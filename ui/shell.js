import { icons } from './icons.js';
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const icon = (name) => {
  const [h, w, path] = icons[name] || icons.info;
  return `<svg class="gp-icon" width="16" height="16" viewBox="0 0 ${w} ${h}" aria-hidden="true">${path}</svg>`;
};
const page = document.body.dataset.uiPage;
const appearance = window.GitpolarAppearance;
let session;
// Use the same deterministic account image as the repository application.
function avatar(name) {
  if(session?.avatars && Object.hasOwn(session.avatars,name)) return `<span class="gp-mini-avatar "><img alt="" src="/api/profiles/${encodeURIComponent(name)}/avatar?v=${encodeURIComponent(session.avatars[name])}"></span>`;
    let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const color = ['#a05bc7', '#218b7c', '#d08940', '#587bd1', '#ce6b85'][hash % 5];
  let cells = '';
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    if ((hash >>> ((y * 3 + x) % 25)) & 1) {
      cells += `<rect x="${x * 6 + 5}" y="${y * 6 + 5}" width="6" height="6"/>`;
      if (x < 2) cells += `<rect x="${(4 - x) * 6 + 5}" y="${y * 6 + 5}" width="6" height="6"/>`;
    }
  }
  return `<span class="gp-mini-avatar" aria-hidden="true"><svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#f0edf3"/><g fill="${color}">${cells}</g></svg></span>`;
}
const links = [
  ['/#/', 'home', 'Dashboard'],
  ['/#/profile', 'person', 'Your profile'],
  ['/#/repos', 'repo', 'Repositories'],
  ['/#/issues', 'issue-opened', 'Issues'],
  ['/#/pulls', 'git-pull-request', 'Pull requests'],
  ['/#/notifications','inbox','Notifications'],
  ['/albums/', 'book', '相册'],
  ['/procurement/', 'project', '采购与库存'],
  ['/#/files', 'file', '个人文件'],
  ['/admin/', 'gear', '管理后台'],
];
const go = (href, symbol, title) => `<a href="${href}">${icon(symbol)}<span>${esc(title)}</span></a>`;
const allowed = (href) =>
  (!session?.user?.personalOnly || ['/#/', '/#/profile', '/#/files'].includes(href) || href.startsWith('/#/settings/')) &&
  (href !== '/admin/' || session?.user?.role === 'admin');
if (page !== 'root' && page !== 'login') {
  const shell = document.createElement('header');
  shell.className = 'gp-global';
  const repo = new URLSearchParams(location.search).get('repo');
  const label = { albums: '相册', procurement: '采购与库存', admin: '管理后台' }[page] || 'Dashboard';
  const sub =
    page === 'albums' && repo
      ? [
          [`/#/repos/${encodeURIComponent(repo)}`, 'code', 'Code'],
          [`/#/repos/${encodeURIComponent(repo)}/graph`, 'git-branch', 'Git Graph'],
          [location.pathname + location.search, 'book', '相册'],
          [location.pathname + location.search + '#/pulls', 'git-pull-request', '相册投稿'],
        ]
      : [
          ['/#/repos', 'repo', 'Repositories'],
          ['/albums/', 'book', '相册'],
          ['/procurement/', 'project', '采购与库存'],
          ['/#/files', 'file', '个人文件'],
          ['/admin/', 'gear', '管理后台'],
        ];
  shell.innerHTML = `<div class="gp-top"><button class="gp-icon-button" type="button" data-shell-open="navigation" aria-label="Open navigation menu" aria-expanded="false" aria-controls="gp-navigation">${icon('three-bars')}</button><a class="gp-brand" href="/#/" aria-label="gitpolar home"><img src="/assets/gitpolar-logo.png" width="32" height="32" alt=""><span>gitpolar</span></a><span class="gp-context">${repo ? esc(repo) : label}</span><form class="gp-search" action="/" method="get"><label>${icon('search')}<input name="q" placeholder="Type / to search" aria-label="搜索工作区"></label></form><a class="gp-icon-button gp-team-shortcut" href="/#/issues" title="Issues" aria-label="Issues">${icon('issue-opened')}</a><a class="gp-icon-button gp-team-shortcut" href="/#/pulls" title="Pull requests" aria-label="Pull requests">${icon('git-pull-request')}</a><a class="gp-icon-button gp-team-shortcut" href="/#/repos" title="Repositories" aria-label="Repositories">${icon('repo')}</a><button class="gp-account" type="button" data-shell-open="account" aria-label="Open user menu" aria-expanded="false" aria-controls="gp-account">${avatar('polar-lab')}</button></div><nav class="gp-tabs" aria-label="Workspace navigation">${sub.map(([href, sym, title]) => `<a href="${href}" ${title === label || (page === 'albums' && title === '相册') ? 'aria-current="page"' : ''}>${icon(sym)}${title}</a>`).join('')}</nav>`;
  document.body.prepend(shell);
  const navigation = document.createElement('dialog');
  navigation.id = 'gp-navigation';
  navigation.className = 'gp-drawer';
  navigation.setAttribute('aria-label', 'Global navigation');
  const account = document.createElement('dialog');
  account.id = 'gp-account';
  account.className = 'gp-drawer gp-account-drawer';
  account.setAttribute('aria-label', 'User menu');
  document.body.append(navigation, account);
  function drawMenus() {
    const user = session?.user;
    const close = `<button class="gp-icon-button" type="button" data-shell-close aria-label="Close menu">${icon('x')}</button>`;
    navigation.innerHTML = `<header><a class="gp-brand" href="/#/"><img src="/assets/gitpolar-logo.png" width="32" height="32" alt=""><span>gitpolar</span></a>${close}</header><nav>${links.filter(([href]) => allowed(href)).map((l) => go(...l)).join('')}</nav><hr><nav>${go('/#/profile/stars','star','Your stars')}${go('/#/settings/appearance','gear','Appearance')}</nav><footer>© 2026 gitpolar</footer>`;
    account.innerHTML = `<header><span class="gp-account-identity">${avatar(user?.username || 'polar-lab')}<span><strong>${esc(user?.username || 'gitpolar')}</strong><small>${esc(user?.name || '飞书登录')}</small></span></span>${close}</header><nav>${[
      ['/#/profile','person','Your profile'],
      ['/#/profile/repositories','repo','Your repositories'],
      ['/#/profile/stars','star','Your stars'],
      ['/#/files','file','Your files'],
      ['/albums/','book','活动相册'],
      ['/procurement/','project','采购与库存'],
    ].filter(([href]) => allowed(href)).map((l) => go(...l)).join('')}</nav><hr><nav>${go('/#/settings/appearance','gear','Appearance')}${go('/#/settings/profile','person','Settings')}${go('/#/settings/tokens','lock','Personal access tokens')}${allowed('/admin/') ? go('/admin/','gear','管理后台') : ''}</nav><hr><nav>${user ? `<button type="button" data-shell-logout>${icon('sign-out')}Sign out</button>` : go('/login/','person','使用飞书登录')}</nav><p class="gp-shell-error" role="status"></p>`;
    for (const a of shell.querySelectorAll('.gp-tabs a,.gp-team-shortcut')) a.hidden = !allowed(a.getAttribute('href'));
    shell.querySelector('.gp-account').innerHTML = avatar(user?.username || 'polar-lab');
  }
  drawMenus();
  for (const trigger of shell.querySelectorAll('[data-shell-open]')) {
    const target = trigger.dataset.shellOpen === 'account' ? account : navigation;
    trigger.onclick = () => { target.showModal(); trigger.setAttribute('aria-expanded','true'); };
    target.addEventListener('close', () => trigger.setAttribute('aria-expanded','false'));
    target.addEventListener('click', (e) => {
      const b = target.getBoundingClientRect();
      if (e.target.closest('[data-shell-close],a') || (e.target === target && (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom))) target.close();
    });
  }
  account.addEventListener('click', async (e) => {
    const button = e.target.closest('[data-shell-logout]');
    if (!button) return;
    button.disabled = true;
    try {
      const response = await fetch('/auth/logout', {method:'POST',credentials:'same-origin'});
      if (!response.ok) throw Error('无法退出，请重试。');
      location.assign('/login/');
    } catch (error) { account.querySelector('[role=status]').textContent = error.message; button.disabled = false; }
  });
  fetch('/api/session', { cache: 'no-store', credentials: 'same-origin' })
    .then((r) => r.json())
    .then((data) => {
      session = data;
      drawMenus();
    })
    .catch(() => {});
  shell.querySelector('.gp-search').onsubmit = (e) => {
    e.preventDefault();
    location.assign('/#/repos?q=' + encodeURIComponent(e.target.elements.q.value));
  };
  addEventListener('keydown', (e) => {
    if (appearance.current.preset === 'github' && e.key === '/' && !e.target.closest('input,textarea,select,[contenteditable=true]') && !document.querySelector('dialog[open]')) {
      e.preventDefault(); shell.querySelector('.gp-search input').focus();
    }
  });
}
// Settings remain reachable when the saved workspace preset is selected.
if (page !== 'root') {
  const picker = document.createElement('details');
  picker.className = 'gp-preset-switch gp-menu';
  picker.innerHTML = `<summary aria-label="切换界面预设">${icon('gear')}<span>界面</span></summary><nav><strong>界面预设</strong><button data-preset="workspace">原版工作区</button><button data-preset="github">GitHub</button><a href="/#/settings/appearance">显示设置</a><p role="status"></p></nav>`;
  document.body.append(picker);
  for (const button of picker.querySelectorAll('button'))
    button.onclick = async () => {
      const selected = button.dataset.preset;
      try {
        await appearance.save({ preset: selected, colorMode: selected === 'workspace' ? 'dark' : 'light' });
        picker.open = false;
      } catch (e) {
        picker.querySelector('p').textContent = e.message;
      }
    };
}
addEventListener('click', (e) => {
  for (const d of document.querySelectorAll('.gp-menu[open]')) if (!d.contains(e.target)) d.open = false;
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') for (const d of document.querySelectorAll('.gp-menu')) d.open = false;
});
