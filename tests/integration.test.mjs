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
import { inflateRawSync,crc32 } from 'node:zlib';
import { rename } from 'node:fs/promises';
const exec=promisify(execFile);
const root=fileURLToPath(new URL('../',import.meta.url));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function portNumber(){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function launch(data,extra={},imports=[]) {
  const port=Number(extra.PORT)||await portNumber(),origin=`http://127.0.0.1:${port}`;
  let logs='';
  const child=spawn(process.execPath,[...imports,'server.mjs'],{cwd:root,windowsHide:true,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),APP_ORIGIN:origin,DATA_DIR:join(data,'storage'),WORKSPACE_NAME:'polar-lab',GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:'',...extra}});
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
