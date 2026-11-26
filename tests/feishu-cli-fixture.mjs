// Both modes are test-only. The fake CLI never calls Feishu or the installed executable.
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';

const pause = ms => new Promise(done => setTimeout(done, ms));
if (process.argv[2] !== '--server') {
  const args = process.argv.slice(2);
  const settingFile = process.env.FAKE_FEISHU_SCENARIO;
  async function scenario() {
    for (;;) { try { return JSON.parse(await readFile(settingFile, 'utf8')); } catch { await pause(5); } }
  }
  const safeArgs = args.map((arg, index) => args[index - 1] === '--device-code' ? '[private]' : arg);
  await appendFile(process.env.FAKE_FEISHU_TRACE, JSON.stringify({args: safeArgs, configDir: process.env.LARKSUITE_CLI_CONFIG_DIR}) + '\n');
  const config = await scenario();
  const out = value => console.log(JSON.stringify(value));
  if (args[0] === 'auth' && args[1] === 'status') {
    out(config.unconfigured ? {appId: '', identity: 'none'} : {appId: 'cli_mock_nas', identity: 'user',
      appSecret: 'do-not-leak-app-secret', identities: {user: {openId: config.cachedId ?? 'ou_operator', userName: '缓存姓名', accessToken: 'do-not-leak-token'}}});
  } else if (args[0] === 'auth' && args[1] === 'qrcode') {
    const output = args[args.indexOf('--output') + 1];
    if (output.startsWith('/') || /^[a-z]:/i.test(output)) throw new Error('Test expected a relative QR output path');
    await writeFile(output, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=', 'base64'));
    console.log('PNG generated');
  } else if (args[0] === 'auth' && args[1] === 'login' && args.includes('--no-wait')) {
    out({verification_url: config.url ?? 'https://accounts.feishu.cn/device?code=opaque%2B%2F&x=a;b',
      device_code: 'private-device-code-never-for-browser', expires_in: config.expiresIn ?? 30});
  } else if (args[0] === 'auth' && args[1] === 'login' && args.includes('--device-code')) {
    let next;
    while (!(next = await scenario()).complete) await pause(15);
    if (next.failCommand) { console.error('never-print-this-device-token'); process.exit(1); }
    if (next.missingIdentity) out({ok: true});
    else if (next.legacy) out({openId: next.completedId ?? 'ou_operator', userName: '本次扫码用户'});
    else out({event: 'authorization_complete', user_open_id: next.completedId ?? 'ou_operator', user_name: '本次扫码用户', ...next.completion});
    process.exitCode = next.completionExit ?? 0;
  } else if (args[0] === 'api') {
    if (args[1] !== 'GET' || args[2] !== '/open-apis/authen/v1/user_info' || args[args.indexOf('--as') + 1] !== 'user') {
      throw new Error('Wrong user verification command');
    }
    const data = {open_id: config.verifiedId ?? config.completedId ?? 'ou_operator',
      tenant_key: config.tenant === undefined ? 'nas-team' : config.tenant, name: config.userName ?? '飞书项管'};
    // Match the installed v1.0.100 CLI: api normalizes OpenAPI replies into {ok, identity, data}.
    out({...(config.rawUserInfo ? {code: 0, data} : {ok: true, identity: 'user', data}), ...config.userInfoEnvelope});
  } else throw new Error('Unexpected mock CLI command');
} else {
  const { createServer } = await import('node:http');
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  process.env.APP_ORIGIN = origin;
  const { feishuCliApi, feishuCliStatus, shutdownFeishuCli } = await import('../backend/feishu-cli.mjs');
  const { procurementApi } = await import('../backend/procurement.mjs');
  const { authenticate, HttpError, json } = await import('../backend/auth.mjs');
  const { db } = await import('../backend/store.mjs');
  server.on('request', (req, res) => {
    const url = new URL(req.url, origin);
    if (url.pathname === '/api/session') return json(res, {user: authenticate(req)?.user ?? null});
    const handler = url.pathname.startsWith('/api/procurement/') ? procurementApi : feishuCliApi;
    handler(req, res, url.pathname, url.searchParams).catch(error => {
      if (res.headersSent || res.destroyed) { res.destroy(); return; }
      json(res, {error: error instanceof HttpError ? error.message : 'Test handler failed.'}, error.status || 500);
    });
  });
  process.on('message', async message => {
    if (message === 'stop') {
      await shutdownFeishuCli();
      server.close(() => { db.close(); process.disconnect(); });
      server.closeAllConnections();
    } else if (message === 'status') process.send(await feishuCliStatus());
  });
  process.send(origin);
}
