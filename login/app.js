const $ = id => document.getElementById(id);
const root = '/api/feishu-cli';
let lifecycle, flow = null, bootVersion = 0, redirectTimer;
let metadata = null, cli = null, starting = false;

function returnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/';
  try {
    const url = new URL(value, location.origin);
    if (url.origin !== location.origin || /^\/login(?:\/|$)/.test(url.pathname)) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}
const destination = returnPath(new URLSearchParams(location.search).get('returnTo'));
function redirect() { location.replace(new URL(destination, location.origin).href); }
function httpUrl(value, sameOrigin = false) {
  try {
    if (typeof value !== 'string' || !value || /[\u0000-\u001f\u007f]/.test(value)) return null;
    const url = new URL(value, location.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (sameOrigin && url.origin !== location.origin)) return null;
    return value;
  } catch { return null; }
}
async function json(path, { method = 'GET', signal, keepalive = false } = {}) {
  const response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', keepalive,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
    headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(typeof payload?.error === 'string' ? payload.error : payload?.error?.message || payload?.message || `登录服务返回 HTTP ${response.status}。`);
    error.status = response.status;
    throw error;
  }
  if (!payload) throw new Error('登录服务没有返回有效数据，请稍后重试。');
  return payload;
}
function message(text = '', warning = false) {
  $('message').hidden = !text;
  $('message').textContent = text;
  $('message').classList.toggle('warning', warning);
}
function steps(active) {
  for (let n = 1; n <= 3; n++) {
    const element = $(`step-${n}`);
    element.classList.toggle('done', n < active);
    if (n === active) element.setAttribute('aria-current', 'step'); else element.removeAttribute('aria-current');
  }
}
function showOnly(id) {
  for (const section of ['ready', 'qr-area', 'result', 'setup']) $(section).hidden = section !== id;
}
function buttons(startText, cancel = false, refresh = false) {
  $('start').hidden = !startText;
  $('start').textContent = startText || '生成飞书登录二维码';
  $('start').disabled = false;
  $('cancel').hidden = !cancel;
  $('cancel').disabled = false;
  $('cancel').textContent = '取消登录';
  $('refresh').hidden = !refresh;
  $('refresh').textContent = '重新检查配置';
}
function stopFlow() {
  const current = flow;
  flow = null;
  if (current) {
    current.abort.abort();
    clearTimeout(current.pollTimer);
    clearInterval(current.clock);
  }
  $('qr').removeAttribute('src');
  $('verification-link').removeAttribute('href');
  return current;
}
function finish(status, description = '') {
  stopFlow();
  message();
  $('connection').textContent = '';
  showOnly('result');
  const states = {
    authorized: ['✓', '登录成功', '即将进入 gitpolar…'],
    expired: ['↻', '二维码已过期', '请重新生成二维码，再用飞书扫码。'],
    cancelled: ['×', '已取消登录', '需要登录时，可以重新生成二维码。'],
    failed: ['!', '未能完成登录', '请重新生成二维码后再试。']
  };
  const [symbol, title, fallback] = states[status] || states.failed;
  $('result-symbol').textContent = symbol;
  $('result-title').textContent = title;
  $('result-description').textContent = description || fallback;
  $('result').classList.toggle('success', status === 'authorized');
  steps(status === 'authorized' ? 3 : 1);
  buttons(status === 'authorized' ? '' : '重新生成二维码');
  if (status === 'authorized') redirectTimer = setTimeout(redirect, 350);
}
function tick(current) {
  if (flow !== current) return false;
  const remaining = Math.ceil((current.expires - Date.now()) / 1000);
  if (remaining <= 0) { finish('expired'); return false; }
  $('countdown').textContent = `二维码剩余 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  return true;
}
function schedulePoll(current, delay = current.interval) {
  if (flow !== current || current.cancelling) return;
  clearTimeout(current.pollTimer);
  current.pollTimer = setTimeout(() => poll(current), delay);
}
async function poll(current) {
  if (!tick(current) || current.cancelling) return;
  try {
    const data = await json(`${root}/poll?id=${encodeURIComponent(current.id)}`, { signal: current.abort.signal });
    if (flow !== current || current.cancelling) return;
    if (data.status === 'pending') {
      message();
      $('connection').textContent = data.message || '正在等待飞书确认…';
      schedulePoll(current);
    } else if (['authorized', 'expired', 'cancelled', 'failed'].includes(data.status)) {
      finish(data.status, data.message);
    } else finish('failed', '登录服务返回了未知状态，请重新尝试。');
  } catch (error) {
    if (flow !== current || current.cancelling || current.abort.signal.aborted) return;
    if (error.status === 404 || error.status === 410) { finish('expired', error.message); return; }
    if (error.status && error.status < 500 && ![409, 429].includes(error.status)) { finish('failed', error.message); return; }
    message('暂时无法确认登录结果，正在重试。请保持本页打开。', true);
    schedulePoll(current, Math.max(3000, current.interval));
  }
}
async function start() {
  if (starting || flow || !cli?.available || !cli?.configured) return;
  starting = true;
  const version = bootVersion;
  message();
  $('start').disabled = true;
  $('start').textContent = '正在生成二维码…';
  $('connection').textContent = '正在向飞书申请登录授权…';
  $('login-card').setAttribute('aria-busy', 'true');
  try {
    const data = await json(`${root}/start`, { method: 'POST', signal: lifecycle.signal });
    if (version !== bootVersion || lifecycle.signal.aborted) return;
    const verification = httpUrl(data.verificationUrl);
    const qr = httpUrl(data.qrUrl, true);
    const expires = Date.parse(data.expiresAt);
    if (typeof data.id !== 'string' || !data.id || !verification || !qr || !Number.isFinite(expires)) throw new Error('登录二维码信息不完整，请重新生成。');
    const current = flow = { id: data.id, expires, abort: new AbortController(), interval: Math.min(10000, Math.max(1000, (Number(data.pollInterval) || 2) * 1000)), cancelling: false };
    steps(2);
    showOnly('qr-area');
    buttons('', true);
    $('connection').textContent = '等待扫码与授权';
    $('qr-error').hidden = true;
    $('qr').src = qr;
    // Keep the device authorization URL opaque; never append returnTo or rebuild its query.
    $('verification-link').setAttribute('href', verification);
    if (!tick(current)) return;
    current.clock = setInterval(() => tick(current), 1000);
    schedulePoll(current);
  } catch (error) {
    if (version !== bootVersion || lifecycle.signal.aborted) return;
    finish('failed', error.status === 409 ? `已有一次登录正在进行，请稍后重试。${error.message}` : error.message);
  } finally {
    if (version === bootVersion) {
      starting = false;
      $('login-card').setAttribute('aria-busy', 'false');
    }
  }
}
async function cancel() {
  const current = flow;
  if (!current || current.cancelling) return;
  current.cancelling = true;
  clearTimeout(current.pollTimer);
  $('cancel').disabled = true;
  $('cancel').textContent = '正在取消…';
  try {
    await json(`${root}/cancel?id=${encodeURIComponent(current.id)}`, { method: 'POST', signal: lifecycle.signal });
    if (flow === current) finish('cancelled');
  } catch (error) {
    if (flow !== current || lifecycle.signal.aborted) return;
    current.cancelling = false;
    message(`取消尚未完成，请重试。${error.message}`, true);
    $('cancel').disabled = false;
    $('cancel').textContent = '重试取消';
    schedulePoll(current);
  }
}
function setup() {
  showOnly('setup');
  steps(1);
  buttons('', false, true);
  $('connection').textContent = '扫码登录服务尚未就绪';
  $('setup-reason').textContent = cli.reason || (cli.available ? '飞书 CLI 已安装，需要完成首次初始化。' : '当前 NAS 尚未安装可用的飞书 CLI。');
  const webLogin = !cli.available && httpUrl(metadata.feishuLoginUrl);
  $('web-login').hidden = $('web-hint').hidden = !webLogin;
  if (webLogin) $('web-login').setAttribute('href', webLogin); else $('web-login').removeAttribute('href');
}
async function boot() {
  const version = ++bootVersion;
  lifecycle?.abort();
  stopFlow();
  clearTimeout(redirectTimer);
  lifecycle = new AbortController();
  metadata = cli = null;
  starting = false;
  steps(1);
  showOnly('');
  buttons('');
  message();
  $('connection').textContent = '正在检查飞书登录服务…';
  $('login-card').setAttribute('aria-busy', 'true');
  try {
    // Catch the parallel status request immediately, including when an existing session redirects.
    const status = json(`${root}/status`, { signal: lifecycle.signal }).then(value => ({ value }), error => ({ error }));
    metadata = await json('/api/session', { signal: lifecycle.signal });
    if (version !== bootVersion || lifecycle.signal.aborted) return;
    if (metadata.user) { steps(3); redirect(); return; }
    const result = await status;
    if (version !== bootVersion || lifecycle.signal.aborted) return;
    if (result.error) throw result.error;
    cli = result.value;
    if (!cli.available || !cli.configured) { setup(); return; }
    showOnly('ready');
    buttons('生成飞书登录二维码');
    $('connection').textContent = '飞书扫码登录已就绪';
  } catch (error) {
    if (version !== bootVersion || lifecycle.signal.aborted) return;
    message(error.message || '暂时无法连接登录服务。');
    $('connection').textContent = '无法读取登录配置';
    buttons('', false, true);
    $('refresh').textContent = '重新连接';
  } finally {
    if (version === bootVersion) $('login-card').setAttribute('aria-busy', 'false');
  }
}
$('start').addEventListener('click', start);
$('cancel').addEventListener('click', cancel);
$('refresh').addEventListener('click', boot);
$('qr').addEventListener('error', () => { if (flow) $('qr-error').hidden = false; });
$('qr').addEventListener('load', () => { $('qr-error').hidden = true; });
window.addEventListener('pagehide', () => {
  ++bootVersion;
  lifecycle?.abort();
  clearTimeout(redirectTimer);
  const current = stopFlow();
  if (current) {
    fetch(`${root}/cancel?id=${encodeURIComponent(current.id)}`, { method: 'POST', credentials: 'same-origin', keepalive: true }).catch(() => {});
  }
});
window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
boot();
