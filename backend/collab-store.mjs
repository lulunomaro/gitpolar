import { db, now } from './store.mjs';
import { fail } from './auth.mjs';

db.exec(`
CREATE TABLE IF NOT EXISTS code_pulls (id INTEGER PRIMARY KEY, repo_id TEXT NOT NULL REFERENCES repos(id), number INTEGER NOT NULL, source_id TEXT NOT NULL REFERENCES repos(id), base TEXT NOT NULL, head TEXT NOT NULL, author_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL, body TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'open', base_oid TEXT NOT NULL, head_oid TEXT NOT NULL, merged_oid TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(repo_id,number));
CREATE UNIQUE INDEX IF NOT EXISTS code_pulls_open ON code_pulls(repo_id,source_id,base,head) WHERE state='open';
CREATE TABLE IF NOT EXISTS collab_posts (id INTEGER PRIMARY KEY, repo_id TEXT NOT NULL REFERENCES repos(id), kind TEXT NOT NULL, number INTEGER NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id), event TEXT NOT NULL, body TEXT NOT NULL, oid TEXT, path TEXT, line INTEGER, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS collab_threads ON collab_posts(repo_id,kind,number,id);
CREATE TABLE IF NOT EXISTS issue_assignees (issue_id INTEGER NOT NULL REFERENCES issues(id), user_id INTEGER NOT NULL REFERENCES users(id), PRIMARY KEY(issue_id,user_id));
CREATE TABLE IF NOT EXISTS repo_labels (id INTEGER PRIMARY KEY, repo_id TEXT NOT NULL REFERENCES repos(id), name TEXT NOT NULL COLLATE NOCASE, color TEXT NOT NULL, UNIQUE(repo_id,name));
CREATE TABLE IF NOT EXISTS issue_labels (issue_id INTEGER NOT NULL REFERENCES issues(id), label_id INTEGER NOT NULL REFERENCES repo_labels(id), PRIMARY KEY(issue_id,label_id));
CREATE TABLE IF NOT EXISTS collab_inbox (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), repo_id TEXT NOT NULL REFERENCES repos(id), kind TEXT NOT NULL, number INTEGER NOT NULL, title TEXT NOT NULL, reason TEXT NOT NULL, unread INTEGER NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id,repo_id,kind,number));
CREATE TABLE IF NOT EXISTS inbox_settings (user_id INTEGER PRIMARY KEY REFERENCES users(id), watching INTEGER NOT NULL DEFAULT 1, participating INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS repo_rules (repo_id TEXT PRIMARY KEY REFERENCES repos(id), require_review INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS repo_projects (id INTEGER PRIMARY KEY, repo_id TEXT NOT NULL REFERENCES repos(id), title TEXT NOT NULL, owner_id INTEGER NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS project_items (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES repo_projects(id), title TEXT NOT NULL, kind TEXT NOT NULL, number INTEGER, status TEXT NOT NULL DEFAULT 'Todo', priority TEXT NOT NULL DEFAULT '', due TEXT NOT NULL DEFAULT '', UNIQUE(project_id,kind,number));
CREATE TABLE IF NOT EXISTS project_fields(id INTEGER PRIMARY KEY,project_id INTEGER NOT NULL REFERENCES repo_projects(id),name TEXT NOT NULL COLLATE NOCASE,type TEXT NOT NULL,UNIQUE(project_id,name));
CREATE TABLE IF NOT EXISTS project_values(item_id INTEGER NOT NULL REFERENCES project_items(id),field_id INTEGER NOT NULL REFERENCES project_fields(id),value TEXT NOT NULL,PRIMARY KEY(item_id,field_id));
CREATE TABLE IF NOT EXISTS project_views(id INTEGER PRIMARY KEY,project_id INTEGER NOT NULL REFERENCES repo_projects(id),name TEXT NOT NULL,layout TEXT NOT NULL,status TEXT NOT NULL,UNIQUE(project_id,name));
CREATE TABLE IF NOT EXISTS private_reports(id INTEGER PRIMARY KEY,repo_id TEXT NOT NULL REFERENCES repos(id),author_id INTEGER NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'open',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS repo_packages (id INTEGER PRIMARY KEY, repo_id TEXT NOT NULL REFERENCES repos(id), name TEXT NOT NULL, version TEXT NOT NULL, path TEXT NOT NULL, oid TEXT NOT NULL, size INTEGER NOT NULL, publisher INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, UNIQUE(repo_id,name,version));
`);
export function field(value, max, label, required = true) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim()) ||
    value.includes('\0')
  )
    fail(400, `Invalid ${label}.`);
  return value.trim();
}
export function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = fn();
    db.exec('COMMIT');
    return value;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function nextNumber(repo) {
  return db
    .prepare(
      `SELECT max(coalesce((SELECT max(number) FROM issues WHERE repo_id=?),0),coalesce((SELECT max(number) FROM code_pulls WHERE repo_id=?),0))+1 n`,
    )
    .get(repo.id, repo.id).n;
}
export const canManage = (repo, user) =>
  user.role === 'admin' || (user.role !== 'reader' && repo.creator_id === user.id);
export function requireManager(repo, user) {
  if (!canManage(repo, user)) fail(403, 'Repository owner or administrator required.');
}
export const members = () =>
  db
    .prepare(
      'SELECT username FROM users WHERE id NOT IN (SELECT user_id FROM personal_workspaces) ORDER BY username',
    )
    .all()
    .map((v) => v.username);
export const thread = (repo, kind, number) =>
  db
    .prepare(
      `SELECT p.id,u.username AS author,p.event,p.body,p.oid,p.path,p.line,p.created_at AS createdAt FROM collab_posts p JOIN users u ON u.id=p.user_id WHERE repo_id=? AND kind=? AND number=? ORDER BY p.id`,
    )
    .all(repo.id, kind, number);
export function post(repo, kind, number, user, event, text = '', oid = null, path = null, line = null) {
  db.prepare(
    'INSERT INTO collab_posts(repo_id,kind,number,user_id,event,body,oid,path,line,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
  ).run(repo.id, kind, number, user.id, event, text, oid, path, line, now());
}
export const inboxSettings = (id) =>
  db.prepare('SELECT watching,participating FROM inbox_settings WHERE user_id=?').get(id) || {
    watching: 1,
    participating: 1,
  };
export function deliver(repo, kind, number, title, actor, participants = [], text = '') {
  const dest = new Map();
  for (const { user_id: id } of db
    .prepare("SELECT user_id FROM preferences WHERE repo_id=? AND kind='watch'")
    .all(repo.id))
    if (inboxSettings(id).watching) dest.set(id, 'watching');
  const people = db
    .prepare('SELECT DISTINCT user_id FROM collab_posts WHERE repo_id=? AND kind=? AND number=?')
    .all(repo.id, kind, number)
    .map((p) => p.user_id);
  for (const id of [repo.creator_id, ...people, ...participants])
    if (id && inboxSettings(id).participating) dest.set(id, 'participating');
  for (const [, name] of text.matchAll(/(?:^|\s)@([a-z0-9][a-z0-9_-]{0,47})\b/gi)) {
    const person = db
      .prepare(
        'SELECT id FROM users WHERE username=? AND id NOT IN (SELECT user_id FROM personal_workspaces)',
      )
      .get(name.toLowerCase());
    if (person && inboxSettings(person.id).participating) dest.set(person.id, 'mention');
  }
  dest.delete(actor.id);
  const insert = db.prepare(
    `INSERT INTO collab_inbox(user_id,repo_id,kind,number,title,reason,unread,updated_at) VALUES(?,?,?,?,?,?,1,?) ON CONFLICT(user_id,repo_id,kind,number) DO UPDATE SET title=excluded.title,reason=excluded.reason,unread=1,updated_at=excluded.updated_at`,
  );
  for (const [id, reason] of dest) insert.run(id, repo.id, kind, number, title, reason, now());
}
