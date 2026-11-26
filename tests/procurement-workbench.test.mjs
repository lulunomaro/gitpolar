import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { zipSync, unzipSync, strToU8 } from 'fflate';

function workbook(rows) {
  const xml = value => String(value ?? '').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'})[c]);
  const sheet = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((value,j)=>'<c r="'+String.fromCharCode(65+j)+(i+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>';
  return zipSync(Object.fromEntries(Object.entries({
    '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="总表" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml':sheet
  }).map(([path,text])=>[path,strToU8(text)])));
}
async function launch(t) {
  const directory=await mkdtemp(join(tmpdir(),'gitpolar-pc-workbench-'));
  const child=fork(new URL('./procurement-fixture.mjs',import.meta.url),[],{execArgv:[],silent:true,windowsHide:true,env:{...process.env,DATA_DIR:directory,FEISHU_APP_ID:'',FEISHU_APP_SECRET:'',GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:''}});
  let errors='';child.stderr.on('data',chunk=>{errors+=chunk;});child.stdout.resume();const exited=once(child,'exit');
  t.after(async()=>{if(child.connected)child.send('stop');await exited;const path=resolve(directory);assert.equal(dirname(path),resolve(tmpdir()));assert.ok(basename(path).startsWith('gitpolar-pc-workbench-'));await rm(path,{recursive:true,force:true});});
  const origin=await Promise.race([once(child,'message').then(([value])=>value),exited.then(()=>{throw new Error(errors);})]);
  async function request(path,{method='GET',who,data,raw}={}) {
    const response=await fetch(origin+path,{method,headers:{Origin:origin,...(who?{Cookie:who.cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):raw});
    return {status:response.status,value:response.headers.get('content-type')?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer()),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  const pc=(path,options)=>request('/api/procurement'+path,options);
  return {request,pc,directory};
}
const expect=(result,status=200)=>{assert.equal(result.status,status,JSON.stringify(result.value));return result.value;};

test('procurement workbench imports whole BOM batches, filters by date/person and exports only authorized rows', {timeout:30000}, async t=>{
  const server=await launch(t),password='workbench-fixture-password';
  const setup=await server.request('/api/setup',{method:'POST',data:{username:'pm',name:'项管',password}});
  const pm={...expect(setup,201).user,cookie:setup.cookie};
  async function member(username,name){const created=expect(await server.request('/api/users',{method:'POST',who:pm,data:{username,name,role:'writer',password}}),201).user;const login=await server.request('/api/login',{method:'POST',data:{username,password}});expect(login);const user={...created,cookie:login.cookie};expect(await server.pc('/assignments',{method:'PUT',who:pm,data:{userId:user.id,teamId:'mechanical',role:'member'}}));return user;}
  const alice=await member('alice','机械 Alice'),bob=await member('bob','电控 Bob'),outsider=await member('outsider','其他组员');
  let imported,modelRequest,bulkRequest,bobRequest;
  await t.test('original BOM column names, ZIP directory categories and same-name STEP/DWG pairs survive import',async()=>{
    const xlsx=workbook([
      ['编号','类别','零件名称','规格 / 尺寸（mm）','数量','对应交付文件','建议制造 / 采购材料'],
      ['A001','cnc','安装板','80×40×5','3','cnc/A001_安装板.step\ncnc/A001_安装板.dwg','6061铝合金'],
      ['D001','碳板','碳板','120×80×3','2','碳板/D001_碳板.dwg','碳纤维板'],
      ['S001','标准件','内六角螺钉','M3×8','30','标准件/S001_内六角螺钉.step','钢']
    ]);
    const zip=zipSync({'底盘BOM.xlsx':xlsx,'cnc/A001_安装板.step':strToU8('ISO-10303-21; original model'),'cnc/A001_安装板.dwg':strToU8('original drawing'),'碳板/D001_碳板.dwg':strToU8('carbon drawing'),'标准件/S001_内六角螺钉.step':strToU8('standard reference model')});
    imported=expect(await server.pc('/imports?name=BOM.zip',{method:'POST',who:alice,raw:zip}),201);
    assert.equal(imported.items.length,3);assert.equal(imported.attachmentCount,4);assert.deepEqual(imported.warnings,[]);assert.equal(imported.items.find(item=>item.name==='内六角螺钉').kind,'standard');assert.ok(imported.items.find(item=>item.name==='内六角螺钉').fileId);
    const plate=imported.items.find(item=>item.name==='安装板');assert.equal(plate.quantity,3);assert.equal(plate.process,'cnc');assert.equal(plate.material,'6061铝合金');assert.ok(plate.fileId);assert.ok(plate.drawingFileId);
    assert.equal(expect(await server.pc('/files/'+plate.fileId,{who:alice})).toString(),'ISO-10303-21; original model');
    assert.equal((await server.pc('/files/'+plate.fileId,{who:bob})).status,404);
    modelRequest=expect(await server.pc('/requests',{method:'POST',who:alice,data:{teamId:'mechanical',title:'11月26日 底盘整包',items:imported.items}}),201).request;
    assert.equal(modelRequest.items.find(item=>item.name==='碳板').fileId,null);
    assert.ok(modelRequest.items.find(item=>item.name==='碳板').drawingFileId);
  });
  await t.test('a pasted 300-row purchase table becomes one draft with exact quantities and decimal prices',async()=>{
    const text='名称\t类别\t规格\t数量\t单位\t单价\t购买链接\n'+Array.from({length:300},(_,i)=>'螺钉 '+i+'\t标准件\tM3×8\t'+(i+1)+'\t件\t0.25\thttps://example.com/item/'+i).join('\n');
    const parsed=expect(await server.pc('/imports?format=paste',{method:'POST',who:alice,data:{text}}),201);
    assert.equal(parsed.items.length,300);assert.equal(parsed.items[257].quantity,258);assert.equal(parsed.items[0].unitPriceCents,25);
    bulkRequest=expect(await server.pc('/requests',{method:'POST',who:alice,data:{teamId:'mechanical',title:'11月26日 标准件批次',items:parsed.items}}),201).request;
    assert.equal(bulkRequest.items.length,300);
    bobRequest=expect(await server.pc('/requests',{method:'POST',who:bob,data:{teamId:'mechanical',title:'Bob 的批次',items:[{kind:'standard',name:'隔离的轴承',spec:'608',quantity:2,unit:'件',unitPriceCents:100}]}}),201).request;
    const db=new DatabaseSync(join(server.directory,'gitpolar.sqlite'));
    try{db.prepare('UPDATE pc_requests SET created_at=?,updated_at=? WHERE id IN (?,?)').run('2026-11-25T17:30:00.000Z','2026-11-26T10:00:00.000Z',modelRequest.id,bulkRequest.id);db.prepare('UPDATE pc_requests SET created_at=?,updated_at=? WHERE id=?').run('2026-11-25T02:00:00.000Z','2026-11-27T10:00:00.000Z',bobRequest.id);}finally{db.close();}
  });
  await t.test('date/person/category drill-down, exact row search and pagination share the request visibility rule',async()=>{
    const all=expect(await server.pc('/workbench?limit=2',{who:pm}));assert.equal(all.total,304);assert.equal(all.items.length,2);assert.ok(all.tree.some(row=>row.date==='2026-11-26'&&row.applicantId===alice.id&&row.itemCount===303));
    const filtered=expect(await server.pc('/workbench?date=2026-11-26&applicant='+alice.id+'&category=cnc',{who:pm}));assert.equal(filtered.total,1);assert.equal(filtered.items[0].name,'安装板');
    const searched=expect(await server.pc('/workbench?q='+encodeURIComponent('螺钉 257'),{who:alice}));assert.equal(searched.total,1);assert.equal(searched.items[0].quantity,258);
    const bobOnly=expect(await server.pc('/workbench',{who:bob}));assert.equal(bobOnly.total,1);assert.ok(bobOnly.tree.every(row=>row.applicantId===bob.id));
    const hidden=expect(await server.pc('/workbench?applicant='+alice.id,{who:outsider}));assert.equal(hidden.total,0);assert.equal(hidden.tree.length,0);
    assert.equal((await server.pc('/workbench?date=2026-02-30',{who:pm})).status,400);
    assert.equal((await server.pc('/workbench?date=2026-99-01',{who:pm})).status,400);
    assert.equal((await server.pc('/workbench')).status,401);
  });
  await t.test('selected delivery exports include BOM and original attachments under date/person directories',async()=>{
    const item=modelRequest.items.find(item=>item.name==='安装板');
    const result=await server.pc('/export',{method:'POST',who:alice,data:{itemIds:[item.id,bulkRequest.items[0].id]}});expect(result);
    const files=unzipSync(result.value),names=Object.keys(files);assert.ok(names.includes('BOM.csv'));assert.ok(names.some(path=>path.startsWith('2026-11-26/机械 Alice/')&&path.endsWith('/A001_安装板.step')));assert.ok(names.some(path=>path.endsWith('/A001_安装板.dwg')));
    const csv=Buffer.from(files['BOM.csv']).toString('utf8');assert.ok(csv.includes('安装板'));assert.ok(csv.includes('螺钉 0'));assert.ok(!csv.includes('隔离的轴承'));
    assert.equal((await server.pc('/export',{method:'POST',who:bob,data:{itemIds:[item.id]}})).status,404);
    assert.equal((await server.pc('/export',{method:'POST',who:alice,data:{itemIds:[item.id,'missing']}})).status,404);
  });
  await t.test('CSV quoting and invalid import quantities produce reviewable results and useful row errors',async()=>{
    const csv='名称,数量,规格,单价\r\n"螺钉,不锈钢",5,"M3\n加长",0.05\r\n';
    const parsed=expect(await server.pc('/imports?name=parts.csv',{method:'POST',who:alice,raw:Buffer.from(csv)}),201);assert.equal(parsed.items[0].name,'螺钉,不锈钢');assert.equal(parsed.items[0].spec,'M3\n加长');assert.equal(parsed.items[0].unitPriceCents,5);
    const bad=await server.pc('/imports?format=paste',{method:'POST',who:alice,data:{text:'名称\t数量\n螺钉\t1.5'}});assert.equal(bad.status,400);assert.match(bad.value.error,/第 2 行/);
    assert.equal((await server.pc('/imports?format=paste',{method:'POST',data:{text:'名称\t数量\n螺钉\t1'}})).status,401);
  });
});
