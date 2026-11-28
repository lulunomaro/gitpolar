import { db } from './store.mjs';
import { body, fail, json, requireAuth } from './auth.mjs';
import { branches, git, fileContent, resolveRef } from './git.mjs';
import { canManage, field, inboxSettings, requireManager } from './collab-store.mjs';
import { forkNetwork, forkRepository } from './forks.mjs';
import { createPull, listPulls, pullDetail, actOnPull } from './code-pulls.mjs';
import { issueDetails, editIssue, createLabel, projects, projectAction } from './issue-project.mjs';
import {
  workflows,
  ciRuns,
  ciEnabled,
  manualRun,
  autoRun,
  pullChecks,
  alerts,
  importSarif,
} from './ci.mjs';

export async function globalCollab(req, res, path) {
  const user = requireAuth(req, res);
  if (path === '/api/pulls' && req.method === 'GET') return json(res, { pulls: await listPulls() });
  if (path === '/api/inbox' && req.method === 'GET') {
    const items = db
      .prepare(
        `SELECT n.id,r.name AS repo,n.kind,n.number,n.title,n.reason,n.unread,n.updated_at FROM collab_inbox n JOIN repos r ON r.id=n.repo_id WHERE n.user_id=? AND r.status='ready' ORDER BY n.updated_at DESC`,
      )
      .all(user.id);
    return json(res, { items, settings: inboxSettings(user.id) });
  }
  fail(404, 'Unknown collaboration route.');
}
export function updateInbox(user, v) {
  if (v.action === 'settings') {
    if (typeof v.watching !== 'boolean' || typeof v.participating !== 'boolean')
      fail(400, 'Invalid notification settings.');
    db.prepare(
      'INSERT INTO inbox_settings VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET watching=excluded.watching, participating=excluded.participating',
    ).run(user.id, +v.watching, +v.participating);
  } else if (v.action === 'read-all')
    db.prepare('UPDATE collab_inbox SET unread=0 WHERE user_id=?').run(user.id);
  else if (['read', 'unread'].includes(v.action)) {
    if (
      !db
        .prepare('UPDATE collab_inbox SET unread=? WHERE id=? AND user_id=?')
        .run(+(v.action === 'unread'), Number(v.id), user.id).changes
    )
      fail(404, 'Notification not found.');
  } else fail(400, 'Unknown inbox action.');
  return { ok: true };
}
const packageList = (repo) =>
  db
    .prepare(
      `SELECT p.*,u.username AS author FROM repo_packages p JOIN users u ON u.id=p.publisher WHERE repo_id=? ORDER BY id DESC`,
    )
    .all(repo.id);
async function publish(repo, user, v) {
  for (const key of ['name', 'version'])
    if (typeof v[key] !== 'string' || !/^[\w][\w.+-]{0,79}$/.test(v[key]))
      fail(400, 'Invalid package ' + key + '.');
  const oid = await resolveRef(repo, field(v.ref, 255, 'ref')),
    path = field(v.path, 1000, 'file');
  const file = await fileContent(repo, oid, path);
  if (file.lfs && !file.lfsAvailable) fail(409, 'The LFS file is unavailable.');
  if (
    db
      .prepare('SELECT 1 FROM repo_packages WHERE repo_id=? AND name=? AND version=?')
      .get(repo.id, v.name, v.version)
  )
    fail(409, 'Package version already exists.');
  // Keep the commit reachable even if the publishing branch is deleted.
  await git(repo.name, ['update-ref', 'refs/gitpolar/packages/' + oid, oid]);
  const created = db
    .prepare(
      'INSERT OR IGNORE INTO repo_packages(repo_id,name,version,path,oid,size,publisher,created_at) VALUES(?,?,?,?,?,?,?,?)',
    )
    .run(repo.id, v.name, v.version, path, oid, file.size, user.id, new Date().toISOString());
  if (!created.changes) fail(409, 'Package version already exists.');
  return { id: Number(created.lastInsertRowid) };
}
export const collaborationRoute =
  /^(?:issues\/\d+|labels|pulls(?:\/.*)?|forks|projects(?:\/.*)?|packages|actions(?:\/runs)?|security(?:\/alerts\/\d+|\/sarif|\/reports(?:\/\d+)?)?|rules)$/;
export async function repoCollab(req, res, repo, user, action, params, changed) {
  const method = req.method,
    [area, sub, third] = action.split('/'),
    n = Number(sub);
  const send = (data, status = 200) => {
    if (method !== 'GET') changed(repo.name);
    return json(res, data, status);
  };
  if (area === 'issues' && n) {
    if (method === 'GET') return send(issueDetails(repo, n));
    if (method === 'POST') return send(editIssue(repo, user, n, await body(req)));
  }
  if (area === 'labels' && method === 'POST') return send(createLabel(repo, await body(req)), 201);
  if (area === 'forks') {
    if (method === 'GET') return send({ network: forkNetwork(repo) });
    if (method === 'POST') return send(await forkRepository(repo, user, (await body(req)).name), 201);
  }
  if (area === 'pulls') {
    if (repo.kind === 'album') fail(409, 'Use the album review workflow.');
    if (!sub && method === 'GET')
      return send({ pulls: await listPulls(repo) });
    if (!sub && method === 'POST') {
      const pr = await createPull(repo, user, await body(req));
      await pullChecks(repo, pr.number, pr.base, pr.head_oid);
      return send(pr, 201);
    }
    if (n > 0 && !third && method === 'GET') return send(await pullDetail(repo, n, params.get('path')));
    if (n > 0 && third && method === 'POST') {
      const pr = await actOnPull(repo, user, n, third, await body(req));
      if (['merge', 'resolve'].includes(third)) await autoRun(repo, pr.base, pr.merged_oid);
      return send(pr);
    }
  }
  if (area === 'projects') {
    if (!sub && method === 'GET') return send({ projects: projects(repo) });
    if (method === 'POST' && /^projects(?:\/[1-9]\d*\/items(?:\/[1-9]\d*)?)?$/.test(action))
      return send(
        projectAction(repo, user, n, Number(action.split('/')[3]), await body(req)),
        third && action.split('/')[3] ? 200 : 201,
      );
  }
  if (area === 'packages') {
    if (method === 'GET') return send({ packages: packageList(repo) });
    if (method === 'POST') return send(await publish(repo, user, await body(req)), 201);
  }
  if (area === 'actions') {
    if (!sub && method === 'GET') {
      const list = await branches(repo),
        ref =
          list.find((b) => b.name === params.get('branch')) ||
          list.find((b) => b.name === 'main') ||
          list[0];
      return send({
        runs: ciRuns(repo),
        workflows: await workflows(repo, ref?.oid),
        branch: ref?.name,
        auto: ciEnabled(repo),
        manage: canManage(repo, user),
      });
    }
    if (sub === 'runs' && method === 'POST') return send(await manualRun(repo, await body(req)), 202);
  }
  if (area === 'security') {
    if (!sub && method === 'GET') {
      const reports = db
        .prepare(
          'SELECT p.id,p.title,p.body,p.state,u.username AS author FROM private_reports p JOIN users u ON u.id=p.author_id WHERE p.repo_id=? AND (p.author_id=? OR ?=1) ORDER BY p.id DESC',
        )
        .all(repo.id, user.id, +canManage(repo, user));
      const listing = await branches(repo),
        ref = listing.find((b) => b.name === 'main') || listing[0];
      const policy = ref
        ? (
            await git(repo.name, [
              'ls-tree',
              '-r',
              '--name-only',
              ref.oid,
              '--',
              'SECURITY.md',
              '.github/SECURITY.md',
              'docs/SECURITY.md',
            ])
          )
            .trim()
            .split('\n')[0]
        : '';
      return send({
        alerts: alerts(repo),
        reports,
        manage: canManage(repo, user),
        policy,
        ref: ref?.oid,
      });
    }
    if (sub === 'reports' && method === 'POST') {
      const v = await body(req);
      if (third) {
        requireManager(repo, user);
        if (!['open', 'resolved'].includes(v.state)) fail(400, 'Invalid report status.');
        if (
          !db
            .prepare('UPDATE private_reports SET state=? WHERE id=? AND repo_id=?')
            .run(v.state, Number(third), repo.id).changes
        )
          fail(404, 'Report not found.');
      } else
        db.prepare(
          'INSERT INTO private_reports(repo_id,author_id,title,body,created_at) VALUES(?,?,?,?,?)',
        ).run(
          repo.id,
          user.id,
          field(v.title, 160, 'title'),
          field(v.body, 6000, 'report'),
          new Date().toISOString(),
        );
      return send({ ok: true }, third ? 200 : 201);
    }
    if (sub === 'sarif' && method === 'POST')
      return send(await importSarif(repo, await body(req, 8 * 1024 * 1024)), 201);
    if (sub === 'alerts' && method === 'POST') {
      const v = await body(req);
      if (!['open', 'dismissed'].includes(v.state)) fail(400, 'Invalid alert state.');
      if (
        !db
          .prepare('UPDATE scan_alerts SET state=? WHERE id=? AND repo_id=?')
          .run(v.state, Number(third), repo.id).changes
      )
        fail(404, 'Alert not found.');
      return send({ ok: true });
    }
  }
  if (area === 'rules') {
    if (method === 'GET')
      return send({
        canManage: canManage(repo, user),
        auto: ciEnabled(repo),
        requireReview: Boolean(
          db.prepare('SELECT require_review FROM repo_rules WHERE repo_id=?').get(repo.id)
            ?.require_review,
        ),
      });
    if (method === 'PUT') {
      requireManager(repo, user);
      const v = await body(req);
      if (typeof v.auto !== 'boolean' || typeof v.requireReview !== 'boolean')
        fail(400, 'Invalid repository rules.');
      db.prepare(
        'INSERT INTO repo_rules VALUES(?,?) ON CONFLICT(repo_id) DO UPDATE SET require_review=excluded.require_review',
      ).run(repo.id, +v.requireReview);
      db.prepare(
        'INSERT INTO ci_settings VALUES(?,?) ON CONFLICT(repo_id) DO UPDATE SET auto=excluded.auto',
      ).run(repo.id, +v.auto);
      return send({ ok: true });
    }
  }
  fail(405, 'Unsupported repository action.');
}
