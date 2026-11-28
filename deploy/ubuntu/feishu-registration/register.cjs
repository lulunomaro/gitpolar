'use strict';

const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

async function registerLoginApp(registerApp, pendingFile, notify) {
  if (fs.existsSync(pendingFile)) throw new Error('pending_application');
  const { client_id, client_secret } = await registerApp({
    source: 'gitpolar',
    createOnly: true,
    appPreset: { name: 'gitpolar' },
    addons: { preset: false },
    onQRCodeReady({ url, expireIn }) {
      notify({ verification_url: url, expires_at: new Date(Date.now() + expireIn * 1000).toISOString() });
    },
  });
  if (typeof client_id !== 'string' || !/^cli_[a-zA-Z0-9_-]+$/.test(client_id) ||
      typeof client_secret !== 'string' || !client_secret.trim()) {
    throw new Error('invalid_credentials');
  }
  const temp = `${pendingFile}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify({ client_id, client_secret }), { flag: 'wx', mode: 0o600, flush: true });
    fs.linkSync(temp, pendingFile);
  } finally {
    fs.rmSync(temp, { force: true });
  }
  return client_id;
}

module.exports = { registerLoginApp };

if (require.main === module) {
  (async () => {
    const { registerApp } = require('@larksuiteoapi/node-sdk');
    const id = await registerLoginApp(registerApp, process.argv[2], event => console.log(JSON.stringify(event)));
    console.log('NAS 已收到 gitpolar 登录应用凭证', id);
  })().catch(error => {
    // SDK HTTP errors may carry the private device code or credentials.
    const messages = {
      access_denied: '飞书已取消本次创建。',
      expired_token: '飞书确认链接已过期。',
      MODULE_NOT_FOUND: '请先在 feishu-registration 目录安装部署工具依赖。',
    };
    console.error(Object.hasOwn(messages, error?.code) ? messages[error.code] : 'NAS 未能完成飞书应用注册。');
    process.exitCode = 1;
  });
}
