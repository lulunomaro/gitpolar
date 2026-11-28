import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fork } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

// Exercise the real HTTP, Git, SQLite and worker paths; replace only the ML service.
test('album AI scopes results to verified Git pointers, reuses features and resumes after restart', {timeout:40000}, async t => {
  const seen = [], directory = await mkdtemp(join(tmpdir(),'gitpolar-album-ai-'));
  const ml = createServer(async (req,res) => {
    try {
      const form = await new Response(req, {headers:req.headers}).formData();
      const entries = JSON.parse(form.get('entries'));
      let payload;
      if (form.has('text')) {
        assert.equal(entries.clip.textual.options.language,'zh-Hans');
        payload={clip:'[0,1]'};
      } else {
        const type = await form.get('image').text();
        assert.equal(entries.clip.visual.modelName, 'ViT-B-16-SigLIP2__webli');
        assert.equal(entries.ocr.recognition.modelName,'PP-OCRv5_mobile');
        assert.ok(entries['facial-recognition'].detection);
        seen.push(type);
        payload={clip:type==='A'?'[1,0]':'[0,1]',imageWidth:100,imageHeight:80,ocr:{text:[type==='A'?'极地相册':'分支文字']},
          'facial-recognition':[{embedding:'[0,1]',boundingBox:{x1:5,y1:8,x2:50,y2:60},score:.95}]};
      }
      res.end(JSON.stringify(payload));
    } catch(e) {res.writeHead(500).end(e.message);}
  });
  ml.listen(0,'127.0.0.1'); await once(ml,'listening');
  Object.assign(process.env,{DATA_DIR:directory, AUTH_PROVIDER:'local', NODE_ENV:'test', GITPOLAR_IMMICH_URL:`http://127.0.0.1:${ml.address().port}`});
  const {repository,db} = await import('../backend/store.mjs');
  const {git} = await import('../backend/git.mjs');
  async function commitFiles(repo, author, branch, files, message) {
    const env = {GIT_INDEX_FILE:join(directory, randomUUID()+'.index'), GIT_AUTHOR_NAME:author.username,
      GIT_AUTHOR_EMAIL:'fixture@test.invalid', GIT_COMMITTER_NAME:author.username, GIT_COMMITTER_EMAIL:'fixture@test.invalid'};
    const parent = (await git(repo.name,['rev-parse','refs/heads/'+branch])).trim();
    await git(repo.name,['read-tree',parent],{env});
    for (const file of files) {
      const blob = (await git(repo.name,['hash-object','-w','--stdin'],{input:file.text})).trim();
      await git(repo.name,['update-index','--add','--cacheinfo','100644',blob,file.path],{env});
    }
    const tree = (await git(repo.name,['write-tree'],{env})).trim();
    const oid = (await git(repo.name,['commit-tree',tree,'-p',parent],{env,input:message})).trim();
    await git(repo.name,['update-ref','refs/heads/'+branch,oid,parent]);
    return oid;
  }
  let child, origin, cookie;
  async function start() {
    child=fork(new URL('procurement-fixture.mjs',import.meta.url),[],{env:process.env,windowsHide:true,silent:true});
    origin=(await once(child,'message'))[0];
  }
  async function stop() { if (child?.exitCode===null) { const done=once(child,'exit'); child.send('stop'); await done; } }
  t.after(async () => { await stop(); ml.closeAllConnections(); await new Promise(done => ml.close(done)); db.close(); });
  await start();
  const call = (p,method='GET',payload,identity=cookie) => fetch(origin+p,{method,headers:{origin,...(identity?{cookie:identity}:{}),'content-type':'application/json'},body:payload && JSON.stringify(payload)});
  const base='/api/repos/pictures/album/ai/';
  assert.equal((await call(base+'people')).status,401);
  const setup=await call('/api/setup','POST',{username:'owner',password:'album-test-password'});
  const owner=(await setup.json()).user; cookie=setup.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/api/users','POST',{username:'reader',password:'album-test-password',role:'reader'})).status,201);
  const member=(await call('/api/login','POST',{username:'reader',password:'album-test-password'})).headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/api/repos','POST',{name:'pictures',kind:'album'})).status,201);
  const repo=repository('pictures'), folder=join(directory,'album-previews',repo.id), albumId='a'.repeat(24);
  await mkdir(folder,{recursive:true});
  const photo = n => ({id:String(n).repeat(24),albumId,path:`photos/${n}.jpg`,size:1,lfsOid:createHash('sha256').update(n===1?'A':'B').digest('hex')});
  const a=photo(1), b=photo(2);
  const manifest=photos => ({path:'.gitpolar/album.json',text:JSON.stringify({version:1,albums:[{id:albumId,title:'活动',path:'活动'}],photos})});
  const pointer=p => ({path:p.path,text:`version https://git-lfs.github.com/spec/v1\noid sha256:${p.lfsOid}\nsize ${p.size}\n`});
  await writeFile(join(folder,a.lfsOid+'.preview.jpg'),'A');
  const main=await commitFiles(repo,owner,'main',[manifest([a]),pointer(a)],'A');
  await git(repo.name,['update-ref','refs/heads/contribution',main]);
  const branch=await commitFiles(repo,owner,'contribution',[manifest([a,b]),pointer(b)],'new photo');
  const status=async ref => (await call(base+'status?ref='+ref)).json();
  async function ready(ref,n) { for (let i=0;i<100;i++) { if ((await status(ref)).ready===n) return; await wait(80); } assert.fail(JSON.stringify(await status(ref))); }
  assert.equal((await call(base+'index?ref=main','POST',{},member)).status,403);
  assert.equal((await call(base+'index?ref=main','POST',{})).status,202);
  await ready('main',1);
  assert.equal((await status('contribution')).missing,1);
  assert.equal((await call(base+'photo?id='+b.id)).status,404);
  await call(base+'index?ref=contribution','POST',{});
  for(let i=0;i<40 && !(await status('contribution')).error;i++) await wait(80);
  assert.match((await status('contribution')).error,/预览图/);
  await stop(); await writeFile(join(folder,b.lfsOid+'.preview.jpg'),'B');
  // Simulate a retry timer that elapsed while the process was down.
  db.prepare('UPDATE album_ai_assets SET retry_at=0 WHERE oid=?').run(b.lfsOid);
  await start(); await ready(branch,2);
  const search = async (ref,mode,q) => (await (await call(base+'search?'+new URLSearchParams({ref,mode,q}))).json()).ids;
  assert.deepEqual(await search('main','text','分支'),[]);
  assert.deepEqual(await search(branch,'text','分支'),[b.id]);
  assert.deepEqual(await search(branch,'semantic','中文描述'),[b.id,a.id]);
  const groups=async ref => (await (await call(base+'people?ref='+ref)).json()).people;
  const [person]=await groups('main'); assert.deepEqual(person.ids,[a.id]);
  assert.deepEqual((await groups(branch))[0].ids,[a.id,b.id]);
  assert.equal((await call(base+'people/'+person.id,'PATCH',{name:'测试人物'},member)).status,403);
  assert.equal((await call(base+'people/'+person.id,'PATCH',{name:'测试人物'})).status,200);
  assert.equal((await groups(branch))[0].name,'测试人物');
  assert.equal((await (await call(base+'photo?id='+a.id)).json()).faces[0].name,'测试人物');
  const forged=await commitFiles(repo,owner,'contribution',[manifest([{...b,path:a.path}])],'mismatched pointer');
  assert.equal((await status(forged)).failed,1);
  assert.deepEqual(await groups(forged),[]); assert.deepEqual(await search(forged,'text','分支'),[]);
  assert.equal((await call(base+'photo?ref='+forged+'&id='+b.id)).status,404);
  const alias={...a,id:'3'.repeat(24),path:'photos/copy.jpg'};
  await commitFiles(repo,owner,'main',[manifest([a,alias]),pointer(alias)],'duplicate bytes');
  await call(base+'index','POST',{}); await ready('main',2);
  assert.deepEqual((await groups('main'))[0].ids,[a.id,alias.id]);
  assert.deepEqual(seen,['A','B']);
});
