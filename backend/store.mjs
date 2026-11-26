import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dataRoot, dbPath } from './config.mjs';
mkdirSync(dataRoot, { recursive: true });
export const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT, github_id INTEGER UNIQUE, display_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK(role IN ('admin','writer','reader')), created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS tokens (id TEXT PRIMARY KEY, hash TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL, created_at TEXT NOT NULL, last_used TEXT);
  CREATE TABLE IF NOT EXISTS repos (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL, creator_id INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'creating');
  CREATE TABLE IF NOT EXISTS lfs_objects (repo_id TEXT NOT NULL REFERENCES repos(id), oid TEXT NOT NULL, size INTEGER NOT NULL, complete INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(repo_id,oid));
  CREATE TABLE IF NOT EXISTS locks (id TEXT PRIMARY KEY, repo_id TEXT NOT NULL REFERENCES repos(id), path TEXT NOT NULL, owner_id INTEGER NOT NULL REFERENCES users(id), locked_at TEXT NOT NULL, UNIQUE(repo_id,path));
  CREATE TABLE IF NOT EXISTS issues (id INTEGER PRIMARY KEY, number INTEGER NOT NULL, repo_id TEXT NOT NULL REFERENCES repos(id), author_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL, body TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL, UNIQUE(repo_id,number));
  CREATE TABLE IF NOT EXISTS preferences (user_id INTEGER NOT NULL REFERENCES users(id), repo_id TEXT NOT NULL REFERENCES repos(id), kind TEXT NOT NULL CHECK(kind IN ('star','watch')), PRIMARY KEY(user_id,repo_id,kind));
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
`);
if (!db.prepare('PRAGMA table_info(sessions)').all().some(column => column.name === 'provider')) db.exec("ALTER TABLE sessions ADD COLUMN provider TEXT NOT NULL DEFAULT 'local'");
export const now = () => new Date().toISOString();
export const getUser = id => db.prepare('SELECT id,username,display_name AS name,role FROM users WHERE id=?').get(id);
export const userCount = () => db.prepare('SELECT count(*) AS n FROM users').get().n;
export const repository = name => db.prepare("SELECT * FROM repos WHERE name=? AND status='ready'").get(name);
