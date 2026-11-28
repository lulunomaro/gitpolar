#!/usr/bin/env python3
"""Connect a team-owned Feishu website client to an installed gitpolar NAS."""
import argparse
import getpass
import json
import os
import re
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='查看当前登录方式及回调地址')
    args = parser.parse_args()
    session = read_json(local + '/api/session')
    print('飞书应用的重定向 URL', session['feishuCallbackUrl'])
    print('当前登录方式', session.get('feishuLoginMethod', '旧版本'))
    if args.check:
        return
    if os.geteuid() != 0 or not sys.stdin.isatty():
        raise RuntimeError('请通过交互式 SSH 使用 sudo 运行。')
    app_id = input('gitpolar 专用网站应用 App ID：').strip()
    if not re.fullmatch(r'cli_[A-Za-z0-9_\-]{1,128}', app_id):
        raise ValueError('App ID 格式不正确。')
    cli = read_json(local + '/api/feishu-cli/status')
    if cli.get('appId') == app_id:
        raise ValueError('该 ID 属于当前 CLI，请输入 gitpolar 网站应用的 App ID。')
    secret = getpass.getpass('网站应用 App Secret（输入隐藏）：').strip()
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


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error))
