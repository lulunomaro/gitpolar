import { readFile, readdir, lstat, statfs } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { db, getUser } from './store.mjs';
import { dataRoot, repoRoot, lfsRoot, dbPath, root, namespace, origin, githubConfigured, callbackUrl, maxLfsBytes, maxPreviewBytes, authProvider } from './config.mjs';
import { requireAuth, body, json, fail, createUser, passwordHash } from './auth.mjs';
import { git, branchOverview } from './git.mjs';
import { releaseLock } from './lfs.mjs';
import { feishuConfigured,feishuCallbackUrl,hasFeishuIdentity } from './feishu.mjs';
import { feishuCliStatus } from './feishu-cli.mjs';

const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
const versions = Promise.all([
  git(null, ['--version']).then(value => value.trim()).catch(() => null),
  git(null, ['lfs', 'version']).then(value => value.trim()).catch(() => null)
]);
let cachedStorage, scanning;
const within = (base, path) => path.startsWith(base + sep);
const add = (map, key, bytes) => map.set(key, (map.get(key) || 0) + bytes);

// Scan asynchronously and cache for 15 seconds: NAS volumes may contain many CAD objects.
// File lengths are apparent bytes, not filesystem allocation or deduplicated physical usage.
async function scanStorage() {
  const storage = {totalBytes:0, gitBytes:0, lfsBytes:0, previewBytes:0, databaseBytes:0, otherBytes:0, disk:null, warnings:[]};
  const gitSizes = new Map(), lfsSizes = new Map(), directories = [dataRoot];
  while (directories.length) {
    const batch = directories.splice(0, 8);
    await Promise.all(batch.map(async directory => {
      let entries;
      try { entries = await readdir(directory, {withFileTypes:true}); }
      catch (error) { storage.warnings.push(directory + ': ' + error.code); return; }
      for (let offset = 0; offset < entries.length; offset += 64) {
        await Promise.all(entries.slice(offset, offset + 64).map(async entry => {
          const path = join(directory, entry.name);
          let info;
          try { info = await lstat(path); }
          catch (error) { if(error.code !== 'ENOENT') storage.warnings.push(path + ': ' + error.code); return; }
          if (info.isSymbolicLink()) { storage.warnings.push('Skipped symbolic link: ' + path); return; }
          if (info.isDirectory()) { directories.push(path); return; }
          if (!info.isFile()) return;
          const bytes = info.size;
          storage.totalBytes += bytes;
          if (within(repoRoot, path)) {
            storage.gitBytes += bytes;
            const parts = relative(repoRoot, path).split(sep);
            if (parts[0] === namespace && parts[1]?.endsWith('.git')) add(gitSizes, parts[1].slice(0, -4), bytes);
          } else if (within(lfsRoot, path)) {
            storage.lfsBytes += bytes;
            add(lfsSizes, relative(lfsRoot, path).split(sep)[0], bytes);
          } else if ([dbPath, dbPath + '-wal', dbPath + '-shm'].includes(path)) storage.databaseBytes += bytes;
          else storage.otherBytes += bytes;
        }));
      }
    }));
  }
  try {
    const disk = await statfs(dataRoot);
    storage.disk = {totalBytes:disk.bsize * disk.blocks, availableBytes:disk.bsize * disk.bavail};
  } catch (error) { storage.warnings.push('Volume capacity unavailable: ' + error.code); }
  storage.scannedAt = new Date().toISOString();
  return {storage, gitSizes, lfsSizes, at:Date.now()};
}
async function storageSnapshot(refresh) {
  if (!refresh && cachedStorage && Date.now() - cachedStorage.at < 15000) return cachedStorage;
  if (!scanning) scanning = scanStorage().then(value => cachedStorage = value).finally(() => scanning = null);
  return scanning;
}
const count = (sql, ...values) => db.prepare(sql).get(...values).n;
function userList() {
  return db.prepare(`SELECT u.id,u.username,u.display_name AS name,u.role,u.created_at AS createdAt,
    u.github_id IS NOT NULL AS githubConnected,u.password_hash IS NOT NULL AS localLogin,
    (SELECT count(*) FROM tokens t WHERE t.user_id=u.id) AS tokens,
    (SELECT count(*) FROM sessions s WHERE s.user_id=u.id AND s.expires>?) AS activeSessions
    FROM users u ORDER BY u.id`).all(Date.now()).map(user => ({...user, githubConnected:Boolean(user.githubConnected), localLogin:Boolean(user.localLogin),feishuConnected:hasFeishuIdentity(user.id)}));
}
function userRecord(id) {
  const user = getUser(id);
  if (!user) fail(404, 'User not found.');
  return user;
}
async function values(req, allowed) {
  const value = await body(req);
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Expected a JSON object.');
  if (Object.keys(value).some(key => !allowed.includes(key))) fail(400, 'Unsupported management field.');
  return value;
}
function revokeCredentials(id) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
    db.prepare('DELETE FROM tokens WHERE user_id=?').run(id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
async function overview(refresh) {
  const [{storage}, [gitVersion, gitLfsVersion],cliStatus] = await Promise.all([storageSnapshot(refresh), versions,feishuCliStatus()]);
  const counts = {
    users:count('SELECT count(*) AS n FROM users'),
    admins:count("SELECT count(*) AS n FROM users WHERE role='admin'"),
    writers:count("SELECT count(*) AS n FROM users WHERE role='writer'"),
    readers:count("SELECT count(*) AS n FROM users WHERE role='reader'"),
    repositories:count('SELECT count(*) AS n FROM repos'),
    readyRepositories:count("SELECT count(*) AS n FROM repos WHERE status='ready'"),
    errorRepositories:count("SELECT count(*) AS n FROM repos WHERE status='error'"),
    locks:count('SELECT count(*) AS n FROM locks'),
    tokens:count('SELECT count(*) AS n FROM tokens'),
    activeSessions:count('SELECT count(*) AS n FROM sessions WHERE expires>?', Date.now())
  };
  const diagnostics = [
    {id:'git', status:gitVersion ? 'ok' : 'warning', title:'Git Smart HTTP', detail:gitVersion || 'Git is unavailable.'},
    {id:'lfs', status:gitLfsVersion ? 'ok' : 'warning', title:'Git LFS', detail:gitLfsVersion || 'Install git-lfs in the NAS container.'},
    {id:'oauth', status:cliStatus.configured||feishuConfigured ? 'ok' : 'warning', title:'Feishu sign-in', detail:cliStatus.configured ? 'Feishu CLI QR sign-in is ready.' : feishuConfigured ? 'Feishu browser OAuth is configured.' : 'Initialize the NAS Feishu CLI application before signing in.'},
    {id:'repositories', status:counts.errorRepositories ? 'warning' : 'ok', title:'Repository creation', detail:counts.errorRepositories ? counts.errorRepositories + ' repository creation record(s) need inspection.' : 'No failed repository creation records.'},
    {id:'storage', status:storage.warnings.length ? 'warning' : 'ok', title:'Storage scan', detail:storage.warnings.length ? 'Storage usage is partial; see storage warnings.' : 'Git, LFS and SQLite usage scanned.'}
  ];
  return {
    service:{name:'gitpolar',version,nodeVersion:process.version,platform:process.platform,uptimeSeconds:Math.floor(process.uptime())},
    counts, storage,
    deployment:{origin:origin.origin,namespace,dataRoot,repositoryRoot:repoRoot,lfsRoot,databasePath:dbPath,authProvider,githubConfigured:authProvider!=='feishu'&&githubConfigured,githubCallbackUrl:callbackUrl,feishuConfigured:feishuConfigured||cliStatus.configured,feishuCliConfigured:cliStatus.configured,feishuCliAvailable:cliStatus.available,feishuCallbackUrl,maxLfsBytes,maxPreviewBytes,gitVersion,gitLfsVersion},
    diagnostics
  };
}
async function repositories(refresh) {
  const snapshot = await storageSnapshot(refresh);
  const records = db.prepare(`SELECT r.*,u.username AS creator,
    (SELECT count(*) FROM locks l WHERE l.repo_id=r.id) AS locks,
    (SELECT count(*) FROM lfs_objects o WHERE o.repo_id=r.id AND o.complete=1) AS lfsObjects,
    (SELECT count(*) FROM lfs_objects o WHERE o.repo_id=r.id AND o.complete=0) AS incompleteLfsObjects
    FROM repos r JOIN users u ON u.id=r.creator_id ORDER BY r.created_at DESC,r.name`).all();
  const result = [];
  for (let offset=0; offset<records.length; offset+=4) {
    result.push(...await Promise.all(records.slice(offset, offset+4).map(async repo => {
      let branches = {defaultBranch:null,branches:[]}, error;
      if (repo.status === 'ready') {
        try { branches = await branchOverview(repo); }
        catch { error = 'Repository Git data could not be read. Check the mounted repository directory.'; }
      }
      return {id:repo.id,name:repo.name,description:repo.description,status:repo.status,createdAt:repo.created_at,creator:repo.creator,
        defaultBranch:branches.defaultBranch,branchCount:branches.branches.length,
        cloneUrl:new URL('/' + namespace + '/' + repo.name + '.git',origin).href,
        gitBytes:snapshot.gitSizes.get(repo.name) || 0,lfsBytes:snapshot.lfsSizes.get(repo.id) || 0,
        lfsObjects:repo.lfsObjects,incompleteLfsObjects:repo.incompleteLfsObjects,locks:repo.locks,...(error?{error}:{})};
    })));
  }
  return {repositories:result, scannedAt:snapshot.storage.scannedAt};
}

export async function adminApi(req,res,pathname,params,changed) {
  requireAuth(req,res,!['GET','HEAD'].includes(req.method),true);
  const refresh = params.get('refresh') === '1';
  if (pathname === '/api/admin/overview' && req.method === 'GET') return json(res, await overview(refresh));
  if (pathname === '/api/admin/repositories' && req.method === 'GET') return json(res, await repositories(refresh));
  if (pathname === '/api/admin/users') {
    if (req.method === 'GET') return json(res,{users:userList()});
    if (req.method === 'POST') {
      if(authProvider === 'feishu') fail(403, 'Members join through Feishu sign-in.');
      const value = await values(req, ['username','password','name','role']);
      if (value.name !== undefined && (typeof value.name !== 'string' || value.name.length > 100)) fail(400, 'Display name must not exceed 100 characters.');
      return json(res,{user:await createUser(value)},201);
    }
  }
  const userMatch = pathname.match(/^\/api\/admin\/users\/([1-9][0-9]*)(?:\/(password|credentials))?$/);
  if (userMatch) {
    const id = Number(userMatch[1]);
    userRecord(id);
    if (!userMatch[2] && req.method === 'PATCH') {
      const value = await values(req,['name','role']);
      if (!Object.keys(value).length) fail(400, 'Provide a display name or role.');
      if (value.name !== undefined && (typeof value.name !== 'string' || value.name.length > 100)) fail(400, 'Display name must not exceed 100 characters.');
      if (value.role !== undefined && !['admin','writer','reader'].includes(value.role)) fail(400, 'Invalid role.');
      db.exec('BEGIN IMMEDIATE');
      try {
        requireAuth(req,res,true,true);
        const current = userRecord(id);
        if (current.role === 'admin' && value.role && value.role !== 'admin' && (authProvider !== 'feishu' || hasFeishuIdentity(id)) && count("SELECT count(*) AS n FROM users WHERE role='admin'" + (authProvider === 'feishu' ? ' AND id IN (SELECT user_id FROM feishu_identities)' : '')) <= 1) fail(409, 'At least one administrator must remain.');
        db.prepare('UPDATE users SET display_name=?,role=? WHERE id=?').run(value.name ?? current.name,value.role ?? current.role,id);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return json(res,{user:getUser(id)});
    }
    if (userMatch[2] === 'password' && req.method === 'POST') {
      if(authProvider === 'feishu') fail(403, 'Password sign-in is disabled. Manage the Feishu identity instead.');
      const value = await values(req,['password']);
      const encoded = await passwordHash(value.password);
      // The authorizing account may have changed while scrypt was running.
      requireAuth(req,res,true,true);
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(encoded,id);
        db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
        db.prepare('DELETE FROM tokens WHERE user_id=?').run(id);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return json(res,{ok:true,credentialsRevoked:true});
    }
    if (userMatch[2] === 'credentials' && req.method === 'DELETE') {
      revokeCredentials(id);
      return json(res,{ok:true});
    }
  }
  if (pathname === '/api/admin/locks' && req.method === 'GET') {
    return json(res,{locks:db.prepare(`SELECT l.id,l.repo_id AS repositoryId,r.name AS repositoryName,l.path,
      l.owner_id AS ownerId,u.username AS ownerName,l.locked_at AS lockedAt
      FROM locks l JOIN repos r ON r.id=l.repo_id JOIN users u ON u.id=l.owner_id
      ORDER BY l.locked_at,l.id`).all()});
  }
  const lockMatch = pathname.match(/^\/api\/admin\/locks\/([a-f0-9-]+)$/);
  if (lockMatch && req.method === 'DELETE') {
    const repo = db.prepare('SELECT r.* FROM repos r JOIN locks l ON l.repo_id=r.id WHERE l.id=?').get(lockMatch[1]);
    if (!repo) fail(404,'Lock not found.');
    const user = requireAuth(req,res,true,true);
    releaseLock(repo,user,lockMatch[1],true);
    changed(repo.name);
    return json(res,{ok:true});
  }
  fail(404,'Unknown administration endpoint or method.');
}
