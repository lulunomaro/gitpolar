import { db } from './store.mjs';
import { fail } from './auth.mjs';
import { field, members, deliver, post, thread, transaction } from './collab-store.mjs';

export function issueDetails(repo, n) {
  const issue = db
    .prepare(
      'SELECT i.*,u.username AS author FROM issues i JOIN users u ON u.id=i.author_id WHERE repo_id=? AND number=?',
    )
    .get(repo.id, n);
  if (!issue) fail(404, 'Issue not found.');
  const labels = db
    .prepare(
      'SELECT l.* FROM repo_labels l JOIN issue_labels x ON x.label_id=l.id WHERE x.issue_id=? ORDER BY l.name',
    )
    .all(issue.id);
  const assignees = db
    .prepare(
      'SELECT u.username FROM issue_assignees a JOIN users u ON u.id=a.user_id WHERE issue_id=? ORDER BY u.username',
    )
    .all(issue.id)
    .map((u) => u.username);
  return {
    ...issue,
    labels,
    assignees,
    posts: thread(repo, 'issues', n),
    members: members(),
    availableLabels: db
      .prepare('SELECT id,name,color FROM repo_labels WHERE repo_id=? ORDER BY name')
      .all(repo.id),
  };
}
export function editIssue(repo, user, n, v) {
  return transaction(() => {
    const issue = issueDetails(repo, n);
    let event = 'edited',
      text = '';
    if (v.action === 'comment') {
      text = field(v.body, 6000, 'comment');
      event = 'comment';
    } else if (v.action === 'state' && ['open', 'closed'].includes(v.state)) {
      db.prepare('UPDATE issues SET state=? WHERE id=?').run(v.state, issue.id);
      event = v.state === 'open' ? 'reopened' : 'closed';
    } else if (v.action === 'metadata') {
      if (
        !Array.isArray(v.assignees) ||
        !Array.isArray(v.labels) ||
        v.assignees.length > 10 ||
        v.labels.length > 32
      )
        fail(400, 'Invalid issue metadata.');
      db.prepare('DELETE FROM issue_assignees WHERE issue_id=?').run(issue.id);
      for (const name of new Set(v.assignees)) {
        if (!issue.members.includes(name)) fail(400, 'Unknown team member.');
        db.prepare('INSERT INTO issue_assignees SELECT ?,id FROM users WHERE username=?').run(
          issue.id,
          name,
        );
      }
      db.prepare('DELETE FROM issue_labels WHERE issue_id=?').run(issue.id);
      for (const id of new Set(v.labels)) {
        if (!issue.availableLabels.some((l) => l.id === id)) fail(400, 'Unknown repository label.');
        db.prepare('INSERT INTO issue_labels VALUES(?,?)').run(issue.id, id);
      }
      event = 'updated metadata';
    } else if (v.action === 'edit') {
      db.prepare('UPDATE issues SET title=?,body=? WHERE id=?').run(
        field(v.title, 160, 'title'),
        field(v.body, 6000, 'description', false),
        issue.id,
      );
    } else fail(400, 'Unknown issue action.');
    post(repo, 'issues', n, user, event, text);
    const result = issueDetails(repo, n),
      ids = db
        .prepare('SELECT user_id FROM issue_assignees WHERE issue_id=?')
        .all(issue.id)
        .map((a) => a.user_id);
    deliver(repo, 'issues', n, result.title, user, [issue.author_id, ...ids], text);
    return result;
  });
}
export function createLabel(repo, v) {
  const name = field(v.name, 50, 'label');
  if (!/^[0-9a-f]{6}$/i.test(v.color || '')) fail(400, 'Use a six-digit hex color.');
  if (db.prepare('SELECT id FROM repo_labels WHERE repo_id=? AND name=?').get(repo.id, name))
    fail(409, 'Label already exists.');
  return {
    id: Number(
      db.prepare('INSERT INTO repo_labels(repo_id,name,color) VALUES(?,?,?)').run(repo.id, name, v.color)
        .lastInsertRowid,
    ),
    name,
    color: v.color,
  };
}
export function projects(repo) {
  const rows = db.prepare('SELECT * FROM repo_projects WHERE repo_id=? ORDER BY id').all(repo.id);
  for (const project of rows) {
    project.fields = db
      .prepare('SELECT id,name,type FROM project_fields WHERE project_id=? ORDER BY id')
      .all(project.id);
    project.views = db
      .prepare('SELECT id,name,layout,status FROM project_views WHERE project_id=? ORDER BY id')
      .all(project.id);
    project.items = db
      .prepare(
        `SELECT x.*,coalesce(i.title,p.title,x.title) AS displayTitle FROM project_items x LEFT JOIN issues i ON x.kind='issues' AND i.repo_id=? AND i.number=x.number LEFT JOIN code_pulls p ON x.kind='pulls' AND p.repo_id=? AND p.number=x.number WHERE x.project_id=? ORDER BY x.id`,
      )
      .all(repo.id, repo.id, project.id);
    const values = db
      .prepare(
        'SELECT v.* FROM project_values v JOIN project_items x ON x.id=v.item_id WHERE x.project_id=?',
      )
      .all(project.id);
    const byId = new Map(project.items.map((i) => [i.id, i]));
    for (const item of project.items) item.values = {};
    for (const v of values) byId.get(v.item_id).values[v.field_id] = v.value;
  }
  return rows;
}
export function projectAction(repo, user, projectId, itemId, v) {
  if (!projectId)
    return {
      id: Number(
        db
          .prepare('INSERT INTO repo_projects(repo_id,title,owner_id) VALUES(?,?,?)')
          .run(repo.id, field(v.title, 100, 'project title'), user.id).lastInsertRowid,
      ),
    };
  if (!db.prepare('SELECT 1 FROM repo_projects WHERE id=? AND repo_id=?').get(projectId, repo.id))
    fail(404, 'Project not found.');
  if (v.action === 'field') {
    if (!['text', 'number', 'date'].includes(v.type)) fail(400, 'Invalid field type.');
    if (
      !db
        .prepare('INSERT OR IGNORE INTO project_fields(project_id,name,type) VALUES(?,?,?)')
        .run(projectId, field(v.name, 50, 'field name'), v.type).changes
    )
      fail(409, 'Field name already exists.');
    return { ok: true };
  }
  if (v.action === 'view') {
    if (
      !['board', 'table', 'roadmap'].includes(v.layout) ||
      !['', 'Todo', 'In progress', 'Done'].includes(v.status)
    )
      fail(400, 'Invalid view settings.');
    if (
      !db
        .prepare('INSERT OR IGNORE INTO project_views(project_id,name,layout,status) VALUES(?,?,?,?)')
        .run(projectId, field(v.name, 50, 'view name'), v.layout, v.status).changes
    )
      fail(409, 'View name already exists.');
    return { ok: true };
  }
  if (!itemId) {
    let title = '',
      number = null;
    if (v.kind === 'draft') title = field(v.title, 160, 'draft title');
    else if (['issues', 'pulls'].includes(v.kind)) {
      number = Number(v.number);
      const item = db
        .prepare(
          `SELECT title FROM ${v.kind === 'issues' ? 'issues' : 'code_pulls'} WHERE repo_id=? AND number=?`,
        )
        .get(repo.id, number);
      if (!item) fail(404, 'Issue or pull request not found.');
      if (
        db
          .prepare('SELECT 1 FROM project_items WHERE project_id=? AND kind=? AND number=?')
          .get(projectId, v.kind, number)
      )
        fail(409, 'Item is already on this project.');
      title = item.title;
    } else fail(400, 'Choose a draft, issue or pull request.');
    return {
      id: Number(
        db
          .prepare('INSERT INTO project_items(project_id,title,kind,number) VALUES(?,?,?,?)')
          .run(projectId, title, v.kind, number).lastInsertRowid,
      ),
    };
  }
  if (
    !['Todo', 'In progress', 'Done'].includes(v.status) ||
    !['', 'High', 'Medium', 'Low'].includes(v.priority) ||
    (v.due !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(v.due))
  )
    fail(400, 'Invalid project fields.');
  return transaction(() => {
    if (
      !db
        .prepare('UPDATE project_items SET status=?,priority=?,due=? WHERE id=? AND project_id=?')
        .run(v.status, v.priority, v.due, itemId, projectId).changes
    )
      fail(404, 'Project item not found.');
    const definitions = db.prepare('SELECT * FROM project_fields WHERE project_id=?').all(projectId);
    for (const [id, raw] of Object.entries(v.values || {})) {
      const def = definitions.find((f) => String(f.id) === id),
        value = field(raw, 300, 'field value', false);
      if (
        !def ||
        (value &&
          ((def.type === 'number' && !Number.isFinite(Number(value))) ||
            (def.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value))))
      )
        fail(400, 'Invalid custom field value.');
      db.prepare(
        'INSERT INTO project_values VALUES(?,?,?) ON CONFLICT(item_id,field_id) DO UPDATE SET value=excluded.value',
      ).run(itemId, def.id, value);
    }
    return { ok: true };
  });
}
