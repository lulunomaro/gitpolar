import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const fixture = new URL('./feishu-cli-fixture.mjs', import.meta.url);
const pause = ms => new Promise(done => setTimeout(done, ms));
const profile = 'NAS 登录 & echo';

async function launch(t, {extra = {}, settings = {}, explicit = false} = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'gitpolar-feishu-cli-'));
  const home = join(directory, 'home');
  const personal = join(home, '.lark-cli');
  const dedicated = join(directory, 'dedicated');
  const data = join(directory, 'data');
  const scenario = join(directory, 'scenario.json'), trace = join(directory, 'trace.ndjson');
  const original = JSON.stringify({currentApp: profile, apps: [{name: profile, appId: 'cli_mock_nas',
    appSecret: {$include: 'keychain-reference'}, brand: 'feishu', users: [{open_id: 'ou_operator', refresh_token: 'personal-token-do-not-copy'}]},
    {name: 'unrelated', appId: 'cli_unrelated', appSecret: 'other-secret', users: [{open_id: 'ou_other'}]}]});
  await mkdir(personal, {recursive: true});
  await mkdir(dedicated, {recursive: true});
  await writeFile(join(personal, 'config.json'), original);
  await writeFile(join(dedicated, 'config.json'), original);
  let current = {...settings};
  await writeFile(scenario, JSON.stringify(current));
  const logs = [];
  const child = fork(fixture, ['--server'], {execArgv: [], silent: true, windowsHide: true, env: {
    ...process.env, NODE_ENV: 'test', AUTH_PROVIDER: 'feishu', DATA_DIR: data, HOME: home, USERPROFILE: home,
    FEISHU_CLI_BIN: fileURLToPath(fixture), FEISHU_CLI_PROFILE: profile, LARKSUITE_CLI_PROFILE: '',
    FEISHU_CLI_CONFIG_DIR: explicit ? dedicated : '', LARKSUITE_CLI_CONFIG_DIR: '',
    FEISHU_APP_ID: '', FEISHU_APP_SECRET: '', FEISHU_ALLOWED_TENANTS: '', FEISHU_ALLOWED_OPEN_IDS: '', FEISHU_ADMIN_OPEN_IDS: '',
    FAKE_FEISHU_SCENARIO: scenario, FAKE_FEISHU_TRACE: trace, ...extra
  }});
  child.stderr.on('data', chunk => logs.push(chunk.toString()));
  child.stdout.on('data', chunk => logs.push(chunk.toString()));
  const exit = once(child, 'exit');
  const origin = await Promise.race([once(child, 'message').then(([url]) => url), exit.then(() => { throw new Error(logs.join('')); })]);
  t.after(async () => {
    if (child.connected) child.send('stop');
    await exit;
    assert.ok(!logs.join('').includes('never-print-this-device-token'));
    assert.ok(!logs.join('').includes('do-not-leak-app-secret'));
  });
  return {
    origin, directory, data, personal, dedicated, original,
    configure: async patch => {
      current = {...current, ...patch};
      await writeFile(scenario + '.next', JSON.stringify(current));
      await rename(scenario + '.next', scenario);
    },
    trace: async () => (await readFile(trace, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
  };
}

async function request(server, path, {cookie, method = 'GET', headers = {}, body} = {}) {
  const response = await fetch(server.origin + path, {method, headers: {Origin: server.origin, ...(cookie ? {Cookie: cookie} : {}),
    ...(body ? {'Content-Type': 'application/json'} : {}), ...headers}, ...(body ? {body: JSON.stringify(body)} : {})});
  return {status: response.status, value: response.headers.get('content-type')?.includes('application/json')
    ? await response.json() : Buffer.from(await response.arrayBuffer()), cookie: response.headers.get('set-cookie')?.split(';')[0],
    headers: response.headers};
}
const cli = (server, path, options) => request(server, '/api/feishu-cli' + path, options);
const start = (server, options = {}) => cli(server, '/start', {method: 'POST', ...options});
const poll = (server, flow, cookie = flow.cookie) => cli(server, '/poll?id=' + flow.value.id, {cookie});
async function untilStatus(server, flow, status) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const result = await poll(server, flow);
    if (result.value.status === status) return result;
    if (['failed', 'expired', 'cancelled'].includes(result.value.status)) assert.equal(result.value.status, status, JSON.stringify(result.value));
    await pause(25);
  }
  assert.fail('Mock CLI authorization did not reach ' + status);
}

function inspect(server, work) {
  const db = new DatabaseSync(join(server.data, 'gitpolar.sqlite'));
  try { return work(db); } finally { db.close(); }
}

test('device flow binds QR and polling to the browser, isolates personal CLI config, and issues one Feishu session', {timeout: 20_000}, async t => {
  const server = await launch(t);
  const status = await cli(server, '/status');
  assert.equal(status.status, 200);
  assert.deepEqual(status.value, {available: true, configured: true, appId: 'cli_mock_nas'});
  assert.equal(status.cookie, undefined);
  assert.ok(!JSON.stringify(status.value).includes('openId'));
  const flow = await start(server);
  assert.equal(flow.status, 200);
  assert.match(flow.cookie, /^gitpolar_feishu_cli_flow=/);
  assert.match(flow.headers.get('set-cookie'), /HttpOnly/);
  assert.match(flow.headers.get('set-cookie'), /SameSite=Lax/);
  assert.equal(flow.value.pollInterval, 2);
  assert.ok(Date.parse(flow.value.expiresAt) > Date.now());
  assert.equal(flow.value.verificationUrl, 'https://accounts.feishu.cn/device?code=opaque%2B%2F&x=a;b');
  assert.deepEqual(Object.keys(flow.value).sort(), ['id', 'verificationUrl', 'qrUrl', 'expiresAt', 'pollInterval'].sort());
  assert.ok(!JSON.stringify(flow.value).includes('device_code'));
  const qr = await request(server, flow.value.qrUrl, {cookie: flow.cookie});
  assert.equal(qr.headers.get('content-type'), 'image/png');
  assert.equal(qr.value.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const anonymous = await poll(server, flow, 'unrelated=other');
  assert.equal(anonymous.status, 404);
  assert.equal(anonymous.cookie, undefined);
  const hiddenQr = await request(server, flow.value.qrUrl);
  assert.equal(hiddenQr.status, 404);
  assert.equal(hiddenQr.cookie, undefined);
  assert.deepEqual((await poll(server, flow)).value, {status: 'pending'});
  assert.equal((await start(server)).status, 409);
  const reused = await start(server, {cookie: flow.cookie});
  assert.deepEqual(reused.value, flow.value);
  assert.equal(reused.cookie, undefined);
  const runtime = JSON.parse(await readFile(join(server.data, 'lark-cli-login', 'config.json'), 'utf8'));
  assert.equal(runtime.apps.length, 1);
  assert.deepEqual(runtime.apps[0].users, []);
  assert.deepEqual(runtime.apps[0].appSecret, {$include: 'keychain-reference'});
  assert.equal(await readFile(join(server.personal, 'config.json'), 'utf8'), server.original);
  assert.ok(!JSON.stringify(runtime).includes('personal-token-do-not-copy'));
  await server.configure({complete: true});
  const authorized = await untilStatus(server, flow, 'authorized');
  assert.match(authorized.cookie, /^gitpolar_session=/);
  const session = await request(server, '/api/session', {cookie: authorized.cookie});
  assert.equal(session.value.user.name, '飞书项管');
  assert.equal(session.value.user.role, 'admin');
  const meta = await request(server, '/api/procurement/meta', {cookie: authorized.cookie});
  assert.equal(meta.status, 200);
  assert.equal(meta.value.projectManager, true);
  assert.equal((await poll(server, flow)).cookie, undefined);
  assert.equal((await poll(server, flow)).value.status, 'authorized');
  inspect(server, db => {
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
    assert.equal(db.prepare('SELECT provider FROM sessions').get().provider, 'feishu');
    assert.equal(db.prepare('SELECT open_id FROM feishu_identities').get().open_id, 'ou_operator');
  });
  const trace = await server.trace();
  assert.ok(trace.every(entry => entry.args.slice(-2).join('|') === '--profile|' + profile));
  assert.ok(trace.filter(entry => entry.args[1] !== 'status').every(entry => entry.configDir === join(server.data, 'lark-cli-login')));
  const qrCall = trace.find(entry => entry.args[1] === 'qrcode');
  assert.equal(qrCall.args[2], flow.value.verificationUrl);
  const verify = trace.find(entry => entry.args[0] === 'api');
  assert.deepEqual(verify.args.slice(0, 5), ['api', 'GET', '/open-apis/authen/v1/user_info', '--as', 'user']);
  assert.deepEqual(await readdir(join(server.data, 'feishu-cli')), []);

  // A later CLI cache change does not change the browser's already issued session.
  await server.configure({complete: false, completedId: 'ou_member', cachedId: 'ou_member', userName: '同队成员'});
  const memberFlow = await start(server);
  assert.equal(memberFlow.status, 200);
  await server.configure({complete: true});
  const memberAuth = await untilStatus(server, memberFlow, 'authorized');
  const memberSession = await request(server, '/api/session', {cookie: memberAuth.cookie});
  assert.equal(memberSession.value.user.role, 'writer');
  assert.notEqual(memberSession.value.user.id, session.value.user.id);
  assert.equal((await request(server, '/api/session', {cookie: authorized.cookie})).value.user.id, session.value.user.id);
  const memberMeta = await request(server, '/api/procurement/meta', {cookie: memberAuth.cookie});
  assert.equal(memberMeta.value.projectManager, false);
  assert.deepEqual(memberMeta.value.myRoles, [{teamId: 'mechanical', role: 'member'}]);
});

test('cross-origin start/cancel and browser cookie substitution are rejected', {timeout: 15_000}, async t => {
  const server = await launch(t, {explicit: true});
  for (const origin of ['', 'https://foreign.invalid']) {
    const result = await start(server, {headers: {origin}});
    assert.equal(result.status, 403);
    assert.equal(result.cookie, undefined);
  }
  const flow = await start(server);
  const url = '/cancel?id=' + flow.value.id;
  assert.equal((await cli(server, url, {method: 'POST', cookie: flow.cookie, headers: {origin: 'https://foreign.invalid'}})).status, 403);
  assert.equal((await cli(server, url, {method: 'POST', cookie: 'gitpolar_feishu_cli_flow=foreign'})).status, 404);
  assert.equal((await poll(server, flow)).value.status, 'pending');
  assert.equal((await cli(server, url, {method: 'POST', cookie: flow.cookie})).status, 200);
  assert.deepEqual((await poll(server, flow)).value, {status: 'cancelled'});
  assert.equal((await poll(server, flow)).cookie, undefined);
  assert.deepEqual(await readdir(join(server.data, 'feishu-cli')), []);
  const restarted = await start(server);
  assert.equal(restarted.status, 200);
  await cli(server, '/cancel?id=' + restarted.value.id, {method: 'POST', cookie: restarted.cookie});
  const trace = await server.trace();
  assert.ok(trace.every(entry => entry.configDir === server.dedicated));
  assert.equal(await readFile(join(server.personal, 'config.json'), 'utf8'), server.original);
});

test('expiration stops the owned completion command and releases the single-flow lock', {timeout: 10_000}, async t => {
  const server = await launch(t, {settings: {expiresIn: 1}});
  const flow = await start(server);
  assert.equal(flow.status, 200);
  const expired = await untilStatus(server, flow, 'expired');
  assert.equal(expired.cookie, undefined);
  await server.configure({expiresIn: 30});
  const next = await start(server);
  assert.equal(next.status, 200);
  await cli(server, '/cancel?id=' + next.value.id, {method: 'POST', cookie: next.cookie});
  inspect(server, db => assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0));
});

test('completion output, exact verified user ID, tenant and allow policy are required; cached login is never a fallback', {timeout: 25_000}, async t => {
  const server = await launch(t);
  for (const settings of [
    {missingIdentity: true},
    {missingIdentity: false, completedId: 'ou_scan', verifiedId: 'ou_cached'},
    {completedId: 'ou_operator', verifiedId: 'ou_operator', tenant: ''},
    {tenant: 'foreign-team', completedId: 'ou_foreign', verifiedId: 'ou_foreign'},
    {tenant: 'nas-team', completedId: 'ou_operator', verifiedId: 'ou_operator', failCommand: true}
  ]) {
    await server.configure({...settings, complete: false});
    const flow = await start(server);
    assert.equal(flow.status, 200);
    await server.configure({complete: true});
    const result = await untilStatus(server, flow, 'failed');
    assert.equal(result.cookie, undefined);
    assert.ok(!JSON.stringify(result.value).includes('private-device'));
    assert.ok(!JSON.stringify(result.value).includes('ou_cached'));
    inspect(server, db => {
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
    });
  }
});

test('status has useful setup instructions and never invokes login when CLI/app config is missing', {timeout: 10_000}, async t => {
  const absent = await launch(t, {extra: {FEISHU_CLI_BIN: join(tmpdir(), 'nonexistent-feishu-cli.exe')}});
  const absentStatus = await cli(absent, '/status');
  assert.equal(absentStatus.value.available, false);
  assert.equal(absentStatus.value.configured, false);
  assert.equal((await start(absent)).status, 503);
  const noApp = await launch(t, {settings: {unconfigured: true}});
  const noAppStatus = await cli(noApp, '/status');
  assert.deepEqual({available: noAppStatus.value.available, configured: noAppStatus.value.configured}, {available: true, configured: false});
  assert.match(noAppStatus.value.reason, /config init/);
  assert.equal((await start(noApp)).status, 503);
  assert.ok((await noApp.trace()).every(entry => entry.args[1] === 'status'));
});

test('legacy completion fields use the same verified identity and cannot bypass an explicit organization allowlist', {timeout: 10_000}, async t => {
  const denied = await launch(t, {explicit: true, extra: {FEISHU_ALLOWED_TENANTS: 'some-other-organization'},
    settings: {legacy: true}});
  const deniedFlow = await start(denied);
  assert.equal(deniedFlow.status, 200);
  await denied.configure({complete: true});
  assert.equal((await untilStatus(denied, deniedFlow, 'failed')).cookie, undefined);
  inspect(denied, db => assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0));
  const allowed = await launch(t, {explicit: true, extra: {FEISHU_ADMIN_OPEN_IDS: 'ou_designated'},
    settings: {legacy: true, completedId: 'ou_designated'}});
  const flow = await start(allowed);
  await allowed.configure({complete: true});
  const authorized = await untilStatus(allowed, flow, 'authorized');
  assert.equal((await request(allowed, '/api/session', {cookie: authorized.cookie})).value.user.role, 'admin');
});
