import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { link, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { lfsRoot } from './config.mjs';
import { objectPath } from './lfs.mjs';
import { db } from './store.mjs';
import { albumPreviewRoot } from './album.mjs';
import { fail } from './auth.mjs';

const runFile = promisify(execFile);
const inspector = fileURLToPath(new URL('../scripts/inspect-album-upload.py', import.meta.url));
const maxBytes = 64 * 1024 ** 2;
let active = 0;

export function safeName(value, limit = 150) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > limit ||
    /[<>:"/\\|?*\x00-\x1f\x7f]/u.test(value) ||
    /[. ]$/.test(value) ||
    value.startsWith('.') ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)
  )
    fail(400, '请输入有效的文件或活动名称。');
  return value.trim().normalize('NFC');
}

export async function uploadPhoto(req, repo, user, name) {
  name = safeName(name);
  if (!/^(\.jpe?g|\.png|\.webp|\.gif)$/i.test(extname(name))) fail(415, '支持 JPEG、PNG、WebP 和 GIF 照片。');
  const length = Number(req.headers['content-length']);
  if (length > maxBytes) fail(413, '每张照片最多 64 MiB。');
  if (active >= 4) fail(429, '正在处理其他照片，请稍后重试。');
  const objects = join(lfsRoot, repo.id),
    previews = join(albumPreviewRoot, repo.id);
  let staging;
  active++;
  try {
    await Promise.all([mkdir(objects, { recursive: true }), mkdir(previews, { recursive: true })]);
    staging = await mkdtemp(join(objects, '.upload-'));
    const file = join(staging, 'original'),
      digest = createHash('sha256');
    let size = 0;
    const meter = new Transform({
      transform(chunk, _encoding, next) {
        size += chunk.length;
        if (size > maxBytes) return next(Object.assign(new Error('每张照片最多 64 MiB。'), { status: 413 }));
        digest.update(chunk);
        next(null, chunk);
      },
    });
    await pipeline(req, meter, createWriteStream(file, { flags: 'wx' }));
    if (!size) fail(400, '照片为空。');
    const lfsOid = digest.digest('hex');
    let metadata;
    try {
      const python = process.env.GITPOLAR_ALBUM_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
      const { stdout } = await runFile(python, [inspector, file, previews, lfsOid, name], {
        timeout: 90000,
        windowsHide: true,
      });
      metadata = JSON.parse(stdout);
    } catch (error) {
      if (error.code === 'ENOENT' || /No module named ['"]PIL/.test(error.stderr || ''))
        fail(503, '服务端缺少照片解码环境。');
      fail(422, '无法解码照片，请检查格式、扩展名和尺寸。');
    }
    const target = objectPath(repo, lfsOid);
    await mkdir(dirname(target), { recursive: true });
    try {
      await link(file, target);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    const info = { name, size, lfsOid, ...metadata };
    db.prepare(
      'INSERT INTO lfs_objects(repo_id,oid,size,complete) VALUES(?,?,?,1) ON CONFLICT(repo_id,oid) DO UPDATE SET size=excluded.size,complete=1'
    ).run(repo.id, lfsOid, size);
    db.prepare('INSERT OR IGNORE INTO album_uploads(id,repo_id,user_id,name,sha,info) VALUES(?,?,?,?,?,?)').run(
      randomUUID(),
      repo.id,
      user.id,
      name,
      lfsOid,
      JSON.stringify(info)
    );
    const row = db
      .prepare('SELECT id FROM album_uploads WHERE repo_id=? AND user_id=? AND name=? AND sha=?')
      .get(repo.id, user.id, name, lfsOid);
    return { id: row.id, name, size, width: metadata.width, height: metadata.height };
  } finally {
    active--;
    if (staging) await rm(staging, { recursive: true, force: true });
  }
}
