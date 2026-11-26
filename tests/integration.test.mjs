import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn,execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,mkdir,writeFile,readFile,chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { randomBytes,createHash } from 'node:crypto';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { inflateRawSync,crc32 } from 'node:zlib';
import { rename } from 'node:fs/promises';
const exec=promisify(execFile);
const root=fileURLToPath(new URL('../',import.meta.url));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function portNumber(){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function launch(data,extra={},imports=[]) {
  const port=Number(extra.PORT)||await portNumber(),origin=`http://127.0.0.1:${port}`;
  let logs='';
  const child=spawn(process.execPath,[...imports,'server.mjs'],{cwd:root,windowsHide:true,env:{...process.env,NODE_ENV:'test',AUTH_PROVIDER:'local',HOST:'127.0.0.1',PORT:String(port),APP_ORIGIN:origin,DATA_DIR:join(data,'storage'),WORKSPACE_NAME:'polar-lab',GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:'',...extra}});
  child.stderr.on('data',data=>logs+=data);child.stdout.on('data',data=>logs+=data);
  for(let attempt=0;attempt<100;attempt++){
    if(child.exitCode!==null)throw new Error(logs);
    try {if((await fetch(origin+'/api/health')).ok)return {child,origin,port,logs:()=>logs,stop:async()=>{if(child.exitCode!==null)return;const stopped=once(child,'exit');child.kill();await stopped;}};}catch{}
    await wait(50);
  }
  child.kill();throw new Error('Server did not start. '+logs);
}
async function request(server,path,options={}) {
  const response=await fetch(server.origin+path,{method:options.method||'GET',headers:{origin:server.origin,...(options.body?{'Content-Type':'application/json'}:{}),...(options.cookie?{cookie:options.cookie}:{}),...(options.token?{Authorization:`Bearer ${options.token}`} : {}),...options.headers},...(options.body?{body:JSON.stringify(options.body)}:{}),redirect:options.redirect||'follow'});
  const text=response.status===204?'':await response.text();let value;try{value=JSON.parse(text);}catch{value=text;}
  return {response,value,status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
function gitClient(username,token) {
  const authorization='Basic '+Buffer.from(`${username}:${token}`).toString('base64');
  return async(args,cwd,allowFailure=false)=>{
    try {const result=await exec('git',['-c','http.proxy=','-c',`http.extraHeader=Authorization: ${authorization}`,'-c','credential.helper=',...args],{cwd,windowsHide:true,maxBuffer:32*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});return {ok:true,...result};}
    catch(error){const result={ok:false,stdout:error.stdout,stderr:String(error.stderr||error.message).replaceAll(token,'[redacted]')};if(allowFailure)return result;throw new Error(result.stderr);}
  };
}
async function configure(git,cwd,name){await git(['config','user.name',name],cwd);await git(['config','user.email',`${name}@gitpolar.test`],cwd);await git(['lfs','install','--local'],cwd);}

test('native Git HTTP, persistent accounts, LFS binary integrity, locks and live API', {timeout:180000}, async t=>{
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-integration-'));
  let server=await launch(directory);
  try {
    const setup=await request(server,'/api/setup',{method:'POST',body:{username:'admin',password:'test-only-password'}});
    assert.equal(setup.status,201);const cookie=setup.cookie;
    assert.equal((await request(server,'/api/setup',{method:'POST',body:{username:'another',password:'test-only-password'}})).status,409);
    const tokenResult=await request(server,'/api/tokens',{method:'POST',cookie,body:{name:'Admin workstation'}});
    assert.equal(tokenResult.status,201);const token=tokenResult.value.token,git=gitClient('admin',token);
    const denied=await fetch(server.origin+'/polar-lab/missing.git/info/refs?service=git-upload-pack');assert.equal(denied.status,404);
    const created=await request(server,'/api/repos',{method:'POST',cookie,body:{name:'cad-assembly',description:'CAD integration test',initialize:true,cad:true}});
    assert.equal(created.status,201);assert.equal(created.value.empty,false);
    const remote=server.origin+'/polar-lab/cad-assembly.git';
    const unauthorized=await fetch(remote+'/info/refs?service=git-upload-pack');assert.equal(unauthorized.status,401);assert.match(unauthorized.headers.get('www-authenticate'),/Basic/);
    const work=join(directory,'work');await git(['clone',remote,work],root);await configure(git,work,'admin');
    assert.match(await readFile(join(work,'.gitattributes'),'utf8'),/lockable/);
    await mkdir(join(work,'装配 图纸'));
    const relative='装配 图纸/底盘.SLDASM',binary=randomBytes(2*1024*1024+137),oid=createHash('sha256').update(binary).digest('hex');
    const rawBinary=randomBytes(2*1024*1024+33);await writeFile(join(work,'ordinary.bin'),rawBinary);await writeFile(join(work,relative),binary);await writeFile(join(work,'README.md'),'# Real CAD project\n\nPushed by a Git client.\n');
    await git(['add','.'],work);await git(['commit','-m','Push Chinese CAD filename and README'],work);await git(['push','origin','main'],work);
    const copy=join(directory,'clone');await git(['clone',remote,copy],root);assert.deepEqual(await readFile(join(copy,relative)),binary);assert.deepEqual(await readFile(join(copy,'ordinary.bin')),rawBinary);
    const pointer=(await git(['show',`HEAD:${relative}`],work)).stdout;assert.match(pointer,new RegExp(`oid sha256:${oid}`));assert(!pointer.includes(binary.subarray(0,32).toString('hex')));
    const info=await request(server,`/api/repos/cad-assembly/browse?${new URLSearchParams({ref:'main',path:relative})}`,{cookie});
    assert.equal(info.status,200);assert.equal(info.value.file.lfs,true);assert.equal(info.value.file.size,binary.length);assert.equal(info.value.file.lfsAvailable,true);
    const downloaded=await fetch(server.origin+`/api/repos/cad-assembly/raw?${new URLSearchParams({ref:'main',path:relative})}`,{headers:{cookie}});assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),binary);
    t.diagnostic('A 2 MiB LFS binary with Chinese/space path survived push, clone and web download byte-for-byte.');

    await git(['switch','-c','feature/notes'],work);await writeFile(join(work,'notes.md'),'# Feature branch\n');await git(['add','.'],work);await git(['commit','-m','Feature branch'],work);await git(['tag','v0.1'],work);await git(['push','origin','feature/notes','--tags'],work);await git(['switch','main'],work);
    const branch=await request(server,'/api/repos/cad-assembly/browse?ref=feature%2Fnotes',{cookie});assert(branch.value.entries.some(e=>e.name==='notes.md'));
    const tag=await request(server,'/api/repos/cad-assembly/browse?ref=v0.1',{cookie});assert(tag.value.entries.some(e=>e.name==='notes.md'));
    const previousHead=(await request(server,'/api/repos/cad-assembly/browse?ref=main',{cookie})).value.oid;
    const update=await request(server,'/api/repos/cad-assembly/file',{method:'PUT',cookie,body:{branch:'main',path:'docs/from-web.md',text:'# Web commit\nSaved on NAS.\n',expectedHead:previousHead}});assert.equal(update.status,200);assert.equal((await request(server,'/api/repos/cad-assembly/file',{method:'PUT',cookie,body:{branch:'main',path:'docs/stale.md',text:'Stale edit',expectedHead:previousHead}})).status,409);await git(['pull','--ff-only'],work);assert.match(await readFile(join(work,'docs/from-web.md'),'utf8'),/Saved on NAS/);
    const issue=await request(server,'/api/repos/cad-assembly/issues',{method:'POST',cookie,body:{title:'Assembly review',body:'Check relative references.'}});assert.equal(issue.status,201);

    const bobUser=await request(server,'/api/users',{method:'POST',cookie,body:{username:'bob',password:'test-only-password',role:'writer'}});assert.equal(bobUser.status,201);
    const bobLogin=await request(server,'/api/login',{method:'POST',body:{username:'bob',password:'test-only-password'}});const bobToken=await request(server,'/api/tokens',{method:'POST',cookie:bobLogin.cookie,body:{name:'Bob workstation'}});const bob=gitClient('bob',bobToken.value.token);
    const bobWork=join(directory,'bob');await bob(['clone',remote,bobWork],root);await configure(bob,bobWork,'bob');
    await git(['lfs','lock',relative],work);
    await bob(['config','lfs.locksverify','false'],bobWork);await chmod(join(bobWork,relative),0o666);const replacement=randomBytes(1024*1024+17);await writeFile(join(bobWork,relative),replacement);await bob(['add','.'],bobWork);await bob(['commit','-m','Attempt foreign locked CAD update'],bobWork);
    const blocked=await bob(['push','origin','main'],bobWork,true);assert.equal(blocked.ok,false);assert.match(blocked.stderr,/locked by admin/);
    const refuseUnlock=await request(server,`/polar-lab/cad-assembly.git/info/lfs/locks/${(await request(server,'/api/repos/cad-assembly/locks',{cookie})).value.locks[0].id}/unlock`,{method:'POST',token:bobToken.value.token,body:{force:true}});assert.equal(refuseUnlock.status,403);
    await git(['lfs','unlock',relative],work);await bob(['push','origin','main'],bobWork);await git(['pull','--ff-only'],work);assert.deepEqual(await readFile(join(work,relative)),replacement);
    t.diagnostic('The server rejected a second writer changing another user’s lock, even with client-side lock checks disabled.');

    const reader=await request(server,'/api/users',{method:'POST',cookie,body:{username:'reader',password:'test-only-password',role:'reader'}});assert.equal(reader.status,201);
    const readerLogin=await request(server,'/api/login',{method:'POST',body:{username:'reader',password:'test-only-password'}});const readerToken=await request(server,'/api/tokens',{method:'POST',cookie:readerLogin.cookie,body:{name:'Read only'}});assert.equal(readerToken.status,201);
    const readerGit=gitClient('reader',readerToken.value.token),readerWork=join(directory,'reader');await readerGit(['clone',remote,readerWork],root);await configure(readerGit,readerWork,'reader');
    await writeFile(join(readerWork,'unauthorized.txt'),'Denied');await readerGit(['add','.'],readerWork);await readerGit(['commit','-m','Denied writer'],readerWork);assert.equal((await readerGit(['push','origin','main'],readerWork,true)).ok,false);
    assert.equal((await request(server,'/api/repos',{method:'POST',cookie:readerLogin.cookie,body:{name:'denied'}})).status,403);

    await git(['switch','-c','bad-pointer'],work);await writeFile(join(work,'missing-pointer.dat'),`version https://git-lfs.github.com/spec/v1\noid sha256:${'f'.repeat(64)}\nsize 999\n`);await git(['add','.'],work);await git(['commit','-m','Missing LFS object'],work);
    const missing=await git(['-c','core.hooksPath=nonexistent-hooks','push','origin','bad-pointer'],work,true);assert.equal(missing.ok,false);assert.match(missing.stderr,/missing or incomplete/);await git(['switch','main'],work);
    await request(server,'/api/repos',{method:'POST',cookie,body:{name:'other-repository',initialize:true}});
    assert.equal((await request(server,`/polar-lab/other-repository.git/info/lfs/objects/${oid}`,{token})).status,404);
    const wrongBatch=await request(server,'/polar-lab/cad-assembly.git/info/lfs/objects/batch',{method:'POST',token,body:{operation:'upload',objects:[{oid:'a'.repeat(64),size:3}]}});assert.equal(wrongBatch.status,200);
    const wrongUpload=await fetch(server.origin+'/polar-lab/cad-assembly.git/info/lfs/objects/'+'a'.repeat(64),{method:'PUT',headers:{Authorization:`Bearer ${token}`},body:'abc'});assert.equal(wrongUpload.status,422);
    t.diagnostic('Read-only permissions, missing-object pre-receive rejection, object isolation and SHA-256 validation passed.');

    const before=(await git(['rev-parse','HEAD'],work)).stdout.trim();const previousPort=server.port;
    await server.stop();server=await launch(directory,{PORT:String(previousPort),APP_ORIGIN:`http://127.0.0.1:${previousPort}`});
    const stored=await request(server,'/api/session',{cookie});assert.equal(stored.value.user.username,'admin');assert.equal((await request(server,'/api/issues',{cookie})).value.issues.length,1);
    const remoteRefs=await git(['ls-remote',server.origin+'/polar-lab/cad-assembly.git','refs/heads/main'],work);assert(remoteRefs.stdout.startsWith(before));
    const archive=await fetch(server.origin+'/api/repos/cad-assembly/archive?ref=main',{headers:{cookie}});assert.equal(archive.status,200);assert.equal(Buffer.from(await archive.arrayBuffer()).readUInt32LE(0),0x04034b50);
    const revoked=await request(server,`/api/tokens/${tokenResult.value.id}`,{method:'DELETE',cookie});assert.equal(revoked.status,204);assert.equal((await git(['ls-remote',remote],work,true)).ok,false);
    t.diagnostic('Repository data, issues, sessions and tokens survived a server restart; token revocation took effect.');
  }finally{await server.stop();t.diagnostic(`Isolated test data: ${directory}`);}
});

test('GitHub OAuth state, PKCE, allowlist and local identity session', {timeout:30000}, async t=>{
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-oauth-test-'));
  const server=await launch(directory,{GITHUB_CLIENT_ID:'test-oauth-client',GITHUB_CLIENT_SECRET:'test-oauth-secret',GITHUB_ALLOWED_USERS:'octo-test'},['--import',new URL('./mock-github.mjs',import.meta.url).href]);
  try {
    await request(server,'/api/setup',{method:'POST',body:{username:'local-admin',password:'test-only-password'}});
    const start=await request(server,'/auth/github',{redirect:'manual'});assert.equal(start.status,302);
    const authorize=new URL(start.response.headers.get('location')),state=authorize.searchParams.get('state');
    assert.equal(authorize.origin+authorize.pathname,'https://github.com/login/oauth/authorize');assert.equal(authorize.searchParams.get('code_challenge_method'),'S256');assert.match(authorize.searchParams.get('code_challenge'),/^[a-zA-Z0-9_-]{43}$/);
    const bad=await request(server,'/auth/github/callback?state=incorrect&code=test-code',{cookie:start.cookie,redirect:'manual'});assert.equal(bad.response.headers.get('location'),'/?auth=failed');
    const success=await request(server,`/auth/github/callback?state=${state}&code=test-code`,{cookie:start.cookie,redirect:'manual'});assert.equal(success.status,302);assert.equal(success.response.headers.get('location'),'/');
    const session=await request(server,'/api/session',{cookie:success.cookie});assert.equal(session.value.user.username,'gh-octo-test');assert.equal(session.value.user.role,'writer');
    const repeated=await request(server,`/auth/github/callback?state=${state}&code=test-code`,{cookie:start.cookie,redirect:'manual'});assert.equal(repeated.response.headers.get('location'),'/?auth=failed');
    const blockedStart=await request(server,'/auth/github',{redirect:'manual'});const blockedState=new URL(blockedStart.response.headers.get('location')).searchParams.get('state');
    const blocked=await request(server,`/auth/github/callback?state=${blockedState}&code=blocked-code`,{cookie:blockedStart.cookie,redirect:'manual'});assert.equal(blocked.response.headers.get('location'),'/?auth=not-allowed');
    const cancelStart=await request(server,'/auth/github',{redirect:'manual'});const cancelState=new URL(cancelStart.response.headers.get('location')).searchParams.get('state');
    const cancelled=await request(server,`/auth/github/callback?state=${cancelState}&error=access_denied`,{cookie:cancelStart.cookie,redirect:'manual'});assert.equal(cancelled.response.headers.get('location'),'/?auth=cancelled');
    await request(server,'/api/logout',{method:'POST',cookie:success.cookie});assert.equal((await request(server,'/api/session',{cookie:success.cookie})).value.user,null);
    t.diagnostic('Only the GitHub provider response was simulated; OAuth callbacks, SQLite identity and sessions used the actual server.');
  }finally{await server.stop();}
});

// Inspect standard ZIP central-directory records and verify extracted bytes/CRC.
// Fixtures below are synthetic binaries, not actual SolidWorks documents.
function zipEntries(bytes) {
  const end=bytes.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
  assert(end>=0,'ZIP end record');
  const count=bytes.readUInt16LE(end+10),entries=new Map();
  let offset=bytes.readUInt32LE(end+16);
  for(let index=0;index<count;index++) {
    assert.equal(bytes.readUInt32LE(offset),0x02014b50);
    const method=bytes.readUInt16LE(offset+10),checksum=bytes.readUInt32LE(offset+16),compressed=bytes.readUInt32LE(offset+20),size=bytes.readUInt32LE(offset+24);
    const nameLength=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32),local=bytes.readUInt32LE(offset+42);
    const name=bytes.subarray(offset+46,offset+46+nameLength).toString('utf8');
    assert.equal(bytes.readUInt32LE(local),0x04034b50);
    const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
    const content=bytes.subarray(start,start+compressed),decoded=method===8?inflateRawSync(content):content;
    assert.equal(decoded.length,size);assert.equal(crc32(decoded),checksum);
    entries.set(name,decoded);offset+=46+nameLength+extra+comment;
  }
  return entries;
}

test('SolidWorks project inventory, hydrated historical ZIPs and shared web/client locks', {timeout:180000}, async t=>{
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-solidworks-'));
  const server=await launch(directory);
  try {
    const setup=await request(server,'/api/setup',{method:'POST',body:{username:'admin',password:'test-only-password'}}),cookie=setup.cookie;
    const token=(await request(server,'/api/tokens',{method:'POST',cookie,body:{name:'CAD workstation'}})).value.token,git=gitClient('admin',token);
    const created=await request(server,'/api/repos',{method:'POST',cookie,body:{name:'robot-cad',initialize:true,cad:true}});
    assert.equal(created.status,201);const repo=created.value,remote=server.origin+'/polar-lab/robot-cad.git';
    const work=join(directory,'work');await git(['clone',remote,work],root);await configure(git,work,'admin');
    const assembly='装配 图纸/底盘 [左].SLDASM',part='零件/支架.SLDPRT';
    const fixtures=new Map([[assembly,randomBytes(128*1024+13)],[part,randomBytes(65536+7)],['工程图/底盘.SLDDRW',randomBytes(8193)],['导出/底盘.STEP',Buffer.from('ISO-10303-21;\nsynthetic exchange fixture\nEND-ISO-10303-21;')],['导出/网格.3MF',randomBytes(2077)],['模板/零件.PRTDOT',randomBytes(4097)],['普通二进制.bin',randomBytes(1025)],['空文件.txt',Buffer.alloc(0)]]);
    for(const [path,bytes] of fixtures){await mkdir(join(work,path,'..'),{recursive:true});await writeFile(join(work,path),bytes);}
    await git(['add','.'],work);await git(['commit','-m','CAD project version one'],work);await git(['tag','cad-v1'],work);await git(['push','origin','main','--tags'],work);
    const v1=(await git(['rev-parse','HEAD'],work)).stdout.trim();
    const inventory=await request(server,'/api/repos/robot-cad/cad?ref=main',{cookie});
    assert.equal(inventory.status,200);assert.equal(inventory.value.oid,v1);assert.equal(inventory.value.files.length,6);
    assert.equal(inventory.value.counts.assembly,1);assert.equal(inventory.value.counts.part,1);assert.equal(inventory.value.counts.drawing,1);assert.equal(inventory.value.counts.exchange,2);assert.equal(inventory.value.counts.template,1);
    assert.equal(inventory.value.referencesVerified,false);assert.deepEqual(inventory.value.missingLfs,[]);assert.deepEqual(inventory.value.nativeInGit,[]);
    assert(inventory.value.files.every(file=>file.lfs&&file.available));
    assert.equal(inventory.value.files.find(f=>f.path===assembly).size,fixtures.get(assembly).length);
    const archive=await fetch(server.origin+'/api/repos/robot-cad/archive?ref=cad-v1',{headers:{cookie}});
    assert.equal(archive.status,200);assert.equal(archive.headers.get('x-gitpolar-commit'),v1);assert.equal(archive.headers.get('x-gitpolar-lfs'),'hydrated');
    const archiveBytes=Buffer.from(await archive.arrayBuffer());assert.equal(Number(archive.headers.get('content-length')),archiveBytes.length);
    const entries=zipEntries(archiveBytes);
    for(const [path,bytes] of fixtures)assert.deepEqual(entries.get('robot-cad/'+path),bytes,'ZIP original bytes: '+path);
    assert.match(entries.get('robot-cad/.gitattributes').toString(),/lockable/);
    const cancel=new AbortController();const interrupted=await fetch(server.origin+'/api/repos/robot-cad/archive?ref=main',{headers:{cookie},signal:cancel.signal});await interrupted.body.getReader().read();cancel.abort();await wait(50);assert.equal((await request(server,'/api/health')).status,200);
    const earlyCancel=new AbortController(),early=fetch(server.origin+'/api/repos/robot-cad/archive?ref=main',{headers:{cookie},signal:earlyCancel.signal});await wait(10);earlyCancel.abort();await early.catch(()=>{});await wait(100);assert.equal((await request(server,'/api/health')).status,200);


    await request(server,'/api/users',{method:'POST',cookie,body:{username:'writer',password:'test-only-password',role:'writer'}});
    const writerCookie=(await request(server,'/api/login',{method:'POST',body:{username:'writer',password:'test-only-password'}})).cookie;
    const writerToken=(await request(server,'/api/tokens',{method:'POST',cookie:writerCookie,body:{name:'Writer'}})).value.token;
    await request(server,'/api/users',{method:'POST',cookie,body:{username:'reader',password:'test-only-password',role:'reader'}});
    const readerCookie=(await request(server,'/api/login',{method:'POST',body:{username:'reader',password:'test-only-password'}})).cookie;
    assert.equal((await request(server,'/api/repos/robot-cad/locks',{method:'POST',cookie:readerCookie,body:{path:assembly}})).status,403);
    assert.equal((await request(server,'/api/repos/robot-cad/locks',{method:'POST',cookie,body:{path:'missing.SLDPRT'}})).status,404);
    assert.equal((await request(server,'/api/repos/robot-cad/locks',{method:'POST',cookie,body:{path:'../outside.SLDPRT'}})).status,400);
    assert.equal((await request(server,'/api/repos/robot-cad/locks',{method:'POST',cookie,headers:{origin:'http://elsewhere.invalid'},body:{path:assembly}})).status,403);
    const webLock=await request(server,'/api/repos/robot-cad/locks',{method:'POST',cookie,body:{path:assembly,ref:v1}});
    assert.equal(webLock.status,201);assert.equal(webLock.value.lock.owner,'admin');
    const clientLocks=JSON.parse((await git(['lfs','locks','--json'],work)).stdout);assert(clientLocks.some(l=>l.path===assembly&&l.owner.name==='admin'));
    assert.equal((await request(server,'/api/repos/robot-cad/locks',{method:'POST',cookie:writerCookie,body:{path:assembly}})).status,409);
    assert.equal((await request(server,'/api/repos/robot-cad/locks/'+webLock.value.lock.id+'/unlock',{method:'POST',cookie:writerCookie,body:{force:true}})).status,403);
    await git(['lfs','unlock',assembly],work);
    assert.equal((await request(server,'/api/repos/robot-cad/locks',{cookie})).value.locks.length,0);
    const writerLock=await request(server,'/api/repos/robot-cad/locks',{method:'POST',cookie:writerCookie,body:{path:part}});assert.equal(writerLock.status,201);
    assert.equal((await request(server,'/api/repos/robot-cad/locks/'+writerLock.value.lock.id+'/unlock',{method:'POST',cookie,body:{}})).status,403);
    assert.equal((await request(server,'/api/repos/robot-cad/locks/'+writerLock.value.lock.id+'/unlock',{method:'POST',cookie,body:{force:true}})).status,200);
    await git(['lfs','lock',assembly],work);
    const cliLock=(await request(server,'/api/repos/robot-cad/locks',{cookie})).value.locks[0];
    assert.equal((await request(server,'/api/repos/robot-cad/locks/'+cliLock.id+'/unlock',{method:'POST',cookie,body:{}})).status,200);

    const secondAssembly=randomBytes(129*1024+19);await chmod(join(work,assembly),0o666);await writeFile(join(work,assembly),secondAssembly);
    await git(['add','.'],work);await git(['commit','-m','CAD project version two'],work);await git(['push','origin','main'],work);
    const v2=(await git(['rev-parse','HEAD'],work)).stdout.trim();
    const versions=await request(server,'/api/repos/robot-cad/history?'+new URLSearchParams({ref:'main',path:assembly}),{cookie});
    assert.equal(versions.status,200);assert.deepEqual(versions.value.commits.map(c=>c.oid),[v2,v1]);assert.equal(versions.value.nextCursor,null);
    assert.equal((await request(server,'/api/repos/robot-cad/history?cursor=invalid',{cookie})).status,400);
    const historical=await fetch(server.origin+'/api/repos/robot-cad/raw?'+new URLSearchParams({ref:v1,path:assembly}),{headers:{cookie}});assert.deepEqual(Buffer.from(await historical.arrayBuffer()),fixtures.get(assembly));
    const current=await fetch(server.origin+'/api/repos/robot-cad/archive?ref=main',{headers:{cookie:readerCookie}});assert.equal(current.status,200);const currentEntries=zipEntries(Buffer.from(await current.arrayBuffer()));assert.deepEqual(currentEntries.get('robot-cad/'+assembly),secondAssembly);
    const tagged=await fetch(server.origin+'/api/repos/robot-cad/archive?ref=cad-v1',{headers:{cookie}});assert.deepEqual(zipEntries(Buffer.from(await tagged.arrayBuffer())).get('robot-cad/'+assembly),fixtures.get(assembly));

    // A missing NAS object must not produce an apparently complete ZIP of pointers.
    const lfsOid=createHash('sha256').update(secondAssembly).digest('hex');
    const object=join(directory,'storage','lfs',repo.id,lfsOid.slice(0,2),lfsOid.slice(2,4),lfsOid);
    await rename(object,object+'.test-backup');
    try {
      const missing=await request(server,'/api/repos/robot-cad/cad?ref=main',{cookie});assert(missing.value.missingLfs.includes(assembly));
      const file=await request(server,'/api/repos/robot-cad/browse?'+new URLSearchParams({ref:'main',path:assembly}),{cookie});assert.equal(file.value.file.lfsAvailable,false);
      const refused=await request(server,'/api/repos/robot-cad/archive?ref=main',{cookie});assert.equal(refused.status,409);assert.match(refused.value.error,/missing LFS content/);
      const old=await fetch(server.origin+'/api/repos/robot-cad/archive?ref=cad-v1',{headers:{cookie}});assert.equal(old.status,200);await old.arrayBuffer();
    } finally {await rename(object+'.test-backup',object);}
    // Pagination is pinned to one commit, even if a branch later moves.
    for(let index=0;index<26;index++) {
      const saved=await request(server,'/api/repos/robot-cad/file',{method:'PUT',cookie,body:{branch:'main',path:'version-notes.md',text:'Revision '+index,message:'Version note '+index}});assert.equal(saved.status,200);
    }
    const page1=await request(server,'/api/repos/robot-cad/history?ref=main',{cookie});assert.equal(page1.value.commits.length,25);assert.equal(page1.value.nextCursor,'25');
    const page2=await request(server,'/api/repos/robot-cad/history?'+new URLSearchParams({ref:page1.value.oid,cursor:page1.value.nextCursor}),{cookie});assert(page2.value.commits.length>=3);assert(!page2.value.commits.some(c=>page1.value.commits.some(p=>p.oid===c.oid)));

    await git(['pull','--ff-only'],work);
    const previewEndpoint='/api/repos/robot-cad/preview?'+new URLSearchParams({ref:'main',path:assembly});
    assert.equal((await request(server,previewEndpoint,{cookie})).value.reason,'not-generated');
    const directPreview=await request(server,'/api/repos/robot-cad/preview?'+new URLSearchParams({ref:'main',path:'导出/底盘.STEP'}),{cookie});assert.equal(directPreview.value.available,true);assert.equal(directPreview.value.format,'step');
    if(process.platform==='win32') {
      await exec('powershell.exe',['-NoProfile','-File',join(root,'tools','Export-SolidWorksPreview.ps1'),'-RepoRoot',work,'-Source',assembly,'-Preview','导出/底盘.STEP','-RegisterOnly'],{cwd:work,windowsHide:true,maxBuffer:4*1024*1024});
    } else {
      const native=inventory.value.files.filter(f=>f.kind!=='exchange').map(f=>({...f}));
      native.find(f=>f.path===assembly).oid=(await git(['rev-parse','HEAD:'+assembly],work)).stdout.trim();
      const digest=createHash('sha256').update('gitpolar-cad-v1\n');for(const f of native.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0))digest.update(f.path+'\0'+f.oid+'\n');
      await mkdir(join(work,'.gitpolar'),{recursive:true});await writeFile(join(work,'.gitpolar/previews.json'),JSON.stringify({version:1,previews:[{source:assembly,path:'导出/底盘.STEP',projectFingerprint:digest.digest('hex'),previewOid:(await git(['rev-parse','HEAD:导出/底盘.STEP'],work)).stdout.trim(),configuration:'Default'}]}));
    }
    await git(['add','.'],work);await git(['commit','-m','Register versioned CAD preview'],work);await git(['push','origin','main'],work);
    const previewCommit=(await git(['rev-parse','HEAD'],work)).stdout.trim(),registered=await request(server,previewEndpoint,{cookie});
    assert.equal(registered.value.available,true);assert.equal(registered.value.derived,true);assert.equal(registered.value.path,'导出/底盘.STEP');assert(registered.value.url.includes(previewCommit));
    await chmod(join(work,part),0o666);await writeFile(join(work,part),randomBytes(66000));await git(['add','.'],work);await git(['commit','-m','Referenced part changed without touching assembly'],work);await git(['push','origin','main'],work);
    const stale=await request(server,previewEndpoint,{cookie});assert.equal(stale.value.available,false);assert.equal(stale.value.reason,'stale');
    const oldPreview=await request(server,'/api/repos/robot-cad/preview?'+new URLSearchParams({ref:previewCommit,path:assembly}),{cookie});assert.equal(oldPreview.value.available,true);
    const badManifest=await request(server,'/api/repos/robot-cad/file',{method:'PUT',cookie,body:{branch:'main',path:'.gitpolar/previews.json',text:'null',message:'Invalid preview manifest test'}});assert.equal(badManifest.status,200);assert.equal((await request(server,previewEndpoint,{cookie})).value.reason,'manifest');
    const viewerAsset=await fetch(server.origin+'/viewer.js');assert.equal(viewerAsset.status,200);assert.match(viewerAsset.headers.get('content-security-policy'),/wasm-unsafe-eval/);await viewerAsset.arrayBuffer();
    const wasmAsset=await fetch(server.origin+'/cad-vendor/occt-import-js.wasm');assert.equal(wasmAsset.headers.get('content-type'),'application/wasm');await wasmAsset.arrayBuffer();
    t.diagnostic('Preview registration used the actual PowerShell helper on Windows; changing a part invalidated an untouched assembly preview while its historical preview remained available.');
    t.diagnostic('Synthetic CAD binaries: exact original bytes in current/tagged/historical ZIPs, Unicode directories, shared web/CLI locks, role checks, missing-object export rejection, and paged history passed.');
  } finally {await server.stop();t.diagnostic('Isolated SolidWorks test data: '+directory);}
});


test('dependency-scoped assembly history, reusable preview assets and exact revision comparison', {timeout:180000}, async t=>{
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-compare-')),server=await launch(directory);
  try{
    const cookie=(await request(server,'/api/setup',{method:'POST',body:{username:'admin',password:'test-only-password'}})).cookie;
    const token=(await request(server,'/api/tokens',{method:'POST',cookie,body:{name:'Comparison test'}})).value.token,git=gitClient('admin',token);
    await request(server,'/api/repos',{method:'POST',cookie,body:{name:'compare-cad',initialize:true,cad:true}});
    const work=join(directory,'work');await git(['clone',server.origin+'/polar-lab/compare-cad.git',work],root);await configure(git,work,'admin');
    const assembly='装配/测试.SLDASM',partA='零件/支架[1].SLDPRT',partB='零件/轮毂.SLDPRT',unrelated='零件/支架1.SLDPRT';
    for(const file of [assembly,partA,partB,unrelated]){await mkdir(join(work,file,'..'),{recursive:true});await writeFile(join(work,file),randomBytes(2048));}
    function boxStl(width){const v=[[0,0,0],[width,0,0],[width,20,0],[0,20,0],[0,0,15],[width,0,15],[width,20,15],[0,20,15]],faces=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];const out=Buffer.alloc(84+faces.length*50);out.writeUInt32LE(faces.length,80);for(const [i,face]of faces.entries())for(let j=0;j<9;j++)out.writeFloatLE(v[face[Math.floor(j/3)]][j%3],84+i*50+12+j*4);return out;}
    async function asset(width){const data=boxStl(width),file='.gitpolar/previews/'+createHash('sha256').update(data).digest('hex')+'.stl';await mkdir(join(work,'.gitpolar/previews'),{recursive:true});await writeFile(join(work,file),data);return {path:file,previewOid:(await git(['hash-object','--path='+file,'--',file],work)).stdout.trim()};}
    const matrix=x=>[1,0,0,0,0,1,0,0,0,0,1,0,x,0,0,1],oldAsset=await asset(30),wheelAsset=await asset(15);
    const deps=async paths=>Promise.all(paths.map(async path=>({path,oid:(await git(['hash-object','--path='+path,'--',path],work)).stdout.trim()})));
    let manifest;
    async function saveManifest(aAsset,move=0){manifest={version:2,previews:[{source:assembly,configuration:'默认',dependencies:await deps([assembly,partA,partB]),components:[{id:'Bracket-1',name:'支架',source:partA,configuration:'默认',...aAsset,transform:matrix(move)},{id:'Wheel-1',name:'轮毂',source:partB,configuration:'默认',...wheelAsset,transform:matrix(70)},{id:'Wheel-2',name:'轮毂实例二',source:partB,configuration:'默认',...wheelAsset,transform:matrix(-40)}]},{source:partA,configuration:'默认',dependencies:await deps([partA]),...aAsset},{source:partB,configuration:'默认',dependencies:await deps([partB]),...wheelAsset}]};await writeFile(join(work,'.gitpolar/previews.json'),JSON.stringify(manifest));}
    async function commit(message){await git(['add','.'],work);await git(['commit','-m',message],work);await git(['push','origin','main'],work);return (await git(['rev-parse','HEAD'],work)).stdout.trim();}
    await saveManifest(oldAsset);const v1=await commit('Assembly baseline');await git(['tag','before',v1],work);await git(['push','origin','--tags'],work);
    const query=(ref,path)=>new URLSearchParams({ref,path}),preview=async(ref,path=assembly)=>(await request(server,'/api/repos/compare-cad/preview?'+query(ref,path),{cookie})).value;
    const initial=await preview(v1);assert.equal(initial.available,true);assert.equal(initial.format,'scene');assert.equal(initial.components.length,3);assert.equal(initial.assets.length,2);assert.equal(initial.size,1368);
    await chmod(join(work,unrelated),0o666);await writeFile(join(work,unrelated),randomBytes(2051));const unrelatedCommit=await commit('Unrelated CAD edit');assert.equal((await preview('main')).available,true);
    await t.test('drawing rows show the last commit for the exact filename',async()=>{
      const rows=await request(server,'/api/repos/compare-cad/browse?'+query(unrelatedCommit,'零件'),{cookie});
      assert.equal(rows.status,200);
      const latest=new Map(rows.value.entries.map(file=>[file.path,file.lastCommit.oid]));
      assert.equal(latest.get(unrelated),unrelatedCommit);
      assert.equal(latest.get(partA),v1);
    });
    await chmod(join(work,partA),0o666);await writeFile(join(work,partA),randomBytes(4097));const changedAsset=await asset(45);await saveManifest(changedAsset);const v2=await commit('Change bracket only');
    const comparison=await request(server,'/api/repos/compare-cad/compare?'+new URLSearchParams({base:v1,head:v2,path:assembly}),{cookie});assert.equal(comparison.status,200);const result=comparison.value;
    assert.equal(result.base.oid,v1);assert.equal(result.head.oid,v2);assert.equal(result.previews.base.available,true);assert.equal(result.previews.head.available,true);assert.equal(result.changes.some(c=>c.path===assembly),false);assert.equal(result.changes.find(c=>c.path===partA).dependency,true);assert.equal(result.changes.find(c=>c.path===unrelated).dependency,false);assert.equal(result.components.find(c=>c.id==='Bracket-1').status,'modified');assert.equal(result.components.filter(c=>c.status==='unchanged').length,2);
    assert.equal(result.storage.newNativeBytes,6148);assert.equal(result.storage.newPreviewBytes,684);assert(result.storage.reusedContentBytes>=4096+1368);
    const history=(await request(server,'/api/repos/compare-cad/history?'+new URLSearchParams({ref:v2,path:assembly,scope:'dependencies'}),{cookie})).value;assert(history.commits.some(c=>c.oid===v2&&c.dependencyOnly));assert(!history.commits.some(c=>c.oid===unrelatedCommit));assert(history.commits.some(c=>c.oid===v1));
    const exactOld=await fetch(server.origin+result.previews.base.assets.find(a=>a.path===oldAsset.path).url,{headers:{cookie}});assert.deepEqual(Buffer.from(await exactOld.arrayBuffer()),boxStl(30));
    const exactNew=await fetch(server.origin+result.previews.head.assets.find(a=>a.path===changedAsset.path).url,{headers:{cookie}});assert.deepEqual(Buffer.from(await exactNew.arrayBuffer()),boxStl(45));
    await saveManifest(changedAsset,12);const moved=await commit('Move an existing instance');const moveDiff=(await request(server,'/api/repos/compare-cad/compare?'+new URLSearchParams({base:v2,head:moved,path:assembly}),{cookie})).value;assert.equal(moveDiff.components.find(c=>c.id==='Bracket-1').status,'moved');assert.equal(moveDiff.storage.newNativeBytes,0);assert.equal(moveDiff.storage.newPreviewBytes,0);const movedHistory=(await request(server,'/api/repos/compare-cad/history?'+new URLSearchParams({ref:moved,path:assembly,scope:'dependencies'}),{cookie})).value;assert.equal(movedHistory.commits.find(c=>c.oid===moved).previewOnly,true);assert.equal(movedHistory.commits.find(c=>c.oid===moved).dependencyOnly,false);
    await chmod(join(work,partB),0o666);await writeFile(join(work,partB),randomBytes(2077));const stale=await commit('Change dependency without updating previews');assert.equal((await preview(stale)).reason,'stale');assert.equal((await preview(stale,partA)).available,true);assert.equal((await preview(v1)).available,true);
    await t.test('assembly history records preview re-registration and replacement of a referenced mesh',async()=>{
      await saveManifest(changedAsset,12);
      const renewed=await commit('Register unchanged meshes for the revised wheel');
      assert.equal((await preview(renewed)).available,true);
      await writeFile(join(work,wheelAsset.path),boxStl(22));
      const replaced=await commit('Replace the registered wheel mesh');
      assert.equal((await preview(replaced)).reason,'stale');
      const page=await request(server,'/api/repos/compare-cad/history?'+new URLSearchParams({ref:replaced,path:assembly,scope:'dependencies'}),{cookie});
      assert.equal(page.status,200);
      assert.deepEqual(page.value.commits.slice(0,3).map(c=>[c.oid,c.previewOnly,c.dependencyOnly]),
        [[replaced,true,false],[renewed,true,false],[stale,false,true]]);
    });
    const noAuth=await request(server,'/api/repos/compare-cad/compare?head=main');assert.equal(noAuth.status,401);assert.equal((await request(server,'/api/repos/compare-cad/compare?head=main&path=../escape.SLDPRT',{cookie})).status,400);assert.equal((await request(server,'/api/repos/compare-cad/compare?head=main&path=missing.SLDPRT',{cookie})).status,404);
    t.diagnostic('Changed references appear without rewriting the assembly; unrelated parts reuse previews; instance moves add no mesh; old and new content stays pinned. Browser fixture: '+directory+'; versions '+v1+' / '+v2);
  }finally{await server.stop();}
});


test('repository tree, branch management and version-specific browsing', {timeout:90000}, async function repositoryTreeBranchesTest(t) {
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-tree-branches-'));
  const server=await launch(directory);
  try {
    const setup=await request(server,'/api/setup',{method:'POST',body:{username:'admin',password:'test-only-password'}}),cookie=setup.cookie;
    const repo=(await request(server,'/api/repos',{method:'POST',cookie,body:{name:'tree-branches',initialize:true}})).value;
    const endpoint='/api/repos/tree-branches',filePath='底盘/电池组件/保护板.txt';
    const initial=await request(server,endpoint+'/file',{method:'PUT',cookie,body:{branch:'main',path:filePath,text:'厚度：2 mm',expectedHead:repo.commit.oid}});
    assert.equal(initial.status,200);const baseline=initial.value.oid;
    const query=(route,ref,path='')=>endpoint+'/'+route+'?'+new URLSearchParams({ref,path});
    const tree=await request(server,query('tree','main'),{cookie});
    assert.equal(tree.status,200);assert.equal(tree.value.oid,baseline);assert(tree.value.entries.some(e=>e.path==='底盘'&&e.type==='tree'));assert(!tree.value.entries.some(e=>e.path===filePath));
    const nested=await request(server,query('tree',baseline,'底盘/电池组件'),{cookie});assert.equal(nested.value.entries[0].path,filePath);const originalBlob=nested.value.entries[0].oid;
    const created=await request(server,endpoint+'/branches',{method:'POST',cookie,body:{name:'feature/3mm',from:baseline}});
    assert.equal(created.status,201);assert.equal(created.value.oid,baseline);
    assert.equal((await request(server,endpoint+'/branches',{method:'POST',cookie,body:{name:'feature/3mm',from:baseline}})).status,409);
    for(const invalidName of ['feature/../bad','-bad','HEAD'])assert.equal((await request(server,endpoint+'/branches',{method:'POST',cookie,body:{name:invalidName,from:baseline}})).status,400);
    assert.equal((await request(server,endpoint+'/branches',{method:'POST',cookie,body:{name:'missing-source',from:'absent'}})).status,404);
    const update=await request(server,endpoint+'/file',{method:'PUT',cookie,body:{branch:'feature/3mm',path:filePath,text:'厚度：3 mm',expectedHead:baseline}});
    assert.equal(update.status,200);
    const changed=await request(server,query('browse','feature/3mm',filePath),{cookie});assert.equal(changed.value.oid,update.value.oid);assert.equal(changed.value.file.text,'厚度：3 mm');
    const unchanged=await request(server,query('browse','main',filePath),{cookie});assert.equal(unchanged.value.oid,baseline);assert.equal(unchanged.value.file.text,'厚度：2 mm');
    const oldTree=await request(server,query('tree',baseline,'底盘/电池组件'),{cookie}),newTree=await request(server,query('tree','feature/3mm','底盘/电池组件'),{cookie});
    assert.equal(oldTree.value.entries[0].oid,originalBlob);assert.notEqual(newTree.value.entries[0].oid,originalBlob);
    const onlyPath='新设计/分支独有.txt',add=await request(server,endpoint+'/file',{method:'PUT',cookie,body:{branch:'feature/3mm',path:onlyPath,text:'仅新分支可见',expectedHead:update.value.oid}});
    assert.equal(add.status,200);const head=add.value.oid;
    const missing=await request(server,query('browse','main',onlyPath),{cookie});assert.equal(missing.status,200);assert.equal(missing.value.missing,true);assert.equal(missing.value.ref,'main');assert.equal(missing.value.oid,baseline);assert.equal(missing.value.path,onlyPath);assert.equal(missing.value.file,undefined);
    assert.equal((await request(server,query('browse','missing-branch',filePath),{cookie})).status,404);
    assert.equal((await request(server,query('tree','main','missing-directory'),{cookie})).status,404);
    const overview=await request(server,endpoint+'/branches',{cookie});assert.equal(overview.value.defaultBranch,'main');const feature=overview.value.branches.find(b=>b.name==='feature/3mm');assert.equal(feature.oid,head);assert.equal(feature.author,'admin');assert(feature.date);assert(feature.message);
    const unauthorized=await request(server,endpoint+'/branches',{method:'POST',body:{name:'no-auth',from:baseline}});assert.equal(unauthorized.status,401);
    await request(server,'/api/users',{method:'POST',cookie,body:{username:'reader',password:'test-only-password',role:'reader'}});
    const reader=(await request(server,'/api/login',{method:'POST',body:{username:'reader',password:'test-only-password'}})).cookie;
    assert.equal((await request(server,endpoint+'/branches',{cookie:reader})).status,200);
    assert.equal((await request(server,endpoint+'/branches',{method:'POST',cookie:reader,body:{name:'read-only',from:baseline}})).status,403);
    assert.equal((await request(server,endpoint+'/branches',{method:'DELETE',cookie:reader,body:{name:'feature/3mm',expectedOid:head}})).status,403);
    assert.equal((await request(server,endpoint+'/branches',{method:'POST',cookie,headers:{origin:'http://unrelated.test'},body:{name:'wrong-origin',from:baseline}})).status,403);
    assert.equal((await request(server,endpoint+'/branches',{method:'DELETE',cookie,body:{name:'main',expectedOid:baseline}})).status,409);
    assert.equal((await request(server,endpoint+'/branches',{method:'DELETE',cookie,body:{name:'feature/3mm',expectedOid:baseline}})).status,409);
    assert.equal((await request(server,endpoint+'/branches',{cookie})).value.branches.find(b=>b.name==='feature/3mm').oid,head);
    assert.equal((await request(server,endpoint+'/branches',{method:'DELETE',cookie,body:{name:'feature/3mm',expectedOid:head}})).status,200);
    assert.equal((await request(server,query('browse','feature/3mm',filePath),{cookie})).status,404);
    assert.equal((await request(server,query('browse',head,filePath),{cookie})).value.file.text,'厚度：3 mm');
    t.diagnostic('Lazy Chinese directory trees, branch-isolated content, immutable history, missing paths, branch mutations and reader permissions verified.');
  } finally {await server.stop();}
});


test('repository context resolves CAD ownership across projects without using filenames or shared commits', {timeout:90000}, async t=>{
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-repository-context-'));
  let server=await launch(directory);
  try {
    const setup=await request(server,'/api/setup',{method:'POST',body:{username:'admin',password:'test-only-password'}}),cookie=setup.cookie;
    const token=(await request(server,'/api/tokens',{method:'POST',cookie,body:{name:'Repository context fixture'}})).value.token;
    const create=async name=>{const result=await request(server,'/api/repos',{method:'POST',cookie,body:{name,initialize:false,cad:false}});assert.equal(result.status,201);return result.value;};
    const first=await create('project-a'),second=await create('project-b'),empty=await create('empty-project');
    const remote=name=>server.origin+'/polar-lab/'+name+'.git';
    const git=gitClient('admin',token),work=join(directory,'working-copy'),path='零件/共享支架 #1+.SLDPRT';
    await git(['clone',remote(first.name),work],root);await configure(git,work,'context-fixture');
    await mkdir(join(work,'零件'),{recursive:true});await writeFile(join(work,path),Buffer.from('fixture-only CAD source, no SolidWorks process is used'));
    await git(['add','--all'],work);await git(['commit','-m','Shared assembly fixture'],work);
    await git(['push','origin','HEAD:main'],work);await git(['push',remote(second.name),'HEAD:main'],work);
    const baseline=(await git(['rev-parse','HEAD'],work)).stdout.trim();
    const resolver='/api/repository-context/resolve';
    const resolveContext=(body,options={})=>request(server,resolver,{method:'POST',cookie,body,...options});
    const query=name=>'/api/repos/'+name+'/context?'+new URLSearchParams({ref:'main',path});

    await t.test('same path and identical Git history remain two distinct repositories',async()=>{
      const values=await Promise.all([first,second,first].map(repo=>resolveContext({remotes:[{name:'origin',url:remote(repo.name)}],ref:'main',path})));
      assert.deepEqual(values.map(result=>result.value.repository.id),[first.id,second.id,first.id]);
      for(const result of values){assert.equal(result.status,200);assert.equal(result.value.resolved,true);assert.equal(result.value.matchedBy,'remote');assert.equal(result.value.revision.oid,baseline);assert.equal(result.value.document.path,path);assert.equal(result.value.document.state,'tracked');assert.equal(result.value.permissions.write,true);}
      const direct=await request(server,query(first.name),{cookie});assert.equal(direct.status,200);assert.equal(direct.value.repository.id,first.id);assert.equal(direct.response.headers.get('x-gitpolar-repository-id'),first.id);
      assert.equal((await request(server,'/api/session')).value.capabilities.repositoryContext,true);
    });

    await t.test('new documents, unpublished branches and empty repositories retain known ownership',async()=>{
      const uncommitted=await resolveContext({remotes:[{name:'origin',url:remote(first.name)}],path:'零件/还未提交.SLDPRT'});
      assert.equal(uncommitted.value.repository.id,first.id);assert.equal(uncommitted.value.document.state,'not-in-revision');
      const unpublished=await resolveContext({remotes:[{name:'origin',url:remote(first.name)}],ref:'feature/not-pushed',path});
      assert.equal(unpublished.status,200);assert.equal(unpublished.value.resolved,true);assert.equal(unpublished.value.repository.id,first.id);assert.equal(unpublished.value.revision.available,false);assert.equal(unpublished.value.revision.reason,'ref-not-on-server');assert.equal(unpublished.value.document.state,'revision-unavailable');
      const unborn=await resolveContext({remotes:[{name:'origin',url:remote(empty.name)}],path:'总装.SLDASM'});
      assert.equal(unborn.status,200);assert.equal(unborn.value.repository.id,empty.id);assert.equal(unborn.value.revision.available,false);
    });

    await t.test('multiple remotes require a choice while an explicit binding stays stable',async()=>{
      const remotes=[{name:'origin',url:remote(first.name)},{name:'upstream',url:remote(second.name)}];
      const ambiguous=await resolveContext({remotes});assert.equal(ambiguous.status,409);assert.equal(ambiguous.value.reason,'ambiguous-remotes');assert.equal(ambiguous.value.resolved,false);assert.deepEqual(new Set(ambiguous.value.candidates.map(repo=>repo.id)),new Set([first.id,second.id]));
      const missingOrigin=await resolveContext({remotes:[{name:'origin',url:remote('deleted-project')},remotes[1]]});assert.equal(missingOrigin.status,409);assert.equal(missingOrigin.value.reason,'ambiguous-remotes');assert(missingOrigin.value.remoteChoices.some(choice=>choice.repositoryName==='deleted-project'&&choice.repositoryId===null));
      const preferred=await resolveContext({remotes,preferredRemote:'upstream'});assert.equal(preferred.value.repository.id,second.id);assert.deepEqual(preferred.value.matchedRemotes,['upstream']);
      const pinned=await resolveContext({repositoryId:first.id,remotes});assert.equal(pinned.value.repository.id,first.id);assert.equal(pinned.value.matchedBy,'repository-id');
      const conflict=await resolveContext({repositoryId:first.id,remotes,preferredRemote:'upstream'});assert.equal(conflict.status,409);assert.equal(conflict.value.reason,'identity-conflict');
      const duplicate=await resolveContext({remotes:[{name:'origin',url:remote(first.name)+'/'},{name:'backup',url:remote(first.name).replace(/\.git$/,'')}]});assert.equal(duplicate.status,200);assert.equal(duplicate.value.repository.id,first.id);
      const unknown=await resolveContext({repositoryId:'00000000-0000-0000-0000-000000000000',remotes:[remotes[0]]});assert.equal(unknown.status,404);assert.equal(unknown.value.reason,'repository-id-not-found');
    });

    await t.test('foreign or missing remotes never fall back by document name or commit',async()=>{
      for(const url of ['https://github.com/polar-lab/project-a.git','https://example.invalid/polar-lab/project-a.git',server.origin+'/another-team/project-a.git','git@example.invalid:polar-lab/project-a.git']){
        const result=await resolveContext({remotes:[{name:'origin',url}],ref:baseline,path});assert.equal(result.status,200);assert.equal(result.value.resolved,false);assert.equal(result.value.reason,'foreign-remote');assert.equal(result.value.repository,undefined);
      }
      const absent=await resolveContext({remotes:[{name:'origin',url:remote('absent-project')}],path});assert.equal(absent.status,404);assert.equal(absent.value.reason,'repository-not-found');
      assert.equal((await resolveContext({path})).value.reason,'no-repository-identity');
      for(const body of [[],{remotes:'origin'},{remotes:[{url:remote(first.name)}]},{remotes:[{name:'origin',url:server.origin.replace('://','://user:secret@')+'/polar-lab/project-a.git'}]},{repositoryId:first.id,path:'C:/CAD/plate.SLDPRT'},{repositoryId:first.id,path:'../plate.SLDPRT'},{repositoryId:first.id,path:'零件\\plate.SLDPRT'},{repositoryId:first.id,ref:'-bad'},{remotes:[],preferredRemote:'absent'}]){
        const invalid=await resolveContext(body);assert.equal(invalid.status,400,JSON.stringify(body));
      }
    });

    await t.test('authentication, read-only accounts and identity-pinned writes keep their boundaries',async()=>{
      assert.equal((await request(server,resolver,{method:'POST',body:{repositoryId:first.id}})).status,401);
      assert.equal((await request(server,query(first.name))).status,401);
      await request(server,'/api/users',{method:'POST',cookie,body:{username:'reader',password:'test-only-password',role:'reader'}});
      const reader=(await request(server,'/api/login',{method:'POST',body:{username:'reader',password:'test-only-password'}})).cookie;
      const read=await resolveContext({repositoryId:first.id},{cookie:reader});assert.equal(read.status,200);assert.equal(read.value.permissions.write,false);
      assert.equal((await resolveContext({repositoryId:first.id},{cookie:reader,headers:{origin:'https://other.example'}})).status,403);
      const bearer=await request(server,resolver,{method:'POST',token,body:{repositoryId:first.id},headers:{origin:''}});assert.equal(bearer.status,200);
      const mismatch=await request(server,'/api/repos/'+first.name+'/file',{method:'PUT',cookie,headers:{'X-Gitpolar-Repository-Id':second.id},body:{branch:'main',path:'wrong-project.txt',text:'must not be written',expectedHead:baseline}});assert.equal(mismatch.status,409);
      assert.equal((await request(server,query(first.name),{cookie})).value.revision.oid,baseline);
      assert.equal((await request(server,query(first.name),{cookie,headers:{'X-Gitpolar-Repository-Id':second.id}})).status,409);
      const correct=await request(server,'/api/repos/'+first.name+'/file',{method:'PUT',cookie,headers:{'X-Gitpolar-Repository-Id':first.id},body:{branch:'main',path:'owned.txt',text:'correct repository',expectedHead:baseline}});assert.equal(correct.status,200);
      const unchanged=await request(server,query(second.name),{cookie});assert.equal(unchanged.value.revision.oid,baseline);
      assert.equal((await request(server,query(first.name),{cookie:reader})).status,200);
    });

    await t.test('repository IDs survive a backend restart and a changed server address',async()=>{
      const oldRemote=remote(first.name),oldPort=server.port;await server.stop();let newPort=await portNumber();while(newPort===oldPort)newPort=await portNumber();server=await launch(directory,{PORT:String(newPort)});
      const rebound=await request(server,resolver,{method:'POST',token,body:{repositoryId:first.id,remotes:[{name:'origin',url:oldRemote}],path}});
      assert.equal(rebound.status,200);assert.equal(rebound.value.repository.id,first.id);assert.equal(rebound.value.repository.cloneUrl,remote(first.name));assert.equal(rebound.value.matchedBy,'repository-id');assert.deepEqual(rebound.value.matchedRemotes,[]);
      const byAddress=await request(server,resolver,{method:'POST',token,body:{remotes:[{name:'origin',url:remote(second.name)}],path}});assert.equal(byAddress.value.repository.id,second.id);
    });
    t.diagnostic('Stateless project routing, shared histories, uncommitted CAD paths, unpublished refs, remote ambiguity, pinned writes, reader access and restart persistence verified without SolidWorks.');
  } finally {await server.stop();}
});


test('NAS administration enforces roles and manages real users, repositories, storage and locks', {timeout:60000}, async t => {
  const directory = await mkdtemp(join(tmpdir(),'gitpolar-admin-'));
  let server = await launch(directory,{GITHUB_CLIENT_ID:'admin-test-client',GITHUB_CLIENT_SECRET:'private-oauth-secret-for-admin-test'});
  try {
    const setup = await request(server,'/api/setup',{method:'POST',body:{username:'manager',password:'test-only-password'}});
    const cookie = setup.cookie, managerId = setup.value.user.id;
    for (const path of ['/api/admin/overview','/api/admin/users','/api/admin/repositories','/api/admin/locks']) assert.equal((await request(server,path)).status,401);
    const member = await request(server,'/api/admin/users',{method:'POST',cookie,body:{username:'engineer',password:'test-only-password',name:'机械组员',role:'writer'}});
    assert.equal(member.status,201); const memberId = member.value.user.id;
    const reader = await request(server,'/api/admin/users',{method:'POST',cookie,body:{username:'observer',password:'test-only-password',role:'reader'}});
    assert.equal(reader.status,201);
    const memberLogin = await request(server,'/api/login',{method:'POST',body:{username:'engineer',password:'test-only-password'}});
    const readerLogin = await request(server,'/api/login',{method:'POST',body:{username:'observer',password:'test-only-password'}});
    for (const login of [memberLogin,readerLogin]) {
      for (const path of ['/api/admin/overview','/api/admin/users','/api/admin/repositories','/api/admin/locks']) assert.equal((await request(server,path,{cookie:login.cookie})).status,403);
      assert.equal((await request(server,'/api/admin/users/'+managerId,{method:'PATCH',cookie:login.cookie,body:{role:'reader'}})).status,403);
    }
    assert.equal((await request(server,'/api/admin/users/'+managerId,{method:'PATCH',cookie,body:{role:'writer'}})).status,409);
    assert.equal((await request(server,'/api/admin/users/'+memberId,{method:'PATCH',cookie,body:{role:'owner'}})).status,400);
    assert.equal((await request(server,'/api/admin/users/'+memberId,{method:'PATCH',cookie,body:{github_id:1}})).status,400);
    assert.equal((await request(server,'/api/admin/users/'+memberId,{method:'PATCH',cookie,body:{name:'Cross-site'},headers:{origin:'https://other.example'}})).status,403);
    assert.equal((await request(server,'/api/admin/users',{method:'POST',cookie,body:[]})).status,400);
    const updated = await request(server,'/api/admin/users/'+memberId,{method:'PATCH',cookie,body:{name:'工程师',role:'reader'}});
    assert.equal(updated.status,200); assert.equal(updated.value.user.name,'工程师');
    const memberToken = (await request(server,'/api/tokens',{method:'POST',cookie:memberLogin.cookie,body:{name:'Workstation'}})).value.token;
    assert.equal((await request(server,'/api/repos',{method:'POST',token:memberToken,body:{name:'denied'}})).status,403);
    await request(server,'/api/admin/users/'+memberId,{method:'PATCH',cookie,body:{role:'writer'}});
    const created = await request(server,'/api/repos',{method:'POST',cookie,body:{name:'team-cad',description:'真实 NAS 管理测试',initialize:true}});
    assert.equal(created.status,201);
    const lock = await request(server,'/api/repos/team-cad/locks',{method:'POST',cookie:memberLogin.cookie,body:{path:'README.md',ref:'main'}});
    assert.equal(lock.status,201);
    const locks = await request(server,'/api/admin/locks',{cookie});
    assert.equal(locks.value.locks[0].repositoryName,'team-cad'); assert.equal(locks.value.locks[0].ownerName,'engineer');
    assert.equal((await request(server,'/api/admin/locks/'+lock.value.lock.id,{method:'DELETE',cookie:readerLogin.cookie})).status,403);
    assert.equal((await request(server,'/api/admin/locks/'+lock.value.lock.id,{method:'DELETE',cookie})).status,200);
    assert.equal((await request(server,'/api/admin/locks/'+lock.value.lock.id,{method:'DELETE',cookie})).status,404);
    assert.equal((await request(server,'/api/repos/team-cad/locks',{cookie})).value.locks.length,0);
    const binary = randomBytes(12873), oid = createHash('sha256').update(binary).digest('hex');
    const batch = await fetch(server.origin+'/polar-lab/team-cad.git/info/lfs/objects/batch',{method:'POST',headers:{Authorization:'Bearer '+memberToken,'Content-Type':'application/json'},body:JSON.stringify({operation:'upload',objects:[{oid,size:binary.length}]})});
    assert.equal(batch.status,200);const uploaded = await fetch((await batch.json()).objects[0].actions.upload.href,{method:'PUT',headers:{Authorization:'Bearer '+memberToken},body:binary});assert.equal(uploaded.status,200);
    await mkdir(join(directory,'storage','repositories','polar-lab','broken-cad.git'),{recursive:true});
    assert.equal((await request(server,'/api/repos',{method:'POST',cookie,body:{name:'broken-cad'}})).status,500);
    const report = await request(server,'/api/admin/overview?refresh=1',{cookie});
    assert.equal(report.status,200);assert.equal(report.value.service.name,'gitpolar');assert.equal(report.value.counts.repositories,2);assert.equal(report.value.counts.errorRepositories,1);assert.equal(report.value.counts.users,3);
    assert.equal(report.value.storage.lfsBytes,binary.length);assert(report.value.storage.gitBytes>0);assert(report.value.storage.databaseBytes>0);
    assert.equal(report.value.storage.totalBytes,report.value.storage.gitBytes+report.value.storage.lfsBytes+report.value.storage.databaseBytes+report.value.storage.otherBytes);
    assert.equal(report.value.deployment.githubConfigured,true);assert.equal(report.value.deployment.origin,server.origin);
    assert(!JSON.stringify(report.value).includes('private-oauth-secret-for-admin-test'));
    const repos = await request(server,'/api/admin/repositories?refresh=1',{cookie});
    const ready = repos.value.repositories.find(repo=>repo.name==='team-cad');
    assert.equal(ready.lfsBytes,binary.length);assert.equal(ready.lfsObjects,1);assert.equal(ready.branchCount,1);assert.equal(ready.defaultBranch,'main');assert.match(ready.cloneUrl,/team-cad.git$/);
    assert.equal(repos.value.repositories.find(repo=>repo.name==='broken-cad').status,'error');
    const users = await request(server,'/api/admin/users',{cookie});
    assert(users.value.users.every(user=>!('password_hash' in user)&&!('hash' in user)&&!('password' in user)));
    assert.equal(users.value.users.find(user=>user.id===memberId).tokens,1);
    assert.equal((await request(server,'/api/admin/users/'+memberId+'/password',{method:'POST',cookie,body:{password:'short'}})).status,400);
    assert.equal((await request(server,'/api/admin/users/'+memberId+'/password',{method:'POST',cookie,body:{password:'replacement-password'}})).status,200);
    assert.equal((await request(server,'/api/repos',{token:memberToken})).status,401);
    assert.equal((await request(server,'/api/session',{cookie:memberLogin.cookie})).value.user,null);
    assert.equal((await request(server,'/api/login',{method:'POST',body:{username:'engineer',password:'test-only-password'}})).status,401);
    const freshLogin = await request(server,'/api/login',{method:'POST',body:{username:'engineer',password:'replacement-password'}});assert.equal(freshLogin.status,200);
    const freshToken = (await request(server,'/api/tokens',{method:'POST',cookie:freshLogin.cookie,body:{name:'Reissued'}})).value.token;
    assert.equal((await request(server,'/api/admin/users/'+memberId+'/credentials',{method:'DELETE',cookie})).status,200);
    assert.equal((await request(server,'/api/repos',{token:freshToken})).status,401);
    assert.equal((await request(server,'/api/session',{cookie:freshLogin.cookie})).value.user,null);
    const second = await request(server,'/api/admin/users',{method:'POST',cookie,body:{username:'co-manager',password:'test-only-password',role:'admin'}});
    const race = await Promise.all([managerId,second.value.user.id].map(id=>request(server,'/api/admin/users/'+id,{method:'PATCH',cookie,body:{role:'writer'}})));
    assert(race.some(result=>result.status===200));assert(race.some(result=>[403,409].includes(result.status)));
    const allNames = ['manager','co-manager']; let finalAdmin;
    for(const username of allNames) {const login=await request(server,'/api/login',{method:'POST',body:{username,password:'test-only-password'}});if(login.value.user.role==='admin')finalAdmin={username,cookie:login.cookie};}
    assert(finalAdmin);assert.equal((await request(server,'/api/admin/overview',{cookie:finalAdmin.cookie})).value.counts.admins,1);
    await server.stop();server=await launch(directory);
    const after = await request(server,'/api/login',{method:'POST',body:{username:finalAdmin.username,password:'test-only-password'}});
    assert.equal((await request(server,'/api/admin/overview',{cookie:after.cookie})).value.counts.users,4);
    assert.equal((await request(server,'/api/admin/users',{cookie:after.cookie})).value.users.find(user=>user.id===memberId).name,'工程师');
    t.diagnostic('Real Git/LFS bytes, failed repository records, role changes, revocation and final administrator protection survived restart.');
  } finally { await server.stop(); }
});


test('Git/LFS require access tokens and recover an incomplete object after an incorrect size declaration', {timeout: 30000}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gitpolar-lfs-retry-'));
  const server = await launch(directory);
  try {
    const setup = await request(server, '/api/setup', {method: 'POST', body: {username: 'manager', password: 'test-only-password'}});
    const cookie = setup.cookie;
    const issued = await request(server, '/api/tokens', {method: 'POST', cookie, body: {name: 'LFS retry regression'}});
    const token = issued.value.token;
    const created = await request(server, '/api/repos', {method: 'POST', cookie, body: {name: 'retry-case', initialize: true}});
    assert.equal(created.status, 201);
    const base = '/polar-lab/retry-case.git', batch = base + '/info/lfs/objects/batch';
    for (const options of [{}, {cookie}]) {
      assert.equal((await request(server, base + '/info/refs?service=git-upload-pack', options)).status, 401);
      assert.equal((await request(server, batch, {...options, method: 'POST', body: {operation: 'upload', objects: []}})).status, 401);
    }
    assert.equal((await request(server, base + '/info/refs?service=git-upload-pack', {token})).status, 200);
    const bytes = Buffer.from('Gitpolar LFS correction regression');
    const oid = createHash('sha256').update(bytes).digest('hex');
    const describe = (size, operation = 'upload') => request(server, batch, {method: 'POST', token, body: {operation, objects: [{oid, size}]}});
    assert.ok((await describe(bytes.length + 3)).value.objects[0].actions.upload);
    const corrected = await describe(bytes.length);
    assert.ok(corrected.value.objects[0].actions?.upload, JSON.stringify(corrected.value));

    // Hold the transfer after its metadata has been read, then race another incorrect declaration.
    let finishUpload;
    const uploadDone = new Promise((done, reject) => {
      const upload = httpRequest(server.origin + base + '/info/lfs/objects/' + oid, {method: 'PUT', headers: {Authorization: 'Bearer ' + token}}, res => {
        res.resume(); res.on('end', () => done(res.statusCode));
      });
      upload.on('error', reject); upload.flushHeaders(); finishUpload = () => upload.end(bytes);
    });
    const objectDirectory = join(directory, 'storage', 'lfs', created.value.id, oid.slice(0, 2), oid.slice(2, 4));
    const deadline = Date.now() + 5000;
    for (;;) {
      if ((await readdir(objectDirectory).catch(() => [])).some(name => name.endsWith('.upload'))) break;
      if (Date.now() > deadline) assert.fail('LFS transfer never opened its temporary object');
      await wait(10);
    }
    await describe(bytes.length + 7);
    finishUpload();
    assert.equal(await uploadDone, 200);
    const available = await describe(bytes.length, 'download');
    assert.ok(available.value.objects[0].actions?.download, JSON.stringify(available.value));
    const downloaded = await fetch(server.origin + base + '/info/lfs/objects/' + oid, {headers: {Authorization: 'Bearer ' + token}});
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), bytes);
    assert.equal((await describe(bytes.length + 1)).value.objects[0].error.code, 422);
    const tokens = await request(server, '/api/tokens', {cookie});
    const tokenRecord = tokens.value.tokens.find(row => row.name === 'LFS retry regression');
    assert.ok(tokenRecord);
    assert.equal((await request(server, '/api/tokens/' + tokenRecord.id, {method: 'DELETE', cookie})).status, 204);
    assert.equal((await request(server, base + '/info/refs?service=git-upload-pack', {token})).status, 401);
  } finally { await server.stop(); }
});

test('two workers safely migrate legacy sessions and cannot demote the final administrator', {timeout: 30000}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gitpolar-admin-race-'));
  await mkdir(join(directory, 'storage'));
  const legacy = new DatabaseSync(join(directory, 'storage', 'gitpolar.sqlite'));
  legacy.exec('CREATE TABLE sessions(hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL)');
  legacy.close();
  const workers = [];
  try {
    await Promise.all([launch(directory), launch(directory)].map(async pending => { const server = await pending; workers.push(server); }));
    const [a, b] = workers;
    const db = new DatabaseSync(join(directory, 'storage', 'gitpolar.sqlite'));
    try { assert.equal(db.prepare('PRAGMA table_info(sessions)').all().filter(row => row.name === 'provider').length, 1); } finally { db.close(); }
    const first = await request(a, '/api/setup', {method: 'POST', body: {username: 'firstadmin', password: 'test-only-password'}});
    const second = await request(a, '/api/admin/users', {method: 'POST', cookie: first.cookie, body: {username: 'secondadmin', password: 'test-only-password', role: 'admin'}});
    assert.equal(second.status, 201);
    const login = await request(b, '/api/login', {method: 'POST', body: {username: 'secondadmin', password: 'test-only-password'}});
    const users = [{server: a, id: first.value.user.id, cookie: first.cookie}, {server: b, id: second.value.user.id, cookie: login.cookie}];
    for (let round = 0; round < 4; round++) {
      const results = await Promise.all(users.map(user => request(user.server, '/api/admin/users/' + user.id,
        {method: 'PATCH', cookie: user.cookie, body: {role: 'writer'}})));
      assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
      const survivor = users[results.findIndex(result => result.status === 409)];
      const members = await request(survivor.server, '/api/admin/users', {cookie: survivor.cookie});
      assert.equal(members.value.users.filter(user => user.role === 'admin').length, 1);
      for (const user of users) assert.equal((await request(survivor.server, '/api/admin/users/' + user.id,
        {method: 'PATCH', cookie: survivor.cookie, body: {role: 'admin'}})).status, 200);
    }
  } finally { await Promise.all(workers.map(server => server.stop())); }
});
