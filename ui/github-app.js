/* GitHub preset views. Existing repository/CAD tools remain the source of actions. */
(() => {
  let current,
    profileCache = new Map(),
    requestCache = new Map(),
    feed = 'all';
  const A = () => window.GitpolarAppearance;
  const isGithub = () => A()?.current.preset === 'github';
  const panel = (body, extra = '') => `<section class="gh-box ${extra}">${body}</section>`;
  function empty(c, title, description, icon = 'repo') {
    return `<div class="gh-empty">${c.icon(icon, 28)}<h2>${c.escape(title)}</h2><p>${c.escape(description)}</p></div>`;
  }
  function recent(c) {
    return [...c.repos].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }
  const canTeam = (c) => !c.session?.user?.personalOnly;
  function profileHref(c, tab = '', username = c.session?.user?.username || 'polar-lab') {
    return '#/users/' + encodeURIComponent(username) + (tab ? '/' + tab : '');
  }
  function catalogCard(c, r, editable = true) {
    return `<article class="gh-pinned"><div>${c.icon('repo')}<a href="${c.repoHref(r.name)}">${c.escape(r.name)}</a><span class="label">Internal</span>${editable ? `<button class="gh-pin-option" data-gh-action="pins" title="自定义置顶仓库" aria-label="自定义置顶仓库">${c.icon('kebab-horizontal')}</button>` : ''}</div><p>${c.escape(r.description || '')}</p><footer><span><i class="language-dot ${r.kind === 'album' ? 'lang-photos' : 'lang-markdown'}"></i>${r.kind === 'album' ? 'Photos' : r.kind === 'solidworks' ? 'SolidWorks' : 'Files'}</span><span>${c.icon('star')}${r.starCount || 0}</span><span>${c.icon('git-branch')}${r.branchList?.length || 1}</span></footer></article>`;
  }
  function extraLinks(c) {
    if (!canTeam(c)) return '';
    return `<a href="/albums/">${c.icon('book')}活动相册</a><a href="/procurement/">${c.icon('project')}采购与库存</a>${c.session?.user?.role === 'admin' ? `<a href="/admin/">${c.icon('gear')}管理后台</a>` : ''}`;
  }
  function loadCached(c, key, url, map, force = false) {
    if (force) map.delete(key);
    if (!map.has(key)) {
      const value = { loading: true };
      map.set(key, value);
      c.api(url)
        .then((data) => {
          if (map.get(key) !== value) return;
          map.set(key, { data });
          if (current && location.hash === current.hash) current.rerender();
        })
        .catch((e) => {
          if (map.get(key) !== value) return;
          map.set(key, { error: e.message });
          if (current && location.hash === current.hash) current.rerender();
        });
    }
    return map.get(key);
  }
  function albumPulls(c) {
    if (!c.onServer || !canTeam(c)) return [];
    const albums = c.repos.filter((r) => r.kind === 'album');
    return albums.flatMap((repo) => {
      const result = loadCached(c, repo.name, 'repos/' + repo.name + '/album/pulls', requestCache);
      return (result.data?.pulls || []).map((p) => ({ ...p, repo: repo.name }));
    });
  }
  function dashboard(c) {
    current = c;
    const user = c.session?.user || { username: 'polar-lab', name: 'polar-lab' },
      all = recent(c),
      mine = all.filter((r) => r.creator?.id === user.id || r.starred || c.pinned.includes(r.name)),
      top = mine.length ? mine : all;
    const requests = albumPulls(c),
      open = requests.filter((p) => p.state === 'open');
    const feedItems = [];
    if (feed === 'all' || feed === 'repos')
      for (const r of all)
        feedItems.push({
          date: r.updatedAt || '',
          html: `<article class="gh-feed-card"><header><a class="gh-actor" href="${profileHref(c, '', r.creator?.username || user.username)}">${c.avatar(r.commit?.author || r.owner, 'large')}<strong>${c.escape(r.commit?.author || r.creator?.name || r.owner)}</strong></a><span>${r.empty ? 'created a repository' : 'pushed to'} <a href="${c.repoHref(r.name)}">${c.escape(r.owner)}/${c.escape(r.name)}</a></span><small>${c.escape(r.updated)}</small></header>${panel(`<div class="gh-feed-title"><a href="${c.repoHref(r.name)}">${c.icon('repo')}${c.escape(r.owner)} / <strong>${c.escape(r.name)}</strong></a>${c.starButton(r)}</div><p>${c.escape(r.description || '')}</p><div class="gh-commit-line">${c.icon('git-commit')}<a href="${c.repoHref(r.name, 'graph')}">${c.escape(r.commit?.message || 'Initial commit')}</a><code>${c.escape(r.commit?.hash || '')}</code></div><footer><span>${c.icon('git-branch')}${c.escape(r.defaultBranch || 'main')}</span><span>${c.icon('star')} ${r.starCount || 0}</span>${r.kind === 'album' ? `<a href="/albums/?repo=${encodeURIComponent(r.name)}">打开相册 →</a>` : ''}</footer>`)}</article>`,
        });
    if (feed === 'all' || feed === 'issues')
      for (const t of c.tickets.slice(0, 12))
        feedItems.push({
          date: t.createdAt || t.updatedAt || '',
          html: `<article class="gh-feed-card"><header>${c.avatar(t.author, 'large')}<strong>${c.escape(t.author)}</strong><span>opened an issue in <a href="${c.repoHref(t.repo)}">${c.escape(t.repo)}</a></span></header>${panel(`<div class="gh-feed-title"><a href="${c.repoHref(t.repo, 'issues')}/${t.id}">${c.icon('issue-opened')} ${c.escape(t.title)} <span class="muted">#${t.id}</span></a></div><p>${c.escape(t.body?.slice(0, 180) || '')}</p>`)}</article>`,
        });
    if (feed === 'all' || feed === 'pulls')
      for (const p of requests.slice(0, 15))
        feedItems.push({
          date: p.createdAt,
          html: `<article class="gh-feed-card"><header>${c.avatar(p.author, 'large')}<strong>${c.escape(p.author)}</strong><span>${p.state === 'merged' ? 'merged' : 'opened'} a pull request</span><small>${p.createdAt.slice(0, 10)}</small></header>${panel(`<div class="gh-feed-title"><a href="/albums/?repo=${encodeURIComponent(p.repo)}#/pulls">${c.icon('git-pull-request')} ${c.escape(p.title)} #${p.number}</a><span class="label">${c.escape(p.state)}</span></div><p>${c.escape(p.repo)} · ${p.added} 张新照片 · ${p.edited} 张整理</p>`)}</article>`,
        });
    feedItems.sort((a, b) => b.date.localeCompare(a.date));
    return `<div class="gh-dashboard"><aside class="gh-dashboard-sidebar"><a class="gh-sidebar-account" href="${profileHref(c)}">${c.avatar(user.username, 'large')}<strong>${c.escape(user.username)}</strong>${c.icon('chevron-down')}</a><div class="section-head"><h2>Top repositories</h2>${canTeam(c) && user.role !== 'reader' ? `<button class="button primary small" data-action="new-repo">${c.icon('repo')}New</button>` : ''}</div><label class="gh-side-search"><input id="gh-side-search" class="form-input" type="search" placeholder="Find a repository…" aria-label="Find a repository"></label><div id="gh-side-repos">${
      top
        .slice(0, 7)
        .map(
          (r) =>
            `<a href="${c.repoHref(r.name)}">${c.avatar(r.owner, 'small')}<span>${c.escape(r.owner)}/${c.escape(r.name)}</span></a>`
        )
        .join('') || '<p class="muted">No repositories yet.</p>'
    }</div><a class="gh-show-more" href="#/repos">Show more</a><section class="gh-side-section"><h2>Recent activity</h2>${
      c.tickets
        .slice(0, 3)
        .map(
          (t) =>
            `<a class="gh-recent" href="${c.repoHref(t.repo, 'issues')}/${t.id}">${c.icon('issue-opened')}<span>${c.escape(t.title)}<small>${c.escape(t.repo)} #${t.id}</small></span></a>`
        )
        .join('') || '<p class="muted">Your team activity will appear here.</p>'
    }</section><section class="gh-side-section"><h2>Gitpolar workspace</h2><nav class="gh-app-links">${extraLinks(c)}<a href="#/files">${c.icon('file')}个人文件</a><a href="#/settings/appearance">${c.icon('gear')}界面预设</a></nav></section></aside><main class="gh-home-feed"><div class="gh-feed-head"><h1>Home</h1><label class="button gh-feed-filter">${c.icon('filter')}<select id="gh-feed-filter" aria-label="Filter feed"><option value="all">Filter</option><option value="repos"${feed === 'repos' ? ' selected' : ''}>Repositories</option><option value="issues"${feed === 'issues' ? ' selected' : ''}>Issues</option><option value="pulls"${feed === 'pulls' ? ' selected' : ''}>Pull requests</option></select></label></div><nav class="gh-home-tabs"><span>For you</span><a href="${profileHref(c, 'following')}">Following</a></nav><div class="gh-feed-items">${feedItems.map((f) => f.html).join('') || panel(empty(c, 'Welcome to gitpolar', 'Create a repository or follow your teammates to start working together.'))}</div><footer class="gh-site-foot"><img src="/assets/gitpolar-logo.png" width="24" height="24" alt="">© 2026 gitpolar <a href="#/settings/appearance">Appearance</a><a href="#/repos">Repositories</a></footer></main><aside class="gh-dashboard-right"><section class="gh-right-box"><h2>Latest changes</h2><ul class="gh-change-timeline">${
      all
        .slice(0, 5)
        .map(
          (r) =>
            `<li><time>${c.escape(r.updated)}</time><a href="${c.repoHref(r.name, 'graph')}">${c.escape(r.commit?.message || r.name)}</a><small>${c.escape(r.name)}</small></li>`
        )
        .join('') || '<li>No changes yet</li>'
    }</ul></section><section class="gh-right-box"><h2>Your workspace</h2><div class="gh-workspace-counts"><a href="#/repos"><strong>${c.repos.length}</strong> repositories</a><a href="#/issues"><strong>${c.tickets.filter((t) => t.state === 'open').length}</strong> open issues</a><a href="#/pulls"><strong>${open.length}</strong> album pull requests</a></div><nav class="gh-app-links">${extraLinks(c)}</nav></section><section class="gh-right-box"><h2>Explore repositories</h2>${all
      .slice(0, 3)
      .map(
        (r) =>
          `<div class="gh-explore-repo"><a href="${c.repoHref(r.name)}">${c.escape(r.owner)}/${c.escape(r.name)}</a><p>${c.escape(r.description || '')}</p><small>${c.icon('star')} ${r.starCount || 0} · ${c.escape(r.language || 'Files')}</small></div>`
      )
      .join('')}</section></aside></div>`;
  }
  function graph(c, p) {
    const year = Number(p.year),
      today = new Date(),
      last =
        year === today.getFullYear()
          ? new Date(Date.UTC(year, today.getMonth(), today.getDate()))
          : new Date(Date.UTC(year, 11, 31));
    const start = new Date(Date.UTC(year, 0, 1));
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(last);
    end.setUTCDate(end.getUTCDate() + 6 - end.getUTCDay());
    const cells = [];
    for (let date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
      const day = date.toISOString().slice(0, 10),
        n = p.days[day] || 0,
        level = n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4;
      cells.push(
        `<span role="img" aria-label="${n} contributions on ${day}" title="${n} contributions on ${day}" class="gh-day level-${level}${date.getUTCFullYear() !== year ? ' outside' : ''}"></span>`
      );
    }
    return `<section class="gh-contributions"><div class="section-head"><h2>${p.total} contributions in ${p.year}</h2><span class="muted">Contribution activity</span></div><div class="gh-contribution-box"><div class="gh-calendar-scroll"><div class="gh-calendar-months">${[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
      .slice(0, year === today.getFullYear() ? today.getMonth() + 1 : 12)
      .map((m) => `<span>${m}</span>`)
      .join(
        ''
      )}</div><div class="gh-calendar"><div class="gh-weekdays"><span>Mon</span><span>Wed</span><span>Fri</span></div><div class="gh-heatmap">${cells.join('')}</div></div></div><div class="gh-calendar-key"><span>Git commits and issues</span><span>Less ${[0, 1, 2, 3, 4].map((l) => `<i class="gh-day level-${l}"></i>`).join('')} More</span></div></div></section>`;
  }
  function demoProfile(c, username) {
    return {
      username,
      name: username,
      bio: '',
      company: '',
      location: '',
      website: '',
      createdAt: '2026-01-01',
      pins: c.pinned,
      repositories: c.repos.map((r) => r.name),
      starred: c.repos.filter((r) => r.starred).map((r) => r.name),
      year: String(new Date().getFullYear()),
      days: {},
      total: 0,
      activity: [],
      own: true,
      followers: 0,
      following: 0,
    };
  }
  function profilePage(c, username, tab = 'overview') {
    current = c;
    username = username || c.session?.user?.username || 'polar-lab';
    const result = c.onServer
      ? loadCached(c, username, 'profiles/' + encodeURIComponent(username), profileCache)
      : { data: demoProfile(c, username) };
    if (result.loading) return '<div class="gh-loading" role="status">Loading profile…</div>';
    if (result.error) return panel(empty(c, 'Unable to load profile', result.error));
    const p = result.data;
    const tabs = [
      ['overview', 'book', 'Overview', null],
      ['repositories', 'repo', 'Repositories', p.repositories.length],
      ['projects', 'project', 'Projects', null],
      ['stars', 'star', 'Stars', p.starred.length],
    ];
    const profileRepos = c.repos.filter((r) => p.repositories.includes(r.name)),
      stars = c.repos.filter((r) => p.starred.includes(r.name));
    let content = '';
    if (tab === 'repositories' || tab === 'stars') {
      const items = tab === 'repositories' ? profileRepos : stars;
      content = `<div class="gh-profile-repo-filters"><input class="form-input" id="gh-profile-repo-search" type="search" placeholder="Find a repository…" aria-label="Find a repository in profile">${p.own && tab === 'repositories' ? `<button class="button primary" data-action="new-repo">${c.icon('repo')}New</button>` : ''}</div><div id="gh-profile-repos">${items.length ? items.map((r) => `<article class="gh-profile-repo"><div><h2><a href="${c.repoHref(r.name)}">${c.escape(r.name)}</a><span class="label">Internal</span></h2><p>${c.escape(r.description || '')}</p><small>${c.escape(r.language || 'Files')} · ${c.icon('star')} ${r.starCount || 0} · Updated ${c.escape(r.updated)}</small></div>${c.starButton(r)}</article>`).join('') : empty(c, tab === 'stars' ? 'No starred repositories yet' : 'No repositories yet', 'Repositories will be listed here.')}</div>`;
    } else if (tab === 'projects')
      content = `<h2 class="gh-content-title">Projects</h2><div class="gh-pinned-grid">${canTeam(c) ? panel(`<header class="gh-feed-title">${c.icon('project')}<a href="/procurement/">采购与库存</a></header><p>申请、组长审批、采购、到货确认与入库。</p>`) : ''}${panel(`<header class="gh-feed-title">${c.icon('file')}<a href="#/files">个人文件</a></header><p>管理自己的代码、图纸和文件夹。</p>`)}</div>`;
    else if (['followers', 'following'].includes(tab)) {
      const members = loadCached(
        c,
        username + '/' + tab,
        'profiles/' + encodeURIComponent(username) + '/' + tab,
        requestCache
      );
      content = `<h2 class="gh-content-title">${tab === 'followers' ? 'Followers' : 'Following'}</h2>${members.loading ? '<p>Loading…</p>' : members.error ? empty(c, 'Unable to load people', members.error) : members.data.users.length ? members.data.users.map((u) => `<a class="gh-person-row" href="${profileHref(c, '', u.username)}">${c.avatar(u.username, 'large')}<span><strong>${c.escape(u.name)}</strong><span class="muted">${c.escape(u.username)}</span><p>${c.escape(u.bio || '')}</p></span></a>`).join('') : empty(c, 'No ' + tab + ' yet', 'Find teammates through repository activity.', 'person')}`;
    } else {
      const pinned = p.pins.length ? c.repos.filter((r) => p.pins.includes(r.name)) : profileRepos.slice(0, 6);
      content = `<div class="section-head gh-pinned-title"><h2>${p.pins.length ? 'Pinned' : 'Popular repositories'}</h2>${p.own ? '<button class="gh-link" data-gh-action="pins">Customize your pins</button>' : ''}</div><div class="gh-pinned-grid">${pinned.map((r) => catalogCard(c, r)).join('') || panel(empty(c, 'No repositories yet', 'Your pinned repositories will appear here.'))}</div>${graph(c, p)}<section class="gh-contribution-activity"><h2>Contribution activity</h2>${
        p.activity.length
          ? p.activity
              .slice(0, 10)
              .map(
                (event) =>
                  `<article>${c.icon(event.type === 'commit' ? 'git-commit' : 'issue-opened')}<div><p><a href="${c.repoHref(event.repo, event.type === 'commit' ? 'graph' : 'issues')}${event.type === 'issue' ? '/' + event.number : ''}">${c.escape(event.message)}</a></p><small>${c.escape(event.repo)} · ${event.date}</small></div></article>`
              )
              .join('')
          : panel(
              empty(
                c,
                'No contributions yet',
                'Git commits and issues attributed to this account will appear here.',
                'history'
              )
            )
      }</section>`;
    }
    return `<nav class="gh-profile-tabs" aria-label="Profile navigation"><div class="gh-profile-tabs-inner"><span class="gh-tab-spacer"></span>${tabs.map(([key, symbol, label, count]) => `<a href="${profileHref(c, key === 'overview' ? '' : key, username)}" ${key === tab ? 'aria-current="page"' : ''}>${c.icon(symbol)}${label}${count != null ? `<span class="count">${count}</span>` : ''}</a>`).join('')}</div></nav><div class="gh-profile-layout"><aside class="gh-profile-sidebar"><div class="gh-profile-avatar">${c.avatar(p.username)}</div><h1><strong>${c.escape(p.name)}</strong><span>${c.escape(p.username)}</span></h1>${p.bio ? `<p class="gh-bio">${c.escape(p.bio)}</p>` : ''}${p.own ? '<a href="#/settings/profile" class="button gh-full-width">Edit profile</a>' : `<button class="button gh-full-width" data-gh-action="follow" data-username="${c.escape(username)}" aria-pressed="${Boolean(p.isFollowing)}">${p.isFollowing ? 'Unfollow' : 'Follow'}</button>`}<div class="gh-follow-counts">${c.icon('person')}<a href="${profileHref(c, 'followers', username)}"><strong>${p.followers}</strong> followers</a> · <a href="${profileHref(c, 'following', username)}"><strong>${p.following}</strong> following</a></div><ul class="gh-profile-meta">${p.company ? `<li>${c.icon('repo')}${c.escape(p.company)}</li>` : ''}${p.location ? `<li>${c.icon('globe')}${c.escape(p.location)}</li>` : ''}${p.website ? `<li>${c.icon('link')}<a href="${c.escape(p.website)}" rel="noreferrer" target="_blank">${c.escape(p.website.replace(/^https?:\/\//, ''))}</a></li>` : ''}<li>${c.icon('history')}Joined ${new Date(p.createdAt).toLocaleDateString('en-CA')}</li></ul><section class="gh-profile-organizations"><h2>Organizations</h2><a href="#/repos">${c.avatar(c.session?.namespace || 'polar-lab', 'large org')}<span>${c.escape(c.session?.namespace || 'polar-lab')}</span></a></section>${p.own ? `<section class="gh-profile-apps"><h2>Workspace</h2><nav class="gh-app-links">${extraLinks(c)}</nav></section>` : ''}</aside><main class="gh-profile-main">${content}</main></div>`;
  }
  function appearanceSettings(c) {
    const mode = A().current;
    return `<h1 class="gh-settings-title">Appearance</h1><p class="gh-settings-description">选择界面预设及颜色，所有工作区使用同一设置。</p><h2 class="gh-setting-section">Interface preset · 界面预设</h2><div class="gh-preset-options">${[
      ['workspace', '原版工作区', '保留当前导航与 Serpent 相册工作区'],
      ['github', 'GitHub', 'GitHub 导航、Dashboard 与个人主页'],
    ]
      .map(
        ([id, label, description]) =>
          `<button class="gh-preset-choice" data-gh-action="appearance" data-preset="${id}" aria-pressed="${mode.preset === id}"><span class="gh-preset-preview preview-${id}"><i></i><span><b></b><b></b><b></b></span><em></em></span><span class="gh-preset-caption"><strong>${c.icon(mode.preset === id ? 'check' : 'gear')} ${label}</strong><small>${description}</small></span></button>`
      )
      .join(
        ''
      )}</div><h2 class="gh-setting-section">Theme mode</h2><p class="gh-settings-description">Sync with the system, or choose a single theme.</p><div class="gh-theme-options">${[
      ['light', 'Light default'],
      ['dark', 'Dark default'],
      ['system', 'Sync with system'],
    ]
      .map(
        ([id, label]) =>
          `<button class="gh-color-choice color-${id}" data-gh-action="color" data-mode="${id}" aria-pressed="${mode.colorMode === id}"><span><i></i><b></b><b></b></span><strong>${label}</strong></button>`
      )
      .join('')}</div><p id="gh-setting-feedback" class="gh-setting-feedback" role="status"></p>`;
  }
  function profileSettings(c) {
    const username = c.session?.user?.username || 'polar-lab',
      result = c.onServer
        ? loadCached(c, username, 'profiles/' + username, profileCache)
        : { data: demoProfile(c, username) };
    if (result.loading) return '<p>Loading profile…</p>';
    if (result.error) return empty(c, 'Unable to load profile', result.error);
    const p = result.data;
    return `<h1 class="gh-settings-title">Public profile</h1><div class="gh-profile-edit-layout"><form id="gh-profile-form" class="gh-profile-form">${[
      ['name', 'Name', 100, p.name],
      ['bio', 'Bio', 160, p.bio],
      ['company', 'Company', 100, p.company],
      ['location', 'Location', 100, p.location],
      ['website', 'URL', 240, p.website],
    ]
      .map(
        ([name, label, max, value]) =>
          `<label class="field">${label}${name === 'bio' ? `<textarea name="${name}" rows="3" maxlength="${max}">${c.escape(value)}</textarea>` : `<input name="${name}" value="${c.escape(value)}" maxlength="${max}">`}</label>`
      )
      .join(
        ''
      )}<p class="gh-form-note">飞书账号：${c.escape(p.username)}。资料更新后会显示在个人主页。</p><button class="button primary" type="submit">Update profile</button><p id="gh-setting-feedback" role="status"></p></form><div class="gh-settings-avatar"><h2>Profile picture</h2>${c.avatar(username)}<small>gitpolar identicon</small></div></div>`;
  }
  function settings(c, section = 'profile') {
    current = c;
    const options = [
      ['profile', 'person', 'Public profile'],
      ['appearance', 'gear', 'Appearance'],
      ['notifications', 'inbox', 'Notifications'],
      ['tokens', 'lock', 'Developer settings'],
    ];
    const content =
      section === 'appearance'
        ? appearanceSettings(c)
        : section === 'profile'
          ? profileSettings(c)
          : section === 'tokens'
            ? `<h1 class="gh-settings-title">Personal access tokens</h1><p class="gh-settings-description">Git 和 Git LFS 使用个人访问令牌。</p><button class="button" data-action="access-tokens">Manage access tokens</button>`
            : `<h1 class="gh-settings-title">Notifications</h1><p class="gh-settings-description">查看议题和相册投稿中需要处理的内容。</p><a class="button" href="#/issues">Issues</a> <a class="button" href="#/pulls">Pull requests</a>`;
    return `<div class="gh-settings-wrap"><header class="gh-settings-head">${c.avatar(c.session?.user?.username || 'polar-lab', 'large')}<div><strong>${c.escape(c.session?.user?.name || c.session?.user?.username || 'polar-lab')}</strong><span>Your personal account</span></div><a class="button" href="${profileHref(c)}">Go to your personal profile</a></header><div class="gh-settings-layout"><aside><nav>${options.map(([key, sym, label]) => `<a href="#/settings/${key}" ${section === key ? 'aria-current="page"' : ''}>${c.icon(sym)}${label}</a>`).join('')}</nav><div class="gh-settings-links">${extraLinks(c)}</div></aside><main>${content}</main></div></div>`;
  }
  function pullPage(c) {
    current = c;
    const requests = albumPulls(c);
    return `<div class="gh-pulls-page"><header class="gh-feed-head"><h1>Pull requests</h1><a class="button" href="/albums/">相册投稿</a></header>${panel(`<div class="gh-list-header">${c.icon('git-pull-request')} ${requests.filter((p) => p.state === 'open').length} Open <span class="muted">${requests.filter((p) => p.state !== 'open').length} Closed</span></div>${requests.length ? requests.map((p) => `<a class="gh-pull-row" href="/albums/?repo=${encodeURIComponent(p.repo)}#/pulls"><span class="gh-pull-symbol ${p.state}">${c.icon('git-pull-request', 20)}</span><span><strong>${c.escape(p.title)}</strong><small>${c.escape(p.repo)} #${p.number} · ${c.escape(p.author)} · ${p.createdAt.slice(0, 10)}</small></span><span class="label">${c.escape(p.state)}</span></a>`).join('') : empty(c, 'No pull requests yet', '队员提交相册 PR 后，可在这里找到投稿。', 'git-pull-request')}`)}</div>`;
  }
  function files(c) {
    current = c;
    return `<section class="gh-files"><div class="page-head"><div><h1>Personal files</h1><p>Your private workspace · ${c.escape(c.session?.user?.username || '')}</p></div></div>${c.workbench ? c.personalFiles() : empty(c, 'Personal files unavailable', '此实例尚未启用个人文件工作区。', 'file')}</section>`;
  }
  function pins(c) {
    const username = c.session?.user?.username || 'polar-lab',
      p = profileCache.get(username)?.data;
    const chosen = p?.pins || [];
    c.openDialog(
      'Customize your pins',
      `<form id="gh-pins-form"><p class="dialog-note">选择最多 6 个仓库，在个人主页展示。</p><div class="gh-pin-choices">${c.repos.map((r) => `<label><input name="repo" type="checkbox" value="${c.escape(r.name)}" ${chosen.includes(r.name) ? 'checked' : ''}>${c.icon('repo')}${c.escape(r.name)}</label>`).join('')}</div><p id="gh-pin-feedback" role="status"></p><div class="dialog-actions"><button class="button primary" type="submit">Save pins</button></div></form>`
    );
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-gh-action]');
    if (!b || !current) return;
    const c = current,
      action = b.dataset.ghAction;
    if (action === 'pins') {
      pins(c);
      return;
    }
    b.disabled = true;
    try {
      if (action === 'appearance' || action === 'color') {
        const next =
          action === 'appearance'
            ? { preset: b.dataset.preset, colorMode: b.dataset.preset === 'github' ? 'light' : 'dark' }
            : { colorMode: b.dataset.mode };
        await A().save(next);
        c.notify('界面设置已保存');
      } else if (action === 'follow') {
        const username = b.dataset.username,
          old = profileCache.get(username).data;
        await c.api('profiles/' + username + '/follow', { method: old.isFollowing ? 'DELETE' : 'PUT' });
        profileCache.clear();
        requestCache.clear();
        c.rerender();
      }
    } catch (err) {
      c.notify(err.message);
    } finally {
      b.disabled = false;
    }
  });
  document.addEventListener('submit', async (e) => {
    if (!['gh-profile-form', 'gh-pins-form'].includes(e.target.id) || !current) return;
    e.preventDefault();
    const form = e.target,
      c = current,
      button = form.querySelector('[type=submit]');
    button.disabled = true;
    const data = new FormData(form);
    const input = form.id === 'gh-pins-form' ? { pins: data.getAll('repo') } : Object.fromEntries(data);
    const feedback = form.querySelector('[role=status]');
    try {
      await c.api('me/profile', { method: 'PATCH', body: input });
      profileCache.clear();
      if (form.id === 'gh-pins-form') form.closest('dialog').close();
      c.rerender();
      c.notify('Profile updated successfully.');
    } catch (err) {
      if (feedback) feedback.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  });
  document.addEventListener('input', (e) => {
    const id = e.target.id;
    if (id === 'gh-side-search' || id === 'gh-profile-repo-search') {
      const host = document.querySelector(id === 'gh-side-search' ? '#gh-side-repos' : '#gh-profile-repos'),
        q = e.target.value.toLowerCase();
      for (const row of host?.children || []) row.hidden = !row.textContent.toLowerCase().includes(q);
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'gh-feed-filter' && current) {
      feed = e.target.value;
      current.rerender();
    }
  });
  window.GitpolarGithub = {
    isGithub,
    dashboard,
    profilePage,
    settings,
    pullPage,
    files,
    invalidate() {
      profileCache.clear();
      requestCache.clear();
    },
  };
})();
