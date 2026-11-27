import { db, now } from './store.mjs';
import { body, fail, json } from './auth.mjs';
import { git, ZERO } from './git.mjs';
import { loadAlbum } from './album.mjs';
import { uploadPhoto } from './album-upload.mjs';
import { proposedChanges, proposalCommit, authorEnv } from './album-proposal.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS album_uploads (
  id TEXT PRIMARY KEY, repo_id TEXT NOT NULL REFERENCES repos(id), user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL, sha TEXT NOT NULL, info TEXT NOT NULL, UNIQUE(repo_id,user_id,name,sha));
CREATE TABLE IF NOT EXISTS album_pulls (
  repo_id TEXT NOT NULL REFERENCES repos(id), number INTEGER NOT NULL, author_id INTEGER NOT NULL REFERENCES users(id),
  request_key TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, created_at TEXT NOT NULL,
  base_oid TEXT NOT NULL, head_oid TEXT NOT NULL, added INTEGER NOT NULL, edited INTEGER NOT NULL, delta TEXT NOT NULL,
  PRIMARY KEY(repo_id,number), UNIQUE(repo_id,author_id,request_key));`);

const selectColumns =
  'p.number,p.author_id AS authorId,u.display_name AS author,u.username,p.title,p.description,p.created_at AS createdAt,p.base_oid AS base,p.head_oid AS head,p.added,p.edited';
const fromTables = ' FROM album_pulls p JOIN users u ON p.author_id=u.id WHERE p.repo_id=?';
const branch = (n) => `refs/heads/album-pr/${n}`;
const stateRef = (n, state) => `refs/gitpolar/album-pr/${n}/${state}`;
const publicPhoto = (repo, ref, id, size) =>
  `/api/repos/${encodeURIComponent(repo.name)}/album/media?` + new URLSearchParams({ ref, id, size });

async function decisions(repo) {
  const refs = await git(repo.name, [
    'for-each-ref',
    '--format=%(refname)%00%(objectname)%00%(authorname)%00%(authordate:iso-strict)',
    'refs/gitpolar/album-pr/',
  ]);
  const result = new Map();
  for (const line of refs.trimEnd().split('\n')) {
    const [ref, oid, reviewer, reviewedAt] = line.split('\0');
    const match = /^refs\/gitpolar\/album-pr\/(\d+)\/(merged|closed)$/.exec(ref);
    if (match) result.set(Number(match[1]), { state: match[2], decisionOid: oid, reviewer, reviewedAt });
  }
  return result;
}

// Re-reading after a stopped process completes publication of the immutable SQL-recorded head.
async function publishBranch(repo, row) {
  const ref = branch(row.number);
  const oid = (await git(repo.name, ['rev-parse', '--verify', ref], { allowFailure: true })).trim();
  if (oid === row.head) return;
  if (!oid) {
    try {
      await git(repo.name, ['update-ref', ref, row.head, ZERO]);
      return;
    } catch {
      /* A concurrent publisher may have won. */
    }
    if ((await git(repo.name, ['rev-parse', '--verify', ref], { allowFailure: true })).trim() === row.head)
      return;
  }
  fail(409, '投稿分支和审核记录的版本不一致。');
}

function summary(row, status, user, repo) {
  return {
    ...row,
    author: row.author || row.username,
    state: 'open',
    ...status,
    branch: `album-pr/${row.number}`,
    canReview: user.id === repo.creator_id && !status,
    canClose: (user.id === repo.creator_id || user.id === row.authorId) && !status,
  };
}
async function readPull(repo, user, number) {
  const row = db.prepare(`SELECT ${selectColumns},p.delta${fromTables} AND p.number=?`).get(repo.id, number);
  if (!row) fail(404, '找不到这条相册 PR。');
  const delta = JSON.parse(row.delta);
  delete row.delta;
  await publishBranch(repo, row);
  const status = (await decisions(repo)).get(number);
  const pr = summary(row, status, user, repo);
  if (status?.state === 'closed')
    pr.reason = (await git(repo.name, ['show', '-s', '--format=%b', status.decisionOid])).trim();
  const photos = [
    ...delta.additions.map((p) => ({ ...p, type: 'add' })),
    ...delta.edits.map((p) => ({ ...p, type: 'edit' })),
  ];
  pr.activity = delta.activity?.title || '';
  pr.photos = photos.map((p) => ({
    id: p.id,
    path: p.path,
    name: p.path.split('/').at(-1),
    type: p.type,
    before: p.before,
    after: p.after,
    thumbUrl: publicPhoto(repo, row.head, p.id, 'thumb'),
    previewUrl: publicPhoto(repo, row.head, p.id, 'preview'),
  }));
  return { pr, delta };
}

async function createPull(repo, user, input) {
  if (typeof input?.key !== 'string' || !/^[\da-f-]{32,36}$/i.test(input.key))
    fail(400, '缺少投稿标识，请重试。');
  const find = () =>
    db
      .prepare('SELECT number FROM album_pulls WHERE repo_id=? AND author_id=? AND request_key=?')
      .get(repo.id, user.id, input.key);
  let row = find();
  if (!row) {
    const title = typeof input.title === 'string' && input.title.trim();
    const description = input.description || '';
    if (
      !title ||
      title.length > 120 ||
      /[\r\n\0]/.test(title) ||
      typeof description !== 'string' ||
      description.length > 3000
    )
      fail(400, '请填写 1–120 字的标题及不超过 3000 字的说明。');
    const snap = await loadAlbum(repo, 'main');
    if (input.expectedHead !== snap.oid) fail(409, 'main 已有新提交，请刷新后再投稿。');
    const delta = proposedChanges(repo, user, snap, input);
    const head = await proposalCommit(repo, user, snap, delta, [snap.oid], title);
    db.prepare(
      `INSERT INTO album_pulls(repo_id,number,author_id,request_key,title,description,created_at,base_oid,head_oid,added,edited,delta)
      SELECT ?,coalesce(max(number),0)+1,?,?,?,?,?,?,?,?,?,? FROM album_pulls WHERE repo_id=?
      ON CONFLICT(repo_id,author_id,request_key) DO NOTHING`
    ).run(
      repo.id,
      user.id,
      input.key,
      title,
      description,
      now(),
      snap.oid,
      head,
      delta.additions.length,
      delta.edits.length,
      JSON.stringify(delta),
      repo.id
    );
    row = find();
  }
  return (await readPull(repo, user, row.number)).pr;
}

async function decide(repo, user, number, action, input) {
  const { pr, delta } = await readPull(repo, user, number);
  const merge = action === 'merge',
    state = merge ? 'merged' : 'closed';
  if (user.id !== repo.creator_id && (merge || user.id !== pr.authorId))
    fail(403, '仅仓库负责人可合并，投稿人可撤回自己的 PR。');
  if (input?.expectedHead !== pr.head) fail(409, '请重新打开并核对当前投稿版本。');
  if (pr.state === state) return pr;
  if (pr.state !== 'open') fail(409, '这条投稿已经完成审核。');
  let oid;
  const checks = [
    `verify ${branch(number)} ${pr.head}`,
    `verify ${stateRef(number, merge ? 'closed' : 'merged')} ${ZERO}`,
  ];
  if (merge) {
    const snap = await loadAlbum(repo, 'main');
    oid = await proposalCommit(
      repo,
      user,
      snap,
      delta,
      [snap.oid, pr.head],
      `Merge album PR #${number}: ${pr.title}`
    );
    checks.push(`update refs/heads/main ${oid} ${snap.oid}`);
  } else {
    const reason = input.reason || '';
    if (typeof reason !== 'string' || reason.length > 1000) fail(400, '关闭原因最多 1000 字。');
    const tree = (await git(repo.name, ['rev-parse', `${pr.head}^{tree}`])).trim();
    oid = (
      await git(repo.name, ['commit-tree', tree, '-p', pr.head], {
        env: authorEnv(user),
        input: `Close album PR #${number}\n\n${reason.trim()}\n`,
      })
    ).trim();
  }
  checks.push(`create ${stateRef(number, state)} ${oid}`);
  // Target ref and terminal review status change in one Git reference transaction.
  const update = await git(repo.name, ['update-ref', '--stdin'], {
    input: checks.join('\n') + '\n',
    result: true,
  });
  if (update.code !== 0) {
    const latest = (await readPull(repo, user, number)).pr;
    if (latest.state === state) return latest;
    fail(409, '分支或审核状态刚刚变化，请刷新后重试。');
  }
  return (await readPull(repo, user, number)).pr;
}

export async function albumPullApi(req, res, repo, user, action, params, changed) {
  if (repo.kind !== 'album') fail(404, '此仓库没有相册投稿。');
  const route = action.slice('album/pulls'.length);
  if (!route && req.method === 'GET') {
    const rows = db.prepare(`SELECT ${selectColumns}${fromTables} ORDER BY number DESC`).all(repo.id);
    const states = await decisions(repo);
    return json(res, {
      pulls: rows.map((row) => summary(row, states.get(row.number), user, repo)),
      ownerId: repo.creator_id,
    });
  }
  if (route === '/uploads' && req.method === 'PUT')
    return json(res, await uploadPhoto(req, repo, user, params.get('name')), 201);
  if (!route && req.method === 'POST') {
    const pr = await createPull(repo, user, await body(req));
    changed(repo.name);
    return json(res, pr, 201);
  }
  const match = /^\/([1-9]\d{0,8})(?:\/(merge|close))?$/.exec(route);
  if (!match) fail(404, '未知的投稿操作。');
  const number = Number(match[1]);
  if (!match[2] && req.method === 'GET') return json(res, (await readPull(repo, user, number)).pr);
  if (match[2] && req.method === 'POST') {
    const pr = await decide(repo, user, number, match[2], await body(req));
    changed(repo.name);
    return json(res, pr);
  }
  fail(405, '不支持的投稿操作。');
}
