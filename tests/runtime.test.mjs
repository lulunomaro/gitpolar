import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { cp, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../', import.meta.url));
const pause = ms => new Promise(done => setTimeout(done, ms));

async function freePort() {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((done, reject) => reservation.close(error => error ? reject(error) : done()));
  return port;
}

async function launch(directory) {
  const port = await freePort();
  const origin = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: directory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: {...process.env, NODE_ENV: 'test', AUTH_PROVIDER: 'feishu', HOST: '127.0.0.1', PORT: String(port),
      APP_ORIGIN: origin, DATA_DIR: join(directory, 'data'),
      FEISHU_CLI_BIN: join(directory, 'no-cli.exe'), FEISHU_CLI_CONFIG_DIR: join(directory, 'no-config'),
      FEISHU_APP_ID: '', FEISHU_APP_SECRET: '', FEISHU_WAREHOUSE_BASE_TOKEN: '', FEISHU_WAREHOUSE_TABLE_ID: ''}
  });
  const exit = once(child, 'exit');
  const output = [];
  child.stdout.on('data', chunk => output.push(chunk.toString()));
  child.stderr.on('data', chunk => output.push(chunk.toString()));
  const stop = async () => { if (child.exitCode === null) child.kill(); await exit; };
  try {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error('Runtime fixture exited: ' + output.join(''));
      try {
        const response = await fetch(origin + '/api/health', {signal: AbortSignal.timeout(300)});
        if (response.ok) return {origin, stop};
      } catch {}
      await pause(50);
    }
    throw new Error('Runtime fixture did not become healthy: ' + output.join(''));
  } catch (error) { await stop(); throw error; }
}

async function runtime(server) {
  const response = await fetch(server.origin + '/api/runtime');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
}

test('runtime identifies loaded code, detects backend updates, and clears the update flag after restart', {timeout: 25_000}, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gitpolar-runtime-'));
  for (const name of ['server.mjs', 'package.json', 'backend', 'templates']) {
    await cp(join(source, name), join(directory, name), {recursive: true});
  }
  await symlink(join(source, 'node_modules'), join(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  let server = await launch(directory);
  t.after(async () => { if (server) await server.stop(); });
  const initial = await runtime(server);
  assert.deepEqual(Object.keys(initial).sort(), ['service', 'version', 'build', 'startedAt', 'updateAvailable'].sort());
  assert.equal(initial.service, 'gitpolar');
  assert.equal(initial.version, JSON.parse(await readFile(join(source, 'package.json'), 'utf8')).version);
  assert.match(initial.build, /^[a-f0-9]{16}$/);
  assert.ok(Number.isFinite(Date.parse(initial.startedAt)));
  assert.equal(initial.updateAvailable, false);

  // Credentials and runtime data must not affect the source fingerprint or enter its public response.
  const secret = 'runtime-private-fixture-value';
  await writeFile(join(directory, '.env'), 'PRIVATE_RUNTIME_FIXTURE=' + secret);
  await writeFile(join(directory, 'data', 'runtime-private-fixture'), secret);
  const unchanged = await runtime(server);
  assert.deepEqual(unchanged, initial);
  assert.ok(!JSON.stringify(unchanged).includes(secret));
  assert.ok(!JSON.stringify(unchanged).includes(directory));

  const module = join(directory, 'backend', 'auth.mjs');
  await writeFile(module, await readFile(module, 'utf8') + '\n// Runtime update regression.\n');
  const changed = await runtime(server);
  assert.equal(changed.build, initial.build);
  assert.equal(changed.startedAt, initial.startedAt);
  assert.equal(changed.updateAvailable, true);
  await server.stop();
  server = null;
  server = await launch(directory);
  const restarted = await runtime(server);
  assert.notEqual(restarted.build, initial.build);
  assert.notEqual(restarted.startedAt, initial.startedAt);
  assert.equal(restarted.updateAvailable, false);
});
