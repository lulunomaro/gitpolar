import test from 'node:test';
import assert from 'node:assert/strict';
import { fork, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'gitpolar-review-'));
  const child = fork(new URL('./procurement-fixture.mjs', import.meta.url), [], {
    env: {
      ...process.env,
      DATA_DIR: dir,
      WORKSPACE_NAME: 'polar-lab',
      APP_ORIGIN_ALIASES: '',
      FEISHU_APP_ID: '',
      FEISHU_APP_SECRET: '',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let errors = '';
  child.stderr.on('data', (b) => (errors += b));
  child.stdout.resume();
  t.after(async () => {
    if (child.exitCode === null) {
      const closed = once(child, 'exit');
      child.kill();
      await closed;
    }
    await rm(dir, { recursive: true, force: true, maxRetries: 4 });
  });
  const origin = await Promise.race([
    once(child, 'message').then(([v]) => v),
    once(child, 'exit').then(() => {
      throw Error(errors);
    }),
  ]);
  const cookies = {};
  async function call(user, path, method = 'GET', value, status = 200) {
    const res = await fetch(origin + '/api/' + path, {
      method,
      headers: { origin, cookie: cookies[user] || '', 'Content-Type': 'application/json' },
      body: value === undefined ? undefined : JSON.stringify(value),
    });
    const data = await res.json();
    assert.equal(res.status, status, method + ' ' + path + ' ' + JSON.stringify(data));
    if (res.headers.has('set-cookie')) cookies[user] = res.headers.get('set-cookie').split(';')[0];
    return data;
  }
  const password = 'collaboration-fixture-123';
  await call('owner', 'setup', 'POST', { username: 'owner', password }, 201);
  for (const [username, role] of [
    ['writer', 'writer'],
    ['reader', 'reader'],
  ]) {
    await call('owner', 'users', 'POST', { username, password, role }, 201);
    await call(username, 'login', 'POST', { username, password });
  }
  const repo = await call('owner', 'repos', 'POST', { name: 'design' }, 201);
  const bare = (name) => join(dir, 'repositories', 'polar-lab', name + '.git');
  const git = (name, ...args) =>
    execFileSync('git', ['--git-dir=' + bare(name), ...args], {
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
  return { dir, repo, origin, call, cookies, git, bare };
}

test(
  'source fork, reviewed revisions, locked CAD, conflicts, immutable packages and two-parent merge',
  { timeout: 100000 },
  async (t) => {
    const { call, dir, repo, origin, cookies, git } = await fixture(t);
    const base = 'repos/design/',
      initial = repo.commit.oid;
    const payload = Buffer.from('isolated CAD data'),
      oid = createHash('sha256').update(payload).digest('hex'),
      dest = join(dir, 'lfs', repo.id, oid.slice(0, 2), oid.slice(2, 4), oid);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, payload);
    const db = new DatabaseSync(join(dir, 'gitpolar.sqlite'));
    db.prepare('INSERT INTO lfs_objects VALUES(?,?,?,1)').run(repo.id, oid, payload.length);
    db.close();
    await call('owner', base + 'file', 'PUT', {
      branch: 'main',
      path: 'fixture.ptr',
      text: `version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${payload.length}\n`,
      expectedHead: initial,
    });
    await call('reader', base + 'forks', 'POST', { name: 'wrong' }, 403);
    await call('writer', base + 'forks', 'POST', { name: 'design-fork' }, 201);
    assert.equal((await call('owner', base + 'forks')).network.length, 2);
    const raw = await fetch(origin + '/api/repos/design-fork/raw?ref=main&path=fixture.ptr', {
      headers: { cookie: cookies.writer },
    });
    assert.deepEqual(Buffer.from(await raw.arrayBuffer()), payload);
    const child = 'repos/design-fork/',
      write = async (body) =>
        (await call('writer', child + 'file', 'PUT', { branch: 'main', path: 'README.md', ...body }))
          .oid;
    let head = await write({ text: 'fork design v1' });
    await call('owner', base + 'issues', 'POST', { title: 'Fixture issue', body: 'Design' }, 201);
    let pr = await call(
      'writer',
      base + 'pulls',
      'POST',
      { base: 'main', source: 'design-fork', head: 'main', title: 'Revised design' },
      201,
    );
    assert.equal(pr.number, 2);
    const route = base + 'pulls/' + pr.number;
    assert.match((await call('owner', route + '?path=README.md')).patch, /fork design v1/);
    await call('owner', base + 'rules', 'PUT', { auto: false, requireReview: true });
    await call('writer', route + '/approve', 'POST', { headOid: head }, 403);
    await call('owner', route + '/merge', 'POST', { headOid: head, baseOid: pr.base_oid }, 409);
    await call('owner', route + '/changes', 'POST', { headOid: head, body: 'Adjust dimensions' });
    await call('owner', route + '/approve', 'POST', { headOid: head });
    const next = await write({ text: 'fork design v2' });
    await call('owner', route + '/merge', 'POST', { headOid: head, baseOid: pr.base_oid }, 409);
    pr = await call('owner', route);
    assert.equal(pr.reviews.approved, false);
    assert.equal(pr.head_oid, next);
    await call('owner', route + '/approve', 'POST', { headOid: next });
    await call('writer', route + '/comment', 'POST', {
      headOid: next,
      body: 'Review this line',
      path: 'README.md',
      line: 1,
    });
    const lock = await call('writer', base + 'locks', 'POST', { path: 'README.md' }, 201);
    await call('owner', route + '/merge', 'POST', { headOid: next, baseOid: pr.base_oid }, 409);
    await call('writer', base + 'locks/' + lock.lock.id + '/unlock', 'POST', {});
    const merged = await call('owner', route + '/merge', 'POST', {
      headOid: next,
      baseOid: pr.base_oid,
    });
    assert.equal(merged.state, 'merged');
    assert.equal(git('design', 'show', '-s', '--format=%P', 'main'), pr.base_oid + ' ' + next);
    assert.equal(git('design', 'show', 'main:README.md'), 'fork design v2');
    assert.equal((await call('writer', route)).posts.find((x) => x.path)?.line, 1);
    assert.equal((await call('writer', 'pulls')).pulls[0].state, 'merged');
    await call(
      'owner',
      base + 'packages',
      'POST',
      { name: 'drawing', version: '1.0', ref: 'main', path: 'README.md' },
      201,
    );
    const pack = (await call('reader', base + 'packages')).packages[0];
    assert.equal(pack.oid, merged.merged_oid);
    await call(
      'owner',
      base + 'packages',
      'POST',
      { name: 'drawing', version: '1.0', ref: 'main', path: 'README.md' },
      409,
    );
    const conflict = await call(
      'owner',
      base + 'branches',
      'POST',
      { name: 'conflict', from: 'main' },
      201,
    );
    await call('owner', base + 'file', 'PUT', { branch: 'main', path: 'README.md', text: 'left' });
    await call('writer', base + 'file', 'PUT', {
      branch: conflict.name,
      path: 'README.md',
      text: 'right',
    });
    const other = await call(
      'writer',
      base + 'pulls',
      'POST',
      { title: 'Conflict', base: 'main', head: 'conflict' },
      201,
    );
    await call('owner', base + 'pulls/' + other.number + '/approve', 'POST', {
      headOid: other.head_oid,
    });
    await call(
      'owner',
      base + 'pulls/' + other.number + '/merge',
      'POST',
      { headOid: other.head_oid, baseOid: other.base_oid },
      409,
    );
    assert.equal(git('design', 'rev-parse', 'main'), other.base_oid);
    await call('writer', base + 'branches', 'POST', { name: 'assembly-resolution', from: 'main' }, 201);
    const resolution = await call('writer', base + 'file', 'PUT', {
      branch: 'assembly-resolution',
      path: 'README.md',
      text: 'manually assembled result',
    });
    const saved = await call('owner', base + 'pulls/' + other.number + '/resolve', 'POST', {
      resolutionBranch: 'assembly-resolution',
      resolutionOid: resolution.oid,
      baseOid: other.base_oid,
      headOid: other.head_oid,
      body: 'Confirmed the manually assembled variant',
    });
    assert.equal(saved.state, 'merged');
    assert.equal(
      git('design', 'rev-parse', 'main^{tree}'),
      git('design', 'rev-parse', 'assembly-resolution^{tree}'),
    );
    assert.equal(
      git('design', 'show', '-s', '--format=%P', 'main'),
      [other.base_oid, other.head_oid, resolution.oid].join(' '),
    );
  },
);

test(
  'issue metadata, project fields, inbox ownership, CI, scan alerts and SARIF',
  { timeout: 90000 },
  async (t) => {
    const { call, repo } = await fixture(t);
    const base = 'repos/design/';
    await call('reader', base + 'preferences', 'POST', { kind: 'watch', enabled: true });
    const issue = await call(
      'owner',
      base + 'issues',
      'POST',
      { title: 'Supplier issue', body: 'Initial' },
      201,
    );
    const item = base + 'issues/' + issue.number;
    const label = await call(
      'writer',
      base + 'labels',
      'POST',
      { name: 'mechanical', color: 'ffcc00' },
      201,
    );
    await call('writer', item, 'POST', {
      action: 'metadata',
      assignees: ['writer'],
      labels: [label.id],
    });
    await call('owner', item, 'POST', { action: 'comment', body: 'Please check @writer' });
    assert.deepEqual((await call('writer', item)).assignees, ['writer']);
    assert.deepEqual((await call('writer', 'issues')).issues[0].labels, ['mechanical']);
    const inbox = (await call('reader', 'inbox')).items[0];
    assert.equal(inbox.unread, 1);
    await call('writer', 'inbox', 'PUT', { action: 'read', id: inbox.id }, 404);
    await call('reader', 'inbox', 'PUT', { action: 'read', id: inbox.id });
    assert.equal((await call('reader', 'inbox')).items[0].unread, 0);
    await call('reader', 'inbox', 'PUT', { action: 'settings', watching: false, participating: false });
    await call('owner', item, 'POST', { action: 'state', state: 'closed' });
    assert.equal((await call('reader', 'inbox')).items[0].unread, 0);
    const project = await call('writer', base + 'projects', 'POST', { title: 'Release' }, 201);
    const path = base + 'projects/' + project.id + '/items';
    const row = await call('writer', path, 'POST', { kind: 'issues', number: issue.number }, 201);
    await call('writer', path + '/' + row.id, 'POST', {
      status: 'In progress',
      priority: 'High',
      due: '2026-12-01',
    });
    assert.equal((await call('owner', base + 'projects')).projects[0].items[0].priority, 'High');
    await call('writer', path, 'POST', { action: 'field', name: 'Weight', type: 'number' }, 201);
    await call(
      'writer',
      path,
      'POST',
      { action: 'view', name: 'Work in progress', layout: 'table', status: 'In progress' },
      201,
    );
    const board = (await call('owner', base + 'projects')).projects[0];
    assert.equal(board.views[0].name, 'Work in progress');
    await call('writer', path + '/' + row.id, 'POST', {
      status: 'In progress',
      priority: 'Low',
      due: '',
      values: { [board.fields[0].id]: '2.5' },
    });
    assert.equal(
      (await call('writer', base + 'projects')).projects[0].items[0].values[board.fields[0].id],
      '2.5',
    );
    await call(
      'writer',
      base + 'security/reports',
      'POST',
      { title: 'Private finding', body: 'Internal report' },
      201,
    );
    const report = (await call('owner', base + 'security')).reports[0];
    assert.equal(report.title, 'Private finding');
    assert.equal((await call('reader', base + 'security')).reports.length, 0);
    await call('owner', base + 'security/reports/' + report.id, 'POST', { state: 'resolved' });
    await call('writer', base + 'rules', 'PUT', { auto: true, requireReview: false }, 403);
    await call('owner', base + 'rules', 'PUT', { auto: true, requireReview: false });
    const { oid } = await call('writer', base + 'file', 'PUT', {
      branch: 'main',
      path: 'check.txt',
      text: '<<<<<<< sample\n',
      expectedHead: repo.commit.oid,
    });
    const job = await call(
      'writer',
      base + 'actions/runs',
      'POST',
      { branch: 'main', workflow: 'Code scanning' },
      202,
    );
    const waitRun = async (id) => {
      for (let i = 0; i < 150; i++) {
        const run = (await call('reader', base + 'actions')).runs.find((r) => r.id === id);
        if (run && !['running', 'queued'].includes(run.state)) return run;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw Error('Run did not finish.');
    };
    assert.equal((await waitRun(job.id)).state, 'success');
    const alert = (await call('reader', base + 'security')).alerts.find(
      (a) => a.rule === 'merge-marker',
    );
    assert.equal(alert.path, 'check.txt');
    await call('writer', base + 'security/alerts/' + alert.id, 'POST', { state: 'dismissed' });
    assert.equal((await call('reader', base + 'security')).alerts[0].state, 'dismissed');
    await call(
      'writer',
      base + 'security/sarif',
      'POST',
      {
        branch: 'main',
        oid,
        report: {
          version: '2.1.0',
          runs: [
            {
              tool: { driver: { name: 'team-lint' } },
              results: [
                {
                  ruleId: 'A',
                  message: { text: 'Check input' },
                  locations: [
                    {
                      physicalLocation: {
                        artifactLocation: { uri: 'check.txt' },
                        region: { startLine: 1 },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      201,
    );
    assert.ok(
      (await call('reader', base + 'security')).alerts.some((a) => a.tool === 'SARIF · team-lint'),
    );
    if (process.platform === 'linux') {
      await call('owner', base + 'rules', 'PUT', { auto: false, requireReview: false });
      const workflow = '.github/workflows/verify.yml';
      await call('writer', base + 'file', 'PUT', {
        branch: 'main',
        path: workflow,
        text: 'name: Verify fixture\non: workflow_dispatch\njobs:\n  test:\n    runs-on: gitpolar\n    steps:\n      - uses: actions/checkout@v4\n      - run: test -f README.md && echo isolated-workflow-passed\n',
      });
      const run = await waitRun(
        (await call('writer', base + 'actions/runs', 'POST', { branch: 'main', workflow }, 202)).id,
      );
      assert.equal(run.state, 'success', run.log);
      assert.match(run.log, /isolated-workflow-passed/);
    }
  },
);

test('manual resolution keeps the reviewed branch changes and cannot confirm the current target as its own result', async (t) => {
  const {call, git} = await fixture(t);
  const api = 'repos/design/';
  const branch = (name, from) => call('writer', api+'branches', 'POST', {name, from}, 201);
  const edit = (branch, path, text) => call('writer', api+'file', 'PUT', {branch, path, text});
  await branch('layout', 'main');
  await edit('layout', 'README.md', 'source assembly notes');
  const head = (await edit('layout', 'parts/new-mount.txt', 'new bracket')).oid;
  const pr = await call('writer', api+'pulls', 'POST', {title:'Join assemblies', base:'main', head:'layout'}, 201);
  const base = (await edit('main', 'README.md', 'target assembly notes')).oid;
  const route = api+'pulls/'+pr.number;
  await branch('result', 'main');
  const resolve = (name, oid, status) => call('owner', route+'/resolve', 'POST', {baseOid:base, headOid:head, resolutionBranch:name, resolutionOid:oid, body:'Confirmed assembly'}, status);
  await resolve('main', base, 409);
  await resolve('result', base, 409);
  const incomplete = (await edit('result', 'README.md', 'saved integrated assembly')).oid;
  const missing = await resolve('result', incomplete, 409);
  assert.ok(missing.error.includes('parts/new-mount.txt'));
  assert.equal(git('design','rev-parse','main'), base);
  const complete = (await edit('result', 'parts/new-mount.txt', 'new bracket')).oid;
  assert.equal((await resolve('result', complete, 200)).state, 'merged');
  assert.equal(git('design','show','main:parts/new-mount.txt'), 'new bracket');
});

test('a merge pushed by the SolidWorks client closes its PR at the original integration commit after source cleanup', async (t) => {
  const {call, git} = await fixture(t);
  const api = 'repos/design/';
  await call('writer', api+'branches', 'POST', {name:'assembly-work', from:'main'}, 201);
  const head = (await call('writer', api+'file', 'PUT', {branch:'assembly-work',path:'part.txt',text:'revised part'})).oid;
  const base = (await call('owner', api+'file', 'PUT', {branch:'main',path:'drawing.txt',text:'updated drawing'})).oid;
  const pr = await call('writer', api+'pulls', 'POST', {title:'Integration from CAD',base:'main',head:'assembly-work'}, 201);
  const tree = git('design','merge-tree','--write-tree',base,head);
  const joined = git('design','-c','user.name=Designer','-c','user.email=d@test.local','commit-tree',tree,'-p',base,'-p',head,'-m','Hand-merged in SolidWorks');
  git('design','update-ref','refs/heads/main',joined,base);
  await call('owner', api+'file', 'PUT', {branch:'main',path:'later.txt',text:'newer independent change'});
  git('design','update-ref','-d','refs/heads/assembly-work',head);
  assert.equal((await call('owner','pulls')).pulls.find(p=>p.number===pr.number).state,'merged');
  const detail = await call('owner', api+'pulls/'+pr.number);
  assert.deepEqual([detail.merged_oid,detail.base_oid,detail.head_oid],[joined,base,head]);
  assert.equal((await call('owner',api+'pulls/'+pr.number+'/merge','POST',{baseOid:base,headOid:head})).merged_oid,joined);
  assert.equal(git('design','show','main:later.txt'),'newer independent change');
});

test('PR merge waits for the usable LFS bytes when a saved pointer has lost its NAS object', async (t) => {
  const {call,git,dir,repo,origin} = await fixture(t);
  const api='repos/design/';
  await call('writer',api+'branches','POST',{name:'parts',from:'main'},201);
  const bytes=Buffer.from('test drawing data'),oid=createHash('sha256').update(bytes).digest('hex');
  const file=join(dir,'lfs',repo.id,oid.slice(0,2),oid.slice(2,4),oid);
  await mkdir(dirname(file),{recursive:true}); await writeFile(file,bytes);
  const database=new DatabaseSync(join(dir,'gitpolar.sqlite'));
  try { database.prepare('INSERT INTO lfs_objects VALUES(?,?,?,1)').run(repo.id,oid,bytes.length); } finally {database.close();}
  await call('writer',api+'file','PUT',{branch:'parts',path:'saved.ptr',text:`version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${bytes.length}\n`});
  const pr=await call('writer',api+'pulls','POST',{title:'Include drawing',base:'main',head:'parts'},201);
  const route=api+'pulls/'+pr.number,values={baseOid:pr.base_oid,headOid:pr.head_oid};
  await rm(file);
  const response=await call('owner',route+'/merge','POST',values,409);
  assert.ok(response.error.includes('saved.ptr'));assert.equal(git('design','rev-parse','main'),pr.base_oid);
  const {token} = await call('owner','tokens','POST',{name:'LFS restore'},201);
  const headers={Authorization:'Basic '+Buffer.from('owner:'+token).toString('base64')};
  const objectUrl=origin+'/polar-lab/design.git/info/lfs/objects/'+oid;
  const verify=() => fetch(objectUrl+'/verify',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({oid,size:bytes.length})});
  assert.equal((await verify()).status,422);
  await writeFile(file,bytes.subarray(0,3));
  assert.equal((await fetch(objectUrl,{headers})).status,404);
  assert.equal((await verify()).status,422);
  const upload=await fetch(objectUrl,{method:'PUT',headers,body:bytes});assert.equal(upload.status,200);
  assert.equal((await verify()).status,200);
  assert.deepEqual(Buffer.from(await (await fetch(objectUrl,{headers})).arrayBuffer()),bytes);
  assert.equal((await call('owner',route+'/merge','POST',values)).state,'merged');
});
