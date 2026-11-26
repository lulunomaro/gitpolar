import {randomUUID} from 'node:crypto';
import {db,now} from './store.mjs';
import {body,fail,hash,json,random,requireAuth} from './auth.mjs';

db.exec(`
 CREATE TABLE IF NOT EXISTS fw_stations(
   id TEXT PRIMARY KEY, owner INTEGER NOT NULL REFERENCES users(id), label TEXT NOT NULL,
   secret TEXT NOT NULL UNIQUE, seen INTEGER, session TEXT, snapshot TEXT NOT NULL DEFAULT '{}',
   last_batch INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS fw_jobs(
   id TEXT PRIMARY KEY, station TEXT NOT NULL REFERENCES fw_stations(id) ON DELETE CASCADE,
   kind TEXT NOT NULL, request TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL,
   result TEXT, created TEXT NOT NULL, updated TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS fw_jobs_station ON fw_jobs(station,state);
 CREATE TABLE IF NOT EXISTS fw_samples(
   seq INTEGER PRIMARY KEY, station TEXT NOT NULL REFERENCES fw_stations(id) ON DELETE CASCADE,
   sample TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS fw_samples_station ON fw_samples(station,seq);
 CREATE TABLE IF NOT EXISTS fw_verification(
   id TEXT PRIMARY KEY, station TEXT NOT NULL REFERENCES fw_stations(id), flash TEXT NOT NULL REFERENCES fw_jobs(id),
   actor INTEGER NOT NULL REFERENCES users(id), outcome TEXT NOT NULL, note TEXT NOT NULL, identity TEXT, created TEXT NOT NULL);
`);
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const cutoff = 30000;
const online = station => station.seen && station.seen >= Date.now()-cutoff;
const getJob = id => db.prepare('SELECT * FROM fw_jobs WHERE id=?').get(id);
function publicJob(row) {
  return {id:row.id,kind:row.kind,state:row.state,source:JSON.parse(row.payload).source || null,
    result:JSON.parse(row.result),created:row.created,updated:row.updated};
}
function boundedText(value, max) {
  return typeof value === 'string' && value.trim() && value.length<=max;
}
function stationStatus(row) {
  const status = JSON.parse(row.snapshot);
  status.identity = freshIdentity(row);
  return {id:row.id,label:row.label,online:Boolean(online(row)),lastSeen:row.seen,status};
}
function freshIdentity(row) {
  const state = JSON.parse(row.snapshot);
  return online(row) && state.port && !state.serialError ? state.identity || null : null;
}
function exchange(station, data) {
  if (!uuid.test(data.session) || !Number.isSafeInteger(data.batch) || data.batch<1 ||
      !Array.isArray(data.samples) || data.samples.length>256 || !data.status || typeof data.status!=='object') fail(400,'Invalid station heartbeat.');
  const sameSession = station.session === data.session;
  if (!sameSession && online(station)) fail(409,'This station already has a connected process.');
  db.exec('BEGIN IMMEDIATE');
  try {
    if (sameSession && data.batch < station.last_batch) fail(409,'Stale station heartbeat.');
    const quietRetry = sameSession && data.batch === station.last_batch;
    if (!quietRetry) {
      if (sameSession && data.batch !== station.last_batch+1) fail(409,'Unexpected station batch sequence.');
      if (data.completed) {
        const done = data.completed, row = getJob(done.id);
        if (!row || row.station !== station.id || !['ok','failed'].includes(done.state)) fail(400,'Unknown completion.');
        if (sameSession && row.state === 'running') {
          db.prepare('UPDATE fw_jobs SET state=?,result=?,updated=? WHERE id=?').run(done.state,JSON.stringify(done.result ?? {}),now(),row.id);
        }
      }
      // 已领取的烧录在断线或进程重启后不能自动重放。
      if (!sameSession) {
        db.prepare("UPDATE fw_jobs SET state='unknown',updated=? WHERE station=? AND state='running'").run(now(),station.id);
      }
      if (station.seen && !online(station)) {
        db.prepare("UPDATE fw_jobs SET state='expired',updated=? WHERE station=? AND kind='flash' AND state='queued'").run(now(),station.id);
      }
      for (const sample of data.samples) {
        db.prepare('INSERT INTO fw_samples(station,sample) VALUES(?,?)').run(station.id,JSON.stringify(sample));
      }
      if (data.samples.length) db.prepare('DELETE FROM fw_samples WHERE station=? AND seq < (SELECT seq FROM fw_samples WHERE station=? ORDER BY seq DESC LIMIT 1 OFFSET 511)').run(station.id,station.id);
      db.prepare('UPDATE fw_stations SET session=?,seen=?,snapshot=?,last_batch=? WHERE id=?').run(data.session,Date.now(),JSON.stringify(data.status),data.batch,station.id);
    }
    let job = db.prepare("SELECT * FROM fw_jobs WHERE station=? AND state='running' ORDER BY rowid LIMIT 1").get(station.id);
    if (!job && !data.active) {
      job = db.prepare("SELECT * FROM fw_jobs WHERE station=? AND state='queued' ORDER BY rowid LIMIT 1").get(station.id);
      if (job) db.prepare("UPDATE fw_jobs SET state='running',updated=? WHERE id=?").run(now(),job.id);
    }
    db.exec('COMMIT');
    return {batch:data.batch,job:job && !data.active ? {id:job.id,kind:job.kind,...JSON.parse(job.payload)} : null};
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}
async function enqueue(station,user,input,services) {
  if (!uuid.test(input.id)) fail(400,'A unique operation UUID is required.');
  const request = JSON.stringify(input,Object.keys(input).sort());
  const existing = getJob(input.id);
  if (existing) {
    if (existing.station!==station.id || existing.request!==request) fail(409,'Operation ID already used.');
    return publicJob(existing);
  }
  if (!online(station)) fail(409,'Connect this Windows station first.');
  let payload = {};
  switch (input.kind) {
    case 'serial-open':
      if (!/^COM[1-9][0-9]{0,3}$/i.test(input.port || '') || !Number.isInteger(input.baud) || input.baud<300 || input.baud>4000000) fail(400,'Choose a COM port and baud rate.');
      payload = {port:input.port.toUpperCase(),baud:input.baud};
      break;
    case 'serial-close': break;
    case 'build':
    case 'flash': {
      if (!boundedText(input.profile,100)) fail(400,'Choose a workstation target.');
      const source = await services.recordSource(user,input);
      payload = {source,profile:input.profile,generate:input.generate===true};
      if (input.kind==='flash') {
        const built = getJob(input.build || '');
        if (!built || built.station!==station.id || built.kind!=='build' || built.state!=='ok') fail(409,'Choose a successful build from this station.');
        const prior = JSON.parse(built.payload);
        if (JSON.stringify(prior)!==JSON.stringify(payload)) fail(409,'The selected revision or target does not match the build.');
        payload.build = built.id;
        payload.sha256 = JSON.parse(built.result).sha256;
        if (!/^[0-9a-f]{64}$/.test(payload.sha256 || '')) fail(409,'This build has no verified image.');
      }
      break;
    }
    default: fail(400,'Unsupported workstation operation.');
  }
  const raced = getJob(input.id);
  if (raced && raced.station===station.id && raced.request===request) return publicJob(raced);
  if (raced) fail(409,'Operation ID already used.');
  db.prepare("INSERT INTO fw_jobs(id,station,kind,request,payload,state,created,updated) VALUES(?,?,?,?,?,'queued',?,?)")
    .run(input.id,station.id,input.kind,request,JSON.stringify(payload),now(),now());
  return publicJob(getJob(input.id));
}
export async function stationApi(req,res,action,params,services) {
  if (action==='station/exchange' && req.method==='POST') {
    const key = (req.headers.authorization || '').replace(/^Bearer /,'');
    const station = key && db.prepare('SELECT * FROM fw_stations WHERE secret=?').get(hash(key));
    if (!station) fail(401,'Invalid workstation key.');
    const data = await body(req,512*1024);
    return json(res,exchange(station,data));
  }
  const user = requireAuth(req,res,req.method!=='GET');
  if (action==='stations') {
    if (req.method==='GET') return json(res,{stations:db.prepare('SELECT * FROM fw_stations WHERE owner=?').all(user.id).map(stationStatus)});
    if (req.method==='POST') {
      const {label} = await body(req);
      if (!boundedText(label,80)) fail(400,'Enter a workstation name.');
      const id=randomUUID(), key='gp_station_'+random();
      db.prepare('INSERT INTO fw_stations(id,owner,label,secret) VALUES(?,?,?,?)').run(id,user.id,label,hash(key));
      return json(res,{id,key},201);
    }
  }
  const [,id,part,item] = action.split('/');
  const station = db.prepare('SELECT * FROM fw_stations WHERE id=? AND owner=?').get(id || '',user.id);
  if (!station) fail(404,'Workstation not found.');
  if (!part && req.method==='GET') return json(res,stationStatus(station));
  if (part==='samples' && req.method==='GET') {
    const after=Number(params.get('after') || 0);
    if (!Number.isSafeInteger(after) || after<0) fail(400,'Invalid serial cursor.');
    const records=db.prepare('SELECT seq,sample FROM fw_samples WHERE station=? AND seq>? ORDER BY seq LIMIT 128').all(id,after);
    return json(res,{samples:records.map(r=>({seq:r.seq,data:JSON.parse(r.sample)})),identity:freshIdentity(station)});
  }
  if (part==='compare' && req.method==='GET') return json(res,await services.compareDevice(freshIdentity(station),Object.fromEntries(params)));
  if (part==='jobs') {
    if (req.method==='POST' && !item) return json(res,await enqueue(station,user,await body(req),services),202);
    if (req.method==='GET' && !item) return json(res,{jobs:db.prepare('SELECT * FROM fw_jobs WHERE station=? ORDER BY rowid DESC LIMIT 50').all(id).map(publicJob)});
    const row = item && getJob(item);
    if (req.method==='GET' && row?.station===id) return json(res,publicJob(row));
  }
  if (part==='verification' && req.method==='GET') return json(res,{records:db.prepare('SELECT * FROM fw_verification WHERE station=? ORDER BY rowid DESC LIMIT 100').all(id).map(r=>({...r,identity:JSON.parse(r.identity)}))});
  if (part==='verification' && req.method==='POST') {
    const input=await body(req), flash=getJob(input.flash || '');
    if (!flash || flash.station!==id || flash.kind!=='flash' || flash.state!=='ok') fail(409,'Choose a completed flash operation.');
    if (!['passed','failed'].includes(input.outcome) || !boundedText(input.note,2000)) fail(400,'Record the observed result.');
    const identity=freshIdentity(station), {source,build}=JSON.parse(flash.payload);
    if (input.outcome==='passed' && (!identity || identity.buildId!==build || ['oid','ref','family','repository'].some(k=>source[k]!==identity[k]))) fail(409,'The live board has not reported this exact build.');
    const key=randomUUID();
    db.prepare('INSERT INTO fw_verification(id,station,flash,actor,outcome,note,identity,created) VALUES(?,?,?,?,?,?,?,?)')
      .run(key,id,flash.id,user.id,input.outcome,input.note,JSON.stringify(identity),now());
    return json(res,{id:key,identity},201);
  }
  fail(404,'Workstation route not found.');
}
