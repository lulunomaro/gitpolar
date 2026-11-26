import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { db, now } from './store.mjs';
import { repoRoot, dataRoot, namespace, dbPath, lfsRoot } from './config.mjs';
import { fail } from './auth.mjs';

export const ZERO = '0'.repeat(40);
export const namePattern = /^[a-z0-9][a-z0-9_-]{0,47}$/;
export const repoPath = name => resolve(repoRoot,namespace,`${name}.git`);
export function filePath(path, empty = false) {
  if (typeof path !== 'string' || (!empty && !path) || path.startsWith('/') || path.includes('\\') || path.includes('\0') || (path && path.split('/').some(s=>!s || s==='.' || s==='..'))) fail(400,'Invalid repository file path.');
  return path;
}
export function git(name, args, options = {}) {
  return new Promise((resolvePromise,reject) => {
    const env = { ...process.env, GIT_TERMINAL_PROMPT:'0', GIT_OPTIONAL_LOCKS:'0', ...options.env };
    delete env.GIT_DIR; delete env.GIT_WORK_TREE;
    const child = spawn('git',[...(name ? ['-c','core.quotepath=false',`--git-dir=${repoPath(name)}`] : []),...args],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
    const chunks = []; let size = 0, errors = '';
    child.stdout.on('data',chunk=>{size+=chunk.length; if(size>(options.max || 32*1024*1024)) child.kill(); else chunks.push(chunk);});
    child.stderr.on('data',chunk=>errors=(errors+chunk).slice(-8192));
    child.on('error',reject);
    child.stdin.on('error',()=>{});
    child.on('close',code=>{
      if (size>(options.max || 32*1024*1024)) return reject(new Error('Git output exceeded the configured read limit.'));
      if(options.result) return resolvePromise({code,output:Buffer.concat(chunks).toString('utf8')});
      if(code && !options.allowFailure) { const error=new Error(errors.trim() || `Git exited with code ${code}.`); error.gitCode=code; return reject(error); }
      resolvePromise(options.buffer ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8'));
    });
    child.stdin.end(options.input);
  });
}
const shellQuote = text => `'${text.replaceAll("'", "'\\''")}'`;
export async function installHook(repo) {
  const entry = fileURLToPath(new URL('./pre-receive.mjs',import.meta.url)).replaceAll('\\','/');
  const content = `#!/bin/sh\nexec "$GITPOLAR_NODE" ${shellQuote(entry)}\n`;
  await writeFile(join(repoPath(repo.name),'hooks','pre-receive'),content,{mode:0o755});
}
export async function createRepository(user, values) {
  const {name,description='',initialize=true,cad=false}=values;
  if(!namePattern.test(name || '')) fail(400,'Invalid repository name.');
  if(typeof description!=='string' || description.length>240) fail(400,'Description must not exceed 240 characters.');
  if(db.prepare('SELECT id FROM repos WHERE name=?').get(name)) fail(409,'Repository already exists.');
  const repo={id:randomUUID(),name,description,creator_id:user.id,created_at:now()};
  db.prepare('INSERT INTO repos(id,name,description,creator_id,created_at) VALUES(?,?,?,?,?)').run(repo.id,name,description,user.id,repo.created_at);
  try {
    await mkdir(resolve(repoRoot,namespace),{recursive:true});
    // Exclusive directory creation protects an existing bare repository from reinitialization.
    await mkdir(repoPath(name));
    await git(null,['init','--bare','--object-format=sha1','--initial-branch=main',repoPath(name)]);
    await git(name,['config','http.receivepack','true']);
    await git(name,['config','receive.denyNonFastForwards','false']);
    await git(name,['config','core.logAllRefUpdates','true']);
    await installHook(repo);
    if(initialize) await commitFiles(repo,user,'main',[{path:'README.md',text:`# ${name}\n\n${description}\n`}],'Initial commit');
    if(cad) {
      const attributes=await readFile(fileURLToPath(new URL('../templates/solidworks.gitattributes',import.meta.url)),'utf8');
      const ignore=await readFile(fileURLToPath(new URL('../templates/solidworks.gitignore',import.meta.url)),'utf8');
      await commitFiles(repo,user,'main',[{path:'.gitattributes',text:attributes},{path:'.gitignore',text:ignore}],'Configure Git LFS for SolidWorks');
    }
    db.prepare("UPDATE repos SET status='ready' WHERE id=?").run(repo.id);
    return repo;
  } catch(error) { db.prepare("UPDATE repos SET status='error' WHERE id=?").run(repo.id); throw error; }
}
export async function branches(repo) {
  const result=await git(repo.name,['for-each-ref','--sort=-committerdate','--format=%(refname:strip=2)%00%(objectname)%00%(committerdate:iso-strict)%00%(authorname)%00%(subject)','refs/heads/']);
  return result.trimEnd().split('\n').filter(Boolean).map(line=>{const[name,oid,date,author,message]=line.split('\0');return {name,oid,date,author,message};});
}

export async function branchOverview(repo) {
  const refs=await branches(repo);
  const head=(await git(repo.name,['symbolic-ref','--short','HEAD'],{allowFailure:true})).trim()||'main';
  return {branches:refs,defaultBranch:refs.some(b=>b.name===head)?head:refs[0]?.name||head};
}
export async function createBranch(repo,name,from) {
  if(typeof name!=='string'||!name||name.length>255||name.startsWith('-')||name==='HEAD')fail(400,'Invalid branch name.');
  await git(repo.name,['check-ref-format','refs/heads/'+name]).catch(()=>fail(400,'Invalid branch name.'));
  if(typeof from!=='string'||!from)fail(400,'A source branch or commit is required.');
  const oid=await resolveRef(repo,from);
  try {await git(repo.name,['update-ref','--create-reflog','-m','Create branch from '+from,'refs/heads/'+name,oid,ZERO]);}
  catch {fail(409,'This branch already exists or conflicts with an existing branch name.');}
  return {name,oid};
}
export async function deleteBranch(repo,name,expectedOid) {
  const {branches:refs,defaultBranch}=await branchOverview(repo),branch=refs.find(b=>b.name===name);
  if(!branch)fail(404,'Branch not found.');
  if(name===defaultBranch)fail(409,'The default branch cannot be deleted.');
  if(typeof expectedOid!=='string'||!/^[0-9a-f]{40}$/.test(expectedOid))fail(400,'The expected branch commit is required.');
  try {await git(repo.name,['update-ref','-d','refs/heads/'+name,expectedOid]);}
  catch {fail(409,'The branch changed. Refresh the branch list before deleting it.');}
}

// Only immutable commit IDs are cached; branches and tags are resolved on every request.
const commitIds=new Map(),commitIndexes=new Map();
function remember(map,key,create,limit){
  if(map.has(key)){const value=map.get(key);map.delete(key);map.set(key,value);return value;}
  const value=create();map.set(key,value);while(map.size>limit)map.delete(map.keys().next().value);
  value.catch(()=>{if(map.get(key)===value)map.delete(key);});return value;
}
export async function resolveRef(repo,ref='main') {
  if(typeof ref!=='string' || !ref || ref.startsWith('-') || ref.includes('\0') || ref.length>255) fail(400,'Invalid ref.');
  if(/^[0-9a-f]{40}$/.test(ref)) {
    try{return await remember(commitIds,repo.id+':'+ref,async()=>(await git(repo.name,['rev-parse','--verify','--end-of-options',`${ref}^{commit}`])).trim(),128);}catch{fail(404,'Commit not found.');}
  }
  for(const prefix of ['refs/heads/','refs/tags/']) {
    const oid=(await git(repo.name,['rev-parse','--verify','--end-of-options',`${prefix}${ref}^{commit}`],{allowFailure:true})).trim();
    if(/^[0-9a-f]{40}$/.test(oid)) return oid;
  }
  fail(404,'Branch or tag not found.');
}
export async function commitInfo(repo,ref,path) {
  const result=await git(repo.name,['log','-1','--format=%H%x00%an%x00%aI%x00%s',ref,...(path?['--',path]:[])]);
  const [oid,author,date,message]=result.trimEnd().split('\0');
  return {hash:oid?.slice(0,7),oid,author,date,message};
}
export async function describe(repo,userId) {
  const refs=await branches(repo);
  let defaultBranch=(await git(repo.name,['symbolic-ref','--short','HEAD'],{allowFailure:true})).trim() || 'main';
  if(refs.length && !refs.some(b=>b.name===defaultBranch)) defaultBranch=refs[0].name;
  const commit=refs.length?await commitInfo(repo,defaultBranch):{author:'',message:'Empty repository',date:repo.created_at,hash:''};
  const prefs=db.prepare('SELECT kind FROM preferences WHERE user_id=? AND repo_id=?').all(userId,repo.id).map(r=>r.kind);
  const b=Object.fromEntries(refs.filter(r=>r.name!=='main').map(r=>[r.name,{oid:r.oid}]));
  return {...repo,owner:namespace,visibility:'Internal',defaultBranch,empty:!refs.length,branchList:refs,branches:b,commit,updated:commit.date,language:'Files',tone:'blue',files:[],starred:prefs.includes('star'),watched:prefs.includes('watch'),starCount:db.prepare("SELECT count(*) AS n FROM preferences WHERE repo_id=? AND kind='star'").get(repo.id).n};
}
export async function tree(repo,ref,path='') {
  filePath(path,true);
  const oid=await resolveRef(repo,ref);
  let output;
  try {output=await git(repo.name,['ls-tree','-z','-l',path?`${oid}:${path}`:oid]);}catch{fail(404,'Path not found.');}
  return output.split('\0').filter(Boolean).map(record=>{
    const tab=record.indexOf('\t'),header=record.slice(0,tab),name=record.slice(tab+1);
    const [mode,type,objectId,size]=header.trim().split(/\s+/);
    return {name,path:path?`${path}/${name}`:name,mode,type,oid:objectId,size:size==='-'?null:Number(size)};
  });
}
export async function fileMeta(repo,ref,path) {
  filePath(path);const oid=await resolveRef(repo,ref),index=await commitIndex(repo,oid),entry=index.byPath.get(path);
  if(!entry)fail(404,'File not found.');return {...entry};
}
export function lfsPointer(buffer) {
  if(buffer.length>1024) return null;
  const match=buffer.toString('utf8').match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)\s*$/);
  return match?{oid:match[1],size:Number(match[2])}:null;
}
const binaryExtensions=new Set(['.sldprt','.sldasm','.slddrw','.sldlfp','.slddrt','.prtdot','.asmdot','.drwdot','.step','.stp','.x_t','.x_b','.stl','.3mf','.zip','.7z','.pdf','.png','.jpg','.jpeg','.gif','.webp','.mp4','.bin','.exe','.dll']);
export async function fileContent(repo,ref,path) {
  filePath(path);const oid=await resolveRef(repo,ref),index=await commitIndex(repo,oid),entry=index.byPath.get(path);
  if(!entry)fail(404,'File not found.');
  if(entry.size>512*1024) return {...entry,binary:true,tooLarge:true};
  const bytes=entry.size<=1024?(await smallBlobs(repo,index)).get(entry.oid):await git(repo.name,['cat-file','blob',entry.oid],{buffer:true,max:1024*1024});
  const lfs=lfsPointer(bytes);
  if(lfs) {
    const record=db.prepare('SELECT size,complete FROM lfs_objects WHERE repo_id=? AND oid=?').get(repo.id,lfs.oid);
    const info=record?.complete?await stat(join(lfsRoot,repo.id,lfs.oid.slice(0,2),lfs.oid.slice(2,4),lfs.oid)).catch(()=>null):null;
    return {...entry,size:lfs.size,binary:true,lfs:true,lfsOid:lfs.oid,lfsAvailable:Boolean(record?.complete && record.size===lfs.size && info?.isFile() && info.size===lfs.size)};
  }
  const binary=bytes.includes(0)||binaryExtensions.has(extname(path).toLowerCase());
  return {...entry,binary,...(!binary?{text:bytes.toString('utf8')}:{} )};
}
export async function browse(repo,ref,path='') {
  const refs=await branches(repo);
  if(!refs.length) return {empty:true,ref:'main',path:'',entries:[],branches:[],commit:{author:'',message:'Empty repository'}};
  const oid=await resolveRef(repo,ref),commit=await commitInfo(repo,oid);
  let file;
  if(path) { try {file=await fileContent(repo,oid,path);}catch(error){if(error.status!==404)throw error;} }
  let entries;
  try {entries=file?[]:await tree(repo,oid,path);}
  catch(error) {if(error.status!==404)throw error;return {ref,oid,path,missing:true,branches:refs,commit,entries:[],locks:[]};}
  const enriched=[];
  for(let offset=0;offset<entries.length;offset+=8) enriched.push(...await Promise.all(entries.slice(offset,offset+8).map(async e=>({...e,lastCommit:await commitInfo(repo,oid,e.path)}))));
  let readme=null;
  const readmeName=entries.find(e=>e.type==='blob' && /^readme\.md$/i.test(e.name));
  if(readmeName) readme=await fileContent(repo,oid,readmeName.path);
  const locks=db.prepare('SELECT l.id,l.path,l.locked_at,u.username AS owner FROM locks l JOIN users u ON u.id=l.owner_id WHERE l.repo_id=? ORDER BY l.locked_at').all(repo.id);
  return {ref,oid,path,file,entries:enriched,readme,branches:refs,commit,locks};
}
export async function commitFiles(repo,user,branch,files,message,expectedHead) {
  if(!files.length || files.length>10) fail(400,'Invalid file list.');
  await git(repo.name,['check-ref-format',`refs/heads/${branch}`]).catch(()=>fail(400,'Invalid branch name.'));
  const exists=(await branches(repo)).some(b=>b.name===branch);
  const parent=exists?await resolveRef(repo,branch):null;
  if(expectedHead!==undefined && expectedHead!==parent)fail(409,'The branch changed since you opened the editor. Refresh and retry.');
  const temp=join(dataRoot,'tmp',`${randomUUID()}.index`);
  await mkdir(join(dataRoot,'tmp'),{recursive:true});
  const env={GIT_INDEX_FILE:temp,GIT_AUTHOR_NAME:user.username,GIT_AUTHOR_EMAIL:`${user.username}@gitpolar.local`,GIT_COMMITTER_NAME:user.username,GIT_COMMITTER_EMAIL:`${user.username}@gitpolar.local`};
  try {
    if(parent) await git(repo.name,['read-tree',parent],{env});
    for(const file of files) {
      filePath(file.path);
      if(typeof file.text!=='string' || Buffer.byteLength(file.text)>512*1024) fail(400,'Web editing supports text files up to 512 KiB.');
      if(binaryExtensions.has(extname(file.path).toLowerCase())) fail(400,'Use git and Git LFS to commit CAD or binary files.');
      const lock=db.prepare('SELECT owner_id FROM locks WHERE repo_id=? AND path=?').get(repo.id,file.path);
      if(lock && lock.owner_id!==user.id) fail(409,'This file is locked by another user.');
      const blob=(await git(repo.name,['hash-object','-w','--stdin'],{input:file.text})).trim();
      await git(repo.name,['update-index','--add','--cacheinfo','100644',blob,file.path],{env});
    }
    const treeOid=(await git(repo.name,['write-tree'],{env})).trim();
    const commit=(await git(repo.name,['commit-tree',treeOid,...(parent?['-p',parent]:[])],{input:message+'\n',env})).trim();
    try{await git(repo.name,['update-ref',`refs/heads/${branch}`,commit,parent||ZERO]);}catch{fail(409,'The branch changed while saving. Refresh and retry.');}
    return commit;
  }finally{await unlink(temp).catch(()=>{});await unlink(temp+'.lock').catch(()=>{});}
}
export async function smartHttp(req,res,repo,user,pathname,query,onPush) {
  const env={...process.env,GIT_PROJECT_ROOT:repoRoot.replaceAll('\\','/'),GIT_HTTP_EXPORT_ALL:'1',PATH_INFO:pathname,REQUEST_METHOD:req.method,QUERY_STRING:query,CONTENT_TYPE:req.headers['content-type']||'',CONTENT_LENGTH:req.headers['content-length']||'',REMOTE_USER:user.username,REMOTE_ADDR:req.socket.remoteAddress||'',AUTH_TYPE:'Basic',SERVER_PROTOCOL:'HTTP/1.1',HTTP_GIT_PROTOCOL:req.headers['git-protocol']||'',GITPOLAR_NODE:process.execPath.replaceAll('\\','/'),GITPOLAR_DB_PATH:dbPath,GITPOLAR_REPO_ID:repo.id,GITPOLAR_USER_ID:String(user.id)};
  const child=spawn('git',['http-backend'],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let errors='',headers=Buffer.alloc(0),sent=false;
  child.stderr.on('data',chunk=>errors=(errors+chunk).slice(-8192));
  child.stdin.on('error',()=>{});
  req.on('aborted',()=>child.kill());
  res.on('close',()=>{if(!res.writableEnded)child.kill();});
  req.pipe(child.stdin);
  const closed=once(child,'close');
  for await(const chunk of child.stdout) {
    if(!sent) {
      headers=Buffer.concat([headers,chunk]);
      let index=headers.indexOf('\r\n\r\n'),skip=4;
      if(index<0){index=headers.indexOf('\n\n');skip=2;}
      if(index<0){if(headers.length>65536)throw new Error('Invalid Git CGI response.');continue;}
      let statusCode=200;
      for(const line of headers.subarray(0,index).toString().split(/\r?\n/)) {
        const colon=line.indexOf(':');if(colon<0)continue;
        const key=line.slice(0,colon),value=line.slice(colon+1).trim();
        if(key.toLowerCase()==='status')statusCode=Number(value.split(' ')[0]);else res.setHeader(key,value);
      }
      res.writeHead(statusCode);sent=true;
      const rest=headers.subarray(index+skip);if(rest.length&&!res.write(rest))await once(res,'drain');
      headers=null;
    } else if(!res.write(chunk))await once(res,'drain');
  }
  const [code]=await closed;
  if(!sent)throw new Error(errors||'Git CGI process produced no response.');
  res.end();
  if(code===0 && pathname.endsWith('/git-receive-pack'))onPush(repo.name);
}
export function streamGit(repo,args,res,type,filename) {
  const child=spawn('git',[`--git-dir=${repoPath(repo.name)}`,...args],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  res.setHeader('Content-Type',type);
  if(filename) res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  child.stdout.pipe(res);
  child.stderr.resume();
  child.on('error',()=>res.destroy());
  child.on('close',code=>{if(code && !res.writableEnded)res.destroy();});
  res.on('close',()=>child.kill());
}

async function commitIndex(repo,oid) {
  return remember(commitIndexes,repo.id+':'+oid,async()=>{
    const output=await git(repo.name,['ls-tree','-r','-z','-l',oid]);
    const files=output.split('\0').filter(Boolean).map(record=>{
      const tab=record.indexOf('\t'),head=record.slice(0,tab).trim().split(/\s+/),path=record.slice(tab+1);
      return {path,name:path.split('/').at(-1),mode:head[0],type:head[1],oid:head[2],size:Number(head[3])};
    }).filter(entry=>entry.type==='blob');
    return {files,byPath:new Map(files.map(file=>[file.path,file]))};
  },8);
}
async function smallBlobs(repo,index) {
  if(!index.small)index.small=(async()=>{
    const ids=[...new Set(index.files.filter(file=>file.size<=1024).map(file=>file.oid))],blobs=new Map();
    for(let start=0;start<ids.length;start+=128){const selected=ids.slice(start,start+128),bytes=await git(repo.name,['cat-file','--batch'],{input:selected.join('\n')+'\n',buffer:true,max:256*1024});let offset=0;
      for(const id of selected){const end=bytes.indexOf(10,offset),[oid,type,length]=bytes.subarray(offset,end).toString().split(' '),size=Number(length);
        if(end<0||oid!==id||type!=='blob'||!Number.isSafeInteger(size)||size<0||end+size+2>bytes.length)throw Error('Cannot read commit file pointers.');
        blobs.set(id,bytes.subarray(end+1,end+1+size));offset=end+size+2;
      }
    }return blobs;
  })().catch(error=>{index.small=null;throw error;});
  return index.small;
}
export async function fileIndex(repo,ref) {
  const index=await commitIndex(repo,await resolveRef(repo,ref));
  // Snapshot inspection enriches entries with LFS state, so give each caller its own objects.
  return index.files.map(file=>({...file}));
}

export async function history(repo,ref,path='',cursor='0') {
  filePath(path,true);
  if (!/^\d{1,7}$/.test(cursor)) fail(400,'Invalid history cursor.');
  const skip=Number(cursor),limit=25,oid=await resolveRef(repo,ref);
  // Keep literal file paths: a CAD name may contain Git pathspec metacharacters.
  const output=await git(repo.name,['--literal-pathspecs','log','-z','--format=%H%x00%an%x00%aI%x00%s','--max-count='+String(limit+1),'--skip='+String(skip),...(path?['--diff-filter=AMT']:[]),oid,...(path?['--',path]:[])]);
  const fields=output.split('\0');
  if(fields.at(-1)==='')fields.pop();
  const commits=[];
  for(let i=0;i+3<fields.length;i+=4)commits.push({oid:fields[i],hash:fields[i].slice(0,7),author:fields[i+1],date:fields[i+2],message:fields[i+3]});
  return {ref,oid,path,commits:commits.slice(0,limit),nextCursor:commits.length>limit?String(skip+limit):null};
}
