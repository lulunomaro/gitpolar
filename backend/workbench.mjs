import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { authenticate, fail, json, requireOrigin } from './auth.mjs';
import { maxLfsBytes, personalWorkspacesEnabled, workspaceFilesRoot } from './config.mjs';
import { db, now } from './store.mjs';

function filePath(value) {
  const path = value?.normalize('NFC');
  if (!path || path.length > 1024 || /[\\\u0000-\u001f\u007f]/.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..' || part.length > 255)) {
    fail(400, '请使用有效的相对文件路径。');
  }
  return path;
}

async function ownerDirectory(userId) {
  // 根目录由部署时在机械盘上创建。磁盘未挂载时不递归创建，以免写入系统盘。
  const directory = join(workspaceFilesRoot, String(userId));
  try { await mkdir(directory, {mode: 0o700}); }
  catch (error) { if (error.code !== 'EEXIST') fail(503, '个人文件盘暂时不可用。'); }
  return directory;
}

async function upload(req, res, userId, directory, path) {
  const lookup = db.prepare('SELECT object_id FROM workspace_files WHERE user_id=? AND path=?');
  const prior = lookup.get(userId, path)?.object_id;
  if (prior ? req.headers['if-match'] !== '"' + prior + '"' : req.headers['if-match']) {
    fail(409, '文件列表已变更，请刷新后重试。');
  }
  const length = Number(req.headers['content-length']);
  if (length > maxLfsBytes) fail(413, '文件超过本站单文件大小限制。');
  const id = randomUUID();
  const object = join(directory, id);
  const temp = object + '.part';
  let size = 0;
  let renamed = false;
  let recorded = false;
  async function* chunks() {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxLfsBytes) fail(413, '文件超过本站单文件大小限制。');
      yield chunk;
    }
  }
  try {
    await pipeline(Readable.from(chunks()), createWriteStream(temp, {flags: 'wx', mode: 0o600}));
    if (!req.complete || (Number.isFinite(length) && length !== size)) fail(400, '文件上传不完整，请重试。');
    await rename(temp, object);
    renamed = true;
    // 每个版本使用独立文件。索引写入成功后才回收旧版本，并发上传不会覆盖较新的版本。
    const updated = now();
    const result = prior
      ? db.prepare('UPDATE workspace_files SET object_id=?, size=?, updated_at=? WHERE user_id=? AND path=? AND object_id=?').run(id, size, updated, userId, path, prior)
      : db.prepare('INSERT INTO workspace_files(user_id,path,object_id,size,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,path) DO NOTHING').run(userId, path, id, size, updated);
    if (!result.changes) fail(409, '文件已在其他页面更新，请刷新后重试。');
    recorded = true;
    if (prior) await rm(join(directory, prior), {force: true}).catch(() => {});
    return json(res, {id, path, size, updated}, prior ? 200 : 201);
  } finally {
    if (!recorded) await rm(renamed ? object : temp, {force: true}).catch(() => {});
  }
}

export async function workbenchApi(req, res, pathname, params) {
  if (!personalWorkspacesEnabled) fail(404, 'Personal workspaces are disabled.');
  const auth = authenticate(req, {includePersonal: true});
  if (!auth || auth.token) fail(401, '请先登录自己的飞书账号。');
  if (req.method !== 'GET') requireOrigin(req);
  const {id: userId} = auth.user;
  if (req.headers['x-gitpolar-workspace'] && req.headers['x-gitpolar-workspace'] !== String(userId)) fail(409, '登录账号已切换，请重新打开工作台。');
  // 为升级前已登录的团队成员补建个人工作台，归属始终取自已验证的会话。
  db.prepare('INSERT OR IGNORE INTO personal_workspaces(user_id,open_id,tenant_key,created_at) SELECT user_id,open_id,tenant_key,? FROM feishu_identities WHERE user_id=?').run(now(), userId);
  const workspace = db.prepare('SELECT created_at AS created FROM personal_workspaces WHERE user_id=?').get(userId);
  if (!workspace) fail(403, '请先用飞书身份登录。');
  const directory = await ownerDirectory(userId);
  if (pathname === '/api/workbench' && req.method === 'GET') {
    const files = db.prepare('SELECT object_id AS id,path,size,updated_at AS updated FROM workspace_files WHERE user_id=? ORDER BY path').all(userId);
    return json(res, {...workspace, files});
  }
  if (pathname === '/api/workbench/files' && req.method === 'PUT') {
    return upload(req, res, userId, directory, filePath(params.get('path')));
  }
  const match = pathname.match(/^\/api\/workbench\/files\/([a-f0-9-]{36})$/);
  if (!match || req.method !== 'GET') fail(404, '找不到此工作台资源。');
  const file = db.prepare('SELECT path,size FROM workspace_files WHERE user_id=? AND object_id=?').get(userId, match[1]);
  if (!file) fail(404, '找不到该文件。');
  const handle = await open(join(directory, match[1]), 'r');
  try {
    res.writeHead(200, {'Content-Type': 'application/octet-stream', 'Content-Length': file.size,
      'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(basename(file.path)).replaceAll("'", '%27')});
    await pipeline(handle.createReadStream(), res);
  } finally { await handle.close(); }
}
