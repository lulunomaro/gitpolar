import { db, repository, now } from './store.mjs';
import { fail } from './auth.mjs';
import { git, branches, repoPath, ZERO } from './git.mjs';
import { copyLfs, rootId } from './forks.mjs';
import { field, thread, post, nextNumber, transaction, deliver } from './collab-store.mjs';

const selectPull = `SELECT p.*,s.name AS source,r.name AS repo,u.username AS author,p.created_at AS createdAt,p.updated_at AS updatedAt FROM code_pulls p JOIN repos s ON s.id=p.source_id JOIN repos r ON r.id=p.repo_id JOIN users u ON u.id=p.author_id`;
const byNumber = (repo, number) =>
  db.prepare(selectPull + ' WHERE p.repo_id=? AND number=?').get(repo.id, number);
export const listPulls = () =>
  db.prepare(selectPull + " WHERE r.status='ready' ORDER BY p.updated_at DESC").all();
const refName = (branch) => 'refs/heads/' + branch;
const guard = new Map();
export async function withPull(repo, number, fn) {
  const key = repo.id + ':' + number;
  if (guard.has(key)) fail(409, 'Another update is in progress. Refresh this pull request.');
  guard.set(key, true);
  try {
    return await fn();
  } finally {
    guard.delete(key);
  }
}
async function liveTips(repo, source, base, head) {
  const target = await branches(repo);
  const incoming = repo.id === source.id ? target : await branches(source);
  const baseOid = target.find((b) => b.name === base)?.oid,
    headOid = incoming.find((b) => b.name === head)?.oid;
  if (!baseOid || !headOid) return null;
  if (source.id !== repo.id)
    await git(repo.name, [
      'fetch',
      '--no-tags',
      '--no-write-fetch-head',
      repoPath(source.name),
      headOid,
    ]);
  return { baseOid, headOid };
}
export async function createPull(repo, user, v) {
  const source = repository(v.source || repo.name);
  if (!source || repo.kind === 'album' || rootId(source) !== rootId(repo))
    fail(400, 'Choose a source in the same repository network.');
  const title = field(v.title, 160, 'title'),
    text = field(v.body ?? '', 6000, 'description', false);
  if (source.id === repo.id && v.base === v.head) fail(400, 'Select two different branches.');
  const tips = await liveTips(repo, source, v.base, v.head);
  if (!tips) fail(404, 'The selected branch does not exist.');
  const { baseOid, headOid } = tips;
  if (!(await git(repo.name, ['merge-base', baseOid, headOid], { allowFailure: true })).trim())
    fail(409, 'Branches have unrelated histories.');
  if (
    (await git(repo.name, ['merge-base', '--is-ancestor', headOid, baseOid], { result: true })).code ===
    0
  )
    fail(409, 'The base branch already contains these commits.');
  const number = transaction(() => {
    if (
      db
        .prepare(
          "SELECT 1 FROM code_pulls WHERE repo_id=? AND source_id=? AND base=? AND head=? AND state='open'",
        )
        .get(repo.id, source.id, v.base, v.head)
    )
      fail(409, 'An open pull request already exists for these branches.');
    const n = nextNumber(repo),
      stamp = now();
    db.prepare(
      'INSERT INTO code_pulls(repo_id,number,source_id,base,head,author_id,title,body,base_oid,head_oid,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    ).run(repo.id, n, source.id, v.base, v.head, user.id, title, text, baseOid, headOid, stamp, stamp);
    deliver(repo, 'pulls', n, title, user, [], text);
    return n;
  });
  await pinTips(repo, number, tips);
  await git(repo.name, ['update-ref', prefix(number) + 'opened-base', baseOid, ZERO]);
  return byNumber(repo, number);
}
const prefix = (n) => 'refs/gitpolar/pulls/' + n + '/';
async function pinTips(repo, n, { headOid, baseOid }) {
  await git(repo.name, ['update-ref', '--stdin'], {
    input: `update ${prefix(n)}head ${headOid}\nupdate ${prefix(n)}base ${baseOid}\n`,
  });
}
async function snapshot(repo, number) {
  const pr = byNumber(repo, number);
  if (!pr) fail(404, 'Pull request not found.');
  // The Git transaction also records its decision so a restart between Git and SQLite is recoverable.
  if (pr.state === 'open') {
    const marker = (
      await git(repo.name, ['rev-parse', '--verify', '--quiet', prefix(number) + 'merged'], {
        allowFailure: true,
      })
    ).trim();
    if (marker) {
      const [base, head] = (await git(repo.name, ['show', '-s', '--format=%P', marker]))
        .trim()
        .split(' ');
      db.prepare(
        "UPDATE code_pulls SET state='merged',merged_oid=?,base_oid=?,head_oid=? WHERE id=?",
      ).run(marker, base, head, pr.id);
      return { ...byNumber(repo, number), branchesPresent: true };
    }
    const tips = await liveTips(repo, repository(pr.source), pr.base, pr.head);
    if (!tips) return { ...pr, branchesPresent: false };
    if (tips.baseOid !== pr.base_oid || tips.headOid !== pr.head_oid) {
      await pinTips(repo, number, tips);
      db.prepare("UPDATE code_pulls SET base_oid=?,head_oid=? WHERE id=? AND state='open'").run(
        tips.baseOid,
        tips.headOid,
        pr.id,
      );
    }
    return { ...pr, base_oid: tips.baseOid, head_oid: tips.headOid, branchesPresent: true };
  }
  return { ...pr, branchesPresent: true };
}
async function changeList(repo, pr) {
  const ancestor = (
    await git(repo.name, ['merge-base', pr.base_oid, pr.head_oid], { allowFailure: true })
  ).trim();
  if (!ancestor) return { ancestor: null, files: [] };
  const raw = await git(repo.name, [
    'diff',
    '--no-ext-diff',
    '--no-renames',
    '--name-status',
    '-z',
    ancestor,
    pr.head_oid,
    '--',
  ]);
  const fields = raw.split('\0'),
    files = [];
  for (let i = 0; i + 1 < fields.length; i += 2) files.push({ status: fields[i], path: fields[i + 1] });
  return { ancestor, files };
}
function reviewStatus(repo, pr) {
  const votes = new Map();
  for (const p of thread(repo, 'pulls', pr.number))
    if (p.oid === pr.head_oid && ['approve', 'changes'].includes(p.event)) votes.set(p.author, p.event);
  return {
    approved: [...votes.values()].includes('approve'),
    changes: [...votes.values()].includes('changes'),
    required: Boolean(
      db.prepare('SELECT require_review FROM repo_rules WHERE repo_id=?').get(repo.id)?.require_review,
    ),
  };
}
export async function pullDetail(repo, n, path) {
  const pr = await snapshot(repo, n),
    { ancestor, files } = await changeList(repo, pr);
  const commits = ancestor
    ? (await git(repo.name, ['log', '--format=%H%x00%an%x00%s', '-100', ancestor + '..' + pr.head_oid]))
        .trimEnd()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [oid, author, title] = line.split('\0');
          return { oid, author, title };
        })
    : [];
  let patch = null;
  if (path) {
    if (!files.some((f) => f.path === path)) fail(404, 'Changed file not found.');
    const diff = await git(
      repo.name,
      [
        '--literal-pathspecs',
        'diff',
        '--no-ext-diff',
        '--no-textconv',
        ancestor,
        pr.head_oid,
        '--',
        path,
      ],
      { max: 2 * 1024 * 1024 },
    ).catch((e) => {
      if (e.message.includes('read limit')) return 'Diff exceeds the inline display limit.';
      throw e;
    });
    patch = diff.slice(0, 120000) + (diff.length > 120000 ? '\n… Diff truncated' : '');
  }
  return {
    ...pr,
    files,
    commits,
    patch,
    reviews: reviewStatus(repo, pr),
    posts: thread(repo, 'pulls', n),
  };
}
async function merge(repo, user, pr, values, manual = false) {
  if (!pr.branchesPresent || values.headOid !== pr.head_oid || values.baseOid !== pr.base_oid)
    fail(409, 'The branches changed. Refresh and review the new revision.');
  const reviews = reviewStatus(repo, pr);
  if (reviews.changes || (reviews.required && !reviews.approved))
    fail(409, 'This revision needs an approving review.');
  let tree, resolution;
  if (manual) {
    const selected = (await branches(repo)).find((b) => b.name === values.resolutionBranch);
    if (!selected || selected.oid !== values.resolutionOid)
      fail(409, 'The resolution branch changed. Review its saved result again.');
    resolution = selected.oid;
    const opened = (
      await git(repo.name, ['rev-parse', '--verify', '--quiet', prefix(pr.number) + 'opened-base'], {
        allowFailure: true,
      })
    ).trim();
    if (resolution === (opened || pr.base_oid))
      fail(409, 'Commit the resolved files to the resolution branch first.');
    if (
      (await git(repo.name, ['merge-base', '--is-ancestor', pr.base_oid, resolution], { result: true }))
        .code !== 0
    )
      fail(409, 'Update the resolution branch with the current base before confirming.');
    tree = (await git(repo.name, ['rev-parse', resolution + '^{tree}'])).trim();
  } else {
    const merged = await git(repo.name, ['merge-tree', '--write-tree', pr.base_oid, pr.head_oid], {
      result: true,
    });
    if (merged.code !== 0)
      fail(
        409,
        'Merge conflict. Resolve the files in the source branch or select a manually resolved assembly.',
      );
    tree = merged.output.trim().split('\n')[0];
  }
  const source = repository(pr.source);
  await copyLfs(source, repo);
  const paths = new Set(
    (await git(repo.name, ['diff', '--no-renames', '--name-only', '-z', pr.base_oid, tree])).split('\0'),
  );
  const locked = db
    .prepare('SELECT path FROM locks WHERE repo_id=? AND owner_id<>?')
    .all(repo.id, user.id)
    .find((l) => paths.has(l.path));
  if (locked) fail(409, 'File is locked by another teammate: ' + locked.path);
  const env = {
    GIT_AUTHOR_NAME: user.username,
    GIT_COMMITTER_NAME: user.username,
    GIT_AUTHOR_EMAIL: user.username + '@gitpolar.local',
    GIT_COMMITTER_EMAIL: user.username + '@gitpolar.local',
  };
  const commit = (
    await git(
      repo.name,
      [
        'commit-tree',
        tree,
        '-p',
        pr.base_oid,
        '-p',
        pr.head_oid,
        ...(resolution && ![pr.base_oid, pr.head_oid].includes(resolution) ? ['-p', resolution] : []),
      ],
      { env, input: `Merge pull request #${pr.number} from ${pr.source}/${pr.head}\n\n${pr.title}\n` },
    )
  ).trim();
  if (source.id !== repo.id && (await liveTips(repo, source, pr.base, pr.head))?.headOid !== pr.head_oid)
    fail(409, 'The source branch changed.');
  const verify = source.id === repo.id ? `verify ${refName(pr.head)} ${pr.head_oid}\n` : '';
  const guardResolution =
    manual &&
    values.resolutionBranch !== pr.base &&
    !(source.id === repo.id && values.resolutionBranch === pr.head)
      ? `verify ${refName(values.resolutionBranch)} ${resolution}\n`
      : '';
  const input = `${verify}${guardResolution}update ${refName(pr.base)} ${commit} ${pr.base_oid}\ncreate ${prefix(pr.number)}merged ${commit}\n`;
  await git(repo.name, ['update-ref', '--stdin'], { input }).catch(() =>
    fail(409, 'The branch changed while merging. Refresh and retry.'),
  );
  db.prepare("UPDATE code_pulls SET state='merged',merged_oid=? WHERE id=?").run(commit, pr.id);
}
export async function actOnPull(repo, user, n, action, v) {
  return withPull(repo, n, async () => {
    const pr = await snapshot(repo, n);
    const text = field(v.body ?? '', 6000, 'comment', action === 'resolve');
    let path = null,
      line = null;
    if (v.path != null) {
      path = field(v.path, 1000, 'file path');
      line = v.line ?? null;
      if (
        action !== 'comment' ||
        v.headOid !== pr.head_oid ||
        !(await changeList(repo, pr)).files.some((f) => f.path === path) ||
        (line !== null && (!Number.isSafeInteger(line) || line < 1))
      )
        fail(409, 'Refresh and select a changed file.');
    }
    if (['merge', 'resolve'].includes(action) && pr.state === 'merged') return pr;
    if (action === 'reopen') {
      if (pr.state !== 'closed' || (user.id !== pr.author_id && user.role === 'reader'))
        fail(409, 'This request cannot be reopened.');
      if (
        db
          .prepare(
            "SELECT 1 FROM code_pulls WHERE repo_id=? AND source_id=? AND base=? AND head=? AND state='open'",
          )
          .get(repo.id, pr.source_id, pr.base, pr.head)
      )
        fail(409, 'An open request already exists.');
      db.prepare("UPDATE code_pulls SET state='open' WHERE id=?").run(pr.id);
    } else if (action === 'comment') {
      field(v.body, 6000, 'comment');
    } else {
      if (pr.state !== 'open') fail(409, 'Pull request is not open.');
      if (['resolve', 'merge'].includes(action)) await merge(repo, user, pr, v, action === 'resolve');
      else if (action === 'close')
        db.prepare("UPDATE code_pulls SET state='closed' WHERE id=?").run(pr.id);
      else if (['approve', 'changes'].includes(action)) {
        if (user.id === pr.author_id) fail(403, 'A teammate must review this request.');
        if (!pr.branchesPresent || pr.head_oid !== v.headOid)
          fail(409, 'Refresh to review the current commit.');
        if (action === 'changes') field(v.body, 6000, 'review');
      } else fail(404, 'Unknown pull request action.');
    }
    post(repo, 'pulls', n, user, action, text, pr.head_oid, path, line);
    db.prepare('UPDATE code_pulls SET updated_at=? WHERE id=?').run(now(), pr.id);
    deliver(repo, 'pulls', n, pr.title, user, [pr.author_id], text);
    return byNumber(repo, n);
  });
}
