const button = document.querySelector('#login');
const errorText = document.querySelector('#error');
const scan = document.querySelector('#scan');
const qr = document.querySelector('#qr');
const cancelButton = document.querySelector('#cancel');
const flowKey = 'gitpolar.feishu.pending';
let webLogin = false;
let serviceReady = false;
let pending;
let timer;
let polling = false;
let officialTab;

function returnPath(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/';
  const url = new URL(value, location.origin);
  if (url.origin !== location.origin || url.pathname.startsWith('//') || /^\/(?:login|auth)(?:\/|$)/.test(url.pathname)) return '/';
  return url.pathname + url.search + url.hash;
}
const query = new URLSearchParams(location.search);
const destination = returnPath(query.get('returnTo'));

function showError(text = '') {
  errorText.textContent = text;
  errorText.hidden = !text;
}

async function request(path, method = 'GET') {
  const response = await fetch(path, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) {
    const error = new Error('暂时无法连接飞书登录服务，请重试。');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function readSettings() {
  const [session, runtime] = await Promise.all([request('/api/session'), request('/api/runtime')]);
  const site = new URL(session.origin || location.origin);
  if (site.hostname === location.hostname && site.protocol === location.protocol && site.port !== location.port) {
    location.replace(new URL('/login/' + location.search, site.origin).href);
    return false;
  }
  if (session.user) {
    remember(null);
    location.replace(destination);
    return false;
  }
  if (runtime.updateAvailable) throw new Error('登录服务需要重启，请联系管理员后重试。');
  webLogin = session.feishuLoginMethod === 'web' || Boolean(session.feishuLoginUrl);
  if (webLogin) {
    remember(null);
    if (!session.feishuLoginUrl) throw new Error('gitpolar 的飞书网页登录尚未配置完成，请联系管理员。');
  }
  serviceReady = true;
  return true;
}

// 只记住本标签的流程编号和有效期。设备码、身份和会话凭证由服务端管理。
function remember(flow) {
  pending = flow;
  clearTimeout(timer);
  scan.hidden = !flow;
  button.hidden = Boolean(flow);
  if (flow) {
    qr.src = '/api/feishu-cli/qr?id=' + encodeURIComponent(flow.id);
  } else {
    qr.removeAttribute('src');
  }
  try {
    if (flow) sessionStorage.setItem(flowKey, JSON.stringify({id: flow.id, until: flow.until}));
    else sessionStorage.removeItem(flowKey);
  } catch { /* 当前页面仍可在内存中完成授权。 */ }
}

function finish(message) {
  remember(null);
  if (officialTab && !officialTab.closed) officialTab.close();
  officialTab = null;
  if (message) {
    showError(message);
    button.focus();
  } else {
    location.replace('/');
  }
}

async function poll() {
  const flow = pending;
  if (!flow || polling) return;
  clearTimeout(timer);
  polling = true;
  try {
    const result = await request('/api/feishu-cli/poll?id=' + encodeURIComponent(flow.id));
    if (pending !== flow) return;
    if (result.status === 'authorized') return finish();
    if (result.status !== 'pending') {
      const message = result.status === 'expired' ? '二维码已过期，请重新登录。'
        : result.errorCode === 'feishu_authorization_failed' ? '飞书授权未完成。如果飞书提示没有应用权限，请选择已开通的团队身份，或联系应用管理员。'
        : result.message || '本次授权已结束，请重新登录。';
      return finish(message);
    }
    showError();
  } catch (error) {
    if (pending !== flow) return;
    if ([403, 404, 410].includes(error.status)) return finish('本次授权已失效，请重新登录。');
    showError('连接暂时中断，正在重新检查授权结果。');
  } finally {
    polling = false;
    if (pending) timer = setTimeout(poll, 2000);
  }
}

async function startFlow() {
  const data = await request('/api/feishu-cli/start', 'POST');
  const url = new URL(data.verificationUrl);
  const until = Date.parse(data.expiresAt);
  const official = ['https://accounts.feishu.cn', 'https://accounts.larksuite.com'].includes(url.origin);
  if (!official || url.username || url.password || !data.id || !Number.isFinite(until)) {
    throw new Error('未能获取飞书官方授权地址，请重试。');
  }
  return {id: data.id, until, url: data.verificationUrl};
}

async function signIn() {
  button.disabled = true;
  showError();
  try {
    if (!serviceReady && !await readSettings()) return;
    if (webLogin) {
      location.assign('/auth/feishu?' + new URLSearchParams({returnTo: destination}));
      return;
    }
    remember(await startFlow());
    document.querySelector('#scan-title').focus();
    poll();
  } catch (error) {
    showError(error.message || '无法生成飞书二维码，请重试。');
  } finally {
    button.disabled = false;
  }
}

async function openOfficial() {
  const flow = pending;
  if (!flow) return;
  if (officialTab && !officialTab.closed) { officialTab.focus(); return; }
  const tab = window.open('about:blank', '_blank');
  if (!tab) return showError('请允许打开飞书授权窗口，或用手机扫描二维码。');
  tab.opener = null;
  officialTab = tab;
  try {
    // 刷新后按浏览器绑定取回当前流程的官方地址，授权链接不写入本地存储。
    if (!flow.url) {
      const current = await startFlow();
      if (flow !== pending) { tab.close(); return; }
      remember(current);
      poll();
    }
    tab.location.replace(pending.url);
  } catch (error) {
    tab.close();
    showError(error.message || '无法打开飞书授权页，请重试。');
  }
}

async function cancelScan() {
  const flow = pending;
  if (!flow) return;
  cancelButton.disabled = true;
  try {
    await request('/api/feishu-cli/cancel?id=' + encodeURIComponent(flow.id), 'POST');
  } catch (error) {
    if (![404, 410].includes(error.status)) return showError('取消失败，请重试。');
  } finally {
    cancelButton.disabled = false;
  }
  if (pending !== flow) return;
  remember(null);
  if (officialTab && !officialTab.closed) officialTab.close();
  officialTab = null;
  showError();
  button.focus();
}

async function boot() {
  const previousError = query.get('auth');
  if (previousError) showError(previousError === 'not-allowed'
    ? '该飞书账号尚未获准加入工作区，请联系管理员。' : '上一次飞书授权未完成，请重新登录。');
  try {
    if (!await readSettings() || webLogin) return;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(flowKey)); } catch { /* 没有可恢复的流程。 */ }
    if (saved?.id && Number.isFinite(saved.until) && saved.until > Date.now()) {
      remember({id: saved.id, until: saved.until});
      poll();
    }
  } catch (error) {
    showError(error.status === 404 ? '登录服务需要更新，请联系管理员。' : error.message || '暂时无法读取登录状态，请重试。');
  } finally {
    button.disabled = false;
  }
}

button.addEventListener('click', signIn);
document.querySelector('#open-official').addEventListener('click', openOfficial);
cancelButton.addEventListener('click', cancelScan);
window.addEventListener('pageshow', event => { if (event.persisted) poll(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
boot();
