import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db, repository } from './store.mjs';
import { loadAlbum, albumPreviewRoot } from './album.mjs';
import { albumPointerMatches, git } from './git.mjs';
import { fail, json, body } from './auth.mjs';
import { canManage, requireManager } from './collab-store.mjs';
import { aiEnabled, modelKey, recognizePhoto, encodeQuery, similarity } from './immich.mjs';

db.exec(`
  CREATE TABLE IF NOT EXISTS album_ai_assets (
    repo TEXT NOT NULL, model TEXT NOT NULL, oid TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'queued', error TEXT NOT NULL DEFAULT '', attempts INTEGER NOT NULL DEFAULT 0,
    retry_at INTEGER NOT NULL DEFAULT 0, visual BLOB, ocr TEXT NOT NULL DEFAULT '', faces TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY(repo, model, oid)
  );
  CREATE INDEX IF NOT EXISTS album_ai_queue ON album_ai_assets(model, state, retry_at);
  CREATE TABLE IF NOT EXISTS album_ai_people (
    id INTEGER PRIMARY KEY, repo TEXT NOT NULL, model TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', representative BLOB NOT NULL
  );
  CREATE INDEX IF NOT EXISTS album_ai_people_repo ON album_ai_people(repo, model);
`);
const verified = new WeakMap();
async function snapshot(repo, ref) {
  const snap = await loadAlbum(repo, ref);
  if (!verified.has(snap)) {
    const pending = albumPointerMatches(repo, snap.oid, snap.manifest.photos).then(photos => ({
      commit:snap.oid, total:snap.manifest.photos.length, photos,
      keys:JSON.stringify([...new Set(photos.map(p => p.lfsOid))]),
    }));
    verified.set(snap, pending);
    pending.catch(() => verified.delete(snap));
  }
  return verified.get(snap);
}
const visibleWhere = `repo=? AND model=? AND oid IN (SELECT value FROM json_each(?))`;
const visibleArgs = (repo, snap) => [repo.id, modelKey, snap.keys];
const pack = v => Buffer.from(v.buffer, v.byteOffset, v.byteLength);
const unpack = b => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

function enqueue(repo, snap, retry = false) {
  if (!aiEnabled) fail(503, 'NAS 尚未配置 Immich 识别服务。');
  const args = visibleArgs(repo, snap);
  db.prepare(`INSERT OR IGNORE INTO album_ai_assets(repo,model,oid) SELECT ?,?,value FROM json_each(?)`).run(...args);
  if (retry) db.prepare(`UPDATE album_ai_assets SET state='queued', error='', retry_at=0, attempts=0 WHERE state!='ready' AND ${visibleWhere}`).run(...args);
  wakeWorker();
}

// Features live outside Git; assigning a face and finishing its asset is one transaction.
function storeResult(repo, oid, result) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db.prepare('SELECT state FROM album_ai_assets WHERE repo=? AND model=? AND oid=?').get(repo, modelKey, oid);
    if (existing?.state === 'ready') { db.exec('COMMIT'); return; }
    const representatives = result.faces.length ? db.prepare('SELECT id,representative FROM album_ai_people WHERE repo=? AND model=?').all(repo, modelKey)
      .map(p => ({id:p.id, vector:unpack(p.representative)})) : [];
    const used = new Set();
    const faces = result.faces.map(face => {
      let best = 0.54, person = null;
      for (const candidate of representatives) {
        if (used.has(candidate.id)) continue;
        const score = similarity(candidate.vector, face.vector);
        if (score > best) { best = score; person = candidate.id; }
      }
      if (person === null) person = Number(db.prepare('INSERT INTO album_ai_people(repo,model,representative) VALUES(?,?,?)').run(repo, modelKey, pack(face.vector)).lastInsertRowid);
      used.add(person);
      return {person, box:face.box};
    });
    db.prepare(`UPDATE album_ai_assets SET state='ready', error='', retry_at=0, visual=?, ocr=?, faces=? WHERE repo=? AND model=? AND oid=?`)
      .run(pack(result.visual), result.text, JSON.stringify(faces), repo, modelKey, oid);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

let stopped = true, busy = false, nextTimer;
function wakeWorker(delay = 0) {
  if (busy || stopped) return;
  clearTimeout(nextTimer);
  nextTimer = setTimeout(() => processNext().catch(e => { console.error('Album AI:', e.message); wakeWorker(15_000); }), delay);
  nextTimer.unref();
}
async function processNext() {
  if (stopped || busy) return;
  const job = db.prepare(`SELECT repo,oid,attempts FROM album_ai_assets WHERE model=? AND state='queued' AND retry_at<=? ORDER BY retry_at,rowid LIMIT 1`).get(modelKey, Date.now());
  if (!job) { wakeWorker(15_000); return; }
  busy = true;
  let delay = 25;
  try {
    const bytes = await readFile(join(albumPreviewRoot, job.repo, job.oid + '.preview.jpg'));
    storeResult(job.repo, job.oid, await recognizePhoto(bytes));
  } catch (error) {
    const message = error.code === 'ENOENT' ? '这张照片缺少预览图。' : error.message;
    const tries = job.attempts + 1;
    // Do not drain the entire queue when the inference server is offline.
    const offline = error.status === 503;
    if (offline) delay = 30_000;
    db.prepare("UPDATE album_ai_assets SET state=?, error=?, attempts=?, retry_at=? WHERE repo=? AND model=? AND oid=? AND state!='ready'")
      .run(offline || tries < 3 ? 'queued' : 'failed', message, tries, Date.now() + Math.min(300_000, 15_000 * tries), job.repo, modelKey, job.oid);
  } finally { busy = false; wakeWorker(delay); }
}

export function startAlbumAI(events) {
  if (!aiEnabled) return () => {};
  stopped = false;
  const pending = new Map();
  const scan = async name => {
    const repo = repository(name);
    if (repo?.kind !== 'album') return;
    const ref = (await git(name,['symbolic-ref','--short','HEAD'])).trim();
    try { enqueue(repo, await snapshot(repo, ref)); }
    catch (error) { if (error.status !== 404) throw error; } // a new, empty repository
  };
  const schedule = name => {
    clearTimeout(pending.get(name));
    pending.set(name, setTimeout(() => {
      pending.delete(name);
      scan(name).catch(e => console.error('Album AI discovery:', e.message));
    }, 500).unref());
  };
  const discover = () => {
    for (const {name} of db.prepare("SELECT name FROM repos WHERE kind='album' AND status='ready'").all()) schedule(name);
  };
  events.on('repository', schedule);
  discover();
  const interval = setInterval(discover, 5 * 60_000).unref(); // also pick up direct NAS Git imports
  wakeWorker();
  return () => { stopped = true; clearTimeout(nextTimer); clearInterval(interval); events.off('repository', schedule); for (const timer of pending.values()) clearTimeout(timer); };
}

function status(repo, snap, user) {
  const rows = new Map(db.prepare(`SELECT oid,state,error FROM album_ai_assets WHERE ${visibleWhere}`).all(...visibleArgs(repo,snap)).map(r => [r.oid,r]));
  const summary = {commit:snap.commit, enabled:aiEnabled, canManage:canManage(repo,user), total:snap.total,
    ready:0, queued:0, failed:snap.total - snap.photos.length, missing:0, error:''};
  if (summary.failed) summary.error = '部分照片的清单与 Git LFS 指针不一致。';
  for (const p of snap.photos) {
    const row = rows.get(p.lfsOid);
    summary[row?.state || 'missing']++;
    if (row?.error && !summary.error) summary.error = row.error;
  }
  return summary;
}
function peopleFor(repo, snap) {
  const records = db.prepare(`SELECT oid,faces FROM album_ai_assets WHERE state='ready' AND faces!='[]' AND ${visibleWhere}`).all(...visibleArgs(repo,snap));
  const byOid = new Map(records.map(row => [row.oid,JSON.parse(row.faces)]));
  const groups = new Map();
  for (const photo of snap.photos) for (const {person,box} of byOid.get(photo.lfsOid) || []) {
    if (!groups.has(person)) groups.set(person,{id:person, coverId:photo.id, box, ids:[]});
    groups.get(person).ids.push(photo.id);
  }
  const labels = db.prepare('SELECT name FROM album_ai_people WHERE repo=? AND model=? AND id=?');
  return [...groups.values()].map(g => ({...g, name:labels.get(repo.id,modelKey,g.id)?.name || ''})).sort((a,b) => b.ids.length - a.ids.length || a.id - b.id);
}
async function search(repo, snap, params) {
  const q = (params.get('q') || '').trim(), mode = params.get('mode') || 'semantic';
  if (!q || q.length > 250 || !['semantic','text'].includes(mode)) fail(400, '请输入 1 到 250 个字符并选择搜索方式。');
  const args = visibleArgs(repo,snap);
  if (mode === 'text') {
    const rows = db.prepare(`SELECT oid FROM album_ai_assets WHERE state='ready' AND instr(lower(ocr),lower(?))>0 AND ${visibleWhere}`).all(q,...args);
    const found = new Set(rows.map(r => r.oid));
    return {ids:snap.photos.filter(p => found.has(p.lfsOid)).map(p => p.id)};
  }
  const rows = db.prepare(`SELECT oid,visual FROM album_ai_assets WHERE state='ready' AND ${visibleWhere}`).all(...args);
  if (!rows.length) return {ids:[]};
  const query = await encodeQuery(q);
  const scores = new Map(rows.map(r => [r.oid, similarity(query,unpack(r.visual))]));
  return {ids:snap.photos.filter(p => scores.has(p.lfsOid)).sort((a,b) => scores.get(b.lfsOid) - scores.get(a.lfsOid)).slice(0,60).map(p => p.id)};
}

export async function albumAiApi(req, res, repo, user, action, params) {
  const ref = params.get('ref') || 'main';
  if (repo.kind !== 'album') fail(404,'这个仓库没有相册。');
  if (!aiEnabled && action === 'album/ai/status' && req.method === 'GET')
    return json(res,{enabled:false,canManage:canManage(repo,user)});
  if (!aiEnabled) fail(503, 'NAS 尚未配置 Immich 识别服务。');
  const snap = await snapshot(repo, ref);
  if (req.method === 'GET') {
    if (action === 'album/ai/status') return json(res,status(repo,snap,user));
    if (action === 'album/ai/search') return json(res,await search(repo,snap,params));
    if (action === 'album/ai/people') return json(res,{people:peopleFor(repo,snap)});
    if (action === 'album/ai/photo') {
      const photo = snap.photos.find(p => p.id === params.get('id'));
      if (!photo) fail(404,'此版本中没有这张已校验的照片。');
      const row = db.prepare('SELECT state,error,ocr,faces FROM album_ai_assets WHERE repo=? AND model=? AND oid=?').get(repo.id,modelKey,photo.lfsOid);
      const label = db.prepare('SELECT name FROM album_ai_people WHERE repo=? AND model=? AND id=?');
      const faces = JSON.parse(row?.faces || '[]').map(f => ({...f,name:label.get(repo.id,modelKey,f.person)?.name || ''}));
      return json(res,{state:row?.state || 'missing', error:row?.error || '', text:row?.ocr || '', faces});
    }
  }
  if (action === 'album/ai/index' && req.method === 'POST') {
    requireManager(repo,user); enqueue(repo,snap,true); return json(res,status(repo,snap,user),202);
  }
  const target = /^album\/ai\/people\/(\d+)$/.exec(action);
  if (target && req.method === 'PATCH') {
    requireManager(repo,user);
    const {name} = await body(req,1024);
    if (typeof name !== 'string' || name.trim().length > 60) fail(400,'人物名称最多 60 个字符。');
    const id = Number(target[1]);
    if (!peopleFor(repo,snap).some(p => p.id === id)) fail(404,'此版本中没有这个人物分组。');
    db.prepare('UPDATE album_ai_people SET name=? WHERE repo=? AND model=? AND id=?').run(name.trim(),repo.id,modelKey,id);
    return json(res,{id,name:name.trim()});
  }
  fail(404,'没有这个相册 AI 接口。');
}
