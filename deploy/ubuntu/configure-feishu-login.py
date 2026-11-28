#!/usr/bin/env python3
"""Connect a team-owned Feishu website client to an installed gitpolar NAS."""
import argparse
import fcntl
import getpass
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, hdrs, newurl):
        return None


http = build_opener(ProxyHandler({}), NoRedirect())
local = 'http://127.0.0.1:4317'
config = Path('/etc/gitpolar/gitpolar.env')
keys = ('FEISHU_LOGIN_APP_ID', 'FEISHU_LOGIN_APP_SECRET')
registration_dir = config.parent / 'feishu-login-registration'
pending_credentials = registration_dir / 'pending.json'
worker = Path(__file__).resolve().parent / 'feishu-registration' / 'register.cjs'
node = '/opt/gitpolar/runtime/node/bin/node'


def read_json(url, data=None):
    req = Request(url, data=None if data is None else json.dumps(data).encode(),
                  headers={'Content-Type': 'application/json'})
    with http.open(req, timeout=10) as response:
        return json.load(response)


def update_settings(original, app_id, secret):
    lines = original.decode('utf8').splitlines()
    rows = [line for line in lines if not re.match(r'^\s*(?:FEISHU_LOGIN_APP_ID|FEISHU_LOGIN_APP_SECRET)\s*=', line)]
    for key, value in zip(keys, (app_id, secret)):
        if not value or not value.isprintable():
            raise ValueError('凭证必须填完整且为单行。')
        quoted = value.replace('\\', '\\\\').replace('"', '\\"')
        rows.append(f'{key}="{quoted}"')
    return ('\n'.join(rows) + '\n').encode('utf8')


def replace_config(expected, replacement):
    stat = config.stat()
    if config.is_symlink() or config.read_bytes() != expected:
        raise RuntimeError('部署配置已变更，请重新运行。')
    fd, name = tempfile.mkstemp(dir=config.parent, prefix='.gitpolar-login-')
    try:
        with os.fdopen(fd, 'wb') as out:
            os.fchown(out.fileno(), stat.st_uid, stat.st_gid)
            out.write(replacement)
            out.flush()
            os.fsync(out.fileno())
        os.replace(name, config)
    finally:
        Path(name).unlink(missing_ok=True)


def verify_service(app_id):
    for _ in range(30):
        try:
            session = read_json(local + '/api/session')
            if session.get('feishuLoginMethod') == 'web' and session.get('feishuLoginUrl'):
                break
        except OSError:
            pass
        time.sleep(.25)
    else:
        raise RuntimeError('登录服务启动检查失败。')
    try:
        with http.open(local + '/auth/feishu', timeout=5):
            raise RuntimeError('登录入口未返回飞书授权地址。')
    except HTTPError as error:
        target = urlsplit(error.headers.get('Location', ''))
        params = parse_qs(target.query)
        if (error.code != 302 or target.scheme != 'https' or target.hostname != 'accounts.feishu.cn'
            or params.get('client_id') != [app_id] or params.get('redirect_uri') != [session['feishuCallbackUrl']]):
            raise RuntimeError('实际登录入口与应用登记不一致。') from None


def activate(app_id, secret):
    if not isinstance(app_id, str) or not isinstance(secret, str):
        raise ValueError('网站应用凭证缺少字段。')
    if not re.fullmatch(r'cli_[A-Za-z0-9_\-]{1,128}', app_id):
        raise ValueError('App ID 格式不正确。')
    cli = read_json(local + '/api/feishu-cli/status')
    if cli.get('appId') == app_id:
        raise ValueError('该 ID 属于当前 CLI，请输入 gitpolar 网站应用的 App ID。')
    original = config.read_bytes()
    replacement = update_settings(original, app_id, secret)
    auth = read_json('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
                     {'app_id': app_id, 'app_secret': secret})
    if auth.get('code') != 0 or not auth.get('tenant_access_token'):
        raise ValueError('飞书未接受这对网站应用凭证。')
    replace_config(original, replacement)
    try:
        subprocess.run(['systemctl', 'restart', 'gitpolar'], check=True)
        verify_service(app_id)
    except (Exception, KeyboardInterrupt):
        replace_config(replacement, original)
        subprocess.run(['systemctl', 'restart', 'gitpolar'], check=True)
        raise
    print('专用网页登录已启用。请让两名队员分别在自己的浏览器中完成飞书授权。')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--check', action='store_true', help='查看当前登录方式及回调地址')
    action.add_argument('--register', action='store_true', help='扫码创建 gitpolar 登录应用，由 NAS 接收凭证')
    action.add_argument('--activate-registered', action='store_true', help='用 NAS 收到的凭证启用网页登录')
    args = parser.parse_args()
    session = read_json(local + '/api/session')
    print('飞书应用的重定向 URL', session['feishuCallbackUrl'], flush=True)
    print('当前登录方式', session.get('feishuLoginMethod', '旧版本'), flush=True)
    if args.check:
        return
    if os.geteuid() != 0:
        raise RuntimeError('请使用 sudo 运行。')
    registration_dir.mkdir(mode=0o700, exist_ok=True)
    info = registration_dir.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o077:
        raise RuntimeError('请检查 NAS 注册目录的所有者和权限。')
    with (registration_dir / 'setup.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('NAS 正在处理另一次飞书应用注册或切换。') from None
        if args.register:
            if pending_credentials.exists():
                app_id = json.loads(pending_credentials.read_text())['client_id']
                print('NAS 已收到待启用应用的凭证', app_id)
                return
            subprocess.run([node, str(worker), str(pending_credentials)], check=True, pass_fds=(lock.fileno(),))
        elif args.activate_registered:
            if not pending_credentials.is_file():
                raise RuntimeError('NAS 尚未收到飞书确认创建后的凭证。')
            credentials = json.loads(pending_credentials.read_text())
            activate(credentials.get('client_id'), credentials.get('client_secret'))
            pending_credentials.unlink()
        else:
            if not sys.stdin.isatty():
                raise RuntimeError('请通过交互式 SSH 输入已有应用凭证，或使用 --register。')
            app_id = input('gitpolar 专用网站应用 App ID：').strip()
            secret = getpass.getpass('网站应用 App Secret（输入隐藏）：').strip()
            activate(app_id, secret)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error))
