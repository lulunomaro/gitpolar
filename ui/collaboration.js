(() => {
  'use strict';
  const cache = new Map();
  let context;
  const esc = (value) => context.escape(value);
  const enc = encodeURIComponent;
  const icon = (key, size = 16) => context.icon(key, size);
  const url = (r, suffix) => `repos/${enc(r.name)}/${suffix}`;
  const href = (r, area) => context.repoHref(r.name, area);
  const canWrite = () => context.session?.user && context.session.user.role !== 'reader';
  const option = (value, label = value, selected = '') =>
    `<option value="${esc(value)}"${String(value) === String(selected) ? ' selected' : ''}>${esc(label)}</option>`;
  const field = (label, control) => `<label class="field">${esc(label)}${control}</label>`;
  const input = (name, placeholder = '', value = '', extra = 'required') =>
    `<input class="form-input" name="${esc(name)}" placeholder="${esc(placeholder)}" value="${esc(value)}" ${extra}>`;
  const text = (name, placeholder, required = false) =>
    `<textarea class="form-input" name="${name}" rows="3" maxlength="6000" placeholder="${esc(placeholder)}"${required ? ' required' : ''}></textarea>`;
  const select = (name, options, extra = '') =>
    `<select class="select" name="${name}" ${extra}>${options}</select>`;
  const button = (label, primary = false) =>
    `<button type="submit" class="button${primary ? ' primary' : ''}">${esc(label)}</button>`;
  const form = (type, repo, content, attrs = '') =>
    `<form data-collab-form="${type}" data-repo="${esc(repo?.name || '')}" ${attrs}>${content}</form>`;
  const heading = (title, extra = '') =>
    `<header class="gh-feed-head"><h1>${esc(title)}</h1>${extra}</header>`;
  const box = (body) => `<section class="panel co-box">${body}</section>`;
  const empty = (title, detail) =>
    `<div class="gh-empty"><h2>${esc(title)}</h2><p>${esc(detail)}</p></div>`;
  const badge = (state) => `<span class="co-state ${esc(state)}">${esc(state)}</span>`;
  const link = (target, label) => `<a href="${esc(target)}">${esc(label)}</a>`;
  function load(c, key, render) {
    context = c;
    if (!cache.has(key)) {
      const entry = { pending: true };
      cache.set(key, entry);
      c.api(key)
        .then((data) => Object.assign(entry, { data, pending: false }))
        .catch((e) => Object.assign(entry, { error: e.message, pending: false }))
        .finally(() => {
          if (cache.get(key) === entry && location.hash === c.hash) c.rerender();
        });
    }
    const value = cache.get(key);
    if (value.pending) return '<p class="co-loading" role="status">Loading…</p>';
    if (value.error) return box(empty('Unable to open this page', value.error));
    return render(value.data);
  }
  function timeline(list) {
    return list
      .map(
        (p) =>
          `<article class="co-comment"><header>${context.avatar(p.author, 'small')} ${link('#/users/' + enc(p.author), p.author)} <span>${esc(p.event)} · ${esc(p.createdAt?.slice(0, 16).replace('T', ' '))}</span>${p.oid ? `<code>${esc(p.oid.slice(0, 7))}</code>` : ''}</header>${p.path ? `<small>${esc(p.path)}${p.line ? ' L' + p.line : ''}</small>` : ''}${p.body ? `<p>${esc(p.body)}</p>` : ''}</article>`,
      )
      .join('');
  }
  function issue(c, repo, n) {
    return load(c, url(repo, 'issues/' + enc(n)), (i) => {
      const id = `data-number="${i.number}"`;
      return `<div class="co-page"><header class="gh-feed-head"><h1 class="detail-title">${esc(i.title)} #${i.number}</h1></header><div>${badge(i.state)} ${esc(i.author)} opened this issue</div><div class="co-columns"><section>${box(`<p class="co-body">${esc(i.body || 'No description provided.')}</p>`)}${timeline(i.posts)}${canWrite() ? form('issue-comment', repo, field('Add a comment', text('body', 'Leave a comment', true)) + button('Comment', true), id) + form('issue-state', repo, button(i.state === 'open' ? 'Close issue' : 'Reopen issue'), `${id} data-state="${i.state === 'open' ? 'closed' : 'open'}"`) : ''}</section><aside>${box(`<h3>Assignees</h3><p>${i.assignees.map((a) => link('#/users/' + enc(a), a)).join(', ') || 'No one assigned'}</p><h3>Labels</h3><p>${i.labels.map((l) => `<span class="label">${esc(l.name)}</span>`).join(' ') || 'None yet'}</p>`)}${canWrite() ? `<details class="co-details"><summary>Edit labels and assignees</summary>${form('issue-meta', repo, field('Assignees', select('assignees', i.members.map((m) => `<option ${i.assignees.includes(m) ? 'selected' : ''} value="${esc(m)}">${esc(m)}</option>`).join(''), 'multiple')) + field('Labels', select('labels', i.availableLabels.map((l) => `<option ${i.labels.some((x) => x.id === l.id) ? 'selected' : ''} value="${l.id}">${esc(l.name)}</option>`).join(''), 'multiple')) + button('Save metadata'), id)}${form('new-label', repo, field('New label', input('name', 'bug')) + field('Color', '<input type="color" name="color" value="#0969da">') + button('Create label'))}</details>` : ''}</aside></div></div>`;
    });
  }
  function newPull(c, repo) {
    return load(c, url(repo, 'forks'), ({ network }) => {
      const q = new URLSearchParams(location.hash.split('?')[1]);
      const source =
        c.repos.find((r) => r.name === q.get('source') && network.some((f) => f.name === r.name)) ||
        repo;
      const branches = (r) => r.branchList || [];
      return `<div class="co-page">${heading('Open a pull request')}<p>Choose the branch with your changes and the branch you want to merge into.</p>${box(
        form(
          'new-pull',
          repo,
          `<div class="co-refs">${field(
            'Base branch',
            select(
              'base',
              branches(repo)
                .map((b) => option(b.name, b.name, repo.defaultBranch))
                .join(''),
            ),
          )}<span>←</span>${field('Head repository', select('source', network.map((r) => option(r.name, r.name, source.name)).join(''), 'data-source-picker'))}${field(
            'Compare branch',
            select(
              'head',
              branches(source)
                .map((b) =>
                  option(
                    b.name,
                    b.name,
                    q.get('head') || branches(source).find((b) => b.name !== repo.defaultBranch)?.name,
                  ),
                )
                .join(''),
            ),
          )}</div>${field('Title', input('title', 'Title', '', 'required maxlength="160"'))}${field('Description', text('body', 'Describe the changes'))}${button('Create pull request', true)}`,
        ),
      )}</div>`;
    });
  }
  function pull(c, repo, n, q) {
    const path = q.get('path') || '',
      tab = q.get('tab') || 'conversation';
    return load(
      c,
      url(repo, 'pulls/' + enc(n) + (path ? '?' + new URLSearchParams({ path }) : '')),
      (p) => {
        const base = href(repo, 'pulls') + '/' + p.number;
        const id = `data-number="${p.number}" data-head="${esc(p.head_oid)}" data-base="${esc(p.base_oid)}"`;
        const can = canWrite(),
          open = p.state === 'open',
          review = can && open && c.session.user.id !== p.author_id;
        let content = '';
        if (tab === 'files')
          content =
            box(
              p.files
                .map(
                  (f) =>
                    `<div class="co-row"><code>${esc(f.status)}</code>${link(base + '?' + new URLSearchParams({ tab: 'files', path: f.path }), f.path)}</div>`,
                )
                .join('') || empty('No changed files', 'The branch trees are identical.'),
            ) +
            (path
              ? box(
                  `<h3>${esc(path)}</h3><pre class="co-diff">${esc(p.patch || 'No text diff')}</pre>${can ? form('pull-inline', repo, field('Line (optional)', '<input name="line" type="number" min="1">') + field('File comment', text('body', 'Comment on this file', true)) + button('Add file comment'), `${id} data-path="${esc(path)}"`) : ''}`,
                )
              : '');
        else if (tab === 'commits')
          content = box(
            p.commits
              .map(
                (commit) =>
                  `<div class="co-row"><strong>${esc(commit.title)}</strong><span>${esc(commit.author)}</span><code>${esc(commit.oid.slice(0, 7))}</code></div>`,
              )
              .join('') || empty('No new commits', ''),
          );
        else
          content =
            box(`<p class="co-body">${esc(p.body || 'No description provided.')}</p>`) +
            timeline(p.posts) +
            (can
              ? form(
                  'pull-comment',
                  repo,
                  field('Add a comment', text('body', 'Leave a comment', true)) + button('Comment'),
                  id,
                )
              : '') +
            (review
              ? box(
                  form(
                    'pull-review',
                    repo,
                    field(
                      'Submit review',
                      select(
                        'decision',
                        option('approve', 'Approve') + option('changes', 'Request changes'),
                      ),
                    ) +
                      field('Review summary', text('body', 'Explain your review')) +
                      button('Submit review'),
                    id,
                  ),
                )
              : '') +
            (open
              ? box(
                  `<h3>${p.branchesPresent ? (p.reviews.changes ? 'Changes requested' : p.reviews.required && !p.reviews.approved ? 'Review required' : 'Merge pull request') : 'Source or base branch was deleted'}</h3><p>${link(href(repo, 'compare') + '?' + new URLSearchParams({ base: p.base_oid, head: p.head_oid }), 'Compare files and CAD assemblies')}</p>${can ? `<div class="co-actions">${form('pull-merge', repo, `<button class="button primary"${!p.branchesPresent || p.reviews.changes || (p.reviews.required && !p.reviews.approved) ? ' disabled' : ''}>Merge pull request</button>`, id)}${form('pull-close', repo, button('Close pull request'), id)}</div>` : ''}`,
                )
              : p.state === 'closed' && can
                ? form('pull-reopen', repo, button('Reopen pull request'), id)
                : '');
        if (tab === 'conversation' && can && open && p.branchesPresent)
          content += `<details class="co-details"><summary>Confirm a manually resolved assembly</summary><p>Save the assembled result in SolidWorks, then commit and push it to a branch in this repository. The selected commit supplies the complete result tree.</p>${form('pull-resolve', repo, field('Resolution branch', select('resolutionBranch', repo.branchList.map((b) => option(b.name, b.name + ' · ' + b.oid.slice(0, 7))).join(''))) + field('Resolution notes', text('body', 'Describe the parts you kept from each branch', true)) + button('Use this saved revision'), id)}</details>`;
        const tabs = [
          ['conversation', 'Conversation', p.posts.length],
          ['commits', 'Commits', p.commits.length],
          ['files', 'Files changed', p.files.length],
        ];
        return `<div class="co-page">${heading(p.title + ' #' + p.number)}<p>${badge(p.state)} ${esc(p.author)} wants to merge <code>${esc(p.source)}:${esc(p.head)}</code> into <code>${esc(p.base)}</code></p><nav class="co-tabs">${tabs.map(([v, t, count]) => `<a ${tab === v ? 'aria-current="page"' : ''} href="${base}?tab=${v}">${t} <span class="count">${count}</span></a>`).join('')}</nav>${content}</div>`;
      },
    );
  }
  function forks(c, r) {
    return load(
      c,
      url(r, 'forks'),
      ({ network }) =>
        `<div class="co-page">${heading('Forks')}${box(network.map((f) => `<div class="co-row">${icon('repo-forked')}${link(c.repoHref(f.name), f.name)} <small>${esc(f.owner)}${f.parent ? ' · forked from ' + esc(f.parent) : ' · upstream'}</small></div>`).join(''))}${canWrite() ? box(form('fork', r, field('Repository name', input('name', 'New fork name', (r.name + '-' + c.session.user.username).slice(0, 48), 'required pattern="[a-z0-9][a-z0-9_\\-]{0,47}"')) + button('Create fork', true))) : ''}</div>`,
    );
  }
  function manageBranches(c, r) {
    return load(
      c,
      url(r, 'branches'),
      (data) =>
        `<div class="co-page">${heading('Branches')}${box(data.branches.map((b) => `<div class="co-row">${icon('git-branch')}${link(c.repoHref(r.name, 'code', b.name), b.name)}<code>${esc(b.oid.slice(0, 7))}</code>${b.name === data.defaultBranch ? '<span class="label">Default</span>' : canWrite() ? form('branch-delete', r, button('Delete branch'), `data-branch="${esc(b.name)}" data-oid="${esc(b.oid)}"`) : ''}</div>`).join(''))}${canWrite() ? box(form('branch-create', r, field('New branch name', input('name', 'Branch name')) + field('Source branch', select('from', data.branches.map((b) => option(b.name, b.name, data.defaultBranch)).join(''))) + button('Create branch', true))) : ''}</div>`,
    );
  }
  function projects(c, r, q) {
    return load(c, url(r, 'projects'), ({ projects }) => {
      const saved = projects.flatMap((p) => p.views).find((v) => String(v.id) === q.get('saved'));
      const view = saved?.layout || q.get('view') || 'board',
        linkBase = href(r, 'projects');
      const showItem = (p, item) =>
        `<article class="co-item"><strong>${item.kind === 'draft' ? esc(item.displayTitle) : link(href(r, item.kind) + '/' + item.number, item.displayTitle + ' #' + item.number)}</strong><small>${esc(item.kind)} · ${esc(item.priority || 'No priority')} ${esc(item.due)}</small>${canWrite() ? `<details><summary>Edit fields</summary>${form('project-edit', r, field('Status', select('status', ['Todo', 'In progress', 'Done'].map((s) => option(s, s, item.status)).join(''))) + field('Priority', select('priority', ['', 'High', 'Medium', 'Low'].map((s) => option(s, s || 'None', item.priority)).join(''))) + field('Due date', `<input type="date" name="due" value="${esc(item.due)}">`) + p.fields.map((f) => field(f.name, input('custom-' + f.id, '', item.values[f.id] || '', `type="${f.type}"`))).join('') + button('Save item'), `data-project="${p.id}" data-item="${item.id}"`)}</details>` : ''}</article>`;
      return `<div class="co-page">${heading('Projects')}<nav class="co-tabs">${['board', 'table', 'roadmap'].map((v) => `<a href="${linkBase}?view=${v}" ${v === view ? 'aria-current="page"' : ''}>${v[0].toUpperCase() + v.slice(1)}</a>`).join('')}</nav>${
        projects
          .filter((p) => !saved || p.id === saved.project_id || p.views.some((v) => v.id === saved.id))
          .map((p) => ({
            ...p,
            items: p.items.filter((i) => !saved?.status || i.status === saved.status),
          }))
          .map((p) =>
            box(
              `<h2>${esc(p.title)}</h2><nav class="co-tabs">${p.views.map((v) => link(linkBase + '?saved=' + v.id, v.name)).join('')}</nav>${
                view === 'board'
                  ? `<div class="co-board">${['Todo', 'In progress', 'Done']
                      .map(
                        (s) =>
                          `<section><h3>${s} <span class="count">${p.items.filter((i) => i.status === s).length}</span></h3>${p.items
                            .filter((i) => i.status === s)
                            .map((i) => showItem(p, i))
                            .join('')}</section>`,
                      )
                      .join('')}</div>`
                  : view === 'roadmap'
                    ? p.items
                        .filter((i) => i.due)
                        .sort((a, b) => a.due.localeCompare(b.due))
                        .map(
                          (i) => `<div class="co-row"><time>${esc(i.due)}</time>${showItem(p, i)}</div>`,
                        )
                        .join('') || '<p>No scheduled items.</p>'
                    : p.items
                        .map(
                          (i) =>
                            `<div class="co-row"><span>${esc(i.status)}</span>${showItem(p, i)}</div>`,
                        )
                        .join('')
              }${canWrite() ? form('project-add', r, field('Item type', select('kind', option('draft', 'Draft') + option('issues', 'Issue') + option('pulls', 'Pull request'))) + field('Title or issue/PR number', input('item', 'Title or number')) + button('Add item'), `data-project="${p.id}"`) + `<details><summary>Customize project</summary>${form('project-field', r, field('Field name', input('name', 'Field name')) + field('Field type', select('type', ['text', 'date', 'number'].map((t) => option(t)).join(''))) + button('Create field'), `data-project="${p.id}"`)}${form('project-view', r, field('View name', input('name', 'View name')) + field('Layout', select('layout', ['board', 'table', 'roadmap'].map((t) => option(t)).join(''))) + field('Filter by status', select('status', ['', 'Todo', 'In progress', 'Done'].map((t) => option(t, t || 'All')).join(''))) + button('Save view'), `data-project="${p.id}"`)}</details>` : ''}`,
            ),
          )
          .join('') ||
        box(empty('No projects yet', 'Create a project to track issues, pull requests and draft items.'))
      }${canWrite() ? form('project-create', r, field('Project name', input('title', 'New project')) + button('Create project', true)) : ''}</div>`;
    });
  }
  function actions(c, r, q) {
    const branch = q.get('branch') || r.defaultBranch;
    return load(
      c,
      url(r, 'actions?' + new URLSearchParams({ branch })),
      (a) =>
        `<div class="co-page">${heading('Actions')}${box(`<h2>Run workflow</h2>${canWrite() && !r.empty ? form('run', r, field('Branch', select('branch', r.branchList.map((b) => option(b.name, b.name, a.branch)).join(''), 'data-run-branch')) + field('Workflow', select('workflow', a.workflows.map((w) => option(w)).join(''))) + button('Run workflow', true)) : '<p>No runnable branch.</p>'}<p>${a.auto ? 'Automatic checks enabled' : 'Manual dispatch'} · ${link(href(r, 'settings'), 'Repository settings')}</p>`)}${box(`<h2>Workflow runs</h2>${a.runs.map((run) => `<details class="co-run"><summary>${badge(run.state)} <strong>${esc(run.workflow)}</strong> #${run.id} · ${esc(run.branch)} <code>${esc(run.oid.slice(0, 7))}</code></summary><pre class="co-diff">${esc(run.log || 'Waiting for output…')}</pre></details>`).join('') || empty('No workflow runs yet', 'Run a workflow to see its logs.')}`)}</div>`,
    );
  }
  function security(c, r) {
    return load(
      c,
      url(r, 'security'),
      (s) =>
        `<div class="co-page">${heading('Security and quality')}${s.policy ? box(link(c.repoHref(r.name, 'code', s.ref, s.policy), 'Security policy')) : ''}${box(`<h2>Code scanning alerts</h2>${s.alerts.map((a) => `<article class="co-item"><h3>${esc(a.message)}</h3><p>${badge(a.state)} ${esc(a.tool)} · ${esc(a.rule)} · ${link(c.repoHref(r.name, 'code', a.oid, a.path), a.path + ':' + a.line)}</p>${canWrite() && a.state !== 'fixed' ? form('alert', r, button(a.state === 'dismissed' ? 'Reopen alert' : 'Dismiss alert'), `data-id="${a.id}" data-state="${a.state === 'dismissed' ? 'open' : 'dismissed'}"`) : ''}</article>`).join('') || '<p>No recorded alerts.</p>'}${canWrite() && !r.empty ? form('scan', r, field('Scan branch', select('branch', r.branchList.map((b) => option(b.name, b.name, r.defaultBranch)).join(''))) + button('Run code scanning', true)) + `<details><summary>Import SARIF report</summary>${form('sarif', r, field('Branch', select('branch', r.branchList.map((b) => option(b.name, b.name, r.defaultBranch)).join(''))) + field('SARIF 2.1.0 report', '<input name="file" type="file" accept=".json,.sarif,application/json" required>') + button('Import findings'))}</details>` : ''}`)}${box(`<h2>Private vulnerability reporting</h2>${s.reports.map((p) => `<details><summary>${badge(p.state)} ${esc(p.title)}</summary><p class="co-body">${esc(p.body)}</p><small>${esc(p.author)}</small>${s.manage ? form('private-report-state', r, button(p.state === 'open' ? 'Resolve report' : 'Reopen report'), `data-id="${p.id}" data-state="${p.state === 'open' ? 'resolved' : 'open'}"`) : ''}</details>`).join('')}${canWrite() ? `<details><summary>Report a vulnerability</summary>${form('private-report', r, field('Title', input('title', 'Report title')) + field('Report', text('body', 'Visible to the reporter and repository maintainers', true)) + button('Submit private report'))}</details>` : ''}`)}</div>`,
    );
  }
  function packages(c, r) {
    return load(
      c,
      url(r, 'packages'),
      (data) =>
        `<div class="co-page">${heading('Packages')}${box(data.packages.map((p) => `<div class="co-row"><strong>${esc(p.name)}</strong><code>${esc(p.version)}</code>${link('/api/' + url(r, 'raw?') + new URLSearchParams({ ref: p.oid, path: p.path, download: '1' }), p.path)}<small>${esc(p.author)} · ${p.size} B</small></div>`).join('') || empty('No packages published', 'Publish a version of a file from this repository.'))}${canWrite() && !r.empty ? box(form('publish', r, field('Package name', input('name', 'Name')) + field('Version', input('version', '1.0.0')) + field('Branch or tag', input('ref', 'Ref', r.defaultBranch)) + field('Repository file', input('path', 'dist/file.zip')) + button('Publish package', true))) : ''}</div>`,
    );
  }
  function rules(c, r) {
    return load(c, url(r, 'rules'), (v) =>
      box(
        `<h2>Pull requests and workflows</h2>${form('rules', r, `<label><input name="requireReview" type="checkbox" ${v.requireReview ? 'checked' : ''} ${v.canManage ? '' : 'disabled'}> Require an approving review on the current revision before merging a pull request</label><label><input name="auto" type="checkbox" ${v.auto ? 'checked' : ''} ${v.canManage ? '' : 'disabled'}> Run checks on pushes and pull requests</label>${v.canManage ? button('Save rules') : ''}`)}`,
      ),
    );
  }
  const noticeLink = (n) =>
    n.kind === 'album'
      ? '/albums/?' + new URLSearchParams({ repo: n.repo, pull: n.number }) + '#/pulls'
      : '#/repos/' + enc(n.repo) + '/' + n.kind + '/' + n.number;
  function inbox(c, settings = false) {
    return load(c, 'inbox', (v) => {
      if (settings)
        return `<h1 class="gh-settings-title">Notifications</h1>${form('inbox-settings', null, `<label><input type="checkbox" name="watching" ${v.settings.watching ? 'checked' : ''}> Repositories you watch</label><label><input type="checkbox" name="participating" ${v.settings.participating ? 'checked' : ''}> Participating, assignments and mentions</label>` + button('Save preferences'))}${link('#/notifications', 'Open inbox')}`;
      const all = new URLSearchParams(location.hash.split('?')[1]).get('filter') === 'all';
      return `<div class="co-page">${heading('Notifications', form('read-all', null, button('Mark all as read')))}<nav class="co-tabs">${link('#/notifications', 'Unread (' + v.items.filter((n) => n.unread).length + ')')}${link('#/notifications?filter=all', 'All notifications')}</nav>${box(
        v.items
          .filter((n) => all || n.unread)
          .map(
            (n) =>
              `<article class="co-row"><span>${icon(n.kind === 'issues' ? 'issue-opened' : 'git-pull-request')}</span><div><small>${esc(n.repo)} #${n.number} · ${esc(n.reason)}</small><p><a data-notice="${n.id}" href="${esc(noticeLink(n))}">${esc(n.title)}</a></p></div>${form('notice', null, button(n.unread ? 'Mark as read' : 'Mark as unread'), `data-id="${n.id}" data-action-name="${n.unread ? 'read' : 'unread'}"`)}</article>`,
          )
          .join('') ||
          empty('You’re all caught up', 'Watch a repository or join a conversation to receive updates.'),
      )}</div>`;
    });
  }
  function repoPage(c, r, area, id, q) {
    context = c;
    if (area === 'issues' && id) return issue(c, r, id);
    if (area === 'pulls' && r.kind !== 'album' && id)
      return id === 'new' ? newPull(c, r) : pull(c, r, id, q);
    switch (area) {
      case 'forks':
        return forks(c, r);
      case 'branches':
        return manageBranches(c, r);
      case 'projects':
        return projects(c, r, q);
      case 'actions':
        return actions(c, r, q);
      case 'security':
        return security(c, r);
      case 'packages':
        return packages(c, r);
      default:
        return null;
    }
  }
  async function submit(f) {
    const data = new FormData(f),
      v = Object.fromEntries(data),
      type = f.dataset.collabForm,
      r = context.repos.find((r) => r.name === f.dataset.repo),
      d = f.dataset;
    const label = f.querySelector('[type=submit],button');
    if (label) label.disabled = true;
    let path,
      body = v,
      method = 'POST',
      redirect = '';
    const n = d.number;
    if (type.startsWith('issue-')) {
      path = 'issues/' + n;
      if (type === 'issue-comment') body = { action: 'comment', body: v.body };
      if (type === 'issue-state') body = { action: 'state', state: d.state };
      if (type === 'issue-meta')
        body = {
          action: 'metadata',
          assignees: data.getAll('assignees'),
          labels: data.getAll('labels').map(Number),
        };
    } else if (type.startsWith('pull-')) {
      const action =
        type === 'pull-review' ? v.decision : type === 'pull-inline' ? 'comment' : type.slice(5);
      path = 'pulls/' + n + '/' + action;
      body = {
        ...(action === 'resolve'
          ? {
              resolutionBranch: v.resolutionBranch,
              resolutionOid: r.branchList.find((b) => b.name === v.resolutionBranch)?.oid,
            }
          : {}),
        body: v.body || '',
        headOid: d.head,
        baseOid: d.base,
        ...(d.path ? { path: d.path, line: v.line ? Number(v.line) : null } : {}),
      };
    } else
      switch (type) {
        case 'new-pull':
          path = 'pulls';
          break;
        case 'new-label':
          path = 'labels';
          body = { name: v.name, color: v.color.slice(1) };
          break;
        case 'fork':
          path = 'forks';
          break;
        case 'branch-create':
          path = 'branches';
          break;
        case 'branch-delete':
          if (!confirm('Delete branch ' + d.branch + '?')) {
            label.disabled = false;
            return;
          }
          path = 'branches';
          method = 'DELETE';
          body = { name: d.branch, expectedOid: d.oid };
          break;
        case 'project-create':
          path = 'projects';
          break;
        case 'project-add':
          path = 'projects/' + d.project + '/items';
          body = { kind: v.kind, title: v.item, number: Number(v.item) };
          break;
        case 'project-edit':
          path = 'projects/' + d.project + '/items/' + d.item;
          body = {
            ...v,
            values: Object.fromEntries(
              Object.entries(v)
                .filter(([k]) => k.startsWith('custom-'))
                .map(([k, x]) => [k.slice(7), x]),
            ),
          };
          break;
        case 'project-view':
        case 'project-field':
          path = 'projects/' + d.project + '/items';
          body = { ...v, action: type.slice(8) };
          break;
        case 'run':
          path = 'actions/runs';
          break;
        case 'scan':
          path = 'actions/runs';
          body = { branch: v.branch, workflow: 'Code scanning' };
          redirect = href(r, 'actions');
          break;
        case 'alert':
          path = 'security/alerts/' + d.id;
          body = { state: d.state };
          break;
        case 'private-report':
          path = 'security/reports';
          break;
        case 'private-report-state':
          path = 'security/reports/' + d.id;
          body = { state: d.state };
          break;
        case 'sarif':
          path = 'security/sarif';
          body = {
            branch: v.branch,
            oid: r.branchList.find((b) => b.name === v.branch)?.oid,
            report: JSON.parse(await v.file.text()),
          };
          break;
        case 'rules':
          path = 'rules';
          method = 'PUT';
          body = { auto: !!v.auto, requireReview: !!v.requireReview };
          break;
        case 'publish':
          path = 'packages';
          break;
        case 'notice':
          method = 'PUT';
          path = 'inbox';
          body = { action: d.actionName, id: Number(d.id) };
          break;
        case 'read-all':
          method = 'PUT';
          path = 'inbox';
          body = { action: 'read-all' };
          break;
        case 'inbox-settings':
          method = 'PUT';
          path = 'inbox';
          body = { action: 'settings', watching: !!v.watching, participating: !!v.participating };
          break;
        default:
          throw Error('Unknown action.');
      }
    const result = await context.api(r ? url(r, path) : path, { method, body });
    if (type === 'new-pull') redirect = href(r, 'pulls') + '/' + result.number;
    if (type === 'fork') redirect = context.repoHref(result.name);
    f.reset();
    f.removeAttribute('data-dirty');
    cache.clear();
    await context.refresh();
    if (redirect) location.hash = redirect;
    else context.rerender();
    context.notify('Saved');
  }
  document.addEventListener('submit', (event) => {
    const f = event.target.closest('[data-collab-form]');
    if (!f) return;
    event.preventDefault();
    submit(f).catch((e) => {
      context.notify(e.message);
      let message = f.querySelector('[role=alert]');
      if (!message) {
        message = document.createElement('p');
        message.setAttribute('role', 'alert');
        f.append(message);
      }
      message.textContent = e.message;
      const b = f.querySelector('button');
      if (b) b.disabled = false;
    });
  });
  document.addEventListener('input', (event) =>
    event.target.closest('[data-collab-form]')?.setAttribute('data-dirty', 'true'),
  );
  document.addEventListener('change', (event) => {
    const el = event.target;
    if (el.matches('[data-source-picker]')) {
      const r = context.repos.find((r) => r.name === el.value),
        head = el.form.elements.head;
      head.replaceChildren(...(r?.branchList || []).map((b) => new Option(b.name, b.name)));
      head.value =
        r?.branchList.find((b) => b.name !== el.form.elements.base.value)?.name ||
        r?.defaultBranch ||
        '';
    }
    if (el.matches('[data-run-branch]'))
      location.hash = location.hash.split('?')[0] + '?' + new URLSearchParams({ branch: el.value });
  });
  document.addEventListener('click', (event) => {
    const a = event.target.closest('a[data-notice]');
    if (!a || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const dest = a.href;
    context
      .api('inbox', { method: 'PUT', body: { action: 'read', id: Number(a.dataset.notice) } })
      .then(() => {
        cache.delete('inbox');
        location.assign(dest);
      })
      .catch((e) => context.notify(e.message));
  });
  window.GitpolarCollab = { repoPage, rules, inbox, invalidate: () => cache.clear() };
})();
