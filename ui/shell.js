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
const links = [
  ['/#/', 'home', 'Dashboard'],
  ['/#/profile', 'person', 'Your profile'],
  ['/#/repos', 'repo', 'Repositories'],
  ['/#/issues', 'issue-opened', 'Issues'],
  ['/#/pulls', 'git-pull-request', 'Pull requests'],
  ['/albums/', 'book', '相册'],
  ['/procurement/', 'project', '采购与库存'],
  ['/#/files', 'file', '个人文件'],
  ['/admin/', 'gear', '管理后台'],
];
const go = (href, symbol, title) => `<a href="${href}">${icon(symbol)}<span>${esc(title)}</span></a>`;
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
  shell.innerHTML = `<div class="gp-top"><details class="gp-menu gp-nav-menu"><summary aria-label="打开全局导航">${icon('three-bars')}</summary><nav>${links.map((l) => go(...l)).join('')}</nav></details><a class="gp-brand" href="/#/"><img src="/assets/gitpolar-logo.png" width="32" height="32" alt=""><span>gitpolar</span></a><span class="gp-context">${repo ? esc(repo) : label}</span><form class="gp-search" action="/" method="get"><label>${icon('search')}<input name="q" placeholder="Type / to search" aria-label="搜索工作区"></label></form><a class="gp-icon-button" href="/#/repos" title="Repositories">${icon('repo')}</a><a class="gp-icon-button" href="/#/issues" title="Issues">${icon('issue-opened')}</a><details class="gp-menu gp-account"><summary aria-label="账户菜单"><span class="gp-mini-avatar">P</span></summary><nav></nav></details></div><nav class="gp-tabs">${sub.map(([href, sym, title]) => `<a href="${href}" ${title === label || (page === 'albums' && title === '相册') ? 'aria-current="page"' : ''}>${icon(sym)}${title}</a>`).join('')}</nav>`;
  document.body.prepend(shell);
  fetch('/api/session', { cache: 'no-store', credentials: 'same-origin' })
    .then((r) => r.json())
    .then((data) => {
      session = data;
      const name = data.user?.name || data.user?.username || '飞书登录';
      shell.querySelector('.gp-mini-avatar').textContent = name.slice(0, 1).toUpperCase();
      shell.querySelector('.gp-account nav').innerHTML = `<span class="gp-menu-name">${esc(name)}</span>${links
        .filter((l) => !data.user?.personalOnly || ['/#/', '/#/profile', '/#/files'].includes(l[0]))
        .filter((l) => l[0] !== '/admin/' || data.user?.role === 'admin')
        .map((l) => go(...l))
        .join(
          ''
        )}${go('/#/settings/appearance', 'gear', 'Appearance · 界面预设')}${go('/#/settings/profile', 'person', 'Settings')}`;
      for (const a of shell.querySelectorAll('.gp-nav-menu a,.gp-tabs a'))
        if (
          (a.pathname === '/admin/' && data.user?.role !== 'admin') ||
          (data.user?.personalOnly && !['/#/', '/#/files', '/#/profile'].includes(a.getAttribute('href')))
        )
          a.hidden = true;
    })
    .catch(() => {});
  shell.querySelector('.gp-search').onsubmit = (e) => {
    e.preventDefault();
    location.assign('/#/repos?q=' + encodeURIComponent(e.target.elements.q.value));
  };
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
