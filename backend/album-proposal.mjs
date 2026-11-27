import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { dataRoot } from './config.mjs';
import { db } from './store.mjs';
import { fail } from './auth.mjs';
import { git, fileMeta, filePath } from './git.mjs';
import { albumManifestPath } from './album.mjs';
import { unmarked, selection } from './album-curation.mjs';
import { safeName } from './album-upload.mjs';

const idFor = (path) => createHash('sha256').update(path).digest('hex').slice(0, 24);
const pointer = (p) => `version https://git-lfs.github.com/spec/v1\noid sha256:${p.lfsOid}\nsize ${p.size}\n`;
const copy = (value) => JSON.parse(JSON.stringify(value));
const noteOf = (snap, p) => snap.selections.get(p.albumId)?.get(p.id) || unmarked;

function activityFor(manifest, input) {
  if (input.activityId) {
    const album = manifest.albums.find((a) => a.id === input.activityId);
    if (!album) fail(404, '目标活动不存在。');
    return album;
  }
  const title = safeName(input.activityName, 80),
    day = input.date;
  if (
    typeof day !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(day)) ||
    new Date(day).toISOString().slice(0, 10) !== day
  )
    fail(400, '请选择有效的活动日期。');
  const path = day + ' ' + title;
  return {
    id: idFor(path),
    title,
    path,
    date: day,
    dateEnd: '',
    datePrecision: 'day',
    year: day.slice(0, 4),
    coverId: '',
    count: 0,
  };
}

export function proposedChanges(repo, user, snap, input) {
  const uploads = input.uploads || [],
    ids = input.edits?.ids || [];
  if (
    !Array.isArray(uploads) ||
    !Array.isArray(ids) ||
    uploads.length > 200 ||
    ids.length > 2000 ||
    (!uploads.length && !ids.length)
  )
    fail(400, '请选择 1–200 张上传照片，或最多 2000 张要整理的照片。');
  if (new Set(uploads).size !== uploads.length || new Set(ids).size !== ids.length) fail(400, '照片选择重复。');
  const activity = uploads.length ? activityFor(snap.manifest, input) : null;
  const additions = uploads.map((id) => {
    if (typeof id !== 'string') fail(400, '无效的上传记录。');
    const row = db
      .prepare('SELECT info FROM album_uploads WHERE id=? AND repo_id=? AND user_id=?')
      .get(id, repo.id, user.id);
    if (!row) fail(404, '找不到本人的上传记录。');
    const p = JSON.parse(row.info),
      relative = [activity.path, p.name].filter(Boolean).join('/');
    return {
      ...p,
      ...(activity.date ? { date: activity.date, year: activity.date.slice(0, 4), dateSource: 'folder' } : {}),
      id: idFor(relative),
      albumId: activity.id,
      path: 'photos/' + relative,
      origin: 'album-pr',
    };
  });
  const edits = [];
  if (ids.length) {
    const { rating, addTags = [], removeTags = [] } = input.edits;
    if (rating != null) selection({ rating, tags: [] });
    const add = selection({ rating: 0, tags: addTags }).tags,
      remove = new Set(selection({ rating: 0, tags: removeTags }).tags);
    if (add.some((tag) => remove.has(tag))) fail(400, '同一个标签不能同时添加和移除。');
    const photos = new Map(snap.manifest.photos.map((p) => [p.id, p]));
    for (const id of ids) {
      const p = photos.get(id);
      if (!p) fail(409, '所选照片已变更，请刷新。');
      const before = noteOf(snap, p);
      const after = selection({
        rating: rating ?? before.rating,
        tags: [...new Set([...before.tags.filter((t) => !remove.has(t)), ...add])],
      });
      if (JSON.stringify(before) !== JSON.stringify(after))
        edits.push({ id, albumId: p.albumId, lfsOid: p.lfsOid, path: p.path, before, after });
    }
  }
  if (!additions.length && !edits.length) fail(400, '所选照片已具有这些标注。');
  return { activity, additions, edits };
}

export async function proposalCommit(repo, user, snap, delta, parents, message) {
  const files = new Map();
  if (delta.additions.length) {
    const manifest = copy(snap.manifest);
    let album = manifest.albums.find((a) => a.id === delta.activity.id);
    if (!album) {
      // An existing activity removed since submission must not be silently resurrected.
      if (delta.activity.count) fail(409, '目标活动已变更，请重新投稿。');
      album = { ...delta.activity };
      manifest.albums.push(album);
    } else if (album.path !== delta.activity.path) fail(409, '目标活动路径已变更，请重新投稿。');
    const paths = new Set(manifest.photos.map((p) => p.path.toLowerCase()));
    for (const p of delta.additions) {
      filePath(p.path);
      if (paths.has(p.path.toLowerCase())) fail(409, '活动中存在同名照片，请重命名后投稿：' + p.name);
      try {
        await fileMeta(repo, snap.oid, p.path);
        fail(409, '仓库已经存在这个文件：' + p.name);
      } catch (e) {
        if (e.status !== 404) throw e;
      }
      paths.add(p.path.toLowerCase());
      manifest.photos.push(p);
      files.set(p.path, pointer(p));
    }
    album.count = manifest.photos.filter((p) => p.albumId === album.id).length;
    album.coverId ||= delta.additions[0].id;
    const text = JSON.stringify(manifest, null, 2) + '\n';
    if (Buffer.byteLength(text) > 16 * 1024 ** 2 || manifest.photos.length > 100000)
      fail(413, '此相册索引已达到容量上限。');
    files.set(albumManifestPath, text);
  }
  const groups = new Map(),
    photos = new Map(snap.manifest.photos.map((p) => [p.id, p]));
  for (const e of delta.edits) {
    const p = photos.get(e.id);
    if (
      !p ||
      p.albumId !== e.albumId ||
      p.lfsOid !== e.lfsOid ||
      JSON.stringify(noteOf(snap, p)) !== JSON.stringify(e.before)
    )
      fail(409, '照片或标注在审核期间有修改，请重新提交：' + e.path);
    if (!groups.has(e.albumId)) groups.set(e.albumId, new Map(snap.selections.get(e.albumId)));
    const group = groups.get(e.albumId);
    if (e.after.rating || e.after.tags.length) group.set(e.id, e.after);
    else group.delete(e.id);
  }
  for (const [id, group] of groups) {
    const text = JSON.stringify(Object.fromEntries(group), null, 2) + '\n';
    if (Buffer.byteLength(text) > 512 * 1024) fail(413, '活动的标注文件已达到容量上限。');
    files.set(`.gitpolar/curation/${id}.json`, text);
  }
  const scratch = join(dataRoot, 'tmp');
  await mkdir(scratch, { recursive: true });
  const dir = await mkdtemp(join(scratch, 'album-pr-'));
  const env = authorEnv(user);
  env.GIT_INDEX_FILE = join(dir, 'index');
  try {
    await git(repo.name, ['read-tree', snap.oid], { env });
    const records = [];
    for (const [path, text] of files) {
      const blob = (await git(repo.name, ['hash-object', '-w', '--stdin'], { input: text })).trim();
      records.push(`100644 ${blob}\t${path}\0`);
    }
    await git(repo.name, ['update-index', '-z', '--index-info'], { env, input: records.join('') });
    const tree = (await git(repo.name, ['write-tree'], { env })).trim();
    return (
      await git(repo.name, ['commit-tree', tree, ...parents.flatMap((p) => ['-p', p])], {
        env,
        input: message + '\n',
      })
    ).trim();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function authorEnv(user) {
  const name = user.name || user.username,
    email = `${user.username}@gitpolar.local`;
  return {
    GIT_AUTHOR_NAME: name,
    GIT_AUTHOR_EMAIL: email,
    GIT_COMMITTER_NAME: name,
    GIT_COMMITTER_EMAIL: email,
  };
}
