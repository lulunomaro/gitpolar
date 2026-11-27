import test from 'node:test';
import assert from 'node:assert/strict';
import {fork, execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

test('branch/tag browsing distinguishes matching names and contribution years use Shanghai dates', {timeout:45000}, async () => {
  const dir=await mkdtemp(join(tmpdir(),'gitpolar-audit-'));
  const child=fork(new URL('./procurement-fixture.mjs',import.meta.url),[],{env:{...process.env,DATA_DIR:dir,WORKSPACE_NAME:'polar-lab',APP_ORIGIN_ALIASES:'',FEISHU_APP_ID:'',FEISHU_APP_SECRET:'',GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:''},windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
  let errors=''; child.stderr.on('data',b=>errors+=b);child.stdout.resume();
  const origin=await Promise.race([once(child,'message').then(([v])=>v),once(child,'exit').then(()=>{throw Error(errors);})]);
  let cookie='';
  async function call(path,method='GET',body,status=200) {
    const response=await fetch(origin+path,{method,headers:{origin,cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const data=await response.json();assert.equal(response.status,status,path+' '+JSON.stringify(data));
    if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return data;
  }
  try {
    await call('/api/setup','POST',{username:'owner',password:'preset-audit-fixture'},201);
    const repo=await call('/api/repos','POST',{name:'ref-fixture'},201);
    const bare=join(dir,'repositories','polar-lab','ref-fixture.git');
    const git=(args,env={})=>execFileSync('git',['--git-dir='+bare,...args],{encoding:'utf8',windowsHide:true,env:{...process.env,GIT_AUTHOR_NAME:'owner',GIT_AUTHOR_EMAIL:'owner@local',GIT_COMMITTER_NAME:'owner',GIT_COMMITTER_EMAIL:'owner@local',...env}}).trim();
    const initial=git(['rev-parse','main']);
    await call('/api/repos/ref-fixture/file','PUT',{branch:'main',path:'new.txt',text:'new branch content',expectedHead:initial});
    const main=git(['rev-parse','main']);
    await call('/api/repos/ref-fixture/branches','POST',{name:'release',from:main},201);
    git(['tag','release',initial]);git(['tag','-a','v1.0',initial,'-m','First release']);
    const overview=await call('/api/repos/ref-fixture/branches');
    assert.equal(overview.tags.length,2);assert.ok(overview.tags.every(t=>t.oid===initial));
    const branch=await call('/api/repos/ref-fixture/browse?ref=release&path=new.txt');assert.equal(branch.file.text,'new branch content');
    const tag=await call('/api/repos/ref-fixture/browse?ref=refs%2Ftags%2Frelease&path=new.txt');assert.equal(tag.oid,initial);assert.equal(tag.missing,true);
    const version=await call('/api/repos/ref-fixture/browse?ref=refs%2Ftags%2Fv1.0');assert.equal(version.oid,initial);assert.equal(version.commitCount,1);
    assert.equal((await call('/api/repos')).repos[0].tagList.length,2);
    const tree=git(['rev-parse',initial+'^{tree}']);
    for(const [name,date] of [['boundary-start','2025-12-31T18:30:00Z'],['boundary-end','2026-12-31T18:30:00Z']]) {
      const oid=git(['commit-tree',tree,'-m',name],{GIT_AUTHOR_DATE:date,GIT_COMMITTER_DATE:name==='boundary-start'?'2024-01-01T00:00:00Z':date});git(['update-ref','refs/heads/'+name,oid]);
    }
    const db=new DatabaseSync(join(dir,'gitpolar.sqlite'));
    try {
      const owner=db.prepare('SELECT id FROM users WHERE username=?').get('owner').id;
      const insert=db.prepare('INSERT INTO issues(number,repo_id,author_id,title,body,created_at) VALUES(?,?,?,?,?,?)');
      insert.run(99,repo.id,owner,'boundary-issue-start','','2025-12-31T18:30:00.000Z');
      insert.run(100,repo.id,owner,'boundary-issue-end','','2026-12-31T18:30:00.000Z');
    } finally {db.close();}
    const current=await call('/api/profiles/owner?year=2026');
    assert.equal(current.days['2026-01-01'],2);
    assert.ok(current.activity.some(e=>e.message==='boundary-start'));
    assert.ok(!current.activity.some(e=>e.message==='boundary-end'));
    assert.ok(!Object.keys(current.days).some(day=>!day.startsWith('2026-')));
    assert.equal((await call('/api/profiles/owner?year=2027')).days['2027-01-01'],2);
    const font=await fetch(origin+'/assets/fonts/MonaSansVF.woff2');
    assert.equal(font.status,200);assert.equal(Buffer.from(await font.arrayBuffer()).subarray(0,4).toString(),'wOF2');
    for(const path of ['/','/albums/','/procurement/','/admin/']) {
      const response=await fetch(origin+path);assert.match(response.headers.get('content-security-policy'),/font-src 'self'/);
    }
  } finally {
    if(child.exitCode===null){const done=once(child,'exit');child.send('stop');await done;}
    await rm(dir,{recursive:true,force:true});
  }
});
