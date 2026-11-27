#!/usr/bin/env python3
"""Index a local photo tree for Gitpolar. A published manifest includes item errors."""

import argparse
from contextlib import contextmanager
from datetime import date, datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import tempfile

from PIL import Image, ImageOps, UnidentifiedImageError


EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MIME = {"JPEG": "image/jpeg", "MPO": "image/jpeg", "PNG": "image/png", "GIF": "image/gif", "WEBP": "image/webp"}
COVER_DIR = "相册封面"
CHUNK_SIZE = 1024 * 1024
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS
PRECISION = {0: "unknown", 4: "year", 7: "month", 10: "day"}

# A day uses the same separator as its month. In 2024.3-4 the dash starts a range.
DATE_TOKEN = re.compile(r"""
    (?<![0-9]) (?P<year>(?:19|20)[0-9]{2})
    (?: (?P<sep>[._-]) (?P<month>[0-9]{1,2}) (?: (?P=sep) (?P<day>[0-9]{1,2}) )?
      | (?P<compact>[0-9]{4}) (?:[0-9]{6})?  # YYYYMMDD or YYYYMMDDhhmmss
    )? (?![0-9])
""", re.VERBOSE)
RANGE_END = re.compile(r"[月日号]?\s*[-~～–—至]\s*([0-9]{1,4}(?:[._-][0-9]{1,2}){0,2})(?![0-9])")


def iso_date(parts):
    values = [int(part) for part in parts] + [1] * (3 - len(parts))
    return date(*values).isoformat()[:(4, 7, 10)[len(parts) - 1]]


def date_span(text):
    text = re.sub(r"(?<=[0-9])[年月](?=[0-9])", ".", text)
    for match in DATE_TOKEN.finditer(text):
        parts = [part for part in match.group("year", "month", "day") if part]
        compact = match["compact"]
        if compact:
            parts.extend((compact[:2], compact[2:]))
        try:
            start = iso_date(parts)
        except ValueError:
            continue
        end = ""
        tail = RANGE_END.match(text, match.end())
        if tail:
            suffix = re.split(r"[._-]", tail[1])
            if len(suffix) <= len(parts):
                try:
                    candidate = iso_date(parts[:-len(suffix)] + suffix)
                    if candidate >= start:
                        end = candidate
                except ValueError:
                    pass  # An invalid endpoint does not erase a valid start date.
        return start, end
    return "", ""


def folder_span(group):
    for name in reversed(PurePosixPath(group).parts):
        span = date_span(name)
        if span[0]:
            return span
    return "", ""


def original_date(exif):
    # Cameras normally store DateTimeOriginal in the nested Exif IFD. Some writers
    # put it directly in IFD0 instead.
    original_tag, exif_ifd = 0x9003, 0x8769
    tags = exif.get_ifd(exif_ifd) if exif_ifd in exif else {}
    for value in (tags.get(original_tag), exif.get(original_tag)):
        if isinstance(value, bytes):
            value = value.decode("ascii", errors="replace")
        if isinstance(value, str):
            try:
                return datetime.strptime(value.strip()[:10], "%Y:%m:%d").date().isoformat()
            except ValueError:
                pass
    return ""


def path_id(relative):
    return hashlib.sha256(relative.encode("utf-8")).hexdigest()[:24]


@contextmanager
def temporary_path(directory):
    # Close the handle before Pillow opens the file and before rename on Windows.
    with tempfile.NamedTemporaryFile(dir=directory, prefix=".album-", suffix=".tmp", delete=False) as temp:
        path = Path(temp.name)
    try:
        yield path
    finally:
        path.unlink(missing_ok=True)


def copy_and_hash(source, staged):
    digest = hashlib.sha256()
    size = 0
    with source.open("rb") as reader, staged.open("wb") as writer:
        source_stat = os.fstat(reader.fileno())
        while True:
            block = reader.read(CHUNK_SIZE)
            if not block:
                break
            digest.update(block)
            writer.write(block)
            size += len(block)
    return digest.hexdigest(), size, source_stat


def publish_object(staged, objects, oid, size, source_stat):
    target = objects / oid[:2] / oid[2:4] / oid
    try:
        existing = target.lstat()
    except FileNotFoundError:
        existing = None
    if existing and stat.S_ISREG(existing.st_mode) and existing.st_size == size:
        if not os.path.samestat(existing, source_stat):
            return  # Reuse the immutable LFS object. A source hard link must be detached.
    target.parent.mkdir(parents=True, exist_ok=True)
    staged.replace(target)


def neutral_rgb(image):
    if "A" in image.getbands() or "transparency" in image.info:
        with image.convert("RGBA") as rgba:
            background = Image.new("RGB", rgba.size, "white")
            background.paste(rgba, mask=rgba.getchannel("A"))
            return background
    return image.convert("RGB")


def image_metadata_and_views(staged, previews, oid, folder_date, filename):
    # JPEG's decoder detects MPO automatically. Older Pillow versions do not
    # register MPO as a separate opener, so keep it out of the opener allowlist.
    with Image.open(staged, formats=("JPEG", "PNG", "GIF", "WEBP")) as image:
        mime = MIME[image.format]
        exif = image.getexif()
        width, height = image.size
        if exif.get(0x0112) in (5, 6, 7, 8):
            width, height = height, width

        taken, origin = folder_date, "folder"
        if not taken:
            taken, origin = original_date(exif), "exif"
        if not taken:
            taken, origin = date_span(Path(filename).stem)[0], "filename"

        preview = previews / (oid + ".preview.jpg")
        thumb = previews / (oid + ".thumb.jpg")
        if not (preview.is_file() and thumb.is_file()):
            # Let the JPEG decoder reduce large originals before allocating RGB buffers.
            # Capture native dimensions above and always build the same two resize stages.
            image.draft(None, (1920, 1920))
            profile = image.info.get("icc_profile") if image.mode in ("RGB", "RGBA") else None
            with ImageOps.exif_transpose(image) as oriented, neutral_rgb(oriented) as rgb:
                for limit, target in ((1920, preview), (640, thumb)):
                    rgb.thumbnail((limit, limit), LANCZOS)
                    if not target.is_file():
                        with temporary_path(previews) as temp:
                            rgb.save(temp, format="JPEG", quality=88, icc_profile=profile)
                            temp.replace(target)
    return {"date": taken, "dateSource": origin if taken else "unknown", "year": taken[:4],
            "width": width, "height": height, "mime": mime}


def image_paths(source, excluded, report):
    found = []

    def scan_error(exc):
        directory = Path(exc.filename)
        if directory == source:
            raise exc
        report(directory.relative_to(source).as_posix(), exc)

    for root, directories, filenames in os.walk(source, followlinks=False, onerror=scan_error):
        directory = Path(root)
        directories[:] = [name for name in directories if directory / name not in excluded]
        for name in filenames:
            path = directory / name
            if path.suffix.lower() in EXTENSIONS:
                relative = path.relative_to(source).as_posix()
                try:
                    if stat.S_ISREG(path.lstat().st_mode):
                        found.append(relative)
                except OSError as exc:
                    report(relative, exc)
    return sorted(found)


def index_photo(source, relative, group, folder_date, objects, previews):
    name = PurePosixPath(relative).name
    with temporary_path(objects) as staged:
        oid, size, source_stat = copy_and_hash(source / relative, staged)
        details = image_metadata_and_views(staged, previews, oid, folder_date, name)
        publish_object(staged, objects, oid, size, source_stat)
    return {"id": path_id(relative), "path": "photos/" + relative, "name": name,
            "albumId": path_id(group), **details, "size": size, "lfsOid": oid}


def make_album(group, title, span, photos):
    taken, end = span
    if not taken:
        taken = min((p["date"] for p in photos if p["date"]), default="")
    cover = next((p for p in photos if PurePosixPath(p["path"]).parent.name == COVER_DIR), photos[0])
    return {"id": path_id(group), "title": PurePosixPath(group).name or title, "path": group,
            "date": taken, "dateEnd": end, "datePrecision": PRECISION[len(taken)], "year": taken[:4],
            "count": len(photos), "coverId": cover["id"]}


def build_index(args):
    if not args.repo_id or args.repo_id in (".", "..") or re.search(r"[/\\]", args.repo_id) or Path(args.repo_id).drive:
        raise ValueError("--repo-id must be a single directory name")
    if args.source.is_symlink() or not args.source.is_dir():
        raise ValueError("--source must be a directory and cannot be a symlink")
    source = args.source.resolve()
    objects = (args.lfs_root / args.repo_id).resolve()
    previews = (args.preview_root / args.repo_id).resolve()
    output = args.output.absolute()
    if source in (objects, previews):
        raise ValueError("the source and repository storage directories must be distinct")
    if output.suffix.lower() in EXTENSIONS and source in output.resolve().parents:
        raise ValueError("--output would overwrite a source image")
    objects.mkdir(parents=True, exist_ok=True)
    previews.mkdir(parents=True, exist_ok=True)
    errors = []

    def report(relative, exc):
        message = "Unrecognized or damaged image" if isinstance(exc, UnidentifiedImageError) else str(exc)
        error = {"path": relative, "message": message or type(exc).__name__}
        errors.append(error)
        print(json.dumps(error, ensure_ascii=False), file=sys.stderr, flush=True)

    paths = image_paths(source, {objects, previews}, report)
    photos, groups, spans = [], {}, {}
    for number, relative in enumerate(paths, start=1):
        parent = PurePosixPath(relative).parent
        if parent.name == COVER_DIR:
            parent = parent.parent
        group = "/".join(parent.parts)  # Root photos belong to the empty relative path.
        if group not in spans:
            spans[group] = folder_span(group)
        try:
            photo = index_photo(source, relative, group, spans[group][0], objects, previews)
        except Exception as exc:  # One unreadable image must not discard the rest of the album.
            report(relative, exc)
        else:
            photos.append(photo)
            groups.setdefault(group, []).append(photo)
        if number % 50 == 0:
            print(f"Processed {number}/{len(paths)} images, {len(errors)} errors", file=sys.stderr, flush=True)

    albums = [make_album(group, args.title, spans[group], groups[group]) for group in sorted(groups)]
    imported = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    manifest = {"version": 1, "title": args.title, "importedAt": imported, "albums": albums,
                "photos": photos, "errors": sorted(errors, key=lambda e: e["path"])}
    output.parent.mkdir(parents=True, exist_ok=True)
    with temporary_path(output.parent) as temp:
        temp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temp.replace(output)
    return {"photos": len(photos), "albums": len(albums), "bytes": sum(p["size"] for p in photos),
            "errors": len(errors), "output": str(output)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="original photo directory")
    parser.add_argument("--output", required=True, type=Path, help="destination JSON manifest")
    parser.add_argument("--lfs-root", required=True, type=Path, help="Gitpolar LFS root containing per-repo directories")
    parser.add_argument("--repo-id", required=True, help="Gitpolar repository ID")
    parser.add_argument("--preview-root", required=True, type=Path, help="root for per-repo JPEG derivatives")
    parser.add_argument("--title", required=True, help="album collection title")
    args = parser.parse_args()
    try:
        summary = build_index(args)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Album import failed: {exc}\n")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    main()
