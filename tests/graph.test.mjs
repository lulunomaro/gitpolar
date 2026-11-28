import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,writeFile,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {layoutGraph} from '../viewer/graph-layout.js';
const exec=promisify(execFile),root=new URL('../',import.meta.url);
const id=number=>number.toString(16).padStart(40,'0');
test('graph lanes preserve fork, merge, octopus and boundary parents',()=>{
  const commits=[{oid:id(9),parents:[id(7),id(8),id(6)]},{oid:id(8),parents:[id(5)]},{oid:id(7),parents:[id(5)]},{oid:id(6),parents:[id(5)]},{oid:id(5),parents:[id(1)]},{oid:id(1),parents:[]}];
  const graph=layoutGraph(commits);assert(graph.width>60);assert.equal(graph.rows.length,6);
  const rows=new Map(graph.rows.map((r,i)=>[r.oid,{...r,index:i}]));
  for(const commit of commits)for(const parent of commit.parents){const edge=graph.segments.find(e=>e.source===commit.oid&&e.target===parent);assert(edge);assert.equal(edge.from,rows.get(commit.oid).lane);const destination=rows.get(parent);assert(destination.index>rows.get(commit.oid).index);assert.equal(edge.to,destination.lane);}
  for(const row of graph.rows)assert(row.x>=0&&row.x<graph.width);
  const prefix=layoutGraph(commits.slice(0,3));assert.deepEqual(prefix.rows,graph.rows.slice(0,3));
});
test('NAS graph exposes real topology, immutable pagination, annotated tags and rename details',{timeout:90000},async t=>{
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-graph-test-'));
  const listener=createServer().listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
  const origin='http://127.0.0.1:'+port;let logs='';
  const child=spawn(process.execPath,['server.mjs'],{cwd:root,windowsHide:true,env:{...process.env,NODE_ENV:'test',AUTH_PROVIDER:'local',HOST:'127.0.0.1',PORT:String(port),APP_ORIGIN:origin,DATA_DIR:join(directory,'data'),WORKSPACE_NAME:'polar-lab',GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:''}});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
  let cookie='';async function request(path,method='GET',body){const response=await fetch(origin+path,{method,headers:{origin,...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const value=await response.json();return {status:response.status,value,cookie:response.headers.get('set-cookie')?.split(';')[0]};}
  try{
    for(let n=0;n<150;n++){try{if((await fetch(origin+'/api/health')).ok)break;}catch{}if(child.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,50));}
    assert.equal((await request('/api/repos/test/graph')).status,401);
    const setup=await request('/api/setup','POST',{username:'graph-admin',password:'graph-test-password'});cookie=setup.cookie;assert(cookie);
    assert.equal((await request('/api/repos','POST',{name:'graph-fixture',initialize:false})).status,201);
    const empty=await request('/api/repos/graph-fixture/graph');assert.deepEqual(empty.value.commits,[]);
    const token=(await request('/api/tokens','POST',{name:'graph-fixture',write:true})).value.token;
    const work=join(directory,'work');await mkdir(work);const auth=Buffer.from('graph-admin:'+token).toString('base64');
    const git=async(...args)=>(await exec('git',['-c','http.proxy=','-c','credential.helper=','-c','http.extraHeader=Authorization: Basic '+auth,...args],{cwd:work,windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0'},maxBuffer:8*1024*1024})).stdout.trim();
    await git('init','--initial-branch=main');await git('config','user.name','Graph Test');await git('config','user.email','graph@test.invalid');
    const original='电池板[左].SLDPRT',renamed='电池保护板[左].SLDPRT';await writeFile(join(work,original),'fixture only, not CAD geometry');await git('add','.');await git('commit','-m','初始图纸');const initial=await git('rev-parse','HEAD');
    for(let n=0;n<101;n++)await git('commit','--allow-empty','-m','设计记录 '+n);
    await git('switch','-c','design/plate');await rename(join(work,original),join(work,renamed));await git('add','-A');await git('commit','-m','重命名电池板');const design=await git('rev-parse','HEAD');
    await git('switch','main');await writeFile(join(work,'assembly-note.md'),'Assembly dependency note');await git('add','.');await git('commit','-m','总装说明');
    await git('merge','--no-ff','design/plate','-m','合并电池板改进');const merged=await git('rev-parse','HEAD');await git('tag','-a','v1.0','-m','Fixture release');
    await git('remote','add','origin',origin+'/polar-lab/graph-fixture.git');await git('push','origin','--all');await git('push','origin','--tags');
    const page=(await request('/api/repos/graph-fixture/graph')).value;assert.equal(page.commits.length,100);assert(page.nextCursor);assert.equal(page.commits[0].oid,merged);assert.equal(page.commits[0].parents.length,2);assert(page.refs.some(r=>r.type==='tag'&&r.name==='v1.0'&&r.oid===merged));
    // Push while paging: next page must still walk the original immutable roots.
    await git('commit','--allow-empty','-m','分页期间的新提交');await git('push','origin','main');const latest=await git('rev-parse','HEAD');
    const next=(await request('/api/repos/graph-fixture/graph?cursor='+encodeURIComponent(page.nextCursor))).value;const all=[...page.commits,...next.commits];assert.equal(new Set(all.map(c=>c.oid)).size,105);assert.equal(all.length,105);assert(all.some(c=>c.oid===initial));assert(!all.some(c=>c.oid===latest));
    const positions=new Map(all.map((c,i)=>[c.oid,i]));for(const commit of all)for(const parent of commit.parents)assert(positions.get(parent)>positions.get(commit.oid));
    const renameInfo=(await request('/api/repos/graph-fixture/commit?ref='+design)).value;assert(renameInfo.files.some(f=>f.status==='R'&&f.path===renamed&&f.previousPath===original));
    const mergeInfo=(await request('/api/repos/graph-fixture/commit?ref='+merged)).value;assert.equal(mergeInfo.parents.length,2);assert(mergeInfo.files.some(f=>f.path===renamed));
    const rootInfo=(await request('/api/repos/graph-fixture/commit?ref='+initial)).value;assert(rootInfo.files.some(f=>f.status==='A'&&f.path===original));
    assert.equal((await request('/api/repos/graph-fixture/graph?cursor=invalid')).status,400);assert.equal((await request('/api/repos/graph-fixture/commit?ref=--all')).status,400);
    const wrongBranch = await request('/api/repos/graph-fixture/graph?ref=design%2Fplate&cursor='+encodeURIComponent(page.nextCursor));
    assert.equal(wrongBranch.status,400);
    const retired = Buffer.from(JSON.stringify({version:1,roots:['f'.repeat(40)],offset:100})).toString('base64url');
    assert.equal((await request('/api/repos/graph-fixture/graph?cursor='+retired)).status,410);
    const scoped=(await request('/api/repos/graph-fixture/graph?ref=design%2Fplate')).value;assert.equal(scoped.commits[0].oid,design);
    t.diagnostic('Actual bare Git fixture includes a divergent branch, merge, annotated tag, Unicode rename and 105 frozen commits. '+directory);
  }finally{if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}}
});
