import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { db, now, repository, ensureColumn } from './store.mjs';
import { git, repoPath, branches } from './git.mjs';
import { fail } from './auth.mjs';
import { field } from './collab-store.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS ci_runs(id INTEGER PRIMARY KEY, repo_id TEXT NOT NULL REFERENCES repos(id), oid TEXT NOT NULL, branch TEXT NOT NULL, workflow TEXT NOT NULL, event TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'queued', log TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ci_settings(repo_id TEXT PRIMARY KEY REFERENCES repos(id), auto INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS scan_alerts(id INTEGER PRIMARY KEY, repo_id TEXT NOT NULL REFERENCES repos(id), branch TEXT NOT NULL, tool TEXT NOT NULL, rule TEXT NOT NULL, path TEXT NOT NULL, line INTEGER NOT NULL, message TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'open', oid TEXT NOT NULL, UNIQUE(repo_id,branch,tool,rule,path,line));
CREATE UNIQUE INDEX IF NOT EXISTS ci_auto_once ON ci_runs(repo_id,branch,oid,workflow,event) WHERE event<>'workflow_dispatch';`);
ensureColumn('ci_runs', 'base_branch', "TEXT NOT NULL DEFAULT ''");
const builtin = ['Repository integrity', 'Code scanning'];
const workflowPath = /^\.github\/workflows\/[^/\x00-\x1f]+\.ya?ml$/i;
const script = fileURLToPath(new URL('../tools/run-workflow.py', import.meta.url));
let working = false,
  broadcast = () => {};
export function startCI(changed) {
  broadcast = changed;
  db.prepare("UPDATE ci_runs SET state='failure',log=log||? WHERE state='running'").run(
    '\nThe service restarted while this run was active. Re-run to retry.',
  );
  kick();
}
export const ciEnabled = (repo) =>
  Boolean(db.prepare('SELECT auto FROM ci_settings WHERE repo_id=?').get(repo.id)?.auto);
export async function workflows(repo, oid) {
  if (!oid) return builtin;
  const files = (
    await git(repo.name, ['ls-tree', '-r', '--name-only', '-z', oid, '--', '.github/workflows'])
  )
    .split('\0')
    .filter((p) => workflowPath.test(p));
  return [...builtin, ...files];
}
function enqueue(repo, oid, branch, workflow, event, baseBranch = '') {
  const result = db
    .prepare(
      'INSERT OR IGNORE INTO ci_runs(repo_id,oid,branch,workflow,event,created_at,base_branch) VALUES(?,?,?,?,?,?,?)',
    )
    .run(repo.id, oid, branch, workflow, event, now(), baseBranch);
  return result.changes ? Number(result.lastInsertRowid) : null;
}
export async function manualRun(repo, v) {
  const ref = (await branches(repo)).find((b) => b.name === v.branch);
  if (!ref) fail(404, 'Branch not found.');
  if (!(await workflows(repo, ref.oid)).includes(v.workflow))
    fail(404, 'Workflow not found at this commit.');
  if (!builtin.includes(v.workflow) && process.platform !== 'linux')
    fail(422, 'Shell workflows require the Linux NAS worker.');
  const id = enqueue(repo, ref.oid, ref.name, v.workflow, 'workflow_dispatch');
  kick();
  return { id };
}
const upstreamPulls = (repo) =>
  db
    .prepare(
      `SELECT p.number,p.base,p.head,r.name FROM code_pulls p JOIN repos r ON r.id=p.repo_id JOIN ci_settings c ON c.repo_id=r.id WHERE p.source_id=? AND p.state='open' AND c.auto=1`,
    )
    .all(repo.id);
export const needsPushEvents = (repo) => ciEnabled(repo) || upstreamPulls(repo).length > 0;
export async function pullChecks(repo, number, base, oid) {
  if (!ciEnabled(repo)) return;
  for (const workflow of await workflows(repo, oid))
    enqueue(repo, oid, 'pull/' + number + '/head', workflow, 'pull_request', base);
  kick();
}
export async function autoRun(repo, branch, oid) {
  if (ciEnabled(repo)) {
    for (const workflow of await workflows(repo, oid)) enqueue(repo, oid, branch, workflow, 'push');
    kick();
  }
  for (const pr of upstreamPulls(repo).filter((p) => p.head === branch)) {
    const target = repository(pr.name);
    if (repo.id !== target.id)
      await git(target.name, ['fetch', '--no-tags', '--no-write-fetch-head', repoPath(repo.name), oid]);
    await pullChecks(target, pr.number, pr.base, oid);
  }
}
export function ciRuns(repo) {
  return db.prepare('SELECT * FROM ci_runs WHERE repo_id=? ORDER BY id DESC LIMIT 50').all(repo.id);
}
export function alerts(repo) {
  return db.prepare('SELECT * FROM scan_alerts WHERE repo_id=? ORDER BY id DESC').all(repo.id);
}
function recordFindings(repo, branch, oid, tool, findings) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      "UPDATE scan_alerts SET state='fixed' WHERE repo_id=? AND branch=? AND tool=? AND state='open'",
    ).run(repo.id, branch, tool);
    const insert = db.prepare(
      `INSERT INTO scan_alerts(repo_id,branch,tool,rule,path,line,message,oid) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(repo_id,branch,tool,rule,path,line) DO UPDATE SET state=CASE WHEN state='dismissed' THEN state ELSE 'open' END,oid=excluded.oid,message=excluded.message`,
    );
    for (const f of findings) insert.run(repo.id, branch, tool, f.rule, f.path, f.line, f.message, oid);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
export async function importSarif(repo, v) {
  const ref = (await branches(repo)).find((b) => b.name === v.branch);
  if (!ref || ref.oid !== v.oid) fail(409, 'Select the current branch revision for this report.');
  if (v.report?.version !== '2.1.0' || !Array.isArray(v.report.runs) || v.report.runs.length !== 1)
    fail(400, 'Expected a SARIF 2.1.0 report with one tool run.');
  const run = v.report.runs[0],
    tool = 'SARIF · ' + field(run?.tool?.driver?.name, 100, 'tool name');
  if (!Array.isArray(run.results) || run.results.length > 5000) fail(400, 'Invalid SARIF result count.');
  const findings = run.results.map((r) => {
    const loc = r?.locations?.[0]?.physicalLocation;
    const line = loc?.region?.startLine ?? 1;
    if (!Number.isSafeInteger(line) || line < 1) fail(400, 'Invalid line.');
    return {
      rule: field(r.ruleId, 150, 'rule'),
      message: field(r.message?.text, 2000, 'message'),
      path: field(loc?.artifactLocation?.uri, 1000, 'path'),
      line,
    };
  });
  recordFindings(repo, ref.name, ref.oid, tool, findings);
  return { count: findings.length };
}
async function scan(repo, run) {
  const findings = [];
  const rules = [
    ['private-key', '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----', 'Private key material'],
    ['merge-marker', '^<<<<<<< .+', 'Unresolved merge conflict marker'],
    [
      'github-token',
      '(gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,})',
      'Potential access token',
    ],
  ];
  for (const [rule, pattern, message] of rules) {
    const result = await git(
      repo.name,
      ['grep', '-I', '-n', '-z', '-E', '-o', '-e', pattern, run.oid, '--'],
      { result: true },
    );
    if (![0, 1].includes(result.code)) throw Error('Unable to scan the Git snapshot.');
    for (const match of result.output.matchAll(/([^\0]+)\0(\d+)\0[^\n]*\n/g))
      findings.push({ rule, message, path: match[1].slice(run.oid.length + 1), line: Number(match[2]) });
  }
  recordFindings(repo, run.branch, run.oid, 'Gitpolar', findings);
  return {
    state: 'success',
    log: `Scanned ${run.oid}\n${findings.length} finding(s). Open Security and quality for details.`,
  };
}
async function shellWorkflow(repo, run) {
  if (process.platform !== 'linux') throw Error('Linux worker required for shell steps.');
  const yaml = await git(repo.name, ['show', run.oid + ':' + run.workflow], { max: 256 * 1024 });
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/python3', [script], {
      env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    });
    let log = '';
    const capture = (b) => {
      log = (log + b.toString()).slice(-65536);
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.stdin.on('error', () => {});
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {}
    }, 300000);
    timer.unref();
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ log, state: code === 0 ? 'success' : code === 78 ? 'skipped' : 'failure' });
    });
    child.stdin.end(
      JSON.stringify({
        yaml,
        bare: repoPath(repo.name),
        oid: run.oid,
        branch: run.branch,
        baseBranch: run.base_branch,
        event: run.event,
      }),
    );
  });
}
function kick() {
  if (working) return;
  working = true;
  setImmediate(async () => {
    try {
      let row;
      while (
        (row = db
          .prepare(
            "SELECT c.*,r.name FROM ci_runs c JOIN repos r ON r.id=c.repo_id WHERE state='queued' ORDER BY c.id LIMIT 1",
          )
          .get())
      ) {
        if (
          !db.prepare("UPDATE ci_runs SET state='running' WHERE id=? AND state='queued'").run(row.id)
            .changes
        )
          continue;
        const repo = repository(row.name);
        let result;
        try {
          if (row.workflow === builtin[0])
            result = {
              state: 'success',
              log:
                (await git(repo.name, ['fsck', '--connectivity-only', '--no-dangling', row.oid])) +
                'Git object connectivity verified at ' +
                row.oid,
            };
          else
            result =
              row.workflow === builtin[1] ? await scan(repo, row) : await shellWorkflow(repo, row);
        } catch (e) {
          result = { state: 'failure', log: e.message };
        }
        db.prepare('UPDATE ci_runs SET state=?,log=? WHERE id=?').run(
          result.state,
          result.log.slice(-65536),
          row.id,
        );
        broadcast(row.name);
      }
    } finally {
      working = false;
    }
  });
}
