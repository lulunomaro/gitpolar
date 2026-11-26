import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Readable } from 'node:stream';

const password = 'procurement-integration-test-only';
const base = '/api/procurement';
const mechanical = 'mechanical';
const electronics = 'electronics';

async function launch(directory) {
  const child = fork(new URL('./procurement-fixture.mjs', import.meta.url), [], {
    execArgv: [], silent: true, windowsHide: true,
    env: {...process.env, DATA_DIR: directory, WORKSPACE_NAME: 'polar-lab', GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '', FEISHU_APP_ID: '', FEISHU_APP_SECRET: ''}
  });
  let logs = '';
  child.stderr.on('data', chunk => { logs += chunk; });
  child.stdout.resume();
  const exited = once(child, 'exit');
  const origin = await Promise.race([
    once(child, 'message').then(([url]) => url),
    exited.then(([code]) => { throw new Error(`Procurement fixture exited (${code}). ${logs}`); })
  ]);
  return {
    origin,
    checkWarehouse: async id => {
      const result = once(child, 'message');
      child.send({checkWarehouseFor: id});
      return (await result)[0];
    },
    stop: async () => { if (child.connected) child.send('stop'); await exited; }
  };
}

async function http(server, path, {method = 'GET', who, input, raw, headers = {}} = {}) {
  const resp = await fetch(server.origin + path, {
    method, headers: {Origin: server.origin, ...(who && {cookie: who.cookie}),
      ...(input !== undefined && {'Content-Type': 'application/json'}), ...headers},
    body: input !== undefined ? JSON.stringify(input) : raw,
    ...(raw instanceof Readable && {duplex: 'half'})
  });
  const value = resp.headers.get('content-type')?.startsWith('application/json')
    ? await resp.json() : Buffer.from(await resp.arrayBuffer());
  return {status: resp.status, value, headers: resp.headers, cookie: resp.headers.get('set-cookie')?.split(';')[0]};
}

function expect(result, status = 200) {
  assert.equal(result.status, status, JSON.stringify(result.value?.error ?? result.status));
  return result.value;
}

test('procurement from cart to warehouse with real HTTP, sessions, SQLite and streamed files', {timeout: 120_000}, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gitpolar-procurement-'));
  const workers = [];
  let probeHits = 0;
  const probe = createServer((req, res) => { probeHits++; res.writeHead(204).end(); });
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  let auditDb;
  t.after(async () => {
    await Promise.all(workers.map(worker => worker.stop()));
    await new Promise(done => probe.close(done));
    auditDb?.close();
    const path = resolve(directory);
    assert.equal(dirname(path), resolve(tmpdir()));
    assert.ok(basename(path).startsWith('gitpolar-procurement-'));
    await rm(path, {recursive: true, force: true});
  });
  let server = await launch(directory);
  workers.push(server);
  const api = (path, who, options = {}) => http(server, base + path, {who, ...options});
  const get = async (path, who, status = 200) => expect(await api(path, who), status);
  const post = async (path, who, input, status = 200) => expect(await api(path, who, {method: 'POST', input}), status);
  const patch = async (id, who, input, status = 200) => expect(await api(`/requests/${id}`, who, {method: 'PATCH', input}), status);
  const act = async (id, who, action, fields = {}, status = 200) => post(`/requests/${id}/actions`, who, {action, ...fields}, status);
  const assign = async (target, teamId, role, who = pm, status = 200) => expect(await api('/assignments', who, {
    method: 'PUT', input: {userId: target.id, teamId, role}
  }), status);
  const upload = async (who, name, raw, status = 201) => expect(await api(`/files?name=${encodeURIComponent(name)}`, who, {method: 'POST', raw}), status).file;
  const create = async (who, items, fields = {}, status = 201) => post('/requests', who, {
    title: '装配工位采购', teamId: mechanical, items, ...fields
  }, status);
  const account = async (username, name, role) => {
    const created = expect(await http(server, '/api/users', {who: pm, method: 'POST', input: {username, name, role, password}}), 201).user;
    const result = await http(server, '/api/login', {method: 'POST', input: {username, password}});
    expect(result);
    return {...created, cookie: result.cookie};
  };

  const setup = await http(server, '/api/setup', {method: 'POST', input: {username: 'manager', name: '项管', password}});
  const pm = {...expect(setup, 201).user, cookie: setup.cookie};
  const member = await account('member', '机械申请人', 'reader');
  const peer = await account('peer', '同组组员', 'writer');
  const lead = await account('lead', '机械组长', 'reader');
  const otherLead = await account('elead', '电气组长', 'writer');
  const buyer = await account('buyer', '采购员', 'reader');
  const keeper = await account('keeper', '库管', 'reader');
  const shopUrl = `http://127.0.0.1:${probe.address().port}/shop?sku=M3%2A8`;
  const standard = {kind: 'standard', name: '内六角螺钉', spec: 'M3×8', quantity: 10, unit: '颗', unitPriceCents: 25, url: shopUrl};
  const annotation = {meshIndex: 0, faceIndex: 13, thread: 'M3×0.5', depthMm: 5.5, through: false, point: [0, -1.25, 3]};
  const modelBytes = Buffer.from('ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n');
  const drawingBytes = Buffer.from([0x41, 0x43, 0x31, 0x30, 0x33, 0x32, 0x00, 0xff]);
  let model, drawing, machining, requestId, finalRequest;
  auditDb = new DatabaseSync(join(directory, 'gitpolar.sqlite'));
  auditDb.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');

  await t.test('team delegation, fallback membership and Git-independent role checks', async () => {
    for (const path of ['/meta', '/requests', '/inventory']) await get(path, null, 401);
    const initial = await get('/meta', member);
    assert.equal(initial.projectManager, false);
    assert.deepEqual(initial.users, []);
    assert.deepEqual(initial.myRoles, [{teamId: mechanical, role: 'member'}]);
    assert.deepEqual(initial.teams, [{id: mechanical, name: '机械组'}]);
    const team = {id: electronics, name: '电气组'};
    await post('/teams', lead, team, 403);
    assert.deepEqual(await post('/teams', pm, team, 201), {team});
    await post('/teams', pm, team, 409);
    await assign(lead, mechanical, 'lead', member, 403);
    await assign(lead, mechanical, 'lead');
    await assign(otherLead, electronics, 'lead');
    await assign(buyer, electronics, 'buyer');
    await assign(keeper, electronics, 'member');
    await assign(keeper, electronics, 'storekeeper');
    await assign(keeper, electronics, 'projectManager', pm, 400);
    const meta = await get('/meta', pm);
    assert.equal(meta.projectManager, true);
    assert.equal(meta.users.length, 7);
    assert.equal(meta.assignments.filter(a => a.userId === keeper.id).length, 1);
    assert.deepEqual((await get('/meta', keeper)).myRoles, [{teamId: electronics, role: 'storekeeper'}]);
    for (const [who, allowed] of [[pm, true], [keeper, true], [buyer, false], [lead, false], [null, false]]) {
      assert.equal(await server.checkWarehouse(who?.id ?? -1), allowed);
    }
    await create(otherLead, [standard], {}, 403);
    await create(member, [standard], {teamId: electronics}, 403);
    expect(await api('/requests', member, {method: 'POST', input: {title: '跨站请求'}, headers: {origin: 'https://other.invalid'}}), 403);
    const token = expect(await http(server, '/api/tokens', {method: 'POST', who: member, input: {name: 'procurement-test'}}), 201).token;
    const result = expect(await api('/requests', null, {method: 'POST', input: {title: 'Token 草稿', teamId: mechanical, items: [standard]},
      headers: {authorization: `Bearer ${token}`, origin: ''}}), 201);
    assert.equal(result.request.applicantId, member.id);
  });

  await t.test('raw STEP/DWG uploads, file ownership and validated face annotations', async () => {
    await upload(null, 'plate.step', modelBytes, 401);
    await upload(member, '../plate.step', modelBytes, 400);
    await upload(member, '..\\part.STP', modelBytes, 400);
    await upload(member, 'plate.zip', modelBytes, 400);
    await upload(member, 'plate.step', Buffer.alloc(0), 400);
    model = await upload(member, "支撑板 (A's).STEP", modelBytes);
    drawing = await upload(member, '支撑板图.DwG', drawingBytes);
    assert.equal(model.name, "支撑板 (A's).STEP");
    assert.equal(model.size, modelBytes.length);
    assert.equal(model.sha256, createHash('sha256').update(modelBytes).digest('hex'));
    const dir = join(directory, 'procurement', 'files');
    assert.deepEqual((await readdir(dir)).sort(), [model.id, drawing.id].sort());
    assert.deepEqual(await readFile(join(dir, model.id)), modelBytes);
    const downloaded = await http(server, model.url, {who: member});
    assert.deepEqual(expect(downloaded), modelBytes);
    assert.match(downloaded.headers.get('content-disposition'), /attachment; filename\*=UTF-8''.*%27/);
    expect(await http(server, model.url), 401);
    expect(await http(server, model.url, {who: lead}), 404);
    machining = {kind: 'machining', name: '支撑板', spec: 'R2', material: '6061-T6', process: 'CNC',
      quantity: 2, unit: '块', unitPriceCents: 12550, fileId: model.id, drawingFileId: drawing.id, threads: [annotation]};
    const longSpec = '加工要求与孔备注'.repeat(130);
    assert.equal((await create(member, [{...machining, spec: longSpec}])).request.items[0].spec, longSpec);
    await create(peer, [machining], {}, 404);
    await create(member, [{...machining, fileId: null}], {}, 400);
    await create(member, [{...machining, fileId: drawing.id}], {}, 400);
    await create(member, [{...machining, drawingFileId: model.id}], {}, 400);
    for (const threads of [Array(201).fill(annotation), [{...annotation, meshIndex: -1}], [{...annotation, faceIndex: 1.5}],
      [{...annotation, thread: ''}], [{...annotation, through: 'false'}], [{...annotation, depthMm: 0}],
      [{...annotation, point: [0, 1]}], [{...annotation, point: [0, null, 2]}]]) {
      await create(member, [{...machining, threads}], {}, 400);
    }
    await create(member, [], {}, 400);
    for (const fields of [{url: 'javascript:noop'}, {url: 'file:///D:/price'}, {url: '/relative'}, {url: 'https://user:password@example.invalid'},
      {quantity: 0}, {quantity: '3'}, {quantity: 1_000_001}, {quantity: 1.5}, {unitPriceCents: -1}, {unitPriceCents: 0.5},
      {unitPriceCents: Number.MAX_SAFE_INTEGER, quantity: 2}]) {
      await create(member, [{...standard, ...fields}], {}, 400);
    }
    const {request} = await create(member, [standard, machining], {
      applicantId: pm.id, state: 'stocked', createdAt: '1990-01-01', notes: '装配前备料'
    });
    requestId = request.id;
    assert.equal(request.state, 'draft');
    assert.equal(request.applicantId, member.id);
    assert.equal(request.applicantName, member.name);
    assert.notEqual(request.createdAt, '1990-01-01');
    assert.equal(request.itemCount, 2);
    assert.equal(request.totalCents, 25350);
    assert.equal(request.items[0].url, shopUrl);
    assert.deepEqual(request.items[1].threads, [annotation]);
    await create(pm, [machining], {}, 409); // Explicitly privileged uploader access still respects other people's drafts.
    assert.deepEqual(expect(await http(server, model.url, {who: lead})), modelBytes);
    for (const who of [peer, otherLead, buyer, keeper]) {
      await get(`/requests/${requestId}`, who, 404);
      expect(await http(server, drawing.url, {who}), 404);
      assert.ok(!(await get('/requests', who)).requests.some(r => r.id === requestId));
    }
    const found = await get('/requests?q=' + encodeURIComponent('M3×8') + '&state=draft', lead);
    assert.ok(found.requests.some(r => r.id === requestId));
    assert.deepEqual((await get('/requests?mine=1', lead)).requests, []);
    await patch(requestId, lead, {title: '替别人改'}, 403);
    await patch(requestId, member, {teamId: electronics, title: '换组'}, 400);
    await patch(requestId, member, {title: '不应写入', items: [standard, {...standard, quantity: 0}]}, 400);
    const after = (await get(`/requests/${requestId}`, member)).request;
    assert.deepEqual(after, request);
    assert.equal(probeHits, 0);
  });

  await t.test('reject with reason, edit and resubmit, then authorize each handoff', async () => {
    const id = requestId;
    const {request: edited} = await patch(id, member, {title: '十一月工位备料', notes: '支撑板配套螺钉'});
    assert.equal(edited.events.at(-1).action, 'edit');
    await act(id, member, 'approve', {}, 403);
    await act(id, pm, 'stock', {location: 'A-01'}, 409);
    assert.equal((await act(id, member, 'submit')).request.state, 'submitted');
    await act(id, member, 'submit', {}, 409);
    await patch(id, member, {items: [standard]}, 409);
    await act(id, otherLead, 'reject', {note: '跨组'}, 404);
    await act(id, lead, 'reject', {note: '   '}, 400);
    const rejected = (await act(id, lead, 'reject', {note: '请补充通孔规格'})).request;
    assert.equal(rejected.state, 'rejected');
    assert.equal(rejected.events.at(-1).note, '请补充通孔规格');
    assert.equal(rejected.events.at(-1).actorName, lead.name);
    assert.equal(rejected.events.at(-1).adminOverride, false);
    const through = {...annotation, faceIndex: 18, through: true, depthMm: null};
    const revised = {...machining, threads: [annotation, through]};
    const fixed = (await patch(id, member, {items: [standard, revised, {...standard, quantity: 3}]})).request;
    assert.equal(fixed.totalCents, 25425);
    assert.equal(fixed.itemCount, 3);
    assert.deepEqual(fixed.items[1].threads, [annotation, through]);
    await act(id, member, 'submit');
    const approved = (await act(id, lead, 'approve', {note: '批准加工和采购'})).request;
    assert.equal(approved.state, 'approved');
    assert.deepEqual(approved.items, fixed.items);
    for (const who of [buyer, keeper]) {
      assert.deepEqual((await get(`/requests/${id}`, who)).request, approved);
      assert.deepEqual(expect(await http(server, drawing.url, {who})), drawingBytes);
      assert.deepEqual((await get('/requests?state=approved', who)).requests.map(r => r.id), [id]);
    }
    await get(`/requests/${id}`, peer, 404);
    await get(`/requests/${id}`, otherLead, 404);
    await patch(id, pm, {items: [standard]}, 409);
    await patch(id, member, {notes: '修改已批准内容'}, 409);
    await act(id, keeper, 'order', {orderReference: 'wrong'}, 403);
    await act(id, buyer, 'order', {supplier: '供应商'}, 400);
    assert.throws(() => auditDb.prepare('UPDATE pc_items SET quantity=1 WHERE request_id=?').run(id), /immutable/);
    const order = {orderReference: 'PO-LAB-27', trackingNumber: 'TRACK-01', supplier: '测试供应商'};
    const ordered = (await act(id, buyer, 'order', order)).request;
    for (const key of Object.keys(order)) assert.equal(ordered[key], order[key]);
    await act(id, keeper, 'stock', {location: 'A-01'}, 409);
    await act(id, lead, 'receive', {}, 403);
    await act(id, buyer, 'receive', {}, 403);
    assert.equal((await act(id, member, 'receive', {note: '清点齐全'})).request.state, 'received');
    await act(id, member, 'stock', {location: 'A-01'}, 403);
    await act(id, keeper, 'stock', {}, 400);
    assert.deepEqual(await get('/inventory', member), {items: [], receipts: []});
  });

  await t.test('stock and receipt snapshots commit together, with one winner across two servers', async () => {
    const id = requestId;
    // A failing second insert must roll back the first receipt, balance, request state and audit event.
    auditDb.exec(`CREATE TRIGGER test_receipt_failure BEFORE INSERT ON pc_stock_receipts WHEN NEW.kind='machining'
      BEGIN SELECT RAISE(ABORT,'test stock failure'); END`);
    try { await act(id, keeper, 'stock', {location: 'A-01'}, 500); }
    finally { auditDb.exec('DROP TRIGGER test_receipt_failure'); }
    assert.deepEqual(await get('/inventory', peer), {items: [], receipts: []});
    const before = (await get(`/requests/${id}`, member)).request;
    assert.equal(before.state, 'received');
    assert.equal(before.events.at(-1).action, 'receive');
    const second = await launch(directory);
    workers.push(second);
    const attempts = Array.from({length: 8}, (_, idx) => http(idx % 2 ? server : second, `${base}/requests/${id}/actions`, {
      who: keeper, method: 'POST', input: {action: 'stock', location: 'A-01', note: '已放入零件柜'}
    }));
    const answers = await Promise.all(attempts);
    assert.deepEqual(answers.map(v => v.status).sort(), [200, 409, 409, 409, 409, 409, 409, 409]);
    finalRequest = answers.find(answer => answer.status === 200).value.request;
    assert.deepEqual(finalRequest.items, before.items);
    assert.equal(finalRequest.state, 'stocked');
    assert.deepEqual(finalRequest.events.map(event => event.action),
      ['create', 'edit', 'submit', 'reject', 'edit', 'submit', 'approve', 'order', 'receive', 'stock']);
    assert.equal(finalRequest.events.at(-1).actorName, keeper.name);
    assert.ok(finalRequest.events.every(event => !event.adminOverride && Number.isFinite(Date.parse(event.createdAt))));
    const inventory = await get('/inventory', peer);
    assert.equal(inventory.receipts.length, 3);
    assert.equal(new Set(inventory.receipts.map(r => r.id)).size, 3);
    assert.ok(inventory.receipts.every(r => r.requestId === id && r.location === 'A-01' && r.actorName === keeper.name && r.feishuStatus === 'pending'));
    assert.deepEqual(inventory.items.map(i => [i.name, i.spec, i.unit, i.quantity]).sort(),
      [['内六角螺钉', 'M3×8', '颗', 13], ['支撑板', 'R2', '块', 2]].sort());
    const matches = await get('/inventory?q=' + encodeURIComponent('m3×8') + '&kind=standard', otherLead);
    assert.equal(matches.items.length, 1);
    assert.equal(matches.receipts.length, 2);
    assert.equal(matches.items[0].quantity, 13);
    assert.deepEqual(await get('/inventory?q=' + encodeURIComponent('%'), keeper), {items: [], receipts: []});
    assert.deepEqual(auditDb.prepare(`SELECT item_id FROM pc_stock_receipts WHERE request_id=? ORDER BY item_id`).all(id).map(r => r.item_id),
      finalRequest.items.map(i => i.id).sort());
    await act(id, pm, 'stock', {location: 'B-02'}, 409);
    await patch(id, pm, {items: [standard]}, 409);
    assert.throws(() => auditDb.prepare('UPDATE pc_events SET note=? WHERE request_id=?').run('改记录', id), /immutable/);
    assert.throws(() => auditDb.prepare('DELETE FROM pc_events WHERE request_id=?').run(id), /immutable/);
    assert.throws(() => auditDb.prepare('UPDATE pc_stock_receipts SET quantity=1 WHERE request_id=?').run(id), /immutable/);
    const receiptId = inventory.receipts[0].id;
    assert.deepEqual({...auditDb.prepare('SELECT feishu_record_id,feishu_error,feishu_synced_at FROM pc_stock_receipts WHERE id=?').get(receiptId)},
      {feishu_record_id: null, feishu_error: null, feishu_synced_at: null});
    // This is the worker's local DB contract. No Feishu requests are made by this fixture.
    auditDb.prepare("UPDATE pc_stock_receipts SET feishu_status='failed',feishu_error='fixture' WHERE id=?").run(receiptId);
    assert.equal((await get('/inventory', buyer)).receipts.find(r => r.id === receiptId).feishuStatus, 'failed');
    auditDb.prepare("UPDATE pc_stock_receipts SET feishu_status='synced',feishu_record_id='test-record',feishu_error=NULL,feishu_synced_at=? WHERE id=?")
      .run(new Date().toISOString(), receiptId);
    assert.equal((await get('/inventory', buyer)).receipts.find(r => r.id === receiptId).feishuStatus, 'synced');
    assert.equal(probeHits, 0);
  });

  await t.test('self-approval is blocked; manager overrides are explicit and actor-attributed', async () => {
    const {request} = await create(lead, [standard]);
    await act(request.id, lead, 'submit');
    await act(request.id, lead, 'approve', {}, 403);
    await act(request.id, lead, 'reject', {note: '自己退回'}, 403);
    const approved = (await act(request.id, pm, 'approve', {note: '代审组长申请', actorName: '其他用户', adminOverride: false})).request;
    assert.equal(approved.events.at(-1).adminOverride, true);
    assert.equal(approved.events.at(-1).actorName, pm.name);
    await act(request.id, buyer, 'order', {orderReference: 'PO-LAB-28'});
    const received = (await act(request.id, pm, 'receive')).request;
    assert.equal(received.events.at(-1).adminOverride, true);
    await assign(keeper, electronics, 'member');
    assert.equal(await server.checkWarehouse(keeper.id), false);
    await get(`/requests/${request.id}`, keeper, 404);
    await assign(keeper, electronics, 'storekeeper');
    await act(request.id, keeper, 'stock', {location: 'B-02'});
    const found = await get('/inventory?q=' + encodeURIComponent('内六角螺钉'), member);
    assert.deepEqual(found.items.map(i => [i.location, i.quantity]), [['A-01', 13], ['B-02', 10]]);
    const self = (await create(pm, [standard], {teamId: electronics})).request;
    await act(self.id, pm, 'submit');
    assert.equal((await act(self.id, pm, 'approve')).request.events.at(-1).adminOverride, true);
  });

  await t.test('64 MiB streaming boundary including chunked uploads, rejected bodies leave no files', async () => {
    const limit = 64 * 1024 * 1024;
    const chunk = Buffer.alloc(256 * 1024, 0x5a);
    async function* blocks(oversize) {
      for (let size = 0; size < limit; size += chunk.length) yield chunk;
      if (oversize) yield Buffer.from([1]);
    }
    const extra = await upload(member, '模型.stp', Readable.from(blocks(false)));
    assert.equal(extra.size, limit);
    const dir = join(directory, 'procurement', 'files');
    const filenames = (await readdir(dir)).sort();
    await upload(member, 'too-large.step', Readable.from(blocks(true)), 413);
    const declared = await new Promise((done, reject) => {
      const req = httpRequest(server.origin + base + '/files?name=declared.step', {method: 'POST',
        headers: {origin: server.origin, cookie: member.cookie, 'content-length': String(limit + 1)}}, res => {
        res.resume(); done(res.statusCode);
      });
      req.on('error', reject); req.end();
    });
    assert.equal(declared, 413);
    assert.deepEqual((await readdir(dir)).sort(), filenames);
    assert.equal(auditDb.prepare('SELECT COUNT(*) AS n FROM pc_files').get().n, filenames.length);
  });

  await t.test('sessions, roles, attachments, history and stock survive closing both servers', async () => {
    const inventory = await get('/inventory', member);
    const roles = (await get('/meta', keeper)).myRoles;
    await Promise.all(workers.splice(0).map(worker => worker.stop()));
    auditDb.close(); auditDb = undefined;
    server = await launch(directory);
    workers.push(server);
    assert.deepEqual((await get(`/requests/${requestId}`, member)).request, finalRequest);
    assert.deepEqual(await get('/inventory', keeper), inventory);
    assert.deepEqual((await get('/meta', keeper)).myRoles, roles);
    assert.deepEqual(expect(await http(server, model.url, {who: buyer})), modelBytes);
    expect(await http(server, model.url, {who: otherLead}), 404);
    assert.equal(probeHits, 0);
  });
});
