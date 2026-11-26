import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:net';
import {pathToFileURL} from 'node:url';

const exec=promisify(execFile);
test('firmware API uses atomic upstream Git, independent vehicle grants, pinned builds and board readback',{timeout:200000},async t=>{
  const temp=await mkdtemp(join(tmpdir(),'gitpolar-fw-')), remote=join(temp,'origin.git');
  const seed=join(temp,'seed'), cfg=join(temp,'test.gitconfig');
  const upstream='https://gitee.com/example/embedded-fixture.git';
  const cmd=async(...args)=>(await exec('git',args,{cwd:temp,windowsHide:true})).stdout.trim();
  await cmd('init','--bare','--initial-branch=engineer',remote);
  await cmd('init','--initial-branch=engineer',seed);
  for (const dir of ['dji_board','DM_board']) {
    await mkdir(join(seed,dir)); await writeFile(join(seed,dir,'a.c'),'int sample = 1;\n');
  }
  await cmd('-C',seed,'add','.');
  await cmd('-C',seed,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','Baseline');
  await cmd('-C',seed,'push',remote,'engineer');
  const initial=await cmd('-C',seed,'rev-parse','HEAD');
  await cmd('config','--file',cfg,'url.'+pathToFileURL(remote).href+'.insteadOf',upstream);
  const socket=createServer().listen(0,'127.0.0.1');await once(socket,'listening');
  const port=socket.address().port; await new Promise(r=>socket.close(r));
  const origin='http://127.0.0.1:'+port;
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),windowsHide:true,
    env:{...process.env,PORT:String(port),HOST:'127.0.0.1',APP_ORIGIN:origin,DATA_DIR:join(temp,'data'),
      FIRMWARE_GIT_URL:upstream,FIRMWARE_SOURCE_REF:'engineer',GIT_CONFIG_GLOBAL:cfg,GIT_CONFIG_NOSYSTEM:'1',
      FIRMWARE_GIT_TOKEN:'',NODE_ENV:'test',AUTH_PROVIDER:'local'}});
  let logs='';child.stderr.on('data',s=>logs+=s);child.stdout.on('data',s=>logs+=s);
  t.after(async()=>{if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}});
  for(let n=0;n<200;n++) {
    try {if ((await fetch(origin+'/api/health')).ok) break;} catch {}
    if(child.exitCode!==null) assert.fail(logs);
    await new Promise(r=>setTimeout(r,50));
  }
  async function request(path,method,body,cookie,status=200,key) {
    const res=await fetch(origin+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),
      ...(key?{Authorization:'Bearer '+key}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    const data=await res.json(); assert.equal(res.status,status,method+' '+path+' '+JSON.stringify(data)+' '+logs);
    return {data,cookie:res.headers.get('set-cookie')?.split(';')[0]};
  }
  const pwd='firmware-fixture-password';
  const admin=(await request('/api/setup','POST',{username:'admin',password:pwd},null,201)).cookie;
  await request('/api/users','POST',{username:'engineer',password:pwd},admin,201);
  const member=(await request('/api/login','POST',{username:'engineer',password:pwd})).cookie;
  const api=async(path='',method='GET',body=null,user=admin,status=200)=>(await request('/api/firmware'+path,method,body,user,status)).data;
  const ref='teams/engineer/dm', url=s=>encodeURIComponent(s);
  const info=await api(); assert.equal(info.main.oid,null); assert.equal(info.source.oid,initial);
  await api('/initialize','POST',{manager:'engineer',expectedSource:initial},member,403);
  let access=(await api('/initialize','POST',{manager:'engineer',expectedSource:initial})).accessVersion;
  await api('/teams','POST',{id:'main',name:'车组',manager:'engineer',expectedAccess:access},admin,400);
  assert.equal((await api()).groups[0].boards.length,2);
  const team=(await api('/teams','POST',{id:'lab',name:'采集组',manager:'engineer',expectedAccess:access,templateGroup:'engineer'}));
  access=team.accessVersion;
  assert.deepEqual((await api('/files?ref=teams%2Flab%2Fdji')).files,['a.c']);
  await api('/access','PUT',{scope:'main',expectedAccess:access,username:'engineer',role:'manager'},member,403);
  await api('/access','PUT',{scope:'engineer',expectedAccess:access,username:'engineer',role:null},member,409);
  const submit=(branch,old,text,user,status=200)=>api('/commits','POST',{ref:branch,expectedHead:old,message:'Edit source',
    files:[{path:branch==='main'?'DM_board/a.c':'a.c',text}]},user,status);
  await submit(ref,initial,'unpermitted',admin,403);
  await submit('main',initial,'unpermitted',member,403);
  access=(await api('/access','PUT',{scope:'engineer',expectedAccess:access,username:'admin',role:'writer'},member)).accessVersion;
  assert.equal((await api('/access?scope=engineer','GET',null,member)).grants.admin,'writer');
  access=(await api('/access','PUT',{scope:'engineer',expectedAccess:access,username:'admin',role:null},member)).accessVersion;
  const change=(await submit(ref,initial,'int sample = 2;\n',member)).oid;
  await submit(ref,initial,'stale',member,409);
  const xml='<mxfile><diagram name="串口">encoded-data</diagram></mxfile>';
  const draw={ref,path:'图纸/串口.drawio',xml,message:'Record wiring',expectedHead:change};
  const drawn=(await api('/drawio','PUT',draw,member)).oid;
  await api('/drawio','PUT',draw,member,409);
  assert.equal((await api('/drawio?ref='+url(ref)+'&path='+url(draw.path))).xml,xml);
  assert.deepEqual((await api('/files?ref='+url(ref))).files,['a.c',draw.path]);
  const cmp=await api('/compare?baseRef=main&headRef='+url(ref)+'&path=DM_board%2Fa.c');
  assert.match(cmp.patch,/\+int sample = 2/);assert.equal(cmp.mergeable,true);
  await api('/merge','POST',{ref,sourceOid:drawn,mainOid:initial},member,403);
  const merged=await api('/merge','POST',{ref,sourceOid:drawn,mainOid:initial});
  assert.deepEqual(merged.parents,[initial,drawn]);
  assert.equal(await cmd('--git-dir='+remote,'show','main:DM_board/'+draw.path),xml);
  const left=(await submit('main',merged.oid,'int sample = 3;\n',admin)).oid;
  const right=(await submit(ref,drawn,'int sample = 4;\n',member)).oid;
  const conflict=await api('/merge','POST',{ref,sourceOid:right,mainOid:left},admin,409);
  assert.deepEqual(conflict.conflicts,['DM_board/a.c']);
  const history=await api('/history?ref='+url(ref));assert.equal(history.commits[0].oid,right);
  const deleted=(await api('/commits','POST',{ref,expectedHead:right,message:'Remove diagram',files:[{path:draw.path,remove:true}]},member)).oid;
  await api('/drawio?ref='+url(ref)+'&path='+url(draw.path),'GET',null,member,404);

  const station=await api('/stations','POST',{label:'USB bench'},member,201);
  const route='/stations/'+station.id;
  await api(route,'GET',null,admin,404);
  const session=randomUUID(); let batch=0;
  let status={port:'COM8',identity:null};
  const exchange=async(extra={})=>(await request('/api/firmware/station/exchange','POST',
    {session,batch:++batch,status,samples:[],...extra},null,200,station.key)).data;
  await exchange();
  assert.equal((await api(route+'/compare?ref='+url(ref),'GET',null,member)).state,'unknown');
  const job={id:randomUUID(),kind:'build',profile:'fixture',ref,oid:deleted};
  const built=await api(route+'/jobs','POST',job,member,202);
  assert.equal(built.source.oid,deleted);
  const taken=(await exchange()).job; assert.equal(taken.id,job.id);
  const checksum='4'.repeat(64);
  await exchange({completed:{id:job.id,state:'ok',result:{sha256:checksum}}});
  assert.equal((await api(route+'/jobs','POST',job,member,202)).state,'ok');
  await api(route+'/jobs','POST',{...job,id:randomUUID(),kind:'flash',oid:initial,build:job.id},member,409);
  const flashing={...job,id:randomUUID(),kind:'flash',build:job.id};
  await api(route+'/jobs','POST',flashing,member,202);
  assert.equal((await exchange()).job.sha256,checksum);
  await exchange({completed:{id:flashing.id,state:'ok',result:{sha256:checksum}}});
  const verify={flash:flashing.id,outcome:'passed',note:'串口版本实测'};
  await api(route+'/verification','POST',verify,member,409);
  status={port:'COM8',identity:{repository:'gitee.com/example/embedded-fixture',ref,oid:deleted,family:'dm',buildId:randomUUID(),observedAt:Date.now()}};
  await exchange();
  await api(route+'/verification','POST',verify,member,409);
  status.identity.buildId=job.id;
  await exchange({samples:[{type:'fixture'}]});
  const device=await api(route+'/compare?ref=main','GET',null,member);
  assert.equal(device.identity.oid,deleted);assert.deepEqual(device.conflicts,['DM_board/a.c']);
  await api(route+'/verification','POST',verify,member,201);
  assert.equal((await api(route+'/samples','GET',null,member)).samples.length,1);
  const interrupted={...flashing,id:randomUUID()}, queued={...flashing,id:randomUUID()};
  await api(route+'/jobs','POST',interrupted,member,202);
  assert.equal((await exchange()).job.id,interrupted.id);
  await api(route+'/jobs','POST',queued,member,202);
  const db=new DatabaseSync(join(temp,'data','gitpolar.sqlite'));
  db.prepare('UPDATE fw_stations SET seen=1 WHERE id=?').run(station.id);db.close();
  const recovered=await request('/api/firmware/station/exchange','POST',{session:randomUUID(),batch:1,status:{},samples:[]},null,200,station.key);
  assert.equal(recovered.data.job,null);
  assert.equal((await api(route+'/jobs/'+interrupted.id,'GET',null,member)).state,'unknown');
  assert.equal((await api(route+'/jobs/'+queued.id,'GET',null,member)).state,'expired');
  const lab=(await api()).groups.find(g=>g.id==='lab');
  const expectedHeads=Object.fromEntries(lab.boards.map(b=>[b.family,b.oid]));
  await api('/teams','DELETE',{id:'lab',expectedAccess:access,expectedHeads:{...expectedHeads,dm:initial}},admin,409);
  await api('/teams','DELETE',{id:'lab',expectedAccess:access,expectedHeads});
  assert.equal((await api()).groups.length,1);
  assert.equal(await cmd('--git-dir='+remote,'rev-parse','engineer'),initial);
});
