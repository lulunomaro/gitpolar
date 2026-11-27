import { createHash,randomUUID } from 'node:crypto';
import { createReadStream,createWriteStream } from 'node:fs';
import { mkdir,stat,rename,unlink } from 'node:fs/promises';
import { join,dirname } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { db,now } from './store.mjs';
import { lfsRoot,namespace,maxLfsBytes } from './config.mjs';
import { requestOrigin } from './request-origin.mjs';
import { requireAuth,body,fail } from './auth.mjs';
import { filePath } from './git.mjs';

const mime='application/vnd.git-lfs+json';
const reply=(res,value,status=200)=>res.writeHead(status,{'Content-Type':mime}).end(JSON.stringify(value));
export const objectPath=(repo,oid)=>join(lfsRoot,repo.id,oid.slice(0,2),oid.slice(2,4),oid);
const validOid=oid=>typeof oid==='string' && /^[a-f0-9]{64}$/.test(oid);
function objectRecord(repo,oid) {
  if(!validOid(oid))fail(400,'Invalid LFS object ID.');
  const row=db.prepare('SELECT * FROM lfs_objects WHERE repo_id=? AND oid=?').get(repo.id,oid);
  if(!row)fail(404,'LFS object not found.');
  return row;
}
export function lockList(repo,params) {
  return db.prepare('SELECT l.*,u.username FROM locks l JOIN users u ON u.id=l.owner_id WHERE l.repo_id=? ORDER BY l.locked_at,l.id').all(repo.id)
    .filter(l=>(!params.path||l.path===params.path)&&(!params.id||l.id===params.id));
}
const presentLock=l=>({id:l.id,path:l.path,locked_at:l.locked_at,owner:{name:l.username}});
function paginate(locks,params) {
  const start=Math.max(0,Number(params.cursor)||0),limit=Math.min(1000,Math.max(1,Number(params.limit)||100));
  return {items:locks.slice(start,start+limit),next_cursor:start+limit<locks.length?String(start+limit):''};
}
export async function lfs(req,res,repo,suffix,searchParams,changed=()=>{}) {
  if(suffix==='/objects/batch' && req.method==='POST') {
    const initial=requireAuth(req,res,false,false,true);
    const values=await body(req);
    const upload=values.operation==='upload';
    if(!upload && values.operation!=='download')fail(400,'Unsupported LFS operation.');
    if(upload && initial.role==='reader')fail(403,'This account has read-only access.');
    if(values.hash_algo && values.hash_algo!=='sha256')fail(400,'Only sha256 LFS objects are supported.');
    if(values.transfers && (!Array.isArray(values.transfers)||!values.transfers.includes('basic')))fail(406,'Only the basic LFS transfer adapter is supported.');
    if(!Array.isArray(values.objects)||values.objects.length>1000)fail(400,'Invalid LFS object list.');
    const objects=[];
    for(const object of values.objects) {
      if(!validOid(object.oid)||!Number.isSafeInteger(object.size)||object.size<0)fail(400,'Invalid LFS object description.');
      const {oid,size}=object;
      if(size>maxLfsBytes){objects.push({oid,size,error:{code:413,message:`LFS object exceeds LFS_MAX_BYTES (${maxLfsBytes}).`}});continue;}
      let record=db.prepare('SELECT * FROM lfs_objects WHERE repo_id=? AND oid=?').get(repo.id,oid);
      if(upload && !record) {
        db.prepare('INSERT OR IGNORE INTO lfs_objects(repo_id,oid,size) VALUES(?,?,?)').run(repo.id,oid,size);
        record=db.prepare('SELECT * FROM lfs_objects WHERE repo_id=? AND oid=?').get(repo.id,oid);
      }
      if(upload && record && !record.complete && record.size!==size) {
        db.prepare('UPDATE lfs_objects SET size=? WHERE repo_id=? AND oid=? AND complete=0').run(size,repo.id,oid);
        record=db.prepare('SELECT * FROM lfs_objects WHERE repo_id=? AND oid=?').get(repo.id,oid);
      }
      if(record && record.size!==size){objects.push({oid,size,error:{code:422,message:'LFS object size does not match its recorded hash.'}});continue;}
      const exists=record?.complete && (await stat(objectPath(repo,oid)).catch(()=>null))?.size===size;
      const href=new URL(`/${namespace}/${repo.name}.git/info/lfs/objects/${oid}`,requestOrigin()).href;
      if(upload) {
        objects.push({oid,size,authenticated:true,...(!exists?{actions:{upload:{href,header:{...(req.headers.authorization?{Authorization:req.headers.authorization}:{})}},verify:{href:href+'/verify',header:{...(req.headers.authorization?{Authorization:req.headers.authorization}:{})}}}}:{})});
      } else if(exists) objects.push({oid,size,authenticated:true,actions:{download:{href,header:{...(req.headers.authorization?{Authorization:req.headers.authorization}:{})}}}});
      else objects.push({oid,size,error:{code:404,message:'LFS object is not available on this server.'}});
    }
    return reply(res,{transfer:'basic',hash_algo:'sha256',objects});
  }
  const objectMatch=suffix.match(/^\/objects\/([a-f0-9]{64})(\/verify)?$/);
  if(objectMatch) {
    const user=requireAuth(req,res,req.method!=='GET',false,true);
    const [,oid,verify]=objectMatch,record=objectRecord(repo,oid);
    const target=objectPath(repo,oid);
    if(req.method==='GET' && !verify) {
      if(!record.complete)fail(404,'LFS upload is incomplete.');
      const info=await stat(target).catch(()=>null);if(!info)fail(404,'LFS object not found.');
      res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':info.size});
      return pipeline(createReadStream(target),res);
    }
    if(req.method==='PUT' && !verify) {
      if(user.role==='reader')fail(403,'This account has read-only access.');
      await mkdir(dirname(target),{recursive:true});
      const temp=`${target}.${randomUUID()}.upload`;
      const hash=createHash('sha256');let size=0;
      const counter=new Transform({transform(chunk,encoding,callback){size+=chunk.length;if(size>record.size)return callback(new Error('LFS size exceeds declared size.'));hash.update(chunk);callback(null,chunk);}});
      try {
        await pipeline(req,counter,createWriteStream(temp,{flags:'wx',mode:0o600}));
        if(size!==record.size || hash.digest('hex')!==oid)fail(422,'LFS SHA-256 or byte length verification failed.');
        await rename(temp,target);
        // A competing batch may have changed pending metadata while this verified upload streamed.
        db.prepare('UPDATE lfs_objects SET size=?,complete=1 WHERE repo_id=? AND oid=?').run(size,repo.id,oid);
        res.writeHead(200).end();return;
      }finally{await unlink(temp).catch(()=>{});}
    }
    if(req.method==='POST' && verify) {
      const values=await body(req);
      if(values.oid!==oid||values.size!==record.size||!record.complete)fail(422,'LFS object verification failed.');
      return reply(res,{});
    }
    fail(405,'Unsupported LFS object method.');
  }
  if(suffix==='/locks' && req.method==='GET') {
    requireAuth(req,res,false,false,true);
    const page=paginate(lockList(repo,Object.fromEntries(searchParams)),Object.fromEntries(searchParams));
    return reply(res,{locks:page.items.map(presentLock),next_cursor:page.next_cursor});
  }
  if(suffix==='/locks' && req.method==='POST') {
    const user=requireAuth(req,res,true,false,true),values=await body(req);
    filePath(values.path);
    const result=createLock(repo,user,values.path);
    if(!result.created)return reply(res,{message:'File is already locked.',lock:presentLock(result.lock)},409);
    changed(repo.name);
    return reply(res,{lock:presentLock(result.lock)},201);
  }
  if(suffix==='/locks/verify' && req.method==='POST') {
    const user=requireAuth(req,res,true,false,true),values=await body(req);
    const page=paginate(lockList(repo,{}),values);
    return reply(res,{ours:page.items.filter(l=>l.owner_id===user.id).map(presentLock),theirs:page.items.filter(l=>l.owner_id!==user.id).map(presentLock),next_cursor:page.next_cursor});
  }
  const unlock=suffix.match(/^\/locks\/([a-f0-9-]+)\/unlock$/);
  if(unlock && req.method==='POST') {
    const user=requireAuth(req,res,true,false,true),values=await body(req);
    const lock=releaseLock(repo,user,unlock[1],values.force);
    changed(repo.name);
    return reply(res,{lock:presentLock(lock)});
  }
  fail(404,'Unknown LFS endpoint.');
}

export function createLock(repo,user,path) {
  filePath(path);
  const existing=lockList(repo,{path})[0];
  if(existing)return {created:false,lock:existing};
  const lock={id:randomUUID(),path,locked_at:now(),username:user.username,owner_id:user.id};
  db.prepare('INSERT INTO locks(id,repo_id,path,owner_id,locked_at) VALUES(?,?,?,?,?)').run(lock.id,repo.id,path,user.id,lock.locked_at);
  return {created:true,lock};
}
export function releaseLock(repo,user,id,force=false) {
  const lock=lockList(repo,{id})[0];
  if(!lock)fail(404,'Lock not found.');
  if(lock.owner_id!==user.id && !(force===true && user.role==='admin'))fail(403,'Only the lock owner or an administrator using force may unlock this file.');
  db.prepare('DELETE FROM locks WHERE id=?').run(lock.id);
  return lock;
}
