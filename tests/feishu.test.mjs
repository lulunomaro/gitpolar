import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {access,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
import {once} from 'node:events';
const root=fileURLToPath(new URL('../',import.meta.url));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function launch(directory,extra={},mock=false){
  const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  const origin='http://127.0.0.1:'+port;
  const preload=join(directory,'mock-fetch.mjs');
  if(mock === true)await writeFile(preload,`const records=new Map();let lostReply=true;
    globalThis.fetch=async(url,options={})=>{
      const address=new URL(url),value=options.body?JSON.parse(options.body):{};
      const response=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
      if(address.href==='https://accounts.feishu.cn/oauth/v3/token')return response({access_token:value.grant_type==='client_credentials'?'app-token':value.code,expires_in:7200});
      if(address.pathname==='/open-apis/authen/v1/user_info'){
        const code=options.headers.Authorization.slice(7);return response({code:0,data:{open_id:'ou_'+code,tenant_key:code==='denied'?'foreign-tenant':'team-tenant',name:'飞书成员'}});
      }
      if(address.pathname.endsWith('/records/search')){
        if(address.pathname.includes('/tables/inventory/'))return response({code:0,data:{items:[{record_id:'rec_stock',fields:{'物料名称':[{text:'M3螺钉'}],'规格型号':'M3×12','单位':'个','库存数量':32,'库位':'A-02'}}],has_more:false}});
        const key=value.filter.conditions[0].value[0];return response({code:0,data:{items:records.has(key)?[{record_id:records.get(key)}]:[]}});
      }
      if(address.pathname.endsWith('/records')){
        const id=value.fields['gitpolar入库ID'];
        if(address.searchParams.get('client_token')!==id)throw new Error('Missing stable idempotency key');
        if(records.has(id))throw new Error('Duplicate external receipt');
        records.set(id,'rec_'+records.size);
        if(lostReply){lostReply=false;throw new Error('Simulated lost network acknowledgement');}
        return response({code:0,data:{record:{record_id:records.get(id)}}});
      }
      throw new Error('Unexpected test network request');
    };`);
  let logs='';const child=spawn(process.execPath,[...(mock?['--import',pathToFileURL(typeof mock === 'string' ? mock : preload).href]:[]),'server.mjs'],{cwd:root,windowsHide:true,env:{...process.env,NODE_ENV:'test',AUTH_PROVIDER:'local',HOST:'127.0.0.1',PORT:String(port),APP_ORIGIN:origin,DATA_DIR:join(directory,'data'),GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:'',FEISHU_APP_ID:'',FEISHU_APP_SECRET:'',FEISHU_WAREHOUSE_AUTO_SYNC:'false',...extra}});
  child.stderr.on('data',chunk=>logs+=chunk);child.stdout.on('data',chunk=>logs+=chunk);
  for(let i=0;i<150;i++){if(child.exitCode!==null)throw new Error(logs);try{if((await fetch(origin+'/api/health')).ok)return{origin,stop:async()=>{if(child.exitCode!==null)return;const stopped=once(child,'exit');child.kill();await stopped;}};}catch{}await pause(30);}
  child.kill();throw new Error('Test server failed: '+logs);
}
async function request(server,path,{cookie,body,method='GET',redirect='manual',headers={}}={}){
  const response=await fetch(server.origin+path,{method,redirect,headers:{Origin:server.origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const text=await response.text();let value;try{value=JSON.parse(text);}catch{value=text;}return{status:response.status,value,cookie:response.headers.get('set-cookie')?.split(';')[0],location:response.headers.get('location')};
}
const configured={FEISHU_APP_ID:'test-feishu-app',FEISHU_APP_SECRET:'test-feishu-private-secret',FEISHU_ALLOWED_TENANTS:'team-tenant',FEISHU_WAREHOUSE_BASE_TOKEN:'base',FEISHU_WAREHOUSE_TABLE_ID:'ledger',FEISHU_INVENTORY_TABLE_ID:'inventory'};
async function loginOAuth(server,code,sessionCookie,link=false){
  const begin=await request(server,'/auth/feishu'+(link?'?link=1':''),{cookie:sessionCookie});assert.equal(begin.status,302);
  const target=new URL(begin.location);assert.equal(target.origin,'https://accounts.feishu.cn');assert.equal(target.searchParams.get('code_challenge_method'),'S256');
  const state=target.searchParams.get('state'),cookie=[begin.cookie,sessionCookie].filter(Boolean).join('; ');
  const end=await request(server,'/auth/feishu/callback?'+new URLSearchParams({code,state}),{cookie});return{...end,state,oauthCookie:cookie};
}

test('Feishu OAuth uses PKCE, identity binding, allowlists and persistent gitpolar accounts',{timeout:45000},async()=>{
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-feishu-'));let server=await launch(directory,{},true);
  try{
    assert.equal((await request(server,'/auth/feishu')).status,503);
    assert.equal((await request(server,'/api/session')).value.feishuLoginUrl,null);
    await server.stop();server=await launch(directory,configured,true);
    const setup=await request(server,'/api/setup',{method:'POST',body:{username:'manager',password:'test-only-password'}});const localCookie=setup.cookie;
    assert.equal((await request(server,'/auth/feishu?link=1')).status,401);
    const denied=await loginOAuth(server,'denied');assert.equal(denied.location,'/?auth=not-allowed');
    const joined=await loginOAuth(server,'member');assert.equal(joined.location,'/procurement/');
    const member=(await request(server,'/api/session',{cookie:joined.cookie})).value.user;assert.equal(member.role,'writer');
    assert.equal((await request(server,'/api/session',{cookie:joined.cookie})).value.feishuLinked,true);
    const replay=await request(server,'/auth/feishu/callback?'+new URLSearchParams({state:joined.state,code:'member'}),{cookie:joined.oauthCookie});assert.equal(replay.location,'/?auth=failed');
    const linked=await loginOAuth(server,'manager',localCookie,true);assert.equal(linked.location,'/procurement/');
    assert.equal((await request(server,'/api/session',{cookie:linked.cookie})).value.user.id,setup.value.user.id);
    const byFeishu=await loginOAuth(server,'manager');assert.equal((await request(server,'/api/session',{cookie:byFeishu.cookie})).value.user.id,setup.value.user.id);
    const conflict=await loginOAuth(server,'manager',joined.cookie,true);assert.equal(conflict.location,'/?auth=identity-conflict');
    assert.equal((await request(server,'/api/admin/users',{cookie:byFeishu.cookie})).value.users.length,2);
    assert.equal((await request(server,'/api/admin/users',{cookie:byFeishu.cookie})).value.users.filter(user=>user.feishuConnected).length,2);
    await server.stop();server=await launch(directory,configured,true);
    const again=await loginOAuth(server,'manager');assert.equal((await request(server,'/api/session',{cookie:again.cookie})).value.user.id,setup.value.user.id);
  }finally{await server.stop();}
});

test('Feishu warehouse retries lost acknowledgements without duplicate receipts and reads remote inventory',{timeout:45000},async()=>{
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-warehouse-'));const server=await launch(directory,configured,true);
  try{
    const setup=await request(server,'/api/setup',{method:'POST',body:{username:'manager',password:'test-only-password'}});const cookie=setup.cookie;
    assert.equal((await request(server,'/api/procurement/feishu/status')).status,401);
    const member=await request(server,'/api/admin/users',{method:'POST',cookie,body:{username:'member',password:'test-only-password',role:'reader'}});assert.equal(member.status,201);
    const memberCookie=(await request(server,'/api/login',{method:'POST',body:{username:'member',password:'test-only-password'}})).cookie;
    assert.equal((await request(server,'/api/procurement/feishu/sync',{method:'POST',cookie:memberCookie})).status,403);
    assert.equal((await request(server,'/api/procurement/feishu/sync',{method:'POST',cookie,headers:{Origin:'https://foreign.example'}})).status,403);
    const created=await request(server,'/api/procurement/requests',{method:'POST',cookie:memberCookie,body:{title:'M3标准件采购',teamId:'mechanical',items:[{kind:'standard',name:'M3螺钉',spec:'M3×12',quantity:5,unit:'个',unitPriceCents:12,url:'https://shop.example/item/1'}]}});assert.equal(created.status,201);
    const id=created.value.request.id;
    for(const action of ['submit','approve','order','receive','stock']){
      const result=await request(server,'/api/procurement/requests/'+id+'/actions',{method:'POST',cookie:['submit','receive'].includes(action)?memberCookie:cookie,body:{action,note:'联调记录',orderReference:'ORDER-TEST',location:'A-02'}});assert.equal(result.status,200,JSON.stringify(result.value));
    }
    const first=await request(server,'/api/procurement/feishu/sync',{method:'POST',cookie});assert.equal(first.status,200);assert.equal(first.value.failed,1);
    const second=await request(server,'/api/procurement/feishu/sync',{method:'POST',cookie});assert.equal(second.value.synced,1);
    const third=await request(server,'/api/procurement/feishu/sync',{method:'POST',cookie});assert.equal(third.value.synced,0);
    const status=await request(server,'/api/procurement/feishu/status',{cookie});assert.equal(status.value.synced,1);assert.equal(status.value.failed,0);assert.equal(status.value.inventoryConfigured,true);
    assert(!JSON.stringify(status.value).includes('test-feishu-private-secret'));
    const inventory=await request(server,'/api/procurement/inventory',{cookie});assert.equal(inventory.value.items[0].quantity,5);assert.equal(inventory.value.receipts[0].feishuStatus,'synced');
    const remote=await request(server,'/api/procurement/feishu/inventory?q=M3',{cookie:memberCookie});assert.equal(remote.value.items[0].quantity,32);assert.equal(remote.value.items[0].name,'M3螺钉');
    assert.equal((await request(server,'/api/procurement/inventory',{cookie})).value.items[0].quantity,5);
  }finally{await server.stop();}
});


test('normal deployment permits only Feishu, rejects legacy sessions and password/GitHub bypasses',{timeout:45000},async()=>{
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-feishu-only-'));
  let server=await launch(directory,{...configured,GITHUB_CLIENT_ID:'legacy-github',GITHUB_CLIENT_SECRET:'legacy-secret'},true);
  try{
    const legacy=await request(server,'/api/setup',{method:'POST',body:{username:'manager',password:'test-only-password'}});
    const unlinked=await request(server,'/api/admin/users',{method:'POST',cookie:legacy.cookie,body:{username:'old-admin',password:'test-only-password',role:'admin'}});
    const oldLogin=await request(server,'/api/login',{method:'POST',body:{username:'old-admin',password:'test-only-password'}});
    const oldToken=(await request(server,'/api/tokens',{method:'POST',cookie:oldLogin.cookie,body:{name:'Old local credentials'}})).value.token;
    const linked=await loginOAuth(server,'manager',legacy.cookie,true);
    assert.equal(linked.location,'/procurement/');
    await server.stop();server=await launch(directory,{...configured,NODE_ENV:'production',AUTH_PROVIDER:'local',GITHUB_CLIENT_ID:'legacy-github',GITHUB_CLIENT_SECRET:'legacy-secret',FEISHU_ADMIN_OPEN_IDS:'ou_designated'},true);
    const metadata=(await request(server,'/api/session')).value;assert.equal(metadata.authProvider,'feishu');assert.equal(metadata.loginUrl,null);assert(metadata.feishuLoginUrl);
    for(const path of ['/api/setup','/api/login'])assert.equal((await request(server,path,{method:'POST',body:{username:'manager',password:'test-only-password'}})).status,403);
    for(const path of ['/auth/github','/auth/github/callback?code=any&state=any'])assert.equal((await request(server,path)).status,403);
    assert.equal((await request(server,'/api/session',{cookie:legacy.cookie})).value.user,null);
    assert.equal((await request(server,'/api/session',{cookie:oldLogin.cookie})).value.user,null);
    assert.equal((await request(server,'/api/repos',{headers:{Authorization:'Bearer '+oldToken}})).status,401);
    assert.equal((await request(server,'/api/admin/overview',{cookie:linked.cookie})).status,200);
    assert.equal((await request(server,'/api/admin/users',{method:'POST',cookie:linked.cookie,body:{username:'hidden-local',password:'test-only-password'}})).status,403);
    assert.equal((await request(server,'/api/users',{method:'POST',cookie:linked.cookie,body:{username:'hidden-local',password:'test-only-password'}})).status,403);
    assert.equal((await request(server,'/api/admin/users/'+legacy.value.user.id+'/password',{method:'POST',cookie:linked.cookie,body:{password:'replacement-password'}})).status,403);
    assert.equal((await request(server,'/api/admin/users/'+legacy.value.user.id,{method:'PATCH',cookie:linked.cookie,body:{role:'writer'}})).status,409);
    const token=(await request(server,'/api/tokens',{method:'POST',cookie:linked.cookie,body:{name:'Feishu Git client'}})).value.token;
    assert.equal((await request(server,'/api/repos',{headers:{Authorization:'Bearer '+token}})).status,200);
    const signIn=await loginOAuth(server,'manager');assert.equal((await request(server,'/api/session',{cookie:signIn.cookie})).value.user.id,legacy.value.user.id);
    const designated=await loginOAuth(server,'designated');assert.equal((await request(server,'/api/session',{cookie:designated.cookie})).value.user.role,'admin');
    assert.equal((await request(server,'/api/procurement/meta',{cookie:signIn.cookie})).value.projectManager,true);
  }finally{await server.stop();}
});


async function warehouseAuditMock() {
  const {readFile, writeFile, access} = await import('node:fs/promises');
  const pause = ms => new Promise(done => setTimeout(done, ms));
  const response = data => new Response(JSON.stringify(data), {headers: {'Content-Type': 'application/json'}});
  globalThis.fetch = async (url, options = {}) => {
    const address = new URL(url), body = options.body ? JSON.parse(options.body) : {};
    if (address.href === 'https://accounts.feishu.cn/oauth/v3/token') return response({access_token: 'audit-bot-token', expires_in: 7200});
    if (address.pathname.endsWith('/records/search')) {
      const id = body.filter.conditions[0].value[0];
      if (process.env.WAREHOUSE_AUDIT_MODE === 'queue') {
        const control = JSON.parse(await readFile(process.env.WAREHOUSE_AUDIT_CONTROL, 'utf8'));
        if (control.failedIds.includes(id)) throw new Error('Fixture receipt is temporarily unavailable');
        return response({code: 0, data: {items: []}});
      }
      if (process.env.WAREHOUSE_AUDIT_MODE === 'late-failure') {
        await writeFile(process.env.WAREHOUSE_AUDIT_READY, id);
        const deadline = Date.now() + 8000;
        for (;;) {
          try { await access(process.env.WAREHOUSE_AUDIT_RELEASE); break; } catch {}
          if (Date.now() > deadline) throw new Error('Fixture synchronization deadline');
          await pause(10);
        }
        throw new Error('Fixture delayed network failure');
      }
      return response({code: 0, data: {items: [{record_id: 'race-existing-record'}]}});
    }
    if (address.pathname.endsWith('/records')) {
      const id = body.fields['gitpolar入库ID'];
      if (address.searchParams.get('client_token') !== id) throw new Error('Missing receipt idempotency key');
      return response({code: 0, data: {record: {record_id: 'audit-' + id}}});
    }
    throw new Error('Unexpected isolated warehouse request');
  };
}

async function stockAuditItems(server, cookie, items) {
  const created = await request(server, '/api/procurement/requests', {method: 'POST', cookie,
    body: {title: '飞书同步异常回归', teamId: 'mechanical', items}});
  assert.equal(created.status, 201, JSON.stringify(created.value));
  const id = created.value.request.id;
  for (const action of ['submit', 'approve', 'order', 'receive', 'stock']) {
    const result = await request(server, '/api/procurement/requests/' + id + '/actions', {method: 'POST', cookie,
      body: {action, orderReference: 'AUDIT-ORDER', location: 'AUDIT-LOC', note: '隔离业务回归'}});
    assert.equal(result.status, 200, JSON.stringify(result.value));
  }
  return id;
}

test('warehouse retries do not starve new receipts behind a full failed batch', {timeout: 20000}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gitpolar-warehouse-queue-'));
  const preload = join(directory, 'audit-mock.mjs'), control = join(directory, 'control.json');
  await writeFile(preload, 'await (' + warehouseAuditMock.toString() + ')();');
  await writeFile(control, JSON.stringify({failedIds: []}));
  const server = await launch(directory, {...configured, WAREHOUSE_AUDIT_MODE: 'queue', WAREHOUSE_AUDIT_CONTROL: control}, preload);
  try {
    const setup = await request(server, '/api/setup', {method: 'POST', body: {username: 'manager', password: 'test-only-password'}});
    const cookie = setup.cookie;
    const item = {kind: 'standard', name: '排队测试', spec: 'M3', unit: '件', quantity: 1, unitPriceCents: 1, url: 'https://shop.example/test'};
    const older = await stockAuditItems(server, cookie, Array.from({length: 20}, (_, i) => ({...item, name: '旧凭证-' + i})));
    const newer = await stockAuditItems(server, cookie, [{...item, name: '新凭证'}]);
    const inventory = await request(server, '/api/procurement/inventory', {cookie});
    const failedIds = inventory.value.receipts.filter(row => row.requestId === older).map(row => row.id);
    assert.equal(failedIds.length, 20);
    await writeFile(control, JSON.stringify({failedIds}));
    const first = await request(server, '/api/procurement/feishu/sync', {method: 'POST', cookie});
    assert.equal(first.value.failed, 20);
    const second = await request(server, '/api/procurement/feishu/sync', {method: 'POST', cookie});
    assert.equal(second.value.synced, 1);
    const final = await request(server, '/api/procurement/inventory', {cookie});
    assert.equal(final.value.receipts.find(row => row.requestId === newer).feishuStatus, 'synced');
    assert.ok(final.value.receipts.filter(row => row.requestId === older).every(row => row.feishuStatus === 'failed'));
  } finally { await server.stop(); }
});

test('a late failed worker cannot downgrade another worker successful warehouse synchronization', {timeout: 20000}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gitpolar-warehouse-race-'));
  const preload = join(directory, 'audit-mock.mjs'), ready = join(directory, 'ready'), release = join(directory, 'release');
  await writeFile(preload, 'await (' + warehouseAuditMock.toString() + ')();');
  const late = await launch(directory, {...configured, WAREHOUSE_AUDIT_MODE: 'late-failure', WAREHOUSE_AUDIT_READY: ready, WAREHOUSE_AUDIT_RELEASE: release}, preload);
  let winner;
  try {
    const setup = await request(late, '/api/setup', {method: 'POST', body: {username: 'manager', password: 'test-only-password'}});
    const cookie = setup.cookie;
    await stockAuditItems(late, cookie, [{kind: 'standard', name: '并发同步', spec: 'M4', unit: '件', quantity: 2, unitPriceCents: 1, url: 'https://shop.example/test'}]);
    winner = await launch(directory, {...configured, WAREHOUSE_AUDIT_MODE: 'winner'}, preload);
    const pending = request(late, '/api/procurement/feishu/sync', {method: 'POST', cookie});
    const deadline = Date.now() + 5000;
    for (;;) { try { await access(ready); break; } catch {} if (Date.now() > deadline) assert.fail('Delayed worker never entered external search'); await pause(10); }
    const success = await request(winner, '/api/procurement/feishu/sync', {method: 'POST', cookie});
    assert.equal(success.value.synced, 1);
    await writeFile(release, 'release');
    const delayed = await pending;
    assert.equal(delayed.value.failed, 0);
    const inventory = await request(late, '/api/procurement/inventory', {cookie});
    assert.equal(inventory.value.receipts[0].feishuStatus, 'synced');
    const status = await request(winner, '/api/procurement/feishu/status', {cookie});
    assert.equal(status.value.synced, 1);
    assert.equal(status.value.failed, 0);
  } finally { await writeFile(release, 'release'); await winner?.stop(); await late.stop(); }
});
