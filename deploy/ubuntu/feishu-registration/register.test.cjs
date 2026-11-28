'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registerLoginApp } = require('./register.cjs');

function pendingPath(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitpolar-registration-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'pending.json');
}

test('creation stages only app credentials and emits only the confirmation link and expiry', async t => {
  const pending = pendingPath(t);
  const events = [];
  const credentials = { client_id: 'cli_test', client_secret: 'fixture-app-secret' };
  const url = 'https://accounts.feishu.cn/fixture?user_code=EXAMPLE';
  const provider = async options => {
    assert.equal(options.createOnly, true);
    assert.deepEqual(options.addons, { preset: false });
    assert.deepEqual(options.appPreset, { name: 'gitpolar' });
    options.onQRCodeReady({ url, expireIn: 600 });
    return { ...credentials, user_info: { open_id: 'unused' } };
  };
  const before = Date.now();
  assert.equal(await registerLoginApp(provider, pending, event => events.push(event)), credentials.client_id);
  assert.equal(events.length, 1);
  assert.deepEqual(Object.keys(events[0]).sort(), ['expires_at', 'verification_url']);
  assert.equal(events[0].verification_url, url);
  assert.ok(Date.parse(events[0].expires_at) >= before + 600000);
  assert.deepEqual(JSON.parse(fs.readFileSync(pending)), credentials);
  if (process.platform !== 'win32') assert.equal(fs.statSync(pending).mode & 0o777, 0o600);
  await assert.rejects(registerLoginApp(() => assert.fail('duplicate registration'), pending, () => {}), /pending_application/);
});

test('expiration or an invalid provider response leaves the NAS ready for another attempt', async t => {
  const pending = pendingPath(t);
  for (const provider of [async () => { throw { code: 'expired_token' }; }, async () => ({ client_id: 'cli_test' })]) {
    await assert.rejects(registerLoginApp(provider, pending, () => {}));
    assert.deepEqual(fs.readdirSync(path.dirname(pending)), []);
  }
});
