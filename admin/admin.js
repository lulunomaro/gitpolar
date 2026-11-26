const $ = (selector, root = document) => root.querySelector(selector);
const page = $('#page');
const modal = $('#modal');
const modalContent = $('#modal-content');
const sections = new Map([
  ['overview', {title: '实例概览', description: '查看工作空间的使用情况、存储占用和服务状态。', endpoint: 'overview'}],
  ['repositories', {title: '仓库', description: '检查仓库状态、分支和 Git LFS 用量。', endpoint: 'repositories'}],
  ['users', {title: '用户', description: '管理工作空间成员的角色、登录方式和访问凭据。', endpoint: 'users'}],
  ['locks', {title: '文件锁', description: '查看谁正在编辑文件，协调跨成员的 Git LFS 解锁。', endpoint: 'locks'}],
  ['deployment', {title: '部署与诊断', description: '核对运行中的 NAS 配置和服务检查结果。', endpoint: 'overview'}],
]);
const roles = new Map([['admin', '项管/管理员'], ['writer', '可写成员'], ['reader', '只读成员']]);
const statuses = new Map([['ready', '就绪'], ['creating', '创建中'], ['error', '异常']]);
const state = {session: null, strictFeishu: false, section: null, data: null, request: null, dialog: null, saving: false, toastTimer: null};
const filters = Object.fromEntries(['repositories', 'users', 'locks'].map(key => [key, {query: '', value: ''}]));
const escapeMap = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => escapeMap[c]);
const icon = name => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
const repoHref = name => `/#/repos/${encodeURIComponent(name)}`;
const byId = (rows, id) => rows.find(item => String(item.id) === String(id));
const isSelf = user => String(user.id) === String(state.session?.user?.id);
const integer = new Intl.NumberFormat('zh-CN');
const decimal = new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 1});
const dateFormat = new Intl.DateTimeFormat('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false});
const count = n => Number.isFinite(n) ? integer.format(n) : '—';

function bytes(n) {
  if (!Number.isFinite(n) || n < 0) return '—';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
  const unit = n < 1 ? 0 : Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${decimal.format(n / 1024 ** unit)} ${units[unit]}`;
}

function time(value) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return '—';
  return `<time datetime="${date.toISOString()}">${dateFormat.format(date)}</time>`;
}

function duration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const hours = Math.floor(seconds / 3600);
  if (hours >= 24) return `${Math.floor(hours / 24)} 天 ${hours % 24} 小时`;
  if (hours) return `${hours} 小时 ${Math.floor(seconds / 60) % 60} 分钟`;
  return seconds < 60 ? '不足 1 分钟' : `${Math.floor(seconds / 60)} 分钟`;
}

function label(text, tone = '') {
  return `<span class="badge ${tone}">${escape(text)}</span>`;
}

function roleBadge(role) {
  return label(roles.get(role) || role, role === 'admin' ? 'purple' : role === 'writer' ? 'blue' : '');
}

function statusBadge(status) {
  return label(statuses.get(status) || status || '未知', {ready: 'green', creating: 'amber', error: 'red'}[status] || '');
}

function accountName(value) {
  return typeof value === 'object' && value ? value.username || value.name : value;
}

async function api(path, {method = 'GET', body, signal} = {}) {
  const options = {method, signal, mode: 'same-origin', credentials: 'same-origin', cache: 'no-store', headers: {Accept: 'application/json'}};
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(path, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(typeof payload?.error === 'string' ? payload.error : `服务器返回 HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function errorMessage(error) {
  if (error instanceof TypeError) return '无法连接到服务器，请检查网络后重试。';
  if (/APP_ORIGIN|request origin/i.test(error.message)) return '当前访问地址与 APP_ORIGIN 不一致。请使用 NAS 配置的地址重新访问。';
  if (/last admin|at least one admin|final admin/i.test(error.message)) return '工作空间需要保留至少一位管理员。';
  if (error.message === 'Lock not found.') return '此文件锁已解除，刷新列表即可看到最新记录。';
  if (/username is already in use/i.test(error.message)) return '此用户名已被使用。';
  return error.message;
}

function toast(message) {
  clearTimeout(state.toastTimer);
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  state.toastTimer = setTimeout(() => { el.hidden = true; }, 4800);
}

function setAccount(user) {
  $('#account').hidden = !user;
  $('#account-name').textContent = user?.username || '';
  $('#account-avatar').textContent = (user?.username || '').slice(0, 1).toUpperCase();
}

function gate(kind, note) {
  const messages = {
    signIn: state.strictFeishu
      ? ['shield', '使用飞书登录 gitpolar', '首次使用飞书登录即可加入工作空间。访问管理后台需要项管权限。', '飞书扫码登录']
      : ['shield', '请登录 gitpolar', '使用管理员账号登录后，即可访问此后台。', '前往主站登录'],
    setup: ['server', '初始化 gitpolar', '请先在主站创建此实例的首个管理员账号。', '前往主站初始化'],
    denied: ['shield', '需要管理员权限', '当前账号可以访问主站。请联系工作空间管理员获取后台权限。', '返回主站'],
    offline: ['warning', '无法连接管理后台', '请确认 NAS 上的 gitpolar 服务已启动。', '重试'],
  };
  const [symbol, title, fallback, button] = messages[kind];
  state.request?.abort();
  state.request = null;
  state.section = null;
  state.data = null;
  if (modal.open) closeDialog();
  for (const filter of Object.values(filters)) { filter.query = ''; filter.value = ''; }
  page.replaceChildren();
  $('#workspace-name').textContent = '';
  $('#workspace').hidden = true;
  $('#gate').hidden = false;
  $('#announce').textContent = '';
  $('#toast').hidden = true;
  setAccount(kind === 'denied' ? state.session?.user : null);
  $('#gate-panel').innerHTML = `<div class="gate-symbol">${icon(symbol)}</div><h1 tabindex="-1">${title}</h1><p>${escape(note || fallback)}</p>
    ${kind === 'offline' ? `<button type="button" class="button" id="retry-session">${icon('refresh')}${button}</button>` : `<a class="button primary" href="${kind==='signIn'||kind==='setup'?'/login/?returnTo=%2Fadmin%2F':'/'}">${button}${icon('arrow-right')}</a>`}`;
  document.title = `${title} · gitpolar`;
  $('#gate-panel h1').focus({preventScroll: true});
  $('#retry-session')?.addEventListener('click', start);
}

function handleAccess(error) {
  if (error.status === 401) {
    state.session = null;
    gate('signIn', '当前登录已失效。请重新登录后返回管理后台。');
    return true;
  }
  if (error.status === 403 && !/origin/i.test(error.message)) {
    if (state.session) state.session = null;
    gate('denied');
    return true;
  }
  return false;
}

async function start() {
  const retry = $('#retry-session');
  if (retry) retry.disabled = true;
  try {
    const session = await api('/api/session');
    state.session = session;
    state.strictFeishu = session.authProvider === 'feishu';
    if (!session.user) { gate(session.setupRequired && !state.strictFeishu ? 'setup' : 'signIn'); return; }
    if (session.user.role !== 'admin') { gate('denied'); return; }
    setAccount(session.user);
    $('#workspace-name').textContent = session.namespace;
    $('#gate').hidden = true;
    $('#workspace').hidden = false;
    await loadSection();
  } catch (error) {
    state.session = null;
    if (!handleAccess(error)) gate('offline', errorMessage(error));
  }
}

function closeMobileNav() {
  $('#mobile-nav').setAttribute('aria-expanded', 'false');
  $('#section-nav').classList.remove('open');
}

function selectedSection() {
  const name = location.hash.replace(/^#\/?/, '');
  return sections.has(name) ? name : 'overview';
}

function statePanel(symbol, title, detail, action = '') {
  return `<div class="state-panel"><span class="state-icon">${icon(symbol)}</span><h2>${escape(title)}</h2><p>${escape(detail)}</p>${action}</div>`;
}

async function loadSection({refresh = false, focus = false} = {}) {
  if (state.session?.user?.role !== 'admin') return;
  const key = selectedSection();
  const section = sections.get(key);
  state.request?.abort();
  const controller = new AbortController();
  state.request = controller;
  state.section = key;
  state.data = null;
  if (modal.open && !state.saving) closeDialog();
  closeMobileNav();
  for (const link of document.querySelectorAll('[data-section]')) {
    if (link.dataset.section === key) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  $('#page-title').textContent = section.title;
  $('#page-description').textContent = key === 'users' && state.strictFeishu
    ? '成员首次使用飞书登录后加入工作空间，由项管分配角色和管理访问凭据。'
    : section.description;
  $('#mobile-section').textContent = section.title;
  $('#new-user').hidden = key !== 'users' || state.strictFeishu;
  $('#new-user').disabled = true;
  $('#refresh').disabled = true;
  $('#refresh').classList.add('refreshing');
  document.title = `${section.title} · 管理后台 · gitpolar`;
  page.setAttribute('aria-busy', 'true');
  page.innerHTML = `<div class="loading"><span class="spinner" aria-hidden="true"></span>正在读取${section.title}…</div>`;
  if (focus) $('#page-title').focus({preventScroll: true});
  try {
    const params = refresh && ['overview', 'repositories'].includes(section.endpoint) ? '?refresh=1' : '';
    const running = key === 'deployment' ? api('/api/runtime', {signal: controller.signal})
      .then(value => value, error => ({unavailable: true, legacy: error.status === 404})) : null;
    const data = await api(`/api/admin/${section.endpoint}${params}`, {signal: controller.signal});
    if (running) data.runtime = await running;
    if (state.request !== controller) return;
    if (state.strictFeishu && section.endpoint === 'overview') {
      data.diagnostics = data.diagnostics.filter(item => !/github (?:oauth|login)|本地登录|local login/i.test(item.title));
    }
    state.data = data;
    if (key === 'overview') renderOverview(data);
    else if (key === 'deployment') renderDeployment(data);
    else renderList(key, data);
    $('#new-user').disabled = $('#new-user').hidden;
    $('#announce').textContent = `${section.title}已${refresh ? '刷新' : '加载'}。`;
  } catch (error) {
    if (state.request !== controller || controller.signal.aborted || handleAccess(error)) return;
    state.data = null;
    page.innerHTML = statePanel('warning', '读取失败', errorMessage(error), '<button type="button" class="button" data-action="retry">重新加载</button>');
    $('#announce').textContent = `${section.title}读取失败。`;
  } finally {
    if (state.request === controller) {
      page.setAttribute('aria-busy', 'false');
      $('#refresh').disabled = false;
      $('#refresh').classList.remove('refreshing');
    }
  }
}

function panelHeader(symbol, title, action = '') {
  return `<div class="panel-heading"><h2>${icon(symbol)}${title}</h2>${action}</div>`;
}

function detailRows(items) {
  // Values passed here are already escaped text or locally constructed markup.
  return `<dl class="detail-list">${items.map(([name, value]) => `<div><dt>${escape(name)}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
}

function metric(tile) {
  const {symbol, name, value, note, target} = tile;
  const contents = `<span class="metric-name">${icon(symbol)}${name}</span><strong>${count(value)}</strong><span class="metric-note">${escape(note)}</span>`;
  return target ? `<a class="metric" href="#${target}">${contents}<span class="metric-arrow">${icon('chevron-right')}</span></a>` : `<div class="metric">${contents}</div>`;
}

function storagePanel(storage) {
  const parts = [
    ['git', 'Git 仓库', storage.gitBytes], ['lfs', 'LFS 对象', storage.lfsBytes],
    ['sqlite', 'SQLite', storage.databaseBytes], ['other', '其他文件', storage.otherBytes],
  ];
  const total = parts.reduce((sum, part) => sum + (Number.isFinite(part[2]) ? part[2] : 0), 0);
  let start = 0;
  const segments = total > 0 ? parts.map(([key, , value]) => {
    if (!Number.isFinite(value) || value <= 0) return '';
    const length = value / total * 100;
    const rect = `<rect class="seg-${key}" x="${start}" y="0" width="${length}" height="1"/>`;
    start += length;
    return rect;
  }).join('') : '';
  const warnings = storage.warnings || [];
  return `<section class="panel">${panelHeader('storage', '存储用量')}
    <div class="storage-body"><div class="storage-total"><span>数据目录占用</span><strong>${bytes(storage.totalBytes)}</strong></div>
      <svg class="usage-bar" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true">${segments}</svg>
      <ul class="storage-legend">${parts.map(([key, name, value]) => `<li><span><i class="swatch seg-${key}" aria-hidden="true"></i>${name}</span><strong>${bytes(value)}</strong></li>`).join('')}</ul>
      <p class="subtle">预览模型计入对应的 Git 仓库或 LFS 对象。</p>
      ${storage.disk ? `<div class="volume-line"><span>所在卷可用空间</span><span><strong>${bytes(storage.disk.availableBytes)}</strong> / ${bytes(storage.disk.totalBytes)}</span></div>` : '<p class="volume-line subtle">无法读取所在卷的可用空间。</p>'}
      ${warnings.length ? `<div class="notice warning">${icon('warning')}<div><strong>存储扫描提示</strong><ul>${warnings.map(text => `<li>${escape(text)}</li>`).join('')}</ul></div></div>` : ''}
    </div><div class="panel-foot">最近扫描 ${time(storage.scannedAt)}</div></section>`;
}

function renderOverview({service, counts, storage, deployment, diagnostics}) {
  const metrics = [
    {symbol: 'repo', name: '仓库', value: counts.repositories, note: `${count(counts.readyRepositories)} 个就绪 · ${count(counts.errorRepositories)} 个异常`, target: 'repositories'},
    {symbol: 'people', name: '用户', value: counts.users, note: `${count(counts.admins)} 管理 · ${count(counts.writers)} 可写 · ${count(counts.readers)} 只读`, target: 'users'},
    {symbol: 'lock', name: '文件锁', value: counts.locks, note: 'Git LFS 已锁定的路径', target: 'locks'},
    {symbol: 'person', name: '有效会话', value: counts.activeSessions, note: `${count(counts.tokens)} 个访问令牌`},
  ];
  const flagged = diagnostics.filter(item => item.status === 'warning');
  const checkSummary = flagged.length ? `${flagged.length} 项需关注` : `${diagnostics.length} 项通过`;
  const firstWarning = flagged[0];
  page.innerHTML = `<div class="metrics">${metrics.map(metric).join('')}</div>
    <div class="overview-columns">${storagePanel(storage)}
    <section class="panel">${panelHeader('server', '服务状态')}
      ${detailRows([['服务', `<strong>${escape(service.name)}</strong> <code>${escape(service.version)}</code>`], ['运行时间', duration(service.uptimeSeconds)], ['Git', `<code>${escape(deployment.gitVersion || '未检测到')}</code>`], ['Git LFS', `<code>${escape(deployment.gitLfsVersion || '未检测到')}</code>`]])}
      <div class="check-summary"><span class="check-symbol ${firstWarning ? 'warn' : ''}">${icon(firstWarning ? 'warning' : diagnostics.length ? 'check-circle' : 'info')}</span><div><strong>${diagnostics.length ? checkSummary : '暂无检查结果'}</strong>${firstWarning ? `<small>${escape(diagnosticText(firstWarning.title))}</small>` : ''}</div><a class="text-link" href="#deployment">查看诊断${icon('chevron-right')}</a></div>
    </section></div>`;
}
// Translate known service messages and preserve diagnostic details from other versions.
const diagnosticLabels = new Map([
  ['Repository creation', '仓库创建'], ['Storage scan', '存储扫描'],
  ['Git is unavailable.', '未检测到 Git。'], ['Install git-lfs in the NAS container.', '请在 NAS 容器内安装 Git LFS。'],
  ['GitHub login is configured.', '已配置 GitHub 登录。'],
  ['GitHub login is not configured; local accounts are available.', '可使用本地账号登录，GitHub 登录尚未配置。'],
  ['No failed repository creation records.', '仓库创建记录正常。'],
  ['Storage usage is partial; see storage warnings.', '用量统计存在缺项，可在实例概览查看扫描提示。'],
  ['Git, LFS and SQLite usage scanned.', '已扫描 Git、LFS 和 SQLite 文件。'],
]);
function diagnosticText(text) {
  const failures = /^(\d+) repository creation record\(s\) need inspection\.$/.exec(text);
  return failures ? failures[1] + ' 条仓库创建记录需要检查。' : diagnosticLabels.get(text) || text;
}

function renderDeployment({deployment: config, diagnostics, service, runtime: backendRuntime}) {
  const setting = value => `<code>${escape(value ?? '—')}</code>`;
  const settings = [
    ['服务地址 · APP_ORIGIN', setting(config.origin)], ['工作空间 · WORKSPACE_NAME', setting(config.namespace)],
    ['数据目录', setting(config.dataRoot)], ['仓库目录', setting(config.repositoryRoot)],
    ['LFS 目录', setting(config.lfsRoot)], ['SQLite 路径', setting(config.databasePath)],
    ['单个 LFS 对象上限', bytes(config.maxLfsBytes)], ['单次预览大小上限', bytes(config.maxPreviewBytes)],
    ...(state.strictFeishu ? [['登录方式', '仅限飞书']] : [
      ['GitHub 登录', label(config.githubConfigured ? '已配置' : '未配置', config.githubConfigured ? 'green' : '')],
      ['GitHub 回调地址', setting(config.githubCallbackUrl)],
    ]),
    ...(typeof config.feishuConfigured === 'boolean' ? [['飞书登录', label(config.feishuConfigured ? '已配置' : '未配置', config.feishuConfigured ? 'green' : '')]] : []),
    ...(config.feishuCallbackUrl ? [['飞书回调地址', setting(config.feishuCallbackUrl)]] : []),
  ];
  const runtime = [['服务版本', setting(`${service.name} ${service.version}`)], ['Node.js', setting(service.nodeVersion)],
    ['系统平台', setting(service.platform)], ['运行时间', duration(service.uptimeSeconds)],
    ['Git', setting(config.gitVersion || '未检测到')], ['Git LFS', setting(config.gitLfsVersion || '未检测到')],
    ['运行构建', setting(backendRuntime?.build)], ['后端启动时间', backendRuntime?.startedAt ? time(backendRuntime.startedAt) : '未确认'],
    ['代码更新', label(backendRuntime?.unavailable ? '运行版本未确认' : backendRuntime?.updateAvailable ? '需要重启后端' : '已加载当前代码', backendRuntime?.unavailable || backendRuntime?.updateAvailable ? 'amber' : 'green')]];
  const runtimeWarning = backendRuntime?.legacy || backendRuntime?.updateAvailable;
  const runtimeCheck = runtimeWarning
    ? {status: 'warning', title: '后端需要重启', detail: '页面或后端源码已有更新，当前进程尚未加载。请在 NAS 重建容器；本机部署请停止旧进程后重新启动。'}
    : backendRuntime?.unavailable ? {status: 'warning', title: '运行版本未确认', detail: '暂时无法读取后端运行版本，请刷新诊断。'} : null;
  const checks = [...diagnostics, ...(runtimeCheck ? [runtimeCheck] : [])].map(item => `<li class="diagnostic"><span class="check-symbol ${item.status === 'warning' ? 'warn' : ''}">${icon(item.status === 'warning' ? 'warning' : 'check-circle')}</span>
    <div><strong>${escape(diagnosticText(item.title))}</strong><p>${escape(diagnosticText(item.detail))}</p></div>${label(item.status === 'warning' ? '需关注' : '通过', item.status === 'warning' ? 'amber' : 'green')}</li>`).join('');
  page.innerHTML = `<div class="deploy-grid">
    <section class="panel">${panelHeader('gear', '生效配置')}${detailRows(settings)}</section>
    <div class="stack"><section class="panel">${panelHeader('server', '运行环境')}${detailRows(runtime)}</section>
    <section class="panel">${panelHeader('check-circle', '服务诊断')}${checks ? `<ul class="diagnostics">${checks}</ul>` : '<p class="panel-message">暂无诊断结果。</p>'}</section></div></div>
    <section class="panel runbook">${panelHeader('terminal', 'NAS 配置与备份')}
    <div class="runbook-grid"><div><h3>应用配置更改</h3><p>在 NAS 的 Compose 项目目录编辑 <code>.env</code>，然后重新创建 gitpolar 容器，使新配置生效。</p>${commandLine('docker compose up -d --build gitpolar')}</div>
    <div><h3>备份数据目录</h3><p>Compose 将 NAS 上的 <code>NAS_DATA_DIR</code> 挂载到容器的 <code>/data</code>。停止服务后，完整复制该目录，保留同一时间点的 SQLite 数据库及日志、Git 仓库和 LFS 对象。复制完成后再启动服务。</p>${commandLine('docker compose stop gitpolar')}${commandLine('docker compose start gitpolar')}</div></div></section>`;
}

function commandLine(command) {
  return `<div class="code-line"><code>${escape(command)}</code><button type="button" class="icon-button" data-action="copy" title="复制命令" aria-label="复制命令 ${escape(command)}">${icon('copy')}</button></div>`;
}

const lists = {
  repositories: {title: '仓库列表', unit: '个仓库', symbol: 'repo', search: '搜索仓库名称、描述或创建者', filter: '仓库状态', options: statuses,
    columns: ['仓库', '状态', '分支', '存储用量', '文件锁', '操作'], empty: '还没有仓库', hint: '成员在主站创建仓库后，可在这里查看状态和用量。',
    matches: (row, value) => !value || row.status === value, terms: row => [row.name, row.description, accountName(row.creator)], row: repositoryRow},
  users: {title: '工作空间成员', unit: '位用户', symbol: 'people', search: '搜索用户名或显示名称', filter: '用户角色', options: roles,
    columns: ['用户', '角色', '登录方式', '有效会话 / 令牌', '操作'], empty: '暂无用户', hint: '点击「添加用户」为成员创建本地账号。',
    matches: (row, value) => !value || row.role === value, terms: row => [row.username, row.name], row: userRow},
  locks: {title: '当前文件锁', unit: '个文件锁', symbol: 'lock', search: '搜索文件路径、仓库或持有人',
    columns: ['文件路径', '仓库', '持有人', '锁定时间', '操作'], empty: '当前没有文件锁', hint: '成员通过 Git LFS 锁定文件后，锁记录会显示在这里。',
    matches: () => true, terms: row => [row.path, row.repositoryName, row.ownerName], row: lockRow},
};

function cell(labelText, contents, className = '') {
  return `<td data-label="${escape(labelText)}" class="${className}">${contents}</td>`;
}

function rowAction(action, id, caption, accessibleName, danger = false) {
  return `<button class="button small${danger ? ' quiet-danger' : ''}" type="button" data-action="${action}" data-id="${escape(id)}" aria-label="${escape(accessibleName)}">${caption}</button>`;
}

function repositoryRow(row) {
  const name = row.status === 'ready' ? `<a class="repo-link" href="${escape(repoHref(row.name))}">${escape(row.name)}</a>` : `<strong>${escape(row.name)}</strong>`;
  return `<tr>${cell('仓库', `<div class="item-name">${icon('repo')}<div>${name}${row.description ? `<p class="row-description">${escape(row.description)}</p>` : ''}</div></div>`, 'lead-cell')}
    ${cell('状态', statusBadge(row.status))}
    ${cell('分支', `<strong>${count(row.branchCount)}</strong>${row.defaultBranch ? `<small class="metadata mono">${escape(row.defaultBranch)}</small>` : ''}`)}
    ${cell('存储用量', `<span class="nowrap">Git ${bytes(row.gitBytes)}</span><small class="metadata nowrap">LFS ${bytes(row.lfsBytes)}</small>`)}
    ${cell('文件锁', count(row.locks))}${cell('操作', rowAction('repository', row.id, '详情', `查看 ${row.name} 的仓库详情`), 'action-cell')}</tr>`;
}

function userRow(row) {
  const methods = state.strictFeishu
    ? (row.feishuConnected === false ? '尚未绑定飞书' : '飞书')
    : [row.localLogin && '本地密码', row.githubConnected && 'GitHub', row.feishuConnected && '飞书'].filter(Boolean).join(' · ');
  return `<tr>${cell('用户', `<div class="item-name"><span class="avatar-letter" aria-hidden="true">${escape(row.username.slice(0, 1).toUpperCase())}</span><div><strong>${escape(row.username)}</strong> ${isSelf(row) ? label('你') : ''}${row.name ? `<small class="metadata">${escape(row.name)}</small>` : ''}</div></div>`, 'lead-cell')}
    ${cell('角色', roleBadge(row.role))}${cell('登录方式', escape(methods || '—'))}
    ${cell('有效会话 / 令牌', `<span class="nowrap">${count(row.activeSessions)} 会话</span><small class="metadata nowrap">${count(row.tokens)} 令牌</small>`)}
    ${cell('操作', rowAction('user', row.id, '管理', `管理用户 ${row.username}`), 'action-cell')}</tr>`;
}

function lockRow(row) {
  return `<tr>${cell('文件路径', `<div class="item-name">${icon('lock')}<code class="file-path" dir="auto">${escape(row.path)}</code></div>`, 'lead-cell')}
    ${cell('仓库', `<a href="${escape(repoHref(row.repositoryName))}">${escape(row.repositoryName)}</a>`)}
    ${cell('持有人', escape(row.ownerName))}${cell('锁定时间', time(row.lockedAt))}
    ${cell('操作', rowAction('unlock', row.id, '强制解锁', `强制解锁 ${row.path}`, true), 'action-cell')}</tr>`;
}

function renderList(key, data) {
  const list = lists[key];
  const {query, value} = filters[key];
  const options = list.options ? [...list.options].map(([id, text]) => `<option value="${id}"${value === id ? ' selected' : ''}>${escape(text)}</option>`).join('') : '';
  page.innerHTML = `<section class="panel list-panel" aria-labelledby="list-title"><div class="list-toolbar">
      <h2 id="list-title">${list.title}<span class="quantity" id="row-count"></span></h2>
      <div class="filter-fields"><label class="search-field">${icon('search')}<span class="sr-only">${list.search}</span><input id="list-query" type="search" value="${escape(query)}" placeholder="${list.search}" autocomplete="off"></label>
      ${list.options ? `<label class="select-field"><span class="sr-only">${list.filter}</span><select id="list-filter"><option value="">全部${list.filter.slice(-2)}</option>${options}</select></label>` : ''}</div></div>
    <div id="list-body"></div>
    ${key === 'repositories' ? `<div class="panel-foot">最近扫描 ${time(data.scannedAt)}</div>` : ''}</section>`;
  updateRows();
}

function updateRows() {
  const key = state.section;
  const list = lists[key];
  const rows = state.data[key];
  const filter = filters[key];
  const query = filter.query.trim().toLowerCase();
  const matches = rows.filter(item => list.matches(item, filter.value) && (!query || list.terms(item).some(term => String(term || '').toLowerCase().includes(query))));
  const num = $('#row-count');
  num.textContent = matches.length === rows.length ? count(rows.length) : `${count(matches.length)} / ${count(rows.length)}`;
  num.setAttribute('aria-label', `显示 ${count(matches.length)} ${list.unit}，共 ${count(rows.length)} ${list.unit}`);
  const body = $('#list-body');
  if (!rows.length) {
    const hint = key === 'users' && state.strictFeishu ? '成员首次使用飞书登录后会出现在这里。' : list.hint;
    body.innerHTML = statePanel(list.symbol, list.empty, hint);
    return;
  }
  if (!matches.length) {
    body.innerHTML = statePanel('search', '没有匹配结果', '试试其他关键词，或清除当前筛选。', '<button class="button" type="button" data-action="clear-filter">清除筛选</button>');
    return;
  }
  body.innerHTML = `<div class="table-wrap"><table role="table" aria-labelledby="list-title" class="records ${key}"><thead><tr>${list.columns.map(title => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${matches.map(list.row).join('')}</tbody></table></div>`;
}
function openDialog(kind, record, title, body, saveLabel = '', {danger = false, focus = ''} = {}) {
  const opener = modal.open ? state.dialog?.opener : document.activeElement;
  state.dialog = {kind, record, opener};
  const cancel = saveLabel ? '取消' : '关闭';
  modalContent.innerHTML = `<form id="action-form" autocomplete="off">
    <div class="dialog-heading"><h2 id="modal-title" tabindex="-1">${escape(title)}</h2><button type="button" class="icon-button" data-dialog="close" aria-label="关闭对话框">${icon('x')}</button></div>
    <div class="dialog-body">${body}<p class="form-error" id="form-error" role="alert" hidden></p></div>
    <div class="dialog-actions"><button type="button" id="dialog-cancel" class="button" data-dialog="close">${cancel}</button>
    ${saveLabel ? `<button type="submit" class="button ${danger ? 'danger' : 'primary'}" id="dialog-submit">${saveLabel}</button>` : ''}</div></form>`;
  if (!modal.open) modal.showModal();
  $(focus || '#modal-title', modalContent)?.focus({preventScroll: true});
}

function closeDialog() {
  const opener = state.dialog?.opener;
  state.dialog = null;
  modal.close();
  modalContent.replaceChildren();
  if (opener?.isConnected) opener.focus({preventScroll: true});
}

function notice(text, warning = false) {
  return `<div class="notice${warning ? ' warning' : ''}">${icon(warning ? 'warning' : 'info')}<p>${escape(text)}</p></div>`;
}

function showRepository(repo) {
  const fields = [['状态', statusBadge(repo.status)], ['仓库标识', `<code>${escape(repo.id)}</code>`],
    ['创建者', escape(accountName(repo.creator) || '—')], ['创建时间', time(repo.createdAt)],
    ['默认分支 / 分支数', `<code>${escape(repo.defaultBranch || '—')}</code> / ${count(repo.branchCount)}`],
    ['Git 仓库', bytes(repo.gitBytes)], ['LFS 对象', `${bytes(repo.lfsBytes)} · ${count(repo.lfsObjects)} 个对象`],
    ['未完成的 LFS 对象', count(repo.incompleteLfsObjects)], ['文件锁', count(repo.locks)]];
  const clone = repo.cloneUrl ? `<div class="clone-block"><h3>克隆地址</h3><div class="code-line"><code>${escape(repo.cloneUrl)}</code><button class="icon-button" type="button" data-dialog="copy" aria-label="复制克隆地址">${icon('copy')}</button></div></div>` : '';
  openDialog('repository', repo, repo.name, `${repo.description ? `<p class="dialog-intro">${escape(repo.description)}</p>` : ''}
    ${repo.error ? notice(repo.error, true) : ''}${detailRows(fields)}${clone}
    ${repo.status === 'ready' ? `<a class="text-link" href="${escape(repoHref(repo.name))}">在主站查看仓库${icon('arrow-right')}</a>` : ''}`);
}

function passwordInput(id, title) {
  return `<label class="field" for="${id}">${title}<input id="${id}" name="password" type="password" minlength="10" maxlength="1024" autocomplete="new-password" required aria-describedby="password-hint"></label>
    <p class="input-hint" id="password-hint">使用 10 至 1024 个字符。</p>`;
}

function roleInput(value, lastAdmin = false) {
  return `<label class="field" for="edit-role">工作空间角色<select id="edit-role" name="role" aria-describedby="role-hint"${lastAdmin ? ' disabled' : ''}>
    ${[...roles].map(([id, name]) => `<option value="${id}"${id === value ? ' selected' : ''}>${escape(name)}</option>`).join('')}</select></label>
    <p class="input-hint" id="role-hint">${lastAdmin ? '此成员是最后一位管理员。先授予其他成员管理员权限，再更改此角色。' : '只读成员可查阅仓库，可写成员还可推送更改，管理员可管理整个实例。'}</p>`;
}

function nameInput(name = '') {
  return `<label class="field" for="display-name">显示名称 <span class="optional">（选填）</span><input id="display-name" name="name" type="text" maxlength="100" value="${escape(name)}" autocomplete="off"></label>`;
}

function showCreateUser() {
  if (state.strictFeishu) return;
  openDialog('create', null, '添加用户', `<label class="field" for="new-username">用户名<input id="new-username" name="username" required type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="48" pattern="[a-z0-9][a-z0-9_\\-]{0,47}" aria-describedby="username-hint"></label>
    <p class="input-hint" id="username-hint">以小写字母或数字开头，可包含连字符或下划线，最多 48 个字符。</p>
    ${nameInput()}${passwordInput('new-password', '初始密码')}${roleInput('writer')}`, '创建用户', {focus: '#new-username'});
}

function showUser(user) {
  const lastAdmin = user.role === 'admin' && state.data.users.filter(member => member.role === 'admin').length === 1;
  openDialog('edit', user, `管理用户 ${user.username}`, `<p class="dialog-intro">创建于 ${time(user.createdAt)} · ${count(user.activeSessions)} 个有效会话 · ${count(user.tokens)} 个访问令牌</p>
    ${nameInput(user.name)}${roleInput(user.role, lastAdmin)}
    ${isSelf(user) && !lastAdmin ? notice('更改自己的管理员角色后，当前账号将返回普通成员权限。') : ''}
    <div class="credential-tools"><h3>账号凭据</h3><div>${state.strictFeishu ? '' : '<button type="button" class="button small" data-dialog="password">重置密码</button>'}
    <button type="button" class="button small quiet-danger" data-dialog="credentials">撤销全部凭据</button></div></div>`, '保存更改', {focus: '#display-name'});
  updateEditButton();
}

function updateEditButton() {
  if (state.dialog?.kind !== 'edit' || state.saving) return;
  const record = state.dialog.record;
  $('#dialog-submit').disabled = $('#display-name').value.trim() === (record.name || '') && $('#edit-role').value === record.role;
}

function showPassword(user) {
  if (state.strictFeishu) return;
  const description = isSelf(user)
    ? '新密码将立即生效。你所有设备的网页会话和访问令牌都将失效，需要重新登录。'
    : '新密码将立即生效。此用户所有设备的网页会话和访问令牌都将失效，Git 客户端需要使用新令牌。';
  openDialog('password', user, `重置 ${user.username} 的密码`, `${notice(description, true)}${passwordInput('reset-password', '新密码')}`, '确认重置并撤销凭据', {danger: true, focus: '#reset-password'});
}

function showRevoke(user) {
  openDialog('credentials', user, `撤销 ${user.username} 的全部凭据？`, `<p class="dialog-intro">此操作将立即注销该用户的所有网页会话，并撤销全部访问令牌。用户可以重新登录并生成新令牌。</p>
    ${detailRows([['用户名', escape(user.username)], ['有效会话', count(user.activeSessions)], ['访问令牌', count(user.tokens)]])}
    ${isSelf(user) ? notice('这是你自己的账号。确认后，本次登录也将结束。', true) : ''}`, '确认撤销凭据', {danger: true, focus: '#dialog-cancel'});
}

function showUnlock(lock) {
  openDialog('unlock', lock, '强制解除文件锁？', `<p class="dialog-intro">解除锁后，其他成员可以锁定此文件。请先和持有人确认编辑进度，以免产生互相冲突的修改。</p>
    ${detailRows([['仓库', escape(lock.repositoryName)], ['文件', `<code dir="auto">${escape(lock.path)}</code>`], ['持有人', escape(lock.ownerName)], ['锁定时间', time(lock.lockedAt)]])}`, '确认强制解锁', {danger: true, focus: '#dialog-cancel'});
}

async function copyLine(button) {
  const code = button.closest('.code-line').querySelector('code');
  let message;
  try {
    await navigator.clipboard.writeText(code.textContent);
    message = '已复制到剪贴板。';
  } catch {
    // HTTP NAS installations can select text even when clipboard access is unavailable.
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    message = '已选中文本，请使用系统复制命令。';
  }
  if (modal.open) {
    let feedback = $('.copy-feedback', modal);
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.className = 'copy-feedback';
      feedback.setAttribute('role', 'status');
      code.closest('.code-line').after(feedback);
    }
    feedback.textContent = message;
  } else {
    toast(message);
  }
}

async function submitDialog(event) {
  event.preventDefault();
  const dialog = state.dialog;
  const submit = $('#dialog-submit');
  if (!dialog || !submit || submit.disabled || state.saving) return;
  const {kind, record} = dialog;
  if (state.strictFeishu && (kind === 'create' || kind === 'password')) return;
  const values = new FormData(event.target);
  const id = record ? encodeURIComponent(record.id) : '';
  const target = `/api/admin/users/${id}`;
  let path, options, success;
  switch (kind) {
    case 'create':
      path = '/api/admin/users';
      options = {method: 'POST', body: {username: values.get('username').trim(), name: values.get('name').trim(), password: values.get('password'), role: values.get('role')}};
      success = '已创建用户。'; break;
    case 'edit': {
      const patch = {};
      const name = values.get('name').trim();
      const role = values.get('role') || record.role;
      if (name !== (record.name || '')) patch.name = name;
      if (role !== record.role) patch.role = role;
      if (!Object.keys(patch).length) return;
      path = target; options = {method: 'PATCH', body: patch}; success = '已保存用户信息。'; break;
    }
    case 'password':
      path = `${target}/password`; options = {method: 'POST', body: {password: values.get('password')}}; success = '已重置密码并撤销该用户的全部凭据。'; break;
    case 'credentials':
      path = `${target}/credentials`; options = {method: 'DELETE'}; success = '已撤销该用户的全部会话和访问令牌。'; break;
    case 'unlock':
      path = `/api/admin/locks/${id}`; options = {method: 'DELETE'}; success = '已解除文件锁。'; break;
    case 'logout':
      path = '/api/logout'; options = {method: 'POST'}; success = '已退出登录。'; break;
    default: return;
  }
  state.saving = true;
  const originalLabel = submit.textContent;
  const activeControls = [...modalContent.querySelectorAll('button:enabled, input:enabled, select:enabled')];
  for (const control of activeControls) control.disabled = true;
  $('#form-error').hidden = true;
  event.target.setAttribute('aria-busy', 'true');
  submit.textContent = '正在处理…';
  try {
    await api(path, options);
    const self = record && isSelf(record);
    const editedSection = state.section;
    closeDialog();
    if (kind === 'logout' || (self && ['password', 'credentials'].includes(kind))) {
      state.session = null;
      gate('signIn', kind === 'logout' ? success : kind === 'password' ? '密码已重置。请使用新密码重新登录。' : '你的会话和访问令牌已撤销，请重新登录。');
      return;
    }
    if (self && kind === 'edit') {
      await start();
      if (state.session?.user?.role !== 'admin') return;
    } else {
      await loadSection({refresh: true});
    }
    if ($('#workspace').hidden) return;
    toast(success);
    if (state.section === editedSection) {
      const tableAction = ['edit', 'password', 'credentials'].includes(kind) ? 'user' : '';
      const rowButton = tableAction && [...page.querySelectorAll('[data-action="user"]')].find(button => button.dataset.id === String(record.id));
      (rowButton || (kind === 'create' ? $('#new-user') : $('#page-title'))).focus({preventScroll: true});
    }
  } catch (error) {
    if (handleAccess(error) || state.dialog !== dialog) return;
    const fieldError = $('#form-error');
    fieldError.textContent = errorMessage(error);
    fieldError.hidden = false;
    for (const control of activeControls) control.disabled = false;
    event.target.setAttribute('aria-busy', 'false');
    submit.textContent = originalLabel;
    submit.focus();
  } finally {
    state.saving = false;
  }
}

modalContent.addEventListener('submit', submitDialog);
modalContent.addEventListener('input', updateEditButton);
modalContent.addEventListener('change', updateEditButton);
modalContent.addEventListener('click', event => {
  const button = event.target.closest('[data-dialog]');
  if (!button || state.saving) return;
  switch (button.dataset.dialog) {
    case 'close': closeDialog(); break;
    case 'password': showPassword(state.dialog.record); break;
    case 'credentials': showRevoke(state.dialog.record); break;
    case 'copy': copyLine(button); break;
  }
});
modal.addEventListener('cancel', event => { event.preventDefault(); if (!state.saving) closeDialog(); });

page.addEventListener('input', event => {
  if (event.target.id === 'list-query') { filters[state.section].query = event.target.value; updateRows(); }
});
page.addEventListener('change', event => {
  if (event.target.id === 'list-filter') { filters[state.section].value = event.target.value; updateRows(); }
});
page.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const {action, id} = button.dataset;
  switch (action) {
    case 'retry': loadSection({refresh: true, focus: true}); break;
    case 'repository': showRepository(byId(state.data.repositories, id)); break;
    case 'user': showUser(byId(state.data.users, id)); break;
    case 'unlock': showUnlock(byId(state.data.locks, id)); break;
    case 'copy': copyLine(button); break;
    case 'clear-filter': {
      const filter = filters[state.section];
      filter.query = ''; filter.value = '';
      renderList(state.section, state.data);
      $('#list-query').focus(); break;
    }
  }
});

$('#refresh').addEventListener('click', () => loadSection({refresh: true}));
$('#new-user').addEventListener('click', showCreateUser);
$('#logout').addEventListener('click', () => openDialog('logout', null, '退出 gitpolar？', '<p class="dialog-intro">确认后将结束当前浏览器的登录会话。</p>', '退出登录', {focus: '#dialog-cancel'}));
$('#mobile-nav').addEventListener('click', event => {
  const open = event.currentTarget.getAttribute('aria-expanded') !== 'true';
  event.currentTarget.setAttribute('aria-expanded', String(open));
  $('#section-nav').classList.toggle('open', open);
});
$('#section-nav').addEventListener('click', event => {
  if (event.target.closest('[aria-current="page"]')) { closeMobileNav(); $('#page-title').focus({preventScroll: true}); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !modal.open && $('#section-nav').classList.contains('open')) {
    closeMobileNav(); $('#mobile-nav').focus();
  }
});
$('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  ($('#workspace').hidden ? $('#gate-panel h1') : $('#content')).focus();
});
window.addEventListener('hashchange', () => loadSection({focus: true}));
window.addEventListener('pageshow', event => { if (event.persisted) start(); });
start();
