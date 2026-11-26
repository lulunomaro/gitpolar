import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, fork } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
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

test('real CLI success envelope binds QR and polling to the browser, isolates personal config, and issues one Feishu session', {timeout: 20_000}, async t => {
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
  const reused = await start(server, {cookie: flow.cookie});
  assert.deepEqual(reused.value, flow.value);
  assert.equal(reused.cookie, undefined);
  const runtimeDir = (await server.trace()).find(entry => entry.args.includes('--no-wait')).configDir;
  assert.equal(dirname(runtimeDir), join(server.data, 'lark-cli-login'));
  const runtime = JSON.parse(await readFile(join(runtimeDir, 'config.json'), 'utf8'));
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
  assert.equal((await poll(server, flow, flow.cookie + '; ' + authorized.cookie)).cookie, undefined);
  // Lost first Set-Cookie response: retry delivers the same existing session, not a new login.
  assert.equal((await poll(server, flow)).cookie, authorized.cookie);
  assert.equal((await poll(server, flow)).value.status, 'authorized');
  inspect(server, db => {
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
    assert.equal(db.prepare('SELECT provider FROM sessions').get().provider, 'feishu');
    assert.equal(db.prepare('SELECT open_id FROM feishu_identities').get().open_id, 'ou_operator');
  });
  const trace = await server.trace();
  assert.ok(trace.every(entry => entry.args.slice(-2).join('|') === '--profile|' + profile));
  assert.ok(trace.filter(entry => entry.args[1] !== 'status').every(entry => entry.configDir === runtimeDir));
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
  inspect(server, db => db.prepare('DELETE FROM sessions WHERE user_id=?').run(memberSession.value.user.id));
  const revoked = await poll(server, memberFlow);
  assert.equal(revoked.value.status, 'expired');
  assert.equal(revoked.cookie, undefined);
});

test('independent browsers authorize concurrently with isolated CLI profiles and sessions', {timeout: 20_000}, async t => {
  const server = await launch(t, {extra: {FEISHU_ALLOWED_TENANTS: 'nas-team'}});
  const [alice, bob] = await Promise.all([start(server), start(server)]);
  assert.equal(alice.status, 200, JSON.stringify(alice.value));
  assert.equal(bob.status, 200, JSON.stringify(bob.value));
  assert.notEqual(alice.value.id, bob.value.id);
  assert.notEqual(alice.cookie, bob.cookie);
  assert.equal((await poll(server, alice, bob.cookie)).status, 404);
  assert.equal((await poll(server, bob, alice.cookie)).status, 404);
  assert.equal((await request(server, alice.value.qrUrl, {cookie: bob.cookie})).status, 404);
  const reused = await start(server, {cookie: alice.cookie});
  assert.equal(reused.value.id, alice.value.id);
  assert.equal(reused.cookie, undefined);

  const trace = await server.trace();
  const configFor = flow => trace.find(entry => entry.args[1] === 'qrcode' && entry.args.includes(flow.value.id + '.png')).configDir;
  const aliceConfig = configFor(alice), bobConfig = configFor(bob);
  assert.notEqual(aliceConfig, bobConfig);
  for (const configDir of [aliceConfig, bobConfig]) {
    assert.equal(dirname(configDir), join(server.data, 'lark-cli-login'));
    assert.deepEqual(JSON.parse(await readFile(join(configDir, 'config.json'), 'utf8')).apps[0].users, []);
  }
  const identities = {
    [basename(aliceConfig)]: {complete: true, completedId: 'ou_alice', userName: '成员 Alice'},
    [basename(bobConfig)]: {complete: false, completedId: 'ou_bob', userName: '成员 Bob'}
  };
  await server.configure({flows: identities});
  const aliceAuth = await untilStatus(server, alice, 'authorized');
  assert.equal((await poll(server, bob)).value.status, 'pending');
  assert.equal((await request(server, bob.value.qrUrl, {cookie: bob.cookie})).status, 200);
  const aliceSession = await request(server, '/api/session', {cookie: aliceAuth.cookie});
  assert.equal(aliceSession.value.user.name, '成员 Alice');

  identities[basename(bobConfig)].complete = true;
  await server.configure({flows: identities});
  const bobAuth = await untilStatus(server, bob, 'authorized');
  const bobSession = await request(server, '/api/session', {cookie: bobAuth.cookie});
  assert.equal(bobSession.value.user.name, '成员 Bob');
  assert.notEqual(aliceAuth.cookie, bobAuth.cookie);
  assert.notEqual(aliceSession.value.user.id, bobSession.value.user.id);
  assert.equal((await request(server, '/api/session', {cookie: aliceAuth.cookie})).value.user.id, aliceSession.value.user.id);
  inspect(server, db => {
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 2);
    assert.equal(db.prepare('SELECT open_id FROM feishu_identities WHERE user_id=?').get(aliceSession.value.user.id).open_id, 'ou_alice');
    assert.equal(db.prepare('SELECT open_id FROM feishu_identities WHERE user_id=?').get(bobSession.value.user.id).open_id, 'ou_bob');
  });
  assert.equal(await readFile(join(server.personal, 'config.json'), 'utf8'), server.original);
});

test('cancelling one browser leaves another browser QR and authorization active', {timeout: 15_000}, async t => {
  const server = await launch(t, {extra: {FEISHU_ALLOWED_TENANTS: 'nas-team'}});
  const [cancelled, survivor] = await Promise.all([start(server), start(server)]);
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.value));
  assert.equal(survivor.status, 200, JSON.stringify(survivor.value));
  assert.equal((await cli(server, '/cancel?id=' + cancelled.value.id, {method: 'POST', cookie: cancelled.cookie})).status, 200);
  assert.equal((await poll(server, cancelled)).value.status, 'cancelled');
  assert.equal((await poll(server, survivor)).value.status, 'pending');
  assert.equal((await request(server, survivor.value.qrUrl, {cookie: survivor.cookie})).status, 200);
  assert.equal((await cli(server, '/cancel?id=' + survivor.value.id, {method: 'POST', cookie: cancelled.cookie})).status, 404);
  await server.configure({complete: true, completedId: 'ou_survivor'});
  const authorized = await untilStatus(server, survivor, 'authorized');
  assert.match(authorized.cookie, /^gitpolar_session=/);
  inspect(server, db => {
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
    assert.equal(db.prepare('SELECT open_id FROM feishu_identities').get().open_id, 'ou_survivor');
  });
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
  assert.ok(trace.every(entry => entry.args[1] === 'status' ? entry.configDir === server.dedicated : dirname(entry.configDir) === join(server.data, 'lark-cli-login')));
  assert.equal(await readFile(join(server.dedicated, 'config.json'), 'utf8'), server.original);
  assert.equal(await readFile(join(server.personal, 'config.json'), 'utf8'), server.original);
});

test('expiration stops the owned completion command and allows a fresh browser flow', {timeout: 10_000}, async t => {
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

test('upstream v1.0.100 partial grant (ExitAuth=3) still requires a completed grant, live user_info and workspace admission', async t => {
  // Contract: larksuite/cli tag v1.0.100, cmd/auth/login_result.go handleLoginScopeIssue and internal/output/exitcode.go.
  const warning = {missing: ['offline_access'], warning: {type: 'missing_scope'}};
  const server = await launch(t, {explicit: true, extra: {FEISHU_ALLOWED_TENANTS: 'nas-team', FEISHU_ADMIN_OPEN_IDS: 'ou_manager'}});
  const cases = [
    {exit: 3, fields: warning, verifiedId: 'ou_worker', status: 'authorized'},
    {exit: 3, fields: warning, verifiedId: 'ou_other', status: 'failed', error: 'feishu_identity_failed'},
    {exit: 3, fields: {...warning, event: 'authorization_failed'}, status: 'failed', error: 'feishu_authorization_failed'},
    {exit: 4, fields: warning, status: 'failed', error: 'feishu_authorization_failed'},
    {exit: 3, fields: {}, status: 'failed', error: 'feishu_authorization_failed'}
  ];
  for (const row of cases) {
    await server.configure({complete: false, completedId: 'ou_worker', verifiedId: row.verifiedId || 'ou_worker', completion: row.fields, completionExit: row.exit});
    const flow = await start(server);
    assert.equal(flow.status, 200);
    await server.configure({complete: true});
    const result = await untilStatus(server, flow, row.status);
    if (row.error) { assert.equal(result.value.errorCode, row.error); assert.equal(result.cookie, undefined); }
    else assert.equal((await request(server, '/api/session', {cookie: result.cookie})).value.user.role, 'writer');
  }
  assert.equal(inspect(server, db => db.prepare('SELECT count(*) AS n FROM sessions').get().n), 1);
  assert.equal(inspect(server, db => db.prepare("SELECT count(*) AS n FROM users WHERE role='admin'").get().n), 0);
});

test('a cached user in an explicit NAS profile cannot bootstrap a project manager', async t => {
  const server = await launch(t, {explicit: true});
  const flow = await start(server);
  await server.configure({complete: true});
  const result = await untilStatus(server, flow, 'failed');
  assert.equal(result.value.errorCode, 'feishu_workspace_denied');
  assert.equal(result.cookie, undefined);
  assert.equal(inspect(server, db => db.prepare('SELECT count(*) AS n FROM users').get().n), 0);
});

test('installed official CLI reads a synthetic profile and renders an offline QR without authorization', async t => {
  const binary = process.platform === 'win32' && process.env.APPDATA
    ? join(process.env.APPDATA, 'npm', 'node_modules', '@larksuite', 'cli', 'bin', 'lark-cli.exe') : 'lark-cli';
  const run = promisify(execFile);
  const temp = await mkdtemp(join(tmpdir(), 'gitpolar-cli-contract-'));
  const config = join(temp, 'config'), output = join(temp, 'output');
  t.after(async () => {
    assert.equal(dirname(resolve(temp)), resolve(tmpdir()));
    assert.ok(basename(temp).startsWith('gitpolar-cli-contract-'));
    await rm(temp, {recursive: true, force: true});
  });
  await Promise.all([mkdir(config), mkdir(output)]);
  const env = {PATH: process.env.PATH, HOME: temp, USERPROFILE: temp, LARKSUITE_CLI_CONFIG_DIR: config,
    LARKSUITE_CLI_DATA_DIR: join(temp, 'data'), LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1', LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1',
    HTTP_PROXY: 'http://127.0.0.1:1', HTTPS_PROXY: 'http://127.0.0.1:1'};
  for (const key of ['SystemRoot','WINDIR','TEMP','TMP']) if (process.env[key]) env[key] = process.env[key];
  const invoke = args => run(binary, args, {cwd: output, env, windowsHide: true, timeout: 10_000});
  let version;
  try { version = (await invoke(['--version'])).stdout.trim(); }
  catch (error) { if (error.code === 'ENOENT') return t.skip('Official CLI not installed'); throw error; }
  t.diagnostic(version);
  const appId = 'cli_offline_contract';
  await writeFile(join(config, 'config.json'), JSON.stringify({currentApp: 'test', apps: [
    {name: 'test', appId, appSecret: 'synthetic-placeholder', brand: 'feishu', users: []}]}));
  const status = JSON.parse((await invoke(['auth','status','--json'])).stdout);
  assert.equal(status.appId, appId);
  assert.ok(!status.identities.user.openId);
  await invoke(['auth','qrcode','https://example.invalid/offline','--output','offline.png']);
  assert.equal((await readFile(join(output, 'offline.png'))).subarray(0,8).toString('hex'), '89504e470d0a1a0a');
});

test('completion output, exact verified user ID, tenant and allow policy are required; cached login is never a fallback', {timeout: 25_000}, async t => {
  const server = await launch(t);
  for (const settings of [
    {missingIdentity: true, errorCode: 'feishu_authorization_failed'},
    {missingIdentity: false, completedId: 'ou_scan', verifiedId: 'ou_cached', errorCode: 'feishu_identity_failed'},
    {completedId: 'ou_operator', verifiedId: 'ou_operator', tenant: '', errorCode: 'feishu_identity_failed'},
    {tenant: 'foreign-team', completedId: 'ou_foreign', verifiedId: 'ou_foreign', errorCode: 'feishu_workspace_denied'},
    {tenant: 'nas-team', completedId: 'ou_operator', verifiedId: 'ou_operator', failCommand: true, errorCode: 'feishu_authorization_failed'}
  ]) {
    await server.configure({...settings, complete: false});
    const flow = await start(server);
    assert.equal(flow.status, 200);
    await server.configure({complete: true});
    const result = await untilStatus(server, flow, 'failed');
    assert.equal(result.cookie, undefined);
    assert.equal(result.value.errorCode, settings.errorCode);
    assert.ok(result.value.message.length > 0);
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
    settings: {legacy: true, rawUserInfo: true, completedId: 'ou_designated'}});
  const flow = await start(allowed);
  await allowed.configure({complete: true});
  const authorized = await untilStatus(allowed, flow, 'authorized');
  assert.equal((await request(allowed, '/api/session', {cookie: authorized.cookie})).value.user.role, 'admin');
});


test('CLI identity verification rejects failed, bot and missing-success envelopes even with matching cached identity', {timeout: 15_000}, async t => {
  const server = await launch(t);
  for (const userInfoEnvelope of [
    {ok: false, code: 0},
    {ok: true, identity: 'bot'},
    {ok: null},
    {ok: 'true'}
  ]) {
    await server.configure({userInfoEnvelope, complete: false});
    const flow = await start(server);
    assert.equal(flow.status, 200);
    await server.configure({complete: true});
    const denied = await untilStatus(server, flow, 'failed');
    assert.equal(denied.value.errorCode, 'feishu_identity_failed');
    assert.match(denied.value.message, /授权已完成/);
    assert.equal(denied.cookie, undefined);
    inspect(server, db => {
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
    });
  }
});


test('an allowlisted first ordinary member is a writer rather than an implicit project manager', {timeout: 10000}, async t => {
  const server = await launch(t, {explicit: true, extra: {FEISHU_ALLOWED_TENANTS: 'nas-team'}, settings: {completedId: 'ou_member'}});
  const flow = await start(server);
  await server.configure({complete: true});
  const authorized = await untilStatus(server, flow, 'authorized');
  const session = await request(server, '/api/session', {cookie: authorized.cookie});
  assert.equal(session.value.user.role, 'writer');
  assert.equal((await request(server, '/api/procurement/meta', {cookie: authorized.cookie})).value.projectManager, false);
});
