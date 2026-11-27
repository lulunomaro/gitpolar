import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from PIL import Image, features


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "index-photo-album.py"
TITLE = "北极熊活动照片"
REPO = "fixture-repo"


def path_id(relative):
    return hashlib.sha256(relative.encode("utf-8")).hexdigest()[:24]


class AlbumIndexerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.source = self.root / TITLE
        self.source.mkdir()
        self.objects = self.root / "lfs" / REPO
        self.views = self.root / "预览" / REPO
        self.output = self.root / "index" / "manifest.json"

    def picture(self, relative, image=None, **options):
        path = self.source / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        if image is None:
            with Image.new("RGB", (40, 20), (83, 83, 83)) as gray:
                gray.save(path, **options)
        else:
            image.save(path, **options)
        return path

    def run_index(self):
        args = [sys.executable, "-B", str(SCRIPT), "--source", str(self.source),
                "--output", str(self.output), "--lfs-root", str(self.objects.parent),
                "--repo-id", REPO, "--preview-root", str(self.views.parent), "--title", TITLE]
        result = subprocess.run(args, capture_output=True, encoding="utf-8", timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(result.stdout.splitlines()), 1, result.stdout)
        report = json.loads(self.output.read_text(encoding="utf-8"))
        self.assertEqual(set(report), {"version", "title", "importedAt", "albums", "photos", "errors"})
        self.assertEqual((report["version"], report["title"]), (1, TITLE))
        imported = datetime.fromisoformat(report["importedAt"].replace("Z", "+00:00"))
        self.assertEqual(imported.utcoffset().total_seconds(), 0)
        self.assertEqual(json.loads(result.stdout), {
            "photos": len(report["photos"]), "albums": len(report["albums"]),
            "bytes": sum(p["size"] for p in report["photos"]), "errors": len(report["errors"]),
            "output": str(self.output),
        })
        return report, result.stderr

    def test_nearest_folder_ranges_stable_ids_and_cover(self):
        cases = [
            ("2023.4.20-23 春季赛", "2023-04-20", "2023-04-23", "day"),
            ("2024.9.11~13", "2024-09-11", "2024-09-13", "day"),
            ("2024.3-4 训练", "2024-03", "2024-04", "month"),
            ("2023.8", "2023-08", "", "month"),
            ("2025 招新", "2025", "", "year"),
            ("2024.10.19 2025赛季见面会", "2024-10-19", "", "day"),
        ]
        exif = Image.Exif()
        exif[0x9003] = "2015:01:02 12:00:00"
        relatives = []
        for folder, *_ in reversed(cases):
            relative = f"2021 归档/{folder}/赛场/IMG_20180803.JPG"
            relatives.append(relative)
            self.picture(relative, exif=exif)
        cover_group = f"2021 归档/{cases[0][0]}/赛场"
        for name in ("b.png", "a.PNG"):
            relatives.append(f"{cover_group}/相册封面/{name}")
            self.picture(relatives[-1])

        report, stderr = self.run_index()
        self.assertEqual(stderr, "")
        albums = {a["path"]: a for a in report["albums"]}
        self.assertEqual(list(albums), sorted(f"2021 归档/{c[0]}/赛场" for c in cases))
        self.assertEqual([p["path"] for p in report["photos"]], ["photos/" + r for r in sorted(relatives)])
        for folder, taken, end, precision in cases:
            group = f"2021 归档/{folder}/赛场"
            cover_id = path_id(group + ("/相册封面/a.PNG" if group == cover_group else "/IMG_20180803.JPG"))
            with self.subTest(group=group):
                self.assertEqual(albums[group], {
                    "id": path_id(group), "title": "赛场", "path": group, "date": taken, "dateEnd": end,
                    "datePrecision": precision, "year": taken[:4], "count": 3 if group == cover_group else 1,
                    "coverId": cover_id,
                })
                members = [p for p in report["photos"] if p["albumId"] == path_id(group)]
                self.assertEqual(len(members), albums[group]["count"])
                for photo in members:
                    self.assertEqual(photo["id"], path_id(photo["path"][len("photos/"):]))
                    self.assertEqual((photo["date"], photo["dateSource"], photo["year"]),
                                     (taken, "folder", taken[:4]))

    def test_nested_exif_date_orientation_dimensions_and_rgb_pixels(self):
        relative = "合影/IMG_20180103.jpeg"
        exif = Image.Exif()
        exif[0x0112] = 6  # Stored landscape, displayed 90 degrees clockwise.
        exif[0x8769] = {0x9003: "2022:02:28 09:10:11"}
        with Image.new("RGB", (2400, 1200), (128, 128, 128)) as image:
            image.paste((210, 35, 25), (1200, 0, 2400, 1200))
            source = self.picture(relative, image, exif=exif)
        oid = hashlib.sha256(source.read_bytes()).hexdigest()
        report, _ = self.run_index()
        self.assertEqual(report["photos"], [{
            "id": path_id(relative), "path": "photos/" + relative, "name": source.name,
            "albumId": path_id("合影"), "date": "2022-02-28", "dateSource": "exif", "year": "2022",
            "width": 1200, "height": 2400, "size": source.stat().st_size, "lfsOid": oid, "mime": "image/jpeg",
        }])
        self.assertEqual(report["albums"][0]["date"], "2022-02-28")
        for label, size in (("thumb", (320, 640)), ("preview", (960, 1920))):
            with self.subTest(label=label), Image.open(self.views / f"{oid}.{label}.jpg") as view:
                self.assertEqual((view.format, view.mode, view.size), ("JPEG", "RGB", size))
                self.assertEqual(view.getexif().get(0x0112, 1), 1)
                for y, expected in ((size[1] // 4, (128, 128, 128)), (3 * size[1] // 4, (210, 35, 25))):
                    rgb = view.getpixel((size[0] // 2, y))
                    self.assertTrue(all(abs(a - b) <= 4 for a, b in zip(rgb, expected)), (rgb, expected))

    def test_lfs_checksum_independence_deduplication_and_reruns(self):
        # Incompressible PNG spans multiple copy chunks. Both paths have identical bytes.
        with Image.frombytes("RGB", (640, 640), os.urandom(640 * 640 * 3)) as image:
            first = self.picture("a.PNG", image)
        data = first.read_bytes()
        self.assertGreater(len(data), 1024 * 1024)
        duplicate = self.source / "b.png"
        duplicate.write_bytes(data)
        for path in (first, duplicate):
            os.utime(path, (946684800, 946684800))
        old_times = [p.stat().st_mtime_ns for p in (first, duplicate)]
        self.views = self.source / "派生图" / REPO  # Even this layout must remain idempotent.
        oid = hashlib.sha256(data).hexdigest()
        obj = self.objects / oid[:2] / oid[2:4] / oid
        thumb = self.views / (oid + ".thumb.jpg")
        preview = self.views / (oid + ".preview.jpg")

        first_run, _ = self.run_index()
        self.assertEqual([p["lfsOid"] for p in first_run["photos"]], [oid, oid])
        self.assertEqual(len({p["id"] for p in first_run["photos"]}), 2)
        self.assertEqual([p for p in self.objects.rglob("*") if p.is_file()], [obj])
        self.assertEqual(set(self.views.iterdir()), {thumb, preview})
        self.assertEqual(obj.read_bytes(), data)
        self.assertFalse(obj.samefile(first))
        self.assertFalse(obj.samefile(duplicate))
        for path in (obj, thumb, preview):
            os.utime(path, (978307200, 978307200))
        cached = {p: p.stat().st_mtime_ns for p in (obj, thumb, preview)}
        second_run, _ = self.run_index()
        self.assertEqual(second_run["photos"], first_run["photos"])
        self.assertEqual(second_run["albums"], first_run["albums"])
        self.assertEqual({p: p.stat().st_mtime_ns for p in cached}, cached)

        thumb_bytes = thumb.read_bytes()
        thumb.unlink()
        obj.unlink()
        os.link(first, obj)  # A store left by an old hard-link import must be detached.
        third_run, _ = self.run_index()
        self.assertEqual(third_run["photos"], first_run["photos"])
        self.assertFalse(obj.samefile(first))
        self.assertEqual(hashlib.sha256(obj.read_bytes()).hexdigest(), oid)
        self.assertEqual(thumb.read_bytes(), thumb_bytes)
        self.assertEqual(preview.stat().st_mtime_ns, cached[preview])
        self.assertEqual([p.read_bytes() for p in (first, duplicate)], [data, data])
        self.assertEqual([p.stat().st_mtime_ns for p in (first, duplicate)], old_times)
        self.assertEqual(list(self.root.rglob("*.tmp")), [])

    def test_filename_fallback_unknown_dates_transparency_and_item_error(self):
        with Image.new("RGBA", (32, 16), (0, 255, 0, 0)) as image:
            unknown = self.picture("未标注/DSC_0001.PnG", image)
        os.utime(unknown, (1609459200, 1609459200))
        self.picture("活动/IMG_20240229_120000.png")
        self.picture("活动/留影2019.GIF")
        self.picture("活动/IMG_20230230.jpg")
        bad_exif = Image.Exif()
        bad_exif[0x9003] = "0000:00:00 00:00:00"
        self.picture("纪念_2020-04-15.JPG", exif=bad_exif)
        if features.check("webp"):
            self.picture("活动/合照.webp")
        (self.source / "损坏.jpg").write_bytes(b"broken picture")
        (self.source / "说明.txt").write_text("text", encoding="utf-8")

        report, stderr = self.run_index()
        self.assertEqual([e["path"] for e in report["errors"]], ["损坏.jpg"])
        self.assertTrue(report["errors"][0]["message"])
        self.assertEqual(json.loads(stderr), report["errors"][0])
        photos = {p["name"]: p for p in report["photos"]}
        for name, taken, origin in (("DSC_0001.PnG", "", "unknown"), ("IMG_20230230.jpg", "", "unknown"),
                                    ("IMG_20240229_120000.png", "2024-02-29", "filename"),
                                    ("留影2019.GIF", "2019", "filename"), ("纪念_2020-04-15.JPG", "2020-04-15", "filename")):
            with self.subTest(name=name):
                self.assertEqual((photos[name]["date"], photos[name]["dateSource"], photos[name]["year"]),
                                 (taken, origin, taken[:4]))
        self.assertEqual(photos["留影2019.GIF"]["mime"], "image/gif")
        if features.check("webp"):
            self.assertEqual(photos["合照.webp"]["mime"], "image/webp")
        self.assertNotIn("说明.txt", photos)
        self.assertNotIn("损坏.jpg", photos)
        albums = {a["path"]: a for a in report["albums"]}
        self.assertEqual((albums["活动"]["date"], albums["活动"]["datePrecision"]), ("2019", "year"))
        self.assertEqual((albums[""]["id"], albums[""]["title"]), (path_id(""), TITLE))
        self.assertEqual([albums["未标注"][key] for key in ("date", "dateEnd", "datePrecision", "year")],
                         ["", "", "unknown", ""])
        with Image.open(self.views / (photos[unknown.name]["lfsOid"] + ".thumb.jpg")) as view:
            self.assertEqual((view.mode, view.size, view.getpixel((0, 0))), ("RGB", (32, 16), (255, 255, 255)))
        self.assertEqual(list(self.root.rglob("*.tmp")), [])

    def test_symlink_files_directories_and_cycles_are_skipped(self):
        original = self.picture("活动/保留.jpg")
        outside = self.root / "outside"
        outside.mkdir()
        (outside / "other.jpg").write_bytes(original.read_bytes())
        try:
            (self.source / "link.jpg").symlink_to(outside / "other.jpg")
            (self.source / "linked-dir").symlink_to(outside, target_is_directory=True)
            (self.source / "活动" / "loop").symlink_to(self.source, target_is_directory=True)
        except OSError as exc:
            if getattr(exc, "winerror", None) == 1314:
                self.skipTest("Windows symlink creation privilege is unavailable")
            raise
        report, _ = self.run_index()
        self.assertEqual([p["path"] for p in report["photos"]], ["photos/活动/保留.jpg"])
        self.assertEqual(report["errors"], [])


if __name__ == "__main__":
    unittest.main()
