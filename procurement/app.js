const base = '/api/procurement';
const $ = (selector, parent = document) => parent.querySelector(selector);
const view = $('#view');
const dialog = $('#preview-dialog');
const labels = { draft: '草稿', submitted: '待组长审核', approved: '待采购', rejected: '已退回', ordered: '待确认到货', received: '待入库', stocked: '已入库' };
const colors = { submitted: 'amber', approved: 'green', rejected: 'red', ordered: 'blue', received: 'purple', stocked: 'green' };
const roles = { member: '组员', lead: '组长', buyer: '采购', storekeeper: '库管' };
const actionLabels = { create: '创建草稿', update: '修改申请', submit: '提交审核', approve: '审核通过', reject: '退回修改', order: '登记下单', receive: '确认到货', stock: '确认入库' };
const formatter = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });
const dateFormat = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"></use></svg>`;
const enc = value => encodeURIComponent(String(value));
const money = cents => formatter.format(Number(cents || 0) / 100);
const time = value => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : '—';
const selected = (a, b) => String(a) === String(b) ? ' selected' : '';
const option = (value, text, current) => `<option value="${esc(value)}"${selected(value, current)}>${esc(text)}</option>`;
const badge = (text, color = '') => `<span class="badge ${color}">${esc(text)}</span>`;
const stateBadge = state => badge(labels[state] || state, colors[state] || '');
const btnLink = (hash, text, glyph, primary = false) => `<a class="btn${primary ? ' primary' : ''}" href="${esc(hash)}">${glyph ? icon(glyph) : ''}${esc(text)}</a>`;
const cartLink = () => btnLink('#cart', '查看购物车', 'cart');
const refreshButton = '<button type="button" class="btn" data-do="reload">' + icon('refresh') + '刷新</button>';
const additions = () => btnLink('#standard', '添加标准件', 'plus', true) + btnLink('#machining', '导入加工件', 'cube');
const title = (heading, subtitle, right = '') => `<div class="heading"><div><h1>${esc(heading)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${right ? `<div class="actions">${right}</div>` : ''}</div>`;
const panel = (heading, glyph, body, right = '') => `<section class="panel"><div class="panel-head"><h2>${icon(glyph)}${esc(heading)}</h2>${right}</div>${body}</section>`;
const bodyPanel = (heading, glyph, body, right) => panel(heading, glyph, `<div class="panel-body">${body}</div>`, right);
const empty = (glyph, heading, description, actions = '') => `<div class="empty">${icon(glyph)}<h2>${esc(heading)}</h2><p>${esc(description)}</p>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
const loading = message => `<div class="loading" role="status">${esc(message)}</div>`;
const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(x => `<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const errBox = error => `<p class="inline-error" role="alert">${esc(error.message || error)}</p>`;
const fileUrl = id => `${base}/files/${enc(id)}`;
const reqUrl = id => `/requests/${enc(id)}`;
const reqHash = id => `#request/${enc(id)}`;
const inputs = form => Object.fromEntries(new FormData(form));
const toKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
function safeUrl(value, relative = false) {
  try {
    if (!value) return '';
    const url = relative ? new URL(value, location.origin) : new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function cents(value) {
  if (!value) return 0;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('预算单价请用人民币元，最多保留两位小数。');
  const [whole, fraction = ''] = value.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('预算单价过大。');
  return result;
}
const priceInput = value => value == null || value === 0 ? '' : (value / 100).toFixed(2);
const field = (label, control, full = false, hint = '') => `<label class="field${full ? ' full' : ''}"><span>${esc(label)}</span>${control}${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
const pair = (name, value) => `<dt>${esc(name)}</dt><dd>${esc(value || '—')}</dd>`;
const abortError = error => error?.name === 'AbortError';
let session, meta, baskets, storageKey, request, machine, liveViewer, modal, controller;
let serial = 0, saving = false, cartMemoryOnly = false;
const filters = { q: '', state: '', mine: false };
let stockQuery = '', stockKind = '';
function notify(message, error = false) {
  const box = $('#notice');
  box.hidden = false;
  box.classList.toggle('error', error);
  box.innerHTML = `<span>${esc(message)}</span><button type="button" data-do="dismiss" aria-label="关闭提示">${icon('close')}</button>`;
  if (error) box.scrollIntoView({ block: 'nearest' });
}
async function fetchChecked(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  if (response.ok) return response;
  const payload = await response.json().catch(() => null);
  const message = payload?.error?.message || payload?.error || payload?.message || response.statusText;
  const error = new Error(`HTTP ${response.status} · ${message || '请求失败'}`);
  error.status = response.status;
  throw error;
}
async function api(path, { method = 'GET', data, signal } = {}) {
  const response = await fetchChecked(base + path, { method, signal,
    ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) });
  return response.status === 204 ? {} : response.json();
}
function projectManager() { return Boolean(meta?.projectManager || meta?.user?.role === 'admin'); }
function hasRole(role, teamId) {
  return projectManager() || meta.myRoles.some(r => r.role === role && (teamId == null || String(r.teamId) === String(teamId)));
}
function applicantTeams() {
  if (projectManager()) return meta.teams;
  const ids = new Set(meta.myRoles.map(r => String(r.teamId)));
  if (!ids.size) ids.add('mechanical');
  return meta.teams.filter(t => ids.has(String(t.id)));
}
const freshCart = () => ({ title: '', teamId: applicantTeams()[0]?.id ?? '', notes: '', items: [] });
const cart = () => baskets.drafts[baskets.active];
function remember() {
  $('#cart-count').textContent = String(cart().items.length);
  try { sessionStorage.setItem(storageKey, JSON.stringify(baskets)); }
  catch { cartMemoryOnly = true; }
}
function loadCart() {
  storageKey = `gitpolar.procurement.cart.v1:${session.namespace}:${meta.user.id}:${meta.user.username}`;
  try { baskets = JSON.parse(sessionStorage.getItem(storageKey)); } catch { baskets = null; }
  if (!Array.isArray(baskets?.drafts?.local?.items) || !Array.isArray(baskets?.drafts?.[baskets.active]?.items)) {
    baskets = { active: 'local', drafts: { local: freshCart() } };
  }
  remember();
}
function upsertLine(item, key) {
  const items = cart().items;
  if (key) {
    const i = items.findIndex(it => it._key === key);
    if (i < 0) throw new Error('购物车中的原条目已移除。');
    items[i] = { ...item, _key: key };
  } else items.push({ ...item, _key: toKey() });
  remember();
}
function sendLine(it) {
  const output = {};
  for (const key of ['kind', 'name', 'spec', 'quantity', 'unit', 'unitPriceCents', 'url', 'material', 'process', 'fileId', 'drawingFileId', 'threads']) {
    if (it[key] != null && it[key] !== '') output[key] = it[key];
  }
  return output;
}
function flow(state) {
  const steps = [['draft','组员申请'], ['submitted','组长审核'], ['approved','采购下单'], ['ordered','组员收货'], ['received','库管入库']];
  const active = state === 'stocked' ? steps.length : steps.findIndex(([s]) => s === state);
  return `<ol class="flow" aria-label="采购流程">${steps.map(([, name], i) => `<li${i === active ? ' aria-current="step"' : ''} class="${i < active ? 'done' : ''}">${i < active ? icon('check') : ''}${name}</li>`).join('')}</ol>`;
}
function route() {
  const [name, arg, extra] = location.hash.slice(1).split('/');
  if (extra !== undefined) return { name: 'unknown' };
  try { return { name: name || 'requests', key: arg ? decodeURIComponent(arg) : '' }; }
  catch { return { name: 'unknown' }; }
}
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
function stopViews() {
  controller?.abort();
  liveViewer?.dispose();
  liveViewer = null;
  if (dialog.open) closePreview();
}
function authGate() {
  stopViews();
  meta = null; machine = null; baskets = null; request = null;
  $('#tabs').hidden = $('#admin-link').hidden = $('#identity').hidden = true;
  const loginUrl='/login/?returnTo='+encodeURIComponent(location.pathname+location.search+location.hash);
  view.innerHTML = `<section class="gate">${icon('lock')}<h1>使用飞书登录采购工作区</h1><p>点击生成二维码，用飞书扫码确认后自动进入。</p><div class="actions">${btnLink(loginUrl,'飞书扫码登录',null,true)}</div></section>`;
  view.setAttribute('aria-busy', 'false');
}
async function boot() {
  const turn = ++serial;
  stopViews();
  view.setAttribute('aria-busy', 'true');
  view.innerHTML = loading('正在验证登录状态…');
  try {
    const nextSession = await (await fetchChecked('/api/session')).json();
    if (turn !== serial) return;
    session = nextSession;
    if (!session.user) { authGate(); return; }
    const nextMeta = await api('/meta');
    if (turn !== serial) return;
    if (meta && (meta.user.id !== nextMeta.user.id || meta.user.username !== nextMeta.user.username)) {
      machine = null;
      request = null;
      cartMemoryOnly = false;
      Object.assign(filters, { q: '', state: '', mine: false });
      stockQuery = stockKind = remoteQuery = '';
      remotePages = [''];
      $('#notice').hidden = true;
    }
    meta = nextMeta;
    loadCart();
    $('#identity').hidden = $('#tabs').hidden = false;
    $('#admin-link').hidden = $('#permissions-tab').hidden = !projectManager();
    const name = meta.user.name || meta.user.username;
    $('#username').textContent = name;
    $('#avatar').textContent = Array.from(name)[0]?.toUpperCase() || 'U';
    $('#identity').title = `${name} · ${projectManager() ? '项目管理员' : [...new Set(meta.myRoles.map(x => roles[x.role]))].join(' / ') || '组员'}`;
    await render();
  } catch (error) {
    if (turn !== serial) return;
    if (error.status === 401) { authGate(); return; }
    meta = null;
    $('#tabs').hidden = $('#admin-link').hidden = $('#identity').hidden = true;
    showFailure(error, 'boot');
  }
}
function showFailure(error, retry = 'reload') {
  view.innerHTML = `<div class="panel">${empty('alert', '页面加载失败', error.message, `<button class="btn" data-do="${retry}">${icon('refresh')}重新加载</button>`)}</div>`;
  view.setAttribute('aria-busy', 'false');
}
async function render() {
  if (!meta) return;
  const turn = ++serial;
  stopViews();
  controller = new AbortController();
  const signal = controller.signal;
  const { name, key } = route();
  const tab = name === 'request' ? 'requests' : name;
  const tabEl = [...document.querySelectorAll('[data-tab]')].find(el => el.dataset.tab === tab);
  for (const el of document.querySelectorAll('[data-tab]')) {
    if (el === tabEl) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  }
  document.title = `${name === 'request' ? '申请详情' : tabEl?.textContent.trim() || '采购工作区'} · gitpolar`;
  request = null;
  view.setAttribute('aria-busy', 'true');
  try {
    if (name === 'requests') await requestsPage(signal);
    else if (name === 'request' && key) await detailPage(key, signal);
    else if (name === 'inventory') await inventoryPage(signal);
    else if (name === 'permissions') await permissionsPage(signal);
    else if (name === 'cart') cartPage();
    else if (name === 'standard' || name === 'machining') {
      const item = key ? cart().items.find(it => it._key === key && it.kind === name) : null;
      if (key && !item) throw new Error('购物车中找不到此条目，请返回购物车。');
      if (name === 'standard') standardPage(item); else await machiningPage(item, signal);
    } else view.innerHTML = empty('list', '找不到此页面', '可以从申请单继续。', btnLink('#requests', '查看申请单'));
  } catch (error) {
    if (turn !== serial || abortError(error)) return;
    if (error.status === 401) { authGate(); return; }
    showFailure(error);
  } finally { if (turn === serial) view.setAttribute('aria-busy', 'false'); }
}
function searchBox(value, label) {
  return `<label class="search-box">${icon('search')}<input name="q" type="search" maxlength="200" value="${esc(value)}" aria-label="${esc(label)}" placeholder="${esc(label)}"></label>`;
}
async function requestsPage(signal) {
  view.innerHTML = loading('正在读取申请单…');
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.state) params.set('state', filters.state);
  if (filters.mine) params.set('mine', '1');
  const { requests } = await api(`/requests?${params}`, { signal });
  if (signal.aborted) return;
  const filtered = Boolean(filters.q || filters.state || filters.mine);
  const rows = requests.map(row => `<tr><td><div class="item-name"><a href="${esc(reqHash(row.id))}">${esc(row.title)}</a></div><div class="subline">${esc(row.applicantName)} · ${esc(row.teamName)} · ${esc(row.itemCount)} 项</div></td><td>${stateBadge(row.state)}</td><td class="num">${money(row.totalCents)}</td><td class="num">${esc(time(row.updatedAt))}</td></tr>`);
  const filterForm = `<form class="toolbar" id="request-filter">${searchBox(filters.q, '搜索申请单')}<select name="state" aria-label="申请状态">${option('', '全部状态', filters.state)}${Object.entries(labels).map(([s, text]) => option(s, text, filters.state)).join('')}</select><label class="check-row"><input type="checkbox" name="mine"${filters.mine ? ' checked' : ''}>仅我的申请</label><button class="btn">筛选</button>${filtered ? '<button class="text-btn" type="button" data-do="reset-filters">清除</button>' : ''}</form>`;
  view.innerHTML = title('采购申请', '查看标准件和加工件从申请到入库的进度。', additions() + refreshButton) + flow() + `<section class="panel" aria-label="申请单">${filterForm}${rows.length ? table(['申请单', '状态', '已填预算', '更新时间'], rows) : empty('list', filtered ? '没有符合条件的申请' : '还没有采购申请', filtered ? '可以清除筛选条件再查看。' : '把标准件或 STEP 加工件加入购物车，再提交给组长审核。', filtered ? '' : cartLink())}</section>`;
}
function standardPage(item) {
  const it = item || {};
  const form = `<form id="standard-form" data-key="${esc(it._key)}"><div class="fields">
    ${field('标准件名称', `<input name="name" value="${esc(it.name)}" maxlength="120" placeholder="例如：内六角圆柱头螺钉" required>`, true)}
    ${field('型号 / 规格', `<input name="spec" value="${esc(it.spec)}" maxlength="500" placeholder="例如：M4 × 12，304 不锈钢">`, true)}
    ${field('数量', `<input name="quantity" type="number" min="1" max="1000000" step="1" value="${esc(it.quantity ?? 1)}" required>`)}
    ${field('单位', `<input name="unit" value="${esc(it.unit || '件')}" maxlength="16" required>`)}
    ${field('预算单价（元）', `<input name="price" type="text" inputmode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?" value="${esc(priceInput(it.unitPriceCents))}" placeholder="选填">`)}
    ${field('商品链接', `<input name="url" type="url" value="${esc(it.url)}" maxlength="2048" placeholder="https://…" required>`, true, '采购可从申请单打开此链接核对型号和价格。')}
  </div><div class="form-foot">${cartLink()}<button class="btn primary">${icon('cart')}${item ? '保存条目' : '加入购物车'}</button></div></form>`;
  view.innerHTML = title(item ? '编辑标准件' : '添加标准件', '填写采购规格和商品链接。') + `<div class="content-width">${bodyPanel('标准件信息', 'part', form)}</div>`;
}
function saveStandard(form) {
  const f = inputs(form), url = safeUrl(f.url);
  if (!url) throw new Error('请填写完整的 HTTP 或 HTTPS 商品链接。');
  if (!f.name.trim() || !f.unit.trim()) throw new Error('请填写标准件名称和单位。');
  upsertLine({ kind: 'standard', name: f.name.trim(), spec: f.spec.trim(), quantity: Number(f.quantity), unit: f.unit.trim(), unitPriceCents: cents(f.price.trim()), url }, form.dataset.key);
  notify('标准件已保存到购物车。');
  go('#cart');
}

const processes = ['CNC 机加工', '碳板切割', '铝方管加工', '钣金加工', '3D 打印', '金属 3D 打印', '钢件加工', '玻纤板加工'];
const materials = ['铝合金 6061', '铝合金 7075', '碳纤维板', '玻纤板', '不锈钢 304', '45 号钢', 'POM', 'PLA', 'PETG', '尼龙'];
const surfaces = ['按图纸', '本色', '去毛刺', '阳极氧化', '喷砂', '发黑', '镀锌', '喷粉'];
const threadTypes = ['M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'];
const maxFileSize = 64 * 1024 * 1024;
const stem = name => name.replace(/\.[^.]+$/, '').normalize('NFC').toLowerCase();
const faceKey = face => `${face.meshIndex}/${face.faceIndex}`;
const faceLabel = face => `网格 ${face.meshIndex + 1} · 面 ${face.faceIndex + 1}`;
function detailSpecs(spec = '') {
  const notes = new Map(), rest = [];
  let surface = '';
  for (const line of String(spec || '').split('\n')) {
    const match = /^孔备注\[网格 (\d+) · 面 (\d+)\]：(.*)$/.exec(line);
    if (match) notes.set(`${Number(match[1]) - 1}/${Number(match[2]) - 1}`, match[3]);
    else if (line.startsWith('表面处理：') && !surface) surface = line.slice(5);
    else rest.push(line);
  }
  return { notes, surface, spec: rest.join('\n').trim() };
}
function startMachine(item) {
  const it = item || {}, specs = detailSpecs(it.spec);
  return { key: it._key || '', basket: baskets.active, step: null, drawing: null, fileId: it.fileId, drawingFileId: it.drawingFileId,
    stepName: it._stepName || '', drawingName: it._drawingName || '', threads: (it.threads || []).map(t => ({ ...t })), notes: specs.notes,
    values: { name: it.name || '', spec: specs.spec, quantity: it.quantity ?? 1, price: priceInput(it.unitPriceCents),
      material: it.material || '', process: it.process || '', surface: specs.surface }, picked: null, ready: false };
}
function viewerPanel(id, initial) {
  return `<section class="panel"><div class="panel-head"><h2>${icon('cube')}STEP 模型</h2><span class="muted"><span class="swatch"></span>已标注　<span class="swatch picked"></span>已选中</span></div>
    <div class="viewer-stage"><div id="${id}-canvas" class="canvas-host"></div><div id="${id}-status" class="stage-status" role="status">${icon('cube')}<span>${esc(initial)}</span></div></div>
    <div class="viewer-tools" data-viewer="${id}">
      <button class="btn compact" type="button" data-tool="rotate" aria-pressed="true">旋转</button><button class="btn compact" type="button" data-tool="pan" aria-pressed="false">平移</button>
      <button class="btn compact" type="button" data-tool="in" aria-label="放大模型">＋</button><button class="btn compact" type="button" data-tool="out" aria-label="缩小模型">−</button>
      <button class="btn compact" type="button" data-tool="fit">${icon('fit')}适应窗口</button><small>拖动旋转，滚轮缩放</small></div>
    <p id="${id}-meta" class="viewer-meta">模型单位：毫米</p></section>`;
}
function statusText(id, message, error = false) {
  const box = $(`#${id}-status`);
  if (!box) return;
  box.hidden = !message;
  if (message) box.innerHTML = `${icon(error ? 'alert' : 'cube')}<span>${esc(message)}</span>`;
}
function showDimensions(id, info) {
  const size = info.dimensions.map(d => Number(d.toFixed(2))).join(' × ');
  $(`#${id}-meta`).textContent = `外形 X × Y × Z：${size} mm　·　${info.meshCount} 个网格　·　${info.faceCount} 个可标注面`;
}
async function viewerFactory() {
  if (!window.GitpolarProcurementViewer) await import('/procurement-viewer.js');
  if (!window.GitpolarProcurementViewer?.create) throw new Error('请检查 NAS 是否已安装采购预览资源。');
  return window.GitpolarProcurementViewer;
}
function viewerError(error) {
  return /webgl/i.test(error.message) ? '当前浏览器无法启动 WebGL。请启用硬件加速后重新打开模型。' : error.message;
}
function suggest(name, list, value, placeholder) {
  return `<input name="${name}" list="choices-${name}" maxlength="120" value="${esc(value)}" placeholder="${esc(placeholder)}"><datalist id="choices-${name}">${list.map(text => option(text, text)).join('')}</datalist>`;
}
function markList(list, notes, editable) {
  if (!list?.length) return '<p class="muted">还没有螺纹标注。</p>';
  return `<ul class="marks">${list.map((face, i) => `<li><div><div class="mark-title"><button type="button" class="text-btn" data-do="${editable ? 'mark-focus' : 'preview-focus'}" data-index="${i}">${esc(faceLabel(face))}</button>${badge(face.thread, 'green')}<span>${esc(face.through ? '通孔' : `深 ${face.depthMm} mm`)}</span></div>${notes.get(faceKey(face)) ? `<div class="subline">${esc(notes.get(faceKey(face)))}</div>` : ''}</div>${editable ? `<button type="button" class="text-btn" data-do="mark-remove" data-index="${i}" aria-label="移除${esc(faceLabel(face))}标注">移除</button>` : ''}</li>`).join('')}</ul>`;
}
function marksPanel() {
  const m = machine, face = m.picked;
  const prior = face && m.threads.find(t => faceKey(t) === faceKey(face));
  const value = prior?.thread || 'M3', custom = !threadTypes.includes(value);
  return `<div class="panel-head"><h2>${icon('tag')}螺纹孔标注 <span class="counter">${m.threads.length}</span></h2></div><div class="panel-body">
    <p class="muted">点选模型上的孔壁，再填写螺纹规格和深度。无螺纹要求时可直接加入购物车。</p>
    ${face ? `<form id="mark-form" class="mark-section"><div class="mark-title"><strong>${esc(faceLabel(face))}</strong>${badge('当前选中', 'amber')}</div><div class="fields mark-section">
      ${field('螺纹规格', `<select name="threadType">${threadTypes.map(t => option(t, t, value)).join('')}${option('custom', '自定义规格', custom ? 'custom' : value)}</select>`)}
      <label class="field" id="thread-custom"${custom ? '' : ' hidden'}><span>自定义螺纹</span><input name="custom" maxlength="64" placeholder="例如：M10 × 1.25" value="${esc(custom ? value : '')}"${custom ? ' required' : ' disabled'}></label>
      <label class="field"><span>孔类型</span><select name="hole"><option value="through"${prior?.through === false ? '' : ' selected'}>通孔</option><option value="blind"${prior?.through === false ? ' selected' : ''}>盲孔</option></select></label>
      <label class="field" id="thread-depth"${prior?.through === false ? '' : ' hidden'}><span>螺纹深度（mm）</span><input type="number" name="depth" min="0.001" step="any" value="${esc(prior?.depthMm ?? '')}"${prior?.through === false ? ' required' : ' disabled'}></label>
      ${field('孔备注（选填）', `<input name="note" maxlength="160" value="${esc(m.notes.get(faceKey(face)))}" placeholder="例如：从此侧攻丝">`, true)}
    </div><div class="form-foot"><button type="button" class="btn" data-do="mark-cancel">取消选中</button><button class="btn primary">${prior ? '更新标注' : '保存标注'}</button></div></form>` : ''}
    <div class="mark-section">${markList(m.threads, m.notes, true)}</div></div>`;
}
function selectMark(face, focus = false) {
  machine.picked = face;
  liveViewer?.selectFace(face, { focus });
  $('#marks-panel').innerHTML = marksPanel();
}
function saveMark(form) {
  const m = machine, f = inputs(form);
  if (!m.picked || !m.ready) throw new Error('请先在 STEP 模型上点选孔壁。');
  const thread = (f.threadType === 'custom' ? f.custom : f.threadType).trim();
  if (!thread) throw new Error('请填写螺纹规格。');
  const through = f.hole === 'through', depthMm = through ? null : Number(f.depth);
  if (!through && !(depthMm > 0 && Number.isFinite(depthMm))) throw new Error('盲孔需要大于零的深度。');
  const { meshIndex, faceIndex, point } = m.picked;
  const annotation = { meshIndex, faceIndex, point, thread, through, depthMm };
  const key = faceKey(annotation), index = m.threads.findIndex(t => faceKey(t) === key);
  if (index < 0 && m.threads.length >= 200) throw new Error('每个加工件最多可保存 200 处螺纹标注。');
  if (index < 0) m.threads.push(annotation); else m.threads[index] = annotation;
  if (f.note.trim()) m.notes.set(key, f.note.trim()); else m.notes.delete(key);
  liveViewer.setAnnotations(m.threads);
  selectMark(null);
}
function machineForm(m) {
  const v = m.values;
  return `<form id="machine-form"><div class="fields">
    ${field('加工件名称', `<input name="name" value="${esc(v.name)}" maxlength="120" required>`, true)}
    ${field('加工工艺', suggest('process', processes, v.process, '选择或输入工艺'))}
    ${field('材料', suggest('material', materials, v.material, '选择或输入材料'))}
    ${field('表面处理', suggest('surface', surfaces, v.surface, '选择或输入表面处理'), true)}
    ${field('数量（件）', `<input name="quantity" type="number" min="1" max="1000000" step="1" value="${esc(v.quantity)}" required>`)}
    ${field('预算单价（元）', `<input name="price" type="text" inputmode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?" value="${esc(v.price)}" placeholder="可留空待询价">`)}
    ${field('加工要求（选填）', `<textarea name="spec" maxlength="1200" placeholder="填写公差、检验或包装要求">${esc(v.spec)}</textarea>`, true)}
    </div><div class="form-foot"><small>按原始 STEP 保存模型和人工标注。</small><button class="btn primary" id="machine-add" disabled>${icon('cart')}${m.key ? '保存条目' : '加入购物车'}</button></div></form>`;
}
function fileNames(m) {
  return `<div class="subline">${icon('file')}${esc(m.stepName || (m.fileId ? '已保存 STEP' : '尚未选择 STEP'))}</div><div class="subline">${icon('file')}${esc(m.drawingName || (m.drawingFileId ? '已附 DWG' : '无配套 DWG'))}${m.drawing || m.drawingFileId ? '<button class="text-btn" type="button" data-do="remove-dwg">移除 DWG</button>' : ''}</div>`;
}
async function machiningPage(item, signal) {
  if (!machine || machine.key !== (item?._key || '') || machine.basket !== baskets.active) machine = startMachine(item);
  const m = machine;
  m.ready = false;
  const attachments = `<div class="fields">${field('导入 STEP 或同名 STEP + DWG', '<input id="pick-step" type="file" accept=".step,.stp,.dwg" multiple>', true, '每个文件最大 64 MiB，可同时选择一个模型和一张同名图纸。')}${field('补充配套 DWG（选填）', '<input id="pick-drawing" type="file" accept=".dwg">', true)}</div><div id="file-names" class="mark-section">${fileNames(m)}</div>`;
  view.innerHTML = title(item ? '编辑加工件' : '发加工', '导入 STEP，点选需要攻丝的面，完成工艺配置后加入购物车。', `<button type="button" class="btn primary" data-do="choose-step">${icon('upload')}选择 STEP / DWG</button>${cartLink()}`) + `<div class="layout machine-layout"><div class="stack">${viewerPanel('model', '选择 STEP 文件后可在这里旋转、缩放和点选孔壁。')}${bodyPanel('模型与配套图纸', 'upload', attachments)}</div><div class="stack"><section id="marks-panel" class="panel">${marksPanel()}</section>${bodyPanel('加工参数', 'part', machineForm(m))}</div></div>`;
  if (!m.step && !m.fileId) return;
  await loadMachine(m, signal);
}
async function loadMachine(m, signal) {
  try {
    statusText('model', '正在解析 STEP 几何…');
    let bytes;
    if (m.step) bytes = await m.step.arrayBuffer();
    else {
      const response = await fetchChecked(fileUrl(m.fileId), { signal });
      if (!m.stepName) {
        const match = /filename\*=UTF-8''([^;]+)/i.exec(response.headers.get('content-disposition') || '');
        if (match) { try { m.stepName = decodeURIComponent(match[1]); } catch { /* Optional filename. */ } }
      }
      bytes = await response.arrayBuffer();
    }
    const factory = await viewerFactory();
    if (signal.aborted) return;
    const viewer = liveViewer = factory.create($('#model-canvas'), { onPick: selectMark, onUnavailable: message => notify(message, true) });
    const info = await viewer.load(bytes);
    if (signal.aborted || liveViewer !== viewer) return;
    statusText('model', '');
    showDimensions('model', info);
    viewer.setAnnotations(m.threads);
    viewer.selectFace(m.picked);
    m.ready = true;
    $('#machine-add').disabled = false;
    $('#file-names').innerHTML = fileNames(m);
  } catch (error) {
    if (abortError(error) || signal.aborted) return;
    if (error.status === 401) { authGate(); return; }
    statusText('model', viewerError(error), true);
  }
}
function takeFiles(list, drawingOnly) {
  const files = Array.from(list || []);
  if (!files.length) return;
  const steps = files.filter(f => /\.st(e)?p$/i.test(f.name));
  const drawings = files.filter(f => /\.dwg$/i.test(f.name));
  if (files.some(f => f.size > maxFileSize || !f.size)) throw new Error('每个文件必须有内容，且不能超过 64 MiB。');
  if (steps.length + drawings.length !== files.length || steps.length > 1 || drawings.length > 1 || (drawingOnly && steps.length)) throw new Error('一次可导入一个 STEP 和一张同名 DWG。');
  const step = steps[0], drawing = drawings[0], m = machine;
  const modelName = step?.name || m.stepName;
  if (!step && !m.step && !m.fileId) throw new Error('请先选 STEP 或同时选择 STEP 和同名 DWG。');
  if (drawing && modelName && stem(modelName) !== stem(drawing.name)) throw new Error('请选与 STEP 主文件名一致的 DWG。');
  if (step) {
    const oldStem = m.stepName.replace(/\.[^.]+$/, '');
    if (!m.values.name || m.values.name === oldStem) m.values.name = step.name.replace(/\.[^.]+$/, '');
    m.step = step; m.stepName = step.name; m.fileId = null; m.picked = null; m.threads = []; m.notes.clear(); m.ready = false;
    if (!m.drawingName || stem(m.drawingName) !== stem(step.name)) { m.drawing = null; m.drawingName = ''; m.drawingFileId = null; }
  }
  if (drawing) { m.drawing = drawing; m.drawingName = drawing.name; m.drawingFileId = null; }
  if (step) render(); else $('#file-names').innerHTML = fileNames(m);
}
async function upload(file) {
  const response = await fetchChecked(`${base}/files?name=${enc(file.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
  const { file: saved } = await response.json();
  return saved.id;
}
async function saveMachine(form) {
  const m = machine, f = inputs(form);
  if (!m.ready) throw new Error('请先成功载入 STEP 模型。');
  if (m.picked) throw new Error('请先保存当前螺纹标注，或点“取消选中”。');
  if (!f.name.trim()) throw new Error('请填写加工件名称。');
  const spec = [f.spec.trim(), f.surface.trim() ? `表面处理：${f.surface.trim()}` : '', ...m.threads.map(t => {
    const note = m.notes.get(faceKey(t));
    return note ? `孔备注[${faceLabel(t)}]：${note}` : '';
  })].filter(Boolean).join('\n');
  const amount = cents(f.price.trim());
  if (!m.fileId) m.fileId = await upload(m.step);
  if (m.drawing && !m.drawingFileId) m.drawingFileId = await upload(m.drawing);
  upsertLine({ kind: 'machining', name: f.name.trim(), quantity: Number(f.quantity), unit: '件', unitPriceCents: amount, spec,
    material: f.material.trim(), process: f.process.trim(), fileId: m.fileId, drawingFileId: m.drawingFileId,
    threads: m.threads, _stepName: m.stepName, _drawingName: m.drawingName }, m.key);
  machine = null;
  notify('加工件及图纸已保存到购物车。');
  go('#cart');
}

function lineTable(items, context) {
  return table(['条目与规格', '数量', '预算单价', '操作'], items.map((it, i) => {
    const machining = it.kind === 'machining', link = safeUrl(it.url);
    const actions = [];
    if (machining && it.fileId) {
      actions.push(`<button type="button" class="btn compact" data-do="preview" data-source="${context}" data-index="${i}">${icon('cube')}预览与标注</button>`, `<a href="${esc(fileUrl(it.fileId))}" download>STEP</a>`);
      if (it.drawingFileId) actions.push(`<a href="${esc(fileUrl(it.drawingFileId))}" download>DWG</a>`);
    } else if (link) actions.push(`<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">商品链接 ${icon('link')}</a>`);
    if (context === 'cart') {
      actions.push(`<a href="#${machining ? 'machining' : 'standard'}/${enc(it._key)}">编辑</a>`, `<button type="button" class="text-btn" data-do="remove-line" data-index="${i}">移除</button>`);
    }
    return `<tr><td><div class="item-name">${esc(it.name)}</div><div class="subline">${badge(machining ? '加工件' : '标准件')}${machining ? `${esc([it.process, it.material].filter(Boolean).join(' · '))} · ${it.threads?.length || 0} 处螺纹` : ''}</div>${it.spec ? `<div class="subline preserve">${esc(it.spec)}</div>` : ''}</td><td class="num">${esc(it.quantity)} ${esc(it.unit)}</td><td class="num">${it.unitPriceCents ? money(it.unitPriceCents) : '待核价'}</td><td><div class="buttons">${actions.join('')}</div></td></tr>`;
  }));
}
function cartPage() {
  const draft = cart(), editing = draft.requestId != null;
  const teams = editing ? meta.teams.filter(t => String(t.id) === String(draft.teamId)) : applicantTeams();
  const count = draft.items.length, total = draft.items.reduce((sum, it) => sum + (it.unitPriceCents || 0) * it.quantity, 0);
  const form = `<form id="cart-form"><div class="fields">
    ${field('申请标题', `<input name="title" value="${esc(draft.title)}" maxlength="120" required placeholder="例如：底盘装配所需零件">`, true)}
    ${field('所属小组', `<select name="teamId" ${editing ? 'disabled' : 'required'}>${teams.map(t => option(t.id, t.name, draft.teamId)).join('')}</select>`, true)}
    ${field('申请说明（选填）', `<textarea name="notes" maxlength="2000" placeholder="用途、期望到货日期等">${esc(draft.notes)}</textarea>`, true)}
    </div><div class="mark-section"><div class="metric"><span>已填预算小计</span><strong>${money(total)}</strong></div>${draft.items.some(it => !it.unitPriceCents) ? '<small>含待核价条目，最终金额以采购订单为准。</small>' : ''}</div>
    <div class="form-foot"><button class="btn" name="intent" value="save"${count ? '' : ' disabled'}>${editing ? '保存修改' : '保存草稿'}</button><button class="btn primary" name="intent" value="submit"${count ? '' : ' disabled'}>${icon('check')}提交组长审核</button></div></form>`;
  const subtitle = editing ? '正在修改已有申请，保存后可再次提交审核。' : '将标准件与加工件合并成一张采购申请。';
  view.innerHTML = title(editing ? '编辑申请' : '购物车', subtitle, additions()) + `<div class="layout"><div class="stack">${panel(`采购条目（${count}）`, 'cart', count ? lineTable(draft.items, 'cart') : empty('cart', '购物车为空', '先添加标准件，或上传 STEP 加工件。'))}${editing ? '<div><button class="text-btn" data-do="local-cart">返回独立购物车</button></div>' : ''}</div>${bodyPanel('申请信息', 'file', form)}</div><p class="subline">${cartMemoryOnly ? '当前浏览器仅能临时保存购物车，请在关闭前保存草稿。' : '购物车保存在当前标签页，保存草稿后可从其他设备查看。'}</p>`;
}
async function saveCart(form, submit) {
  const current = cart(), key = baskets.active;
  if (!current.items.length) throw new Error('请先加入一个采购条目。');
  const f = inputs(form), payload = { title: f.title.trim(), notes: f.notes.trim(), items: current.items.map(sendLine) };
  if (!payload.title) throw new Error('请填写申请标题。');
  if (current.requestId == null) payload.teamId = f.teamId;
  const saved = current.requestId == null
    ? await api('/requests', { method: 'POST', data: payload })
    : await api(reqUrl(current.requestId), { method: 'PATCH', data: payload });
  // The draft now exists on the NAS. On a failed submit, retry its action, never recreate the cart.
  const id = saved.request.id;
  if (key === 'local') baskets.drafts.local = freshCart(); else delete baskets.drafts[key];
  baskets.active = 'local';
  machine = null;
  remember();
  if (submit) {
    try { await api(`${reqUrl(id)}/actions`, { method: 'POST', data: { action: 'submit' } }); }
    catch (error) {
      notify(`草稿已保存，提交审核失败。${error.message}`, true);
      go(reqHash(id));
      return;
    }
  }
  notify(submit ? '申请已提交组长审核。' : '申请已保存。');
  go(reqHash(id));
}
function editRequest() {
  const key = `request-${request.id}`;
  if (!baskets.drafts[key]) {
    baskets.drafts[key] = { requestId: request.id, title: request.title, notes: request.notes || '', teamId: request.teamId,
      items: request.items.map(it => ({ ...sendLine(it), _key: toKey(), _stepName: it.fileName || '', _drawingName: it.drawingFileName || '' })) };
  }
  baskets.active = key;
  machine = null;
  remember();
  go('#cart');
}
function mayEdit(row) {
  return (projectManager() || String(row.applicantId) === String(meta.user.id)) && ['draft', 'rejected'].includes(row.state);
}
function actionsFor(row) {
  const owner = String(row.applicantId) === String(meta.user.id);
  if (mayEdit(row)) return ['submit'];
  if (row.state === 'submitted' && (projectManager() || (!owner && hasRole('lead', row.teamId)))) return ['approve', 'reject'];
  if (row.state === 'approved' && hasRole('buyer')) return ['order'];
  if (row.state === 'ordered' && (owner || projectManager())) return ['receive'];
  if (row.state === 'received' && hasRole('storekeeper')) return ['stock'];
  return [];
}
function actionForm(actions) {
  if (!actions.length) return '';
  const names = { submit: '提交组长审核', approve: '通过审核', reject: '退回修改', order: '确认已下单', receive: '确认已到货', stock: '确认入库' };
  let fields = '';
  if (actions.includes('order')) {
    fields += field('采购单号 / 订单号', '<input name="orderReference" maxlength="120" required>', true);
    fields += field('供应商（选填）', '<input name="supplier" maxlength="120">', true);
    fields += field('物流单号（选填）', '<input name="trackingNumber" maxlength="120">', true);
  }
  if (actions.includes('stock')) fields += field('入库库位', '<input name="location" maxlength="120" placeholder="例如：机械库 A-03" required>', true);
  fields += field('操作备注', '<textarea name="note" maxlength="1000" placeholder="审批意见、收货情况等"></textarea>', true);
  return bodyPanel('处理申请', 'check', `<form id="action-form" class="action-form"><div class="fields">${fields}</div><div class="actions">${actions.map(a => `<button class="btn ${a === 'reject' ? 'danger' : 'primary'}" name="action" value="${a}">${names[a]}</button>`).join('')}</div></form>`);
}
const eventNames = { ...labels, ...actionLabels, created: '创建草稿', updated: '修改申请', edit: '修改申请', resubmit: '重新提交' };
async function detailPage(id, signal) {
  view.innerHTML = loading('正在读取申请详情…');
  const result = await api(reqUrl(id), { signal });
  if (signal.aborted) return;
  const row = request = result.request;
  const timeline = row.events.length ? `<ol class="timeline">${row.events.map(event => `<li>${icon('clock')}<div><strong>${esc(eventNames[event.action] || event.action)}</strong> · ${esc(event.actorName)} ${event.adminOverride ? badge('项管代办') : ''}<div class="subline">${esc(time(event.createdAt))}</div>${event.note ? `<p class="preserve">${esc(event.note)}</p>` : ''}</div></li>`).join('')}</ol>` : '<p class="muted">暂无操作记录。</p>';
  const data = `<dl class="data-pairs">${pair('申请人', row.applicantName)}${pair('所属小组', row.teamName)}${pair('创建时间', time(row.createdAt))}${pair('已填预算', money(row.totalCents))}${row.orderReference ? pair('订单号', row.orderReference) : ''}${row.supplier ? pair('供应商', row.supplier) : ''}${row.trackingNumber ? pair('物流单号', row.trackingNumber) : ''}</dl>`;
  const canEdit = mayEdit(row), actions = actionsFor(row);
  view.innerHTML = `<div class="breadcrumb"><a href="#requests">${icon('back')} 采购申请</a></div>` + title(row.title, '', stateBadge(row.state) + (canEdit ? '<button class="btn" data-do="edit-request">编辑申请</button>' : '') + refreshButton) + flow(row.state) + `<div class="layout"><div class="stack">${panel(`申请条目（${row.items.length}）`, 'list', lineTable(row.items, 'request'))}${row.notes ? bodyPanel('申请说明', 'file', `<p class="preserve">${esc(row.notes)}</p>`) : ''}${bodyPanel('操作记录', 'clock', timeline)}</div><div class="stack">${bodyPanel('申请信息', 'file', data)}${actionForm(actions)}</div></div>`;
}
async function applyAction(form, action) {
  if (!action || !actionsFor(request).includes(action)) throw new Error('当前账号或申请状态不支持此操作，请刷新申请单。');
  const f = inputs(form);
  if (action === 'reject' && !f.note.trim()) throw new Error('请填写退回原因，便于申请人修改。');
  const data = { action };
  for (const key of ['note', 'supplier', 'orderReference', 'trackingNumber', 'location']) if (f[key]?.trim()) data[key] = f[key].trim();
  const id = request.id;
  await api(`${reqUrl(id)}/actions`, { method: 'POST', data });
  delete baskets.drafts[`request-${id}`];
  if (baskets.active === `request-${id}`) baskets.active = 'local';
  remember();
  notify(`已完成${actionLabels[action]}。`);
  await render();
}
function disposeModal() {
  if (!modal) return;
  modal.controller.abort();
  modal.viewer?.dispose();
  modal = null;
  $('#preview-content').replaceChildren();
}
function closePreview() {
  if (dialog.open) dialog.close();
  disposeModal();
}
function pickPreview(face, focus = false) {
  if (!modal) return;
  modal.viewer?.selectFace(face, { focus });
  const mark = (modal.item.threads || []).find(t => faceKey(t) === faceKey(face));
  $('#preview-pick').textContent = `${faceLabel(face)} · ${mark ? `${mark.thread} · ${mark.through ? '通孔' : `深 ${mark.depthMm} mm`}` : '此面无螺纹标注'}`;
}
async function openPreview(item) {
  if (!item?.fileId) throw new Error('此条目没有 STEP 附件。');
  if (dialog.open) closePreview();
  const ctx = modal = { item, controller: new AbortController(), viewer: null };
  const signal = ctx.controller.signal;
  $('#preview-content').innerHTML = `<div class="dialog-head"><h2 id="preview-title">${esc(item.name)} · 加工预览</h2><button class="btn compact" data-do="close-preview" aria-label="关闭预览">${icon('close')}</button></div><div class="dialog-body stack">${viewerPanel('preview', '正在读取原始 STEP…')}${bodyPanel('已保存的螺纹标注', 'tag', `<p id="preview-pick" class="muted">点击面或标注可定位。</p>${markList(item.threads, detailSpecs(item.spec).notes, false)}`)}<div class="actions"><a class="btn" href="${esc(fileUrl(item.fileId))}" download>下载 STEP</a>${item.drawingFileId ? `<a class="btn" href="${esc(fileUrl(item.drawingFileId))}" download>下载配套 DWG</a>` : ''}</div></div>`;
  dialog.showModal();
  try {
    const [response, factory] = await Promise.all([fetchChecked(fileUrl(item.fileId), { signal }), viewerFactory()]);
    const buffer = await response.arrayBuffer();
    if (signal.aborted) return;
    const viewer = ctx.viewer = factory.create($('#preview-canvas'), { onPick: pickPreview, onUnavailable: message => { $('#preview-pick').textContent = message; } });
    const info = await viewer.load(buffer);
    if (signal.aborted) return;
    viewer.setAnnotations(item.threads || []);
    showDimensions('preview', info);
    statusText('preview', '');
  } catch (error) {
    if (abortError(error) || signal.aborted) return;
    statusText('preview', viewerError(error), true);
  }
}
function viewerTool(button) {
  const toolbar = button.closest('[data-viewer]');
  const viewer = toolbar.dataset.viewer === 'model' ? liveViewer : modal?.viewer;
  if (!viewer) return;
  switch (button.dataset.tool) {
    case 'fit': viewer.fit(); break;
    case 'in': viewer.zoom(1.25); break;
    case 'out': viewer.zoom(0.8); break;
    default:
      viewer.setMode(button.dataset.tool);
      for (const btn of toolbar.querySelectorAll('[aria-pressed]')) btn.setAttribute('aria-pressed', String(btn === button));
  }
}

let remoteQuery = '', remotePages = [''], nextRemotePage = '';
const syncNames = { pending: '待同步', synced: '已同步', failed: '同步失败' };
function stockRows(items, remote = false) {
  if (!items.length) return empty('stock', '没有符合条件的库存', remote ? '可以调整关键词再查询。' : '完成入库后，物料数量和库位会显示在这里。');
  const headers = ['物料名称', '规格', '库存数量', '库位'];
  if (!remote) headers.push('更新时间');
  return table(headers, items.map(it => `<tr><td class="item-name">${esc(it.name)}</td><td class="preserve">${esc(it.spec || '—')}</td><td class="num">${esc(it.quantity)} ${esc(it.unit)}</td><td>${esc(it.location || '—')}</td>${remote ? '' : `<td class="num">${esc(time(it.updatedAt))}</td>`}</tr>`));
}
function receiptRows(receipts) {
  if (!receipts.length) return empty('clock', '暂无入库流水', '入库后可在此查看经手人和飞书同步状态。');
  return table(['物料 / 申请单', '数量', '库位', '经手人', '时间', '飞书流水'], receipts.map(receipt => `<tr><td><a class="item-name" href="${esc(reqHash(receipt.requestId))}">${esc(receipt.itemName)}</a></td><td>${esc(receipt.quantity)}</td><td>${esc(receipt.location)}</td><td>${esc(receipt.actorName)}</td><td class="num">${esc(time(receipt.createdAt))}</td><td>${badge(syncNames[receipt.feishuStatus] || receipt.feishuStatus || '未知', ({ synced: 'green', failed: 'red', pending: 'amber' })[receipt.feishuStatus])}</td></tr>`));
}
function syncPanel(status) {
  const sync = hasRole('storekeeper') && status.baseConfigured ? '<button type="button" class="btn compact" data-do="sync-feishu">同步入库流水</button>' : '';
  const counts = `<div class="subline">待同步 ${esc(status.pending)} 条 · 已同步 ${esc(status.synced)} 条 · 失败 ${esc(status.failed)} 条</div>`;
  const statusLabel = status.baseConfigured ? badge('流水表已配置', 'green') : badge('流水表未配置', 'amber');
  return bodyPanel('飞书入库流水', 'refresh', `<div class="actions">${statusLabel}${sync}</div>${!status.baseConfigured ? `<p class="subline">${status.configured ? '已配置飞书应用，还需配置入库流水表。' : '在 NAS 配置飞书应用和入库流水表后可同步。'}</p>` : ''}${counts}${status.lastError ? `<p class="subline">最近错误 · ${esc(status.lastError)}</p>` : ''}`);
}
async function inventoryPage(signal) {
  const remote = route().key === 'feishu';
  view.innerHTML = title('物料库存', '按物料名称或规格查询数量和库位。') + `<div class="stack"><div class="actions">${remote ? btnLink('#inventory', '本地库存', 'stock') : badge('本地库存', 'blue')}${remote ? badge('飞书现有库存', 'blue') : btnLink('#inventory/feishu', '飞书现有库存', 'layers')}</div><section class="panel"><form class="toolbar" id="inventory-filter">${searchBox(remote ? remoteQuery : stockQuery, '搜索名称或规格')}${remote ? '' : `<select name="kind" aria-label="物料类别">${option('', '全部类别', stockKind)}${option('standard', '仅标准件', stockKind)}${option('machining', '仅加工件', stockKind)}</select>`}<button class="btn">查询</button></form><div id="stock-results">${loading('正在读取库存…')}</div></section><div id="stock-extra" class="stack"></div><div id="sync-status">${loading('正在读取飞书配置状态…')}</div></div>`;
  async function drawSync() {
    try {
      const status = await api('/feishu/status', { signal });
      if (!signal.aborted) $('#sync-status').innerHTML = syncPanel(status);
      return status;
    } catch (error) {
      if (!signal.aborted) $('#sync-status').innerHTML = errBox(error);
      if (error.status === 401) throw error;
      return null;
    }
  }
  async function drawLocal() {
    const { items, receipts } = await api(`/inventory?q=${enc(stockQuery)}&kind=${enc(stockKind)}`, { signal });
    if (signal.aborted) return;
    $('#stock-results').innerHTML = stockRows(items);
    $('#stock-extra').innerHTML = panel('入库流水', 'clock', receiptRows(receipts));
  }
  if (!remote) { await Promise.all([drawLocal(), drawSync()]); return; }
  nextRemotePage = '';
  const status = await drawSync();
  if (signal.aborted) return;
  if (status && status.inventoryConfigured === false) {
    $('#stock-results').innerHTML = empty('layers', '飞书库存表尚未配置', '请由项管在 NAS 配置现有仓库表及其字段映射。');
    return;
  }
  const query = new URLSearchParams({ q: remoteQuery });
  const token = remotePages.at(-1);
  if (token) query.set('pageToken', token);
  try {
    const data = await api(`/feishu/inventory?${query}`, { signal });
    if (signal.aborted) return;
    nextRemotePage = data.hasMore ? data.nextPageToken || '' : '';
    $('#stock-results').innerHTML = stockRows(data.items, true);
    $('#stock-extra').innerHTML = `<div class="buttons"><button type="button" class="btn" data-do="remote-prev"${remotePages.length === 1 ? ' disabled' : ''}>上一页</button><span class="muted">第 ${remotePages.length} 页</span><button type="button" class="btn" data-do="remote-next"${nextRemotePage ? '' : ' disabled'}>下一页</button></div>`;
  } catch (error) {
    if (signal.aborted) return;
    if (error.status === 401) throw error;
    $('#stock-results').innerHTML = empty('alert', '无法读取飞书现有库存', error.message, '<button class="btn" data-do="reload">重试</button>');
  }
}
async function syncFeishu() {
  const result = await api('/feishu/sync', { method: 'POST', data: {} });
  notify(`入库流水同步完成。已同步 ${result.synced} 条，失败 ${result.failed} 条，待同步 ${result.pending} 条。`, result.failed > 0);
  await render();
}
async function permissionsPage(signal) {
  if (!projectManager()) {
    view.innerHTML = empty('lock', '需要项目管理员权限', '团队和采购角色由项目管理员分配。', btnLink('#requests', '返回申请单'));
    return;
  }
  view.innerHTML = loading('正在读取团队和权限…');
  const current = await api('/meta', { signal });
  if (signal.aborted) return;
  meta = current;
  if (!projectManager()) { $('#permissions-tab').hidden = $('#admin-link').hidden = true; return permissionsPage(signal); }
  const assignmentForm = `<form id="assignment-form"><div class="fields">
    ${field('用户', `<select name="userId" required><option value="">选择账号</option>${meta.users.map(u => option(u.id, u.name && u.name !== u.username ? `${u.name} (${u.username})` : u.username)).join('')}</select>`, true)}
    ${field('所属小组', `<select name="teamId" required>${meta.teams.map(t => option(t.id, t.name)).join('')}</select>`)}
    ${field('采购角色', `<select name="role" required>${Object.entries(roles).map(([r, text]) => option(r, text)).join('')}</select>`)}
    </div><div class="form-foot"><button class="btn primary">保存权限</button></div></form>`;
  const teamForm = `<form id="team-form"><div class="fields">
    ${field('小组名称', '<input name="name" maxlength="64" placeholder="例如：电控组" required>')}
    ${field('小组标识', '<input name="id" maxlength="48" placeholder="例如：control" required>')}
    </div><div class="form-foot"><button class="btn">创建小组</button></div></form>`;
  const assigned = meta.assignments.length ? table(['账号', '小组', '采购角色'], meta.assignments.map(a => `<tr><td>${esc(a.username)}</td><td>${esc(a.teamName)}</td><td>${badge(roles[a.role] || a.role)}</td></tr>`)) : empty('team', '暂无显式分配的角色', '未分配的账号使用默认机械组组员权限。');
  view.innerHTML = title('团队权限', '项目管理员可分配组员、组长、采购和库管角色。', btnLink('/admin/', '账号管理', 'team')) + `<div class="layout"><div class="stack">${panel('已分配权限', 'team', assigned)}${bodyPanel('已有小组', 'layers', `<div class="actions">${meta.teams.map(t => badge(t.name)).join('')}</div>`)}</div><div class="stack">${bodyPanel('分配采购角色', 'lock', assignmentForm)}${bodyPanel('创建小组', 'plus', teamForm)}</div></div>`;
}
async function write(button, handler) {
  if (saving) return;
  saving = true;
  const previous = button ? [...button.childNodes] : [];
  if (button) { button.disabled = true; button.textContent = '正在保存…'; }
  view.inert = true;
  $('#tabs').inert = true;
  try { await handler(); }
  catch (error) {
    if (error.status === 401) authGate();
    notify(error.message || '未能完成操作。', true);
  } finally {
    saving = false;
    view.inert = false;
    $('#tabs').inert = false;
    if (button?.isConnected) { button.disabled = false; button.replaceChildren(...previous); }
  }
}
function showInput(form, selector, control, show) {
  $(selector, form).hidden = !show;
  const input = form.elements.namedItem(control);
  input.disabled = !show;
  input.required = show;
}
function saveFormTyping(element) {
  const form = element.form;
  if (form?.id === 'cart-form' && ['title', 'notes', 'teamId'].includes(element.name)) {
    cart()[element.name] = element.value;
    remember();
  }
  if (form?.id === 'machine-form' && Object.hasOwn(machine.values, element.name)) machine.values[element.name] = element.value;
}
view.addEventListener('input', event => saveFormTyping(event.target));
view.addEventListener('change', event => {
  const el = event.target;
  try {
    saveFormTyping(el);
    if (el.id === 'pick-step' || el.id === 'pick-drawing') { takeFiles(el.files, el.id === 'pick-drawing'); el.value = ''; }
    if (el.form?.id === 'mark-form') {
      if (el.name === 'threadType') showInput(el.form, '#thread-custom', 'custom', el.value === 'custom');
      if (el.name === 'hole') showInput(el.form, '#thread-depth', 'depth', el.value === 'blind');
    }
  } catch (error) { if (el.type === 'file') el.value = ''; notify(error.message, true); }
});
view.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target, button = event.submitter, intent = button?.value;
  try {
    switch (form.getAttribute('id')) {
      case 'request-filter': {
        const f = inputs(form);
        Object.assign(filters, { q: f.q.trim(), state: f.state, mine: Boolean(f.mine) });
        await render(); return;
      }
      case 'inventory-filter': {
        const q = inputs(form).q.trim();
        if (route().key === 'feishu') { remoteQuery = q; remotePages = ['']; } else { stockQuery = q; stockKind = inputs(form).kind || ''; }
        await render(); return;
      }
      case 'mark-form': saveMark(form); return;
      case 'standard-form': saveStandard(form); return;
      case 'machine-form': await write(button, () => saveMachine(form)); return;
      case 'cart-form': await write(button, () => saveCart(form, intent === 'submit')); return;
      case 'action-form': await write(button, () => applyAction(form, intent)); return;
      case 'team-form': await write(button, async () => {
        await api('/teams', { method: 'POST', data: inputs(form) });
        notify('小组已创建。'); await render();
      }); return;
      case 'assignment-form': await write(button, async () => {
        const f = inputs(form);
        await api('/assignments', { method: 'PUT', data: { userId: Number(f.userId), teamId: f.teamId, role: f.role } });
        notify('采购角色已保存。'); await render();
      }); return;
    }
  } catch (error) { notify(error.message, true); }
});
document.addEventListener('click', async event => {
  const el = event.target.closest('button[data-do],button[data-tool]');
  if (!el) return;
  try {
    if (el.dataset.tool) { viewerTool(el); return; }
    const index = Number(el.dataset.index);
    switch (el.dataset.do) {
      case 'dismiss': $('#notice').hidden = true; return;
      case 'boot': await boot(); return;
      case 'reload': await render(); return;
      case 'reset-filters': Object.assign(filters, { q: '', state: '', mine: false }); await render(); return;
      case 'remove-line': cart().items.splice(index, 1); remember(); cartPage(); return;
      case 'choose-step': $('#pick-step').click(); return;
      case 'remove-dwg': machine.drawing = null; machine.drawingName = ''; machine.drawingFileId = null; $('#file-names').innerHTML = fileNames(machine); return;
      case 'mark-cancel': selectMark(null); return;
      case 'mark-focus': selectMark(machine.threads[index], true); return;
      case 'mark-remove': {
        const [removed] = machine.threads.splice(index, 1);
        machine.notes.delete(faceKey(removed));
        liveViewer?.setAnnotations(machine.threads); selectMark(null); return;
      }
      case 'preview': await openPreview((el.dataset.source === 'cart' ? cart() : request).items[index]); return;
      case 'preview-focus': pickPreview(modal.item.threads[index], true); return;
      case 'close-preview': closePreview(); return;
      case 'edit-request': editRequest(); return;
      case 'local-cart': baskets.active = 'local'; machine = null; remember(); cartPage(); return;
      case 'sync-feishu': await write(el, syncFeishu); return;
      case 'remote-next': if (nextRemotePage) { remotePages.push(nextRemotePage); await render(); } return;
      case 'remote-prev': if (remotePages.length > 1) { remotePages.pop(); await render(); } return;
    }
  } catch (error) { notify(error.message, true); }
});
dialog.addEventListener('close', () => { if (!dialog.open) disposeModal(); });
$('.skip').addEventListener('click', event => { event.preventDefault(); $('#main').focus(); });
window.addEventListener('hashchange', () => { if (meta) render(); else boot(); });
window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
document.addEventListener('visibilitychange', async () => {
  if (document.hidden || saving) return;
  const turn = serial;
  try {
    const current = await (await fetchChecked('/api/session')).json();
    if (turn === serial && (current.user?.id ?? null) !== (meta?.user?.id ?? null)) await boot();
  } catch { /* The current form stays available if session revalidation is offline. */ }
});
boot();
