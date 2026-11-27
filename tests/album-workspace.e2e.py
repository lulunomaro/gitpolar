"""Browser regression for selecting photos and reviewing an album PR against an isolated server.

Requires Python with Pillow, Playwright with Chromium, Node 24, and Git on PATH.
"""
import io
import os
from pathlib import Path
import socket
import subprocess
import sys
from tempfile import TemporaryDirectory
import time
from urllib.request import build_opener, ProxyHandler

from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


def image(index):
    data = io.BytesIO()
    Image.new('RGB', (180 + 40 * index, 132 + 75 * (index % 2)),
              (85 + index * 20, 112 + index * 15, 170 - index * 20)).save(data, 'PNG')
    return {'name': f'训练-{index}.png', 'mimeType': 'image/png', 'buffer': data.getvalue()}


def exercise(origin, browser):
    owner = browser.new_context(viewport={'width': 1280, 'height': 800})
    member = browser.new_context(viewport={'width': 1280, 'height': 800})
    password = 'album-browser-fixture'

    def post(ctx, path, data):
        response = ctx.request.post(origin + path, data=data, headers={'Origin': origin})
        assert response.ok, (path, response.status, response.text())

    post(owner, '/api/setup', {'username': 'owner', 'password': password})
    post(owner, '/api/users', {'username': 'member', 'password': password, 'role': 'reader'})
    post(owner, '/api/repos', {'name': 'events', 'kind': 'album'})
    post(member, '/api/login', {'username': 'member', 'password': password})
    url = origin + '/albums/?repo=events'
    editor, reviewer = member.new_page(), owner.new_page()
    errors = []
    for page in (editor, reviewer):
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda msg: errors.append(msg.text) if 'Content Security Policy' in msg.text else None)
        page.set_default_timeout(10000)

    editor.goto(url)
    editor.get_by_role('button', name='投稿', exact=True).click()
    editor.locator('#activity-name').fill('训练日')
    editor.locator('#file-input').set_input_files([image(i) for i in range(5)])
    expect(editor.locator('.queue-row')).to_have_count(5)
    editor.wait_for_function("document.querySelector('.queue-row img')?.naturalWidth > 0")
    editor.locator('#pr-title').fill('训练照片')
    editor.get_by_role('button', name='提交 PR', exact=True).click()
    expect(editor.locator('#review .pr-state')).to_have_text('待审核', timeout=30000)
    expect(editor.locator('#review')).not_to_contain_text('合并到 main')
    assert member.request.get(origin+'/api/repos/events/album').json()['stats']['photos'] == 0

    def review_pr(title):
        reviewer.goto(url+'#/pulls')
        reviewer.get_by_role('button', name='刷新投稿').click()
        reviewer.get_by_role('button', name=title, exact=False).click()
        expect(reviewer.locator('.review-image')).to_be_visible()
        reviewer.wait_for_function("document.querySelector('.review-image')?.naturalWidth > 0")

    def merge():
        reviewer.get_by_role('button', name='合并到 main').click()
        expect(reviewer.locator('#review .pr-state')).to_have_text('已合并')
        reviewer.get_by_role('button', name='关闭审核详情').click()

    review_pr('训练照片')
    reviewer.get_by_role('button', name='下一张').click()
    expect(reviewer.locator('.review-paging')).to_contain_text('2 / 5')
    merge()
    editor.goto(url)
    cards = editor.locator('#gallery .card')
    expect(cards).to_have_count(5)
    cards.nth(1).click(); expect(editor.locator('#viewer')).not_to_be_visible()
    cards.nth(3).click(modifiers=['Shift']); expect(editor.locator('.card[aria-pressed=true]')).to_have_count(3)
    cards.nth(0).click(modifiers=['Control']); expect(editor.locator('.card[aria-pressed=true]')).to_have_count(4)
    editor.get_by_role('button', name='选择操作').click(); editor.get_by_role('button', name='反选', exact=True).click()
    expect(editor.locator('.card[aria-pressed=true]')).to_have_count(1)
    cards.nth(0).click(); cards.nth(1).click(modifiers=['Shift'])
    editor.get_by_role('button', name='设为 5 星').click()
    editor.get_by_role('textbox', name='添加标签').fill('训练')
    editor.get_by_role('button', name='提交整理 PR').click(); editor.get_by_role('button', name='提交 PR', exact=True).click()
    expect(editor.locator('#review .pr-state')).to_have_text('待审核')
    review_pr('整理 2 张照片的标注'); expect(reviewer.locator('.changes')).to_contain_text('5 星 · 训练'); merge()
    editor.goto(url);editor.locator('#rating').select_option('5');expect(cards).to_have_count(2)
    editor.locator('#reset').click();cards.first.dblclick();expect(editor.locator('#viewer')).to_be_visible()
    editor.keyboard.press('ArrowRight');expect(editor.locator('#position')).to_have_text('2 / 5');editor.keyboard.press('Escape')
    expect(editor.locator('#viewer')).not_to_be_visible()
    editor.get_by_role('button', name='瀑布流').click();expect(editor.locator('#masonry')).to_have_attribute('aria-pressed','true')
    editor.locator('#search').fill('does-not-match');expect(editor.get_by_text('没有符合条件的结果')).to_be_visible();editor.locator('#reset').click()
    editor.set_viewport_size({'width':390,'height':844});editor.locator('#toggle-library').click();editor.locator('.tree .nav-item').first.click()
    expect(cards).to_have_count(5);cards.first.click();editor.locator('#toggle-info').click()
    expect(editor.get_by_role('button',name='打开大图')).to_be_visible()
    editor.locator('#hide-info').click()
    assert editor.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    owner.close();member.close()


if __name__ == '__main__':
    with TemporaryDirectory(prefix='gitpolar-browser-') as temp, socket.socket() as reserve:
        reserve.bind(('127.0.0.1', 0));port = reserve.getsockname()[1];reserve.close()
        origin = 'http://127.0.0.1:' + str(port)
        env = dict(os.environ, NODE_ENV='test', AUTH_PROVIDER='local', DATA_DIR=temp, APP_ORIGIN=origin,
                   HOST='127.0.0.1', PORT=str(port), GITPOLAR_ALBUM_PYTHON=sys.executable, APP_ORIGIN_ALIASES='',
                   FEISHU_APP_ID='', FEISHU_APP_SECRET='', FEISHU_WAREHOUSE_BASE_TOKEN='', FEISHU_WAREHOUSE_TABLE_ID='')
        server = subprocess.Popen(['node','server.mjs'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL)
        try:
            client = build_opener(ProxyHandler({}))
            for _ in range(100):
                try:
                    with client.open(origin+'/api/health',timeout=1):break
                except OSError:time.sleep(.1)
            else:raise RuntimeError('Isolated server did not start.')
            with sync_playwright() as p:
                browser = p.chromium.launch(args=['--no-proxy-server']);exercise(origin, browser);browser.close()
            print('PASS: upload, two-account review, selection, bulk edits, preview, and mobile panels')
        finally:
            server.terminate();server.wait(timeout=10)
