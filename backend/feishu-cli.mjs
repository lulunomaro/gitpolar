import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { access, chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { delimiter, extname, join, resolve } from 'node:path';
import { cookie, fail, hash, HttpError, json, newSession, random, requireOrigin, setCookie } from './auth.mjs';
import { dataRoot } from './config.mjs';
import { getOrCreateFeishuUser } from './feishu.mjs';

const flowCookie = 'gitpolar_feishu_cli_flow';
const directory = join(dataRoot, 'feishu-cli');
const profile = process.env.FEISHU_CLI_PROFILE?.trim();
const explicitConfig = process.env.FEISHU_CLI_CONFIG_DIR?.trim() || process.env.LARKSUITE_CLI_CONFIG_DIR?.trim();
const sourceConfig = resolve(explicitConfig || join(homedir(), '.lark-cli'));
const runtimeConfig = explicitConfig ? sourceConfig : join(dataRoot, 'lark-cli-login');
const flows = new Map();
let active, cachedStatus, statusWork;
const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const publicFailure = '飞书登录未完成，请重新扫码；如仍失败，请联系管理员检查后端登录服务。';
const loginFailures = {
  authorization: {errorCode: 'feishu_authorization_failed', message: '飞书授权未完成，请重新生成二维码并在飞书中确认。'},
  identity: {errorCode: 'feishu_identity_failed', message: '飞书授权已完成，但未能验证登录身份。请重新扫码；如仍失败，请联系管理员检查飞书连接。'},
  account: {errorCode: 'feishu_account_failed', message: '飞书身份已验证，但创建 gitpolar 账号失败，请联系管理员检查后端。'},
  denied: {errorCode: 'feishu_workspace_denied', message: '飞书授权已完成，但该账号尚未获准加入此工作区，请联系项目管理员。'}
};

async function executable() {
  const configured = process.env.FEISHU_CLI_BIN?.trim();
  const candidates = configured ? [configured] : [
    ...(process.platform === 'win32' && process.env.APPDATA
      ? [join(process.env.APPDATA, 'npm', 'node_modules', '@larksuite', 'cli', 'bin', 'lark-cli.exe')] : []),
    ...(process.env.PATH || '').split(delimiter).filter(Boolean).map(path => join(path, process.platform === 'win32' ? 'lark-cli.exe' : 'lark-cli'))
  ];
  for (const path of candidates) {
    try { await access(path, process.platform === 'win32' || ['.mjs', '.cjs', '.js'].includes(extname(path).toLowerCase()) ? constants.F_OK : constants.X_OK); return resolve(path); }
    catch { /* Only report a safe availability result; paths and command output stay private. */ }
  }
  return null;
}

function cli(bin, args, {signal, timeout = 15_000, cwd = directory, configDir = sourceConfig} = {}) {
  return new Promise((done, reject) => {
    if (signal?.aborted) { reject(new Error(publicFailure)); return; }
    const script = ['.mjs', '.cjs', '.js'].includes(extname(bin).toLowerCase());
    const child = spawn(script ? process.execPath : bin, [...(script ? [bin] : []), ...args, ...(profile ? ['--profile', profile] : [])], {
      cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: {...process.env, LARKSUITE_CLI_CONFIG_DIR: configDir, LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1', LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1'}
    });
    let bytes = 0, stderrBytes = 0, rejected = false;
    const chunks = [];
    const stop = () => { rejected = true; child.kill(); };
    const timer = setTimeout(stop, timeout);
    timer.unref();
    signal?.addEventListener('abort', stop, {once: true});
    child.stdout.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 256 * 1024) stop();
      else chunks.push(chunk);
    });
    // Drain stderr without retaining or logging secrets, device codes or CLI notices.
    child.stderr.on('data', chunk => { stderrBytes += chunk.length; if (stderrBytes > 128 * 1024) stop(); });
    child.on('error', () => { rejected = true; });
    child.on('close', code => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
      if (rejected || code !== 0) { reject(new Error(publicFailure)); return; }
      done(Buffer.concat(chunks).toString('utf8'));
    });
  });
}

function parse(value) {
  try {
    const result = JSON.parse(value);
    if (result && typeof result === 'object' && !Array.isArray(result)) return result;
  } catch { /* No raw CLI output in errors. */ }
  throw new Error(publicFailure);
}

async function statusRecord(bin, options = {}) {
  return parse(await cli(bin, ['auth', 'status', '--json'], options));
}
const appIdOf = record => typeof record.appId === 'string' && /^cli_[a-zA-Z0-9_-]{1,128}$/.test(record.appId) ? record.appId : null;
const snapshotUserId = record => typeof record.identities?.user?.openId === 'string' && record.identities.user.openId.length <= 256
  ? record.identities.user.openId : null;

async function isolateConfiguration(appId) {
  if (explicitConfig) return;
  const source = parse(await readFile(join(sourceConfig, 'config.json'), 'utf8'));
  if (!Array.isArray(source.apps)) throw new Error(publicFailure);
  const selector = profile || process.env.LARKSUITE_CLI_PROFILE || source.currentApp;
  const selected = selector ? source.apps.find(app => app.name === selector) || source.apps.find(app => app.appId === selector) : source.apps[0];
  if (!selected || selected.appId !== appId || !selected.appSecret) throw new Error(publicFailure);
  const app = {};
  for (const key of ['name', 'appId', 'appSecret', 'brand', 'lang', 'defaultAs', 'strictMode', 'dpopMode']) {
    if (Object.hasOwn(selected, key)) app[key] = selected[key];
  }
  app.users = [];
  const isolated = {currentApp: app.name || app.appId, apps: [app]};
  for (const key of ['strictMode', 'riskControl']) if (Object.hasOwn(source, key)) isolated[key] = source[key];
  await mkdir(runtimeConfig, {recursive: true, mode: 0o700});
  const path = join(runtimeConfig, 'config.json');
  await writeFile(path, JSON.stringify(isolated), {mode: 0o600});
  await chmod(path, 0o600);
}

export async function feishuCliStatus() {
  if (cachedStatus && cachedStatus.until > Date.now()) return {...cachedStatus.value};
  if (!statusWork) statusWork = (async () => {
    const bin = await executable();
    if (!bin) return {available: false, configured: false, reason: 'NAS 尚未安装飞书 CLI，请安装 @larksuite/cli，或设置 FEISHU_CLI_BIN。'};
    await mkdir(directory, {recursive: true, mode: 0o700});
    try {
      const record = await statusRecord(bin);
      const appId = appIdOf(record);
      return appId ? {available: true, configured: true, appId}
        : {available: true, configured: false, reason: '请先在 NAS 上运行 lark-cli config init 配置专用应用。'};
    } catch {
      return {available: true, configured: false, reason: '无法读取飞书 CLI 配置，请在 NAS 上检查 lark-cli auth status --json。'};
    }
  })().then(value => {
    cachedStatus = {value, until: Date.now() + 10_000};
    return value;
  }).finally(() => { statusWork = null; });
  return {...await statusWork};
}

async function deleteQr(flow) {
  try { await unlink(flow.qrPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
function expire(flow) {
  if (flow.status !== 'pending') return;
  flow.status = 'expired';
  flow.controller.abort();
}
function authorizedFlow(req, params) {
  const flow = flows.get(params.get('id'));
  const secret = cookie(req, flowCookie);
  if (!flow || !secret || hash(secret) !== flow.binding) fail(404, '找不到此浏览器的飞书登录流程。');
  if (flow.status === 'pending' && Date.now() >= flow.expiresAt) expire(flow);
  return flow;
}
function responseFor(flow) {
  return {id: flow.id, verificationUrl: flow.verificationUrl, qrUrl: `/api/feishu-cli/qr?id=${flow.id}`,
    expiresAt: new Date(flow.expiresAt).toISOString(), pollInterval: 2};
}

async function finish(flow) {
  let phase = 'authorization';
  try {
    const completed = parse(await cli(flow.bin, ['auth', 'login', '--device-code', flow.deviceCode, '--json'], {
      configDir: runtimeConfig, signal: flow.controller.signal, timeout: Math.max(1, flow.expiresAt - Date.now())
    }));
    // v1.0.100 emits authorization_complete/user_open_id/user_name. Some CLI versions emit openId/userName.
    const completedId = completed.event === 'authorization_complete' ? completed.user_open_id : completed.openId;
    const completedName = completed.event === 'authorization_complete' ? completed.user_name : completed.userName;
    if (completed.success === false || typeof completedId !== 'string' || !completedId || completedId.length > 256
      || typeof completedName !== 'string') throw new Error(publicFailure);
    phase = 'identity';
    const result = parse(await cli(flow.bin, ['api', 'GET', '/open-apis/authen/v1/user_info', '--as', 'user'], {
      configDir: runtimeConfig, signal: flow.controller.signal, timeout: Math.max(1, Math.min(15_000, flow.expiresAt - Date.now()))
    }));
    const identity = result.data;
    // CLI api returns {ok:true, identity:'user', data}; raw OpenAPI replies use {code:0, data}.
    // If a CLI success marker is present, it must succeed as the user even if code is also 0.
    const verified = Object.hasOwn(result, 'ok')
      ? result.ok === true && result.identity === 'user'
      : result.code === 0 && (!Object.hasOwn(result, 'identity') || result.identity === 'user');
    if (!verified || identity?.open_id !== completedId || typeof identity.tenant_key !== 'string' || !identity.tenant_key.trim()) {
      throw new Error(publicFailure);
    }
    if (flow.status !== 'pending' || Date.now() >= flow.expiresAt) { expire(flow); return; }
    phase = 'account';
    flow.user = getOrCreateFeishuUser(identity, {bootstrapAdminIds: flow.bootstrapId ? [flow.bootstrapId] : []});
    // The verified identity is now independent of the CLI's shared credential cache.
    flow.ready = true;
    clearTimeout(flow.timer);
  } catch (error) {
    if (flow.status === 'pending') {
      flow.status = Date.now() >= flow.expiresAt ? 'expired' : 'failed';
      flow.failure = loginFailures[error instanceof HttpError && error.status === 403 ? 'denied' : phase];
    }
  } finally {
    flow.deviceCode = null;
    if (active === flow) active = null;
    await deleteQr(flow).catch(() => {});
  }
}

async function start(req, res) {
  requireOrigin(req);
  const binding = cookie(req, flowCookie);
  const known = binding && [...flows.values()].find(flow => flow.binding === hash(binding) && flow.status === 'pending' && flow.expiresAt > Date.now());
  if (known) { await known.started; return json(res, responseFor(known)); }
  if (active) fail(409, 'NAS 正在等待另一个浏览器完成飞书扫码，请稍后重试。');
  // Claim the shared credential cache before the first await; only this flow can change it.
  const secret = random(), id = random();
  const flow = {id, binding: hash(secret), status: 'pending', expiresAt: Date.now() + 60_000,
    controller: new AbortController(), qrPath: join(directory, `${id}.png`)};
  active = flow;
  flows.set(id, flow);
  for (const [key, previous] of flows) {
    if (previous !== flow && previous.expiresAt + 300_000 < Date.now()) flows.delete(key);
  }
  flow.started = (async () => {
    try {
      flow.bin = await executable();
      if (!flow.bin) fail(503, 'NAS 尚未安装飞书 CLI，请安装 @larksuite/cli 或设置 FEISHU_CLI_BIN。');
      await mkdir(directory, {recursive: true, mode: 0o700});
      const record = await statusRecord(flow.bin, {signal: flow.controller.signal});
      if (!appIdOf(record)) fail(503, '请先在 NAS 上运行 lark-cli config init 配置专用应用。');
      flow.bootstrapId = snapshotUserId(record);
      await isolateConfiguration(appIdOf(record));
      const begun = parse(await cli(flow.bin, ['auth', 'login', '--scope', 'auth:user.id:read', '--no-wait', '--json'], {
        configDir: runtimeConfig, signal: flow.controller.signal, timeout: 30_000
      }));
      if (typeof begun.verification_url !== 'string' || typeof begun.device_code !== 'string' || !begun.device_code
        || !Number.isFinite(begun.expires_in) || begun.expires_in <= 0 || begun.expires_in > 86400) throw new Error(publicFailure);
      const link = new URL(begun.verification_url);
      if (link.protocol !== 'https:' || link.username || link.password) throw new Error(publicFailure);
      flow.verificationUrl = begun.verification_url; // An opaque URL: never reconstruct or normalize it.
      flow.deviceCode = begun.device_code;
      flow.expiresAt = Date.now() + begun.expires_in * 1000;
      flow.timer = setTimeout(() => expire(flow), Math.max(1, flow.expiresAt - Date.now()));
      flow.timer.unref();
      await cli(flow.bin, ['auth', 'qrcode', flow.verificationUrl, '--output', `${id}.png`], {configDir: runtimeConfig, signal: flow.controller.signal});
      await chmod(flow.qrPath, 0o600);
      const bytes = await readFile(flow.qrPath);
      if (bytes.length > 2 * 1024 * 1024 || !bytes.subarray(0, 8).equals(pngHeader)) throw new Error(publicFailure);
      flow.work = finish(flow);
    } catch (error) {
      clearTimeout(flow.timer);
      if (flow.status === 'pending') flow.status = Date.now() >= flow.expiresAt ? 'expired' : 'failed';
      flow.deviceCode = null;
      if (active === flow) active = null;
      await deleteQr(flow);
      if (error?.status) throw error;
      fail(503, publicFailure);
    }
  })();
  await flow.started;
  res.setHeader('Set-Cookie', setCookie(flowCookie, secret, Math.max(1, Math.ceil((flow.expiresAt - Date.now()) / 1000)) + 300));
  return json(res, responseFor(flow));
}

export async function feishuCliApi(req, res, pathname, params) {
  res.setHeader('Cache-Control', 'no-store');
  if (pathname === '/api/feishu-cli/status' && req.method === 'GET') return json(res, await feishuCliStatus());
  if (pathname === '/api/feishu-cli/start' && req.method === 'POST') return start(req, res);
  if (pathname === '/api/feishu-cli/cancel' && req.method === 'POST') {
    requireOrigin(req);
    const flow = authorizedFlow(req, params);
    if (flow.status === 'pending') {
      flow.status = 'cancelled';
      clearTimeout(flow.timer);
      flow.controller.abort();
      await flow.work;
    }
    return json(res, {ok: true});
  }
  if (pathname === '/api/feishu-cli/poll' && req.method === 'GET') {
    const flow = authorizedFlow(req, params);
    if (flow.status === 'pending' && flow.ready) {
      newSession(res, flow.user, 'feishu');
      flow.status = 'authorized';
    }
    return json(res, {status: flow.status, ...(flow.status === 'failed' ? flow.failure || {message: publicFailure} : {})});
  }
  if (pathname === '/api/feishu-cli/qr' && req.method === 'GET') {
    const flow = authorizedFlow(req, params);
    if (flow.status !== 'pending' || flow.ready) fail(410, '此登录二维码已失效，请重新发起登录。');
    let bytes;
    try { bytes = await readFile(flow.qrPath); }
    catch { fail(410, '此登录二维码已失效，请重新发起登录。'); }
    res.writeHead(200, {'Content-Type': 'image/png', 'Content-Length': bytes.length, 'X-Content-Type-Options': 'nosniff'}).end(bytes);
    return;
  }
  fail(404, '找不到飞书 CLI 登录接口。');
}

export async function shutdownFeishuCli() {
  for (const flow of flows.values()) {
    clearTimeout(flow.timer);
    if (flow.status === 'pending') flow.status = 'cancelled';
    flow.controller.abort();
  }
  await Promise.allSettled([...flows.values()].map(flow => flow.work || flow.started));
  await Promise.allSettled([...flows.values()].map(deleteQr));
  flows.clear();
  active = null;
}
