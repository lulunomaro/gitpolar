import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const root=new URL('../',import.meta.url);
async function checkAssetRevalidation(origin, owner) {
  const url = origin + '/cad-engine.js';
  const get = (method, headers) => fetch(url, {method, headers});
  const plain = await get('GET', {'Accept-Encoding': 'identity'});
  assert.equal(plain.status, 200);
  const source = await readFile(new URL('public/cad-engine.js', root));
  assert.deepEqual(Buffer.from(await plain.arrayBuffer()), source);
  const tag = plain.headers.get('etag');
  assert.ok(tag);
  assert.equal(plain.headers.get('vary'), 'Accept-Encoding');
  assert.equal(plain.headers.get('cache-control'), 'public, no-cache');
  const zipped = await get('GET', {'Accept-Encoding': 'gzip'});
  assert.equal(zipped.headers.get('content-encoding'), 'gzip');
  assert.equal(zipped.headers.get('etag'), tag);
  assert.ok(Number(zipped.headers.get('content-length')) < source.length);
  assert.deepEqual(Buffer.from(await zipped.arrayBuffer()), source);
  const head = await get('HEAD', {'Accept-Encoding': 'gzip'});
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), zipped.headers.get('content-length'));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  const unchanged = await get('GET', {'If-None-Match': '"other", ' + tag, 'Accept-Encoding': 'gzip'});
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.headers.get('etag'), tag);
  assert.equal(unchanged.headers.get('vary'), 'Accept-Encoding');
  assert.equal((await unchanged.arrayBuffer()).byteLength, 0);
  const uncompressed = await get('HEAD', {'Accept-Encoding': '*;q=1, gzip;q=0'});
  assert.equal(uncompressed.headers.get('content-encoding'), null);
  assert.equal(Number(uncompressed.headers.get('content-length')), source.length);
  for (const [cookie, status] of [[owner, 200], ['', 401]]) {
    const response = await fetch(origin + '/api/me/appearance', {headers: {cookie, 'If-None-Match': '*'}});
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('etag'), null);
    await response.arrayBuffer();
  }
}

test('GitHub preset settings, profile edits, real contributions and follows persist per account', {timeout:45000}, async t=>{
 const dir=await mkdtemp(join(tmpdir(),'gitpolar-interface-'));
 const child=fork(new URL('./procurement-fixture.mjs',import.meta.url),[],{env:{...process.env,DATA_DIR:dir,APP_ORIGIN_ALIASES:'',FEISHU_APP_ID:'',FEISHU_APP_SECRET:'',GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:''},windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
 let errors='';child.stderr.on('data',b=>errors+=b);child.stdout.resume();
 const origin=await Promise.race([once(child,'message').then(([v])=>v),once(child,'exit').then(()=>{throw Error(errors);})]);
 async function call(path,cookie='',method='GET',body,status=200,extra={}) {
  const response=await fetch(origin+path,{method,headers:{origin,cookie,...(body?{'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined});
  const json=await response.json();assert.equal(response.status,status,path+' '+JSON.stringify(json));
  if(response.headers.has('set-cookie'))return response.headers.get('set-cookie').split(';')[0];
  return json;
 }
 try {
  await call('/api/me/appearance','','GET',null,401);
  const owner=await call('/api/setup','','POST',{username:'owner',password:'interface-test-password'},201);
  await checkAssetRevalidation(origin, owner);
  await call('/api/users',owner,'POST',{username:'member',password:'interface-test-password',role:'reader'},201);
  const member=await call('/api/login','','POST',{username:'member',password:'interface-test-password'});
  assert.deepEqual(await call('/api/me/appearance',member),{preset:'github',colorMode:'light'});
  await call('/api/me/appearance',member,'PUT',{preset:'workspace',colorMode:'dark'});
  assert.deepEqual(await call('/api/me/appearance',member),{preset:'workspace',colorMode:'dark'});
  assert.deepEqual(await call('/api/me/appearance',owner),{preset:'github',colorMode:'light'});
  await call('/api/me/appearance',member,'PUT',{preset:'bad',colorMode:'dark'},400);
  await call('/api/me/appearance',member,'PUT',{preset:'github',colorMode:'light'},403,{origin:'https://bad.invalid'});
  await call('/api/me/profile',member,'PATCH',{name:'机械组',bio:'CAD, code & photos',location:'实验室',website:'https://example.com/'});
  const profile=await call('/api/profiles/member',owner);assert.equal(profile.name,'机械组');assert.equal(profile.own,false);
  assert.equal((await call('/api/profiles/member',member)).own,true);
  await call('/api/me/profile',member,'PATCH',{website:'javascript:alert(1)'},400);
  await call('/api/profiles/owner?year=bad',member,'GET',null,400);
  await call('/api/profiles/unknown',member,'GET',null,404);
  await call('/api/profiles/owner/follow',member,'PUT');await call('/api/profiles/owner/follow',member,'PUT');
  assert.equal((await call('/api/profiles/owner',owner)).followers,1);
  assert.equal((await call('/api/profiles/owner',member)).isFollowing,true);
  assert.equal((await call('/api/profiles/member',member)).following,1);
  assert.equal((await call('/api/profiles/owner/followers',owner)).users[0].username,'member');
  await call('/api/profiles/member/follow',member,'PUT',null,400);
  const repo=await call('/api/repos',owner,'POST',{name:'robot-cad',description:'机器人设计版本'},201);
  await call('/api/repos/robot-cad/preferences',owner,'POST',{kind:'star',enabled:true});
  await call('/api/me/profile',owner,'PATCH',{pins:['robot-cad']});
  const active=await call('/api/profiles/owner',owner);assert.deepEqual(active.pins,['robot-cad']);assert.deepEqual(active.starred,['robot-cad']);assert.ok(active.total>=1);assert.ok(Object.values(active.days).reduce((a,b)=>a+b,0)>=1);
  await call('/api/me/profile',owner,'PATCH',{pins:['does-not-exist']},400);
  await call('/api/profiles/owner/follow',member,'DELETE');assert.equal((await call('/api/profiles/owner',owner)).followers,0);
  for(const page of ['/','/albums/','/procurement/','/admin/','/login/']) {
   const response=await fetch(origin+page);const html=await response.text();assert.ok(html.includes('/ui/appearance.js'),page);assert.ok(html.includes('/ui/github.css'),page);
  }
  const manifest=await fetch(origin+'/ui/workspace-manifest.json').then(r=>r.json());assert.equal(manifest.id,'workspace');
  for(const file of ['github-app.js','github.css','icons.js','shell.js','motion.js','motion.css'])assert.equal((await fetch(origin+'/ui/'+file)).status,200,file);
 } finally {if(child.exitCode===null){const done=once(child,'exit');child.send('stop');await done;}await rm(dir,{recursive:true,force:true});}
});
