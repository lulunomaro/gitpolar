import { db } from './store.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS album_stars (
  repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('activity','photo')),
  target_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(repo_id, target_kind, target_id, user_id)
) WITHOUT ROWID`);

// A Star belongs to an account and an album item across its Git revisions.
export function albumStarSummary(repoId, userId) {
  const result = { activity: new Map(), photo: new Map() };
  const rows = db
    .prepare(
      `SELECT target_kind, target_id, count(*) AS n, max(user_id=?) AS mine
    FROM album_stars WHERE repo_id=? GROUP BY target_kind,target_id`
    )
    .all(userId ?? null, repoId);
  for (const row of rows) {
    result[row.target_kind].set(row.target_id, { starCount: row.n, starred: Boolean(row.mine) });
  }
  return result;
}

export function setAlbumStar(repoId, userId, kind, targetId, enabled) {
  const key = [repoId, kind, targetId, userId];
  if (enabled) {
    db.prepare('INSERT OR IGNORE INTO album_stars(repo_id,target_kind,target_id,user_id) VALUES(?,?,?,?)').run(
      ...key
    );
  } else {
    db.prepare('DELETE FROM album_stars WHERE repo_id=? AND target_kind=? AND target_id=? AND user_id=?').run(
      ...key
    );
  }
  const row = db
    .prepare(
      `SELECT count(*) AS n, max(user_id=?) AS mine FROM album_stars
    WHERE repo_id=? AND target_kind=? AND target_id=?`
    )
    .get(userId, repoId, kind, targetId);
  return { starCount: row.n, starred: Boolean(row.mine) };
}
