import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
import { fork, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const exec = promisify(execFile), root = fileURLToPath(new URL('../',import.meta.url));

test('album repositories keep Feishu ownership, original LFS downloads, and immutable branch previews',{timeout:45000},async t => {
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-album-')),data=join(directory,'data');
  const env={...process.env,DATA_DIR:data,WORKSPACE_NAME:'polar-lab',APP_ORIGIN_ALIASES:'',FEISHU_APP_ID:'',FEISHU_APP_SECRET:'',FEISHU_WAREHOUSE_BASE_TOKEN:'',FEISHU_WAREHOUSE_TABLE_ID:'',GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:''};
  const child=fork(new URL('./procurement-fixture.mjs',import.meta.url),[],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
  let logs=''; child.stdout.on('data',c=>logs+=c);child.stderr.on('data',c=>logs+=c);
  const origin=await Promise.race([once(child,'message').then(([value])=>value),once(child,'exit').then(()=>{throw Error(logs);})]);
  let cookie='';
  async function request(path,method='GET',body,headers={}) {
    const r=await fetch(origin+path,{method,headers:{origin,...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
    return {status:r.status,headers:r.headers,bytes:Buffer.from(await r.arrayBuffer())};
  }
  const seed=async code => (await exec(process.execPath,['--input-type=module','-e',code],{cwd:root,env,windowsHide:true,maxBuffer:1024*1024})).stdout.trim();
  try {
    assert.equal((await request('/api/albums')).status,401);
    const setup=await request('/api/setup','POST',{username:'album-admin',password:'album-test-password'});
    cookie=setup.headers.get('set-cookie').split(';')[0];
    const owner=JSON.parse(setup.bytes).user;
    const create=await request('/api/repos','POST',{name:'team-photos',kind:'album',initialize:false});
    assert.equal(create.status,201);const repo=JSON.parse(create.bytes);
    assert.equal(repo.creator.id,owner.id);assert.equal(repo.kind,'album');
    assert.equal((await request('/api/repos','POST',{name:'bad-kind',kind:'arbitrary'})).status,400);
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
    const sha=createHash('sha256').update(png).digest('hex');
    const image='photos/2024.4.12 训练赛/合照.png',photoId='a'.repeat(24),albumId='b'.repeat(24);
    const manifest={version:1,title:'队伍活动相册',importedAt:new Date().toISOString(),albums:[{id:albumId,title:'训练赛',path:'2024.4.12 训练赛',date:'2024-04-12',year:'2024',datePrecision:'day',coverId:photoId}],photos:[{id:photoId,path:image,name:'合照.png',albumId,date:'2024-04-12',dateSource:'folder',year:'2024',width:1,height:1,size:png.length,lfsOid:sha}]};
    const object=join(data,'lfs',repo.id,sha.slice(0,2),sha.slice(2,4),sha);
    await mkdir(join(object,'..'),{recursive:true});await writeFile(object,png);
    const pointer=`version https://git-lfs.github.com/spec/v1\noid sha256:${sha}\nsize ${png.length}\n`;
    const initial=await seed(`
      import {db} from './backend/store.mjs';
      import {git} from './backend/git.mjs';
      const name='team-photos',env={GIT_INDEX_FILE:${JSON.stringify(join(directory,'fixture.index'))},GIT_AUTHOR_NAME:'Album fixture',GIT_AUTHOR_EMAIL:'fixture@test.invalid',GIT_COMMITTER_NAME:'Album fixture',GIT_COMMITTER_EMAIL:'fixture@test.invalid'};
      let records='';
      for(const [path,text] of ${JSON.stringify([['.gitpolar/album.json',JSON.stringify(manifest)],[image,pointer]])}) {
        const oid=(await git(name,['hash-object','-w','--stdin'],{input:text})).trim();records+='100644 '+oid+String.fromCharCode(9)+path+String.fromCharCode(0);
      }
      await git(name,['update-index','-z','--index-info'],{env,input:records});
      const tree=(await git(name,['write-tree'],{env})).trim(),oid=(await git(name,['commit-tree',tree],{env,input:'Import photos'+String.fromCharCode(10)})).trim();
      await git(name,['update-ref','refs/heads/main',oid]);
      db.prepare('INSERT INTO lfs_objects(repo_id,oid,size,complete) VALUES(?,?,?,1)').run(${JSON.stringify(repo.id)},${JSON.stringify(sha)},${png.length});
      db.close(); console.log(oid);
    `);
    const albums=JSON.parse((await request('/api/albums')).bytes);
    assert.equal(albums.repos[0].photoCount,1);assert.equal(albums.repos[0].owner.id,owner.id);
    const view=JSON.parse((await request('/api/repos/team-photos/album')).bytes);
    assert.equal(view.oid,initial);assert.equal(view.photos[0].date,'2024-04-12');assert.equal(view.albums[0].count,1);
    assert.equal(view.photos[0].thumbUrl.includes(initial),true);
    const original=await request(view.photos[0].originalUrl);
    assert.equal(original.status,200);assert.deepEqual(original.bytes,png);assert.equal(original.headers.get('content-type'),'image/png');
    assert.match(original.headers.get('content-disposition'),/^attachment;/);
    assert.match(original.headers.get('cache-control'),/private.*immutable/);
    assert.equal((await request(view.photos[0].originalUrl,'HEAD')).bytes.length,0);
    assert.equal((await request(view.photos[0].originalUrl,'GET',null,{'If-None-Match':original.headers.get('etag')})).status,304);
    assert.equal((await request('/api/repos/team-photos/album/media?id=../secret')).status,400);
    assert.equal((await request('/api/repos/team-photos/album/media?id='+photoId+'&size=../../secret')).status,400);
    assert.equal((await request('/api/repos/team-photos/album/media?id='+'c'.repeat(24))).status,404);
    assert.equal((await request(view.photos[0].thumbUrl)).status,404);
    assert.equal((await request('/api/repos/team-photos/branches','POST',{name:'archive/2024',from:'main'})).status,201);
    const changed=structuredClone(manifest);changed.photos[0].lfsOid='c'.repeat(64);
    assert.equal((await request('/api/repos/team-photos/file','PUT',{branch:'main',path:'.gitpolar/album.json',text:JSON.stringify(changed),expectedHead:initial})).status,200);
    const stale=JSON.parse((await request('/api/repos/team-photos/album')).bytes);
    assert.equal((await request(stale.photos[0].originalUrl)).status,409);
    assert.deepEqual((await request(view.photos[0].originalUrl)).bytes,png);
    const archive=JSON.parse((await request('/api/repos/team-photos/album?ref=archive%2F2024')).bytes);
    assert.equal(archive.oid,initial);assert.deepEqual((await request(archive.photos[0].originalUrl)).bytes,png);
    assert.equal(view.canEdit,true);
    assert.equal((await request('/albums/vendor/serpent-layout.js')).status,200);
    const selectPath='/api/repos/team-photos/album/selection?ref=archive%2F2024';
    const mark={id:photoId,rating:5,tags:['训练',' 队伍 ','训练'],expectedHead:initial};
    assert.equal((await request(selectPath,'PUT',{...mark,rating:7})).status,400);
    const saved=await request(selectPath,'PUT',mark);
    assert.equal(saved.status,200,saved.bytes.toString());
    const newHead=JSON.parse(saved.bytes).oid;
    const curated=JSON.parse((await request('/api/repos/team-photos/album?ref=archive%2F2024')).bytes);
    assert.equal(curated.oid,newHead);assert.notEqual(newHead,initial);
    assert.deepEqual(curated.photos[0].tags,['训练','队伍']);assert.equal(curated.photos[0].rating,5);
    assert.equal((await request(selectPath,'PUT',mark)).status,409);
    assert.equal(JSON.parse((await request(selectPath,'PUT',{...mark,expectedHead:newHead})).bytes).oid,newHead);
    const historical=JSON.parse((await request('/api/repos/team-photos/album?ref='+initial)).bytes);
    assert.equal(historical.canEdit,false);assert.equal(historical.photos[0].rating,0);
    assert.equal((await request('/api/repos/team-photos/album/selection?ref='+initial,'PUT',mark)).status,409);
    const downloadPath='/api/repos/team-photos/album/serpent?ref='+newHead+'&activity='+albumId;
    const archiveFile=await request(downloadPath);
    assert.equal(archiveFile.status,200,archiveFile.bytes.subarray(0,150).toString());
    assert.equal(archiveFile.headers.get('x-gitpolar-commit'),newHead);
    const unpacked=unzipSync(archiveFile.bytes),folder='训练赛.library/',asset=folder+'images/'+photoId+'.info/';
    assert.equal(JSON.parse(Buffer.from(unpacked[folder+'metadata.json'])).folders[0].id,albumId);
    const metadata=JSON.parse(Buffer.from(unpacked[asset+'metadata.json']));
    assert.deepEqual(metadata.tags,['训练','队伍']);assert.equal(metadata.star,5);assert.deepEqual(metadata.folders,[albumId]);
    assert.deepEqual(Buffer.from(unpacked[asset+'合照.png']),png);
    assert.equal((await request('/api/repos/team-photos/album/serpent?activity='+albumId)).status,409);
    assert.equal((await request('/api/repos/team-photos/album/serpent?activity='+'c'.repeat(24))).status,404);
    await seed(`import {db} from './backend/store.mjs';
      db.prepare("UPDATE users SET role='reader' WHERE id=?").run(${Number(owner.id)});
      db.close();`);
    assert.equal(JSON.parse((await request('/api/repos/team-photos/album')).bytes).canEdit,false);
    assert.equal((await request(selectPath,'PUT',{...mark,expectedHead:newHead})).status,403);
    cookie='';assert.equal((await request(downloadPath)).status,401);
    assert.equal((await request(view.photos[0].originalUrl)).status,401);
    t.diagnostic('Actual Git commits, branch refs and original LFS bytes were read through authenticated HTTP.');
  } finally {
    if(child.exitCode===null) { const stopped=once(child,'exit');child.send('stop');await stopped; }
  }
});
