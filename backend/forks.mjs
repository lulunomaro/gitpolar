import { mkdir, link, copyFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { constants } from 'node:fs';
import { db, repository } from './store.mjs';
import { git, createRepository, repoPath } from './git.mjs';
import { objectPath } from './lfs.mjs';
import { fail } from './auth.mjs';

export const rootId = (repo) =>
  db.prepare('SELECT root_id FROM repo_forks WHERE repo_id=?').get(repo.id)?.root_id || repo.id;
export function forkNetwork(repo) {
  return db
    .prepare(
      `SELECT r.id,r.name,u.username AS owner,p.name AS parent FROM repos r JOIN users u ON u.id=r.creator_id LEFT JOIN repo_forks f ON f.repo_id=r.id LEFT JOIN repos p ON p.id=f.parent_id WHERE r.status='ready' AND (r.id=? OR f.root_id=?) ORDER BY r.created_at`,
    )
    .all(rootId(repo), rootId(repo));
}
export async function copyLfs(source, target) {
  if (source.id === target.id) return;
  const missing = db
    .prepare(
      `SELECT s.oid,s.size FROM lfs_objects s WHERE s.repo_id=? AND s.complete=1 AND NOT EXISTS (SELECT 1 FROM lfs_objects t WHERE t.repo_id=? AND t.oid=s.oid AND t.complete=1)`,
    )
    .all(source.id, target.id);
  for (const { oid, size } of missing) {
    const from = objectPath(source, oid),
      to = objectPath(target, oid);
    await mkdir(dirname(to), { recursive: true });
    try {
      await link(from, to);
    } catch (e) {
      if (['EXDEV', 'ENOTSUP', 'EPERM'].includes(e.code)) {
        try {
          await copyFile(from, to, constants.COPYFILE_EXCL);
        } catch (copy) {
          if (copy.code !== 'EEXIST') throw copy;
        }
      } else if (e.code !== 'EEXIST') throw e;
    }
    if ((await stat(to)).size !== size) fail(409, 'A fork LFS object has an incorrect size.');
    db.prepare(
      'INSERT INTO lfs_objects(repo_id,oid,size,complete) VALUES(?,?,?,1) ON CONFLICT(repo_id,oid) DO UPDATE SET size=excluded.size,complete=1',
    ).run(target.id, oid, size);
  }
}
export async function forkRepository(source, user, name) {
  if (source.kind === 'album') fail(409, 'Submit an album pull request to contribute to this album.');
  await createRepository(
    user,
    { name, description: source.description, initialize: false },
    async (target) => {
      await git(target.name, [
        'fetch',
        '--no-write-fetch-head',
        '--no-tags',
        repoPath(source.name),
        '+refs/heads/*:refs/heads/*',
        '+refs/tags/*:refs/tags/*',
      ]);
      const head = (await git(source.name, ['symbolic-ref', 'HEAD'])).trim();
      await git(target.name, ['symbolic-ref', 'HEAD', head]);
      await copyLfs(source, target);
      db.prepare('INSERT INTO repo_forks(repo_id,parent_id,root_id) VALUES(?,?,?)').run(
        target.id,
        source.id,
        rootId(source),
      );
    },
  );
  return repository(name);
}
