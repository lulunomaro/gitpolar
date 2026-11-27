"""Exercise the real preset, profile, repository and business navigation in Chromium."""
import io,os,socket,subprocess,sys,time,json
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import build_opener,ProxyHandler
from PIL import Image
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1];ART=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'artifacts'/'interface-ui';ART.mkdir(parents=True,exist_ok=True)

def run(origin,browser,data_dir):
    ctx=browser.new_context(viewport={'width':1440,'height':960},locale='zh-CN',color_scheme='light')
    errors=[]
    def post(path,body):
        res=ctx.request.post(origin+path,data=body,headers={'Origin':origin});assert res.ok,(res.status,res.text());return res
    post('/api/setup',{'username':'polar','password':'github-style-fixture','name':'Polar'})
    for name,desc in [('robot-mechanical','RoboMaster 机械设计与 SolidWorks 装配版本管理'),('robot-firmware','Control firmware and team development'),('team-docs','Team documentation and engineering notes')]:
        post('/api/repos',{'name':name,'description':desc})
    post('/api/repos',{'name':'activity-albums','kind':'album','description':'活动影像 · 团队相册'})
    post('/api/repos/robot-mechanical/issues',{'title':'装配体预览与图纸审核','body':'Review the current CAD design and its assembly dependencies.'})
    post('/api/users',{'username':'member','password':'github-style-fixture','role':'writer'})
    other=browser.new_context();res=other.request.post(origin+'/api/login',data={'username':'member','password':'github-style-fixture'},headers={'Origin':origin});assert res.ok
    res=other.request.post(origin+'/api/repos/robot-mechanical/issues',data={'title':'Member fixture issue','body':'Created by a teammate'},headers={'Origin':origin});assert res.ok;other.close()
    res=ctx.request.put(origin+'/api/profiles/member/follow',headers={'Origin':origin});assert res.ok
    post('/api/repos/robot-mechanical/branches',{'name':'design/preview','from':'main'})
    bare=str(Path(data_dir)/'repositories'/'polar-lab'/'robot-mechanical.git')
    subprocess.run(['git','--git-dir='+bare,'tag','v1.0','main'],check=True,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
    page=ctx.new_page();page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(origin+'/#/')
    expect(page.locator('.gh-home-feed h1')).to_have_text('Home');expect(page.locator('.gh-feed-card')).not_to_have_count(0)
    assert page.evaluate('getComputedStyle(document.querySelector(".workspace-rail")).display')=='none'
    page.screenshot(path=str(ART/'github-dashboard.png'),full_page=True)
    page.get_by_role('link',name='Following',exact=True).click();expect(page.locator('.gh-home-tabs [aria-current=page]')).to_have_text('Following');expect(page.locator('.gh-feed-items')).to_contain_text('Member fixture issue');expect(page.locator('.gh-feed-items')).not_to_contain_text('装配体预览与图纸审核')
    page.goto(origin+'/#/')
    page.locator('.account-trigger').click();page.get_by_role('link',name='Your profile',exact=True).click();expect(page.locator('.gh-profile-sidebar h1')).to_contain_text('polar')
    page.wait_for_selector('.gh-heatmap');expect(page.locator('.gh-contributions h2')).to_contain_text('contributions')
    page.screenshot(path=str(ART/'github-profile.png'),full_page=True)
    page.locator('#gh-contribution-year').select_option('2025');expect(page.locator('.gh-contributions h2')).to_contain_text('2025')
    page.goto(origin+'/#/users/member');expect(page.locator('.gh-profile-sidebar h1')).to_contain_text('member');expect(page.get_by_role('button',name='Customize your pins')).to_have_count(0)
    page.goto(origin+'/#/profile');expect(page.locator('.gh-contributions')).to_be_visible()
    page.get_by_role('link',name='Edit profile',exact=True).click();expect(page.locator('#gh-profile-form')).to_be_visible()
    page.locator('#gh-profile-form [name=bio]').fill('RoboMaster · CAD, code and photos')
    page.locator('#gh-profile-form [name=location]').fill('Polar Lab')
    page.get_by_role('button',name='Update profile').click();expect(page.locator('#toast')).to_have_text('Profile updated successfully.')
    page.get_by_role('link',name='Go to your personal profile').click();expect(page.locator('.gh-bio')).to_have_text('RoboMaster · CAD, code and photos')
    page.get_by_role('button',name='Customize your pins').click();page.locator('#gh-pins-form [value=robot-mechanical]').check();page.get_by_role('button',name='Save pins').click();expect(page.locator('.gh-pinned')).to_have_count(1)
    page.goto(origin+'/#/settings/appearance');expect(page.locator('.gh-preset-choice[data-preset=github]')).to_have_attribute('aria-pressed','true')
    page.screenshot(path=str(ART/'github-appearance.png'),full_page=True)
    page.locator('.gh-preset-choice[data-preset=workspace]').click();expect(page.locator('html')).to_have_attribute('data-preset','workspace')
    page.goto(origin+'/#/');expect(page.locator('.workspace-rail')).to_be_visible();expect(page.locator('.workspace-pane-head')).not_to_have_count(0)
    page.screenshot(path=str(ART/'saved-workspace.png'),full_page=True)
    page.goto(origin+'/#/settings/appearance');page.locator('.gh-preset-choice[data-preset=github]').click();expect(page.locator('html')).to_have_attribute('data-preset','github')
    page.locator('[data-gh-action=color][data-mode=dark]').click();expect(page.locator('html')).to_have_attribute('data-theme','dark')
    page.goto(origin+'/#/');expect(page.locator('.gh-home-feed')).to_be_visible();page.screenshot(path=str(ART/'github-dashboard-dark.png'),full_page=True)
    page.goto(origin+'/#/settings/appearance');page.locator('[data-gh-action=color][data-mode=light]').click();expect(page.locator('html')).to_have_attribute('data-theme','light')
    page.goto(origin+'/#/repos/robot-mechanical');expect(page.locator('.file-list')).to_be_visible();expect(page.locator('#top-nav')).to_contain_text('Git Graph');page.screenshot(path=str(ART/'github-repository.png'),full_page=True)
    about=page.locator('.repo-about').bounding_box();files=page.locator('.repo-files').bounding_box();assert about['x']>files['x']+files['width'],(about,files)
    page.get_by_role('button',name='Go to file',exact=True).click();page.locator('#search-query').fill('README');expect(page.locator('.search-hit')).to_have_count(1);page.locator('.search-hit').click();expect(page.locator('.code-body')).to_be_visible();page.goto(origin+'/#/repos/robot-mechanical')
    page.locator('.branch-picker summary').click();expect(page.get_by_role('tab',name='Branches',exact=True)).to_be_visible();page.get_by_role('tab',name='Tags',exact=True).click();page.get_by_role('searchbox',name='Find a tag',exact=True).fill('v1');page.get_by_role('searchbox',name='Find a tag',exact=True).press('Enter');expect(page.locator('.version-banner')).to_contain_text('Viewing tag v1.0');expect(page.locator('.file-list')).to_be_visible();page.locator('.branch-picker summary').click();expect(page.get_by_role('tab',name='Tags',exact=True)).to_have_attribute('aria-selected','true');page.keyboard.press('Escape')
    page.goto(origin+'/#/repos/robot-mechanical');page.locator('.branch-picker summary').click();page.get_by_role('searchbox',name='Find a branch',exact=True).fill('design/preview');page.get_by_role('searchbox',name='Find a branch',exact=True).press('ArrowDown');page.keyboard.press('Enter');expect(page.locator('.branch-picker summary')).to_contain_text('design/preview')
    page.goto(origin+'/#/repos/robot-mechanical/issues');expect(page.locator('.gh-issue-sidebar')).to_be_visible();expect(page.locator('.gh-issue-list > li')).to_have_count(2);page.get_by_role('link',name='Created by me',exact=True).click();expect(page.locator('.gh-issue-list > li')).to_have_count(1)
    page.locator('#gh-list-search input').fill('is:issue author:member');page.locator('#gh-list-search input').press('Enter');expect(page.locator('.gh-issue-list')).to_contain_text('Member fixture issue');expect(page.locator('.gh-issue-list')).not_to_contain_text('装配体预览与图纸审核');page.get_by_role('link',name='Compact display density',exact=True).click();expect(page.locator('.gh-compact-list')).to_be_visible();page.screenshot(path=str(ART/'github-issues.png'),full_page=True)
    page.goto(origin+'/#/repos/robot-mechanical/pulls');expect(page.locator('.gh-pulls-page')).to_contain_text('普通代码 PR')
    page.goto(origin+'/#/repos/robot-mechanical/wiki');expect(page.locator('.markdown')).to_contain_text('README.md')
    page.goto(origin+'/#/repos/robot-mechanical/security');expect(page.locator('.panel')).to_contain_text('No scanning service is connected')
    page.goto(origin+'/#/repos/robot-mechanical/graph');expect(page.locator('.git-graph-page')).to_be_visible()
    page.goto(origin+'/procurement/');expect(page.locator('.gp-global')).to_be_visible();expect(page.locator('#tabs')).to_be_visible();assert page.locator('#tabs').evaluate('(e)=>getComputedStyle(e).position')=='static';assert page.locator('body').evaluate('(e)=>getComputedStyle(e).paddingLeft')=='0px';page.screenshot(path=str(ART/'github-procurement.png'),full_page=True)
    page.get_by_role('button',name='Open user menu',exact=True).click();expect(page.locator('#gp-account[open]')).to_be_visible();expect(page.get_by_role('button',name='Sign out',exact=True)).to_be_visible();page.keyboard.press('Escape');expect(page.locator('#gp-account')).not_to_be_visible()
    page.goto(origin+'/admin/');expect(page.locator('.gp-global')).to_be_visible();expect(page.locator('#workspace')).to_be_visible();expect(page.locator('#page')).to_have_attribute('aria-busy','false');page.screenshot(path=str(ART/'github-admin.png'),full_page=True)
    page.goto(origin+'/albums/?repo=activity-albums');expect(page.locator('.gp-global')).to_be_visible();expect(page.locator('#upload')).to_be_visible()
    page.goto(origin+'/#/profile');page.set_viewport_size({'width':390,'height':844});expect(page.locator('.gh-profile-sidebar h1')).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(ART/'github-profile-mobile.png'),full_page=True)
    page.goto(origin+'/#/');expect(page.locator('.gh-home-feed')).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(ART/'github-dashboard-mobile.png'),full_page=True)
    page.goto(origin+'/#/settings/appearance');expect(page.locator('.gh-preset-choice')).to_have_count(2);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.goto(origin+'/#/issues');page.get_by_role('button',name='New issue',exact=True).click();page.locator('#new-issue-form [name=repository]').select_option('team-docs');page.locator('#new-issue-form [name=title]').fill('Issue in the selected repository');page.get_by_role('button',name='Create issue',exact=True).click();expect(page.locator('.detail-title')).to_contain_text('Issue in the selected repository');assert '/repos/team-docs/issues/' in page.url
    for width in [390,320]:
        page.set_viewport_size({'width':width,'height':844})
        for key,path,ready in [('repo','/#/repos/robot-mechanical','.file-list'),('issues','/#/repos/robot-mechanical/issues','.gh-issue-list'),('pulls','/#/pulls','.gh-pulls-page'),('procurement','/procurement/','#tabs'),('admin','/admin/','#workspace'),('album','/albums/?repo=activity-albums','#upload')]:
            page.goto(origin+path);expect(page.locator(ready)).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,key,page.evaluate('document.documentElement.scrollWidth'))
            if width==390:page.screenshot(path=str(ART/(key+'-mobile.png')),full_page=True)
            if key=='repo':
                page.locator('.tree-visibility').click();expect(page.locator('.repo-tree')).to_be_visible();page.locator('.tree-visibility').click();expect(page.locator('.repo-tree')).not_to_be_visible()
        page.get_by_role('button',name='Open navigation menu',exact=True).click();expect(page.locator('#gp-navigation[open]')).to_be_visible();page.keyboard.press('Escape')
    assert not errors,errors
    ctx.close()
    guest=browser.new_context(viewport={'width':1440,'height':960});p=guest.new_page();p.goto(origin+'/login/');expect(p.locator('.login-card')).to_be_visible();assert p.locator('.login-page').evaluate('(e)=>getComputedStyle(e,"::after").backgroundImage')=='none';p.screenshot(path=str(ART/'github-login-desktop.png'),full_page=True);p.set_viewport_size({'width':390,'height':844});assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');p.screenshot(path=str(ART/'github-login.png'),full_page=True);guest.close()
    print(json.dumps({'dashboard':True,'profileSaved':True,'realContributions':True,'savedPresetRestored':True,'darkTheme':True,'repositoryAndGraph':True,'businessPages':True,'followingFeed':True,'tagAndBranchKeyboard':True,'yearSelection':True,'authorSearchAndDensity':True,'globalIssueRepositorySelection':True,'businessAccountDrawer':True,'mobileWidths':[320,390],'mobileOverflow':False,'browserErrors':errors}))

if __name__=='__main__':
 with TemporaryDirectory(prefix='gitpolar-github-ui-') as temp,socket.socket() as s:
    s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close();origin=f'http://127.0.0.1:{port}'
    env=dict(os.environ,NODE_ENV='test',AUTH_PROVIDER='local',DATA_DIR=temp,HOST='127.0.0.1',PORT=str(port),APP_ORIGIN=origin,APP_ORIGIN_ALIASES='',FEISHU_APP_ID='',FEISHU_APP_SECRET='',GITPOLAR_ALBUM_PYTHON=sys.executable)
    with (ART/'ui-server.log').open('w') as logs:
      server=subprocess.Popen(['node','server.mjs'],cwd=ROOT,env=env,stdout=logs,stderr=logs)
      try:
       client=build_opener(ProxyHandler({}))
       for _ in range(100):
        try:
          with client.open(origin+'/api/health',timeout=1):break
        except OSError:time.sleep(.1)
       else:raise RuntimeError('Preview server did not start')
       with sync_playwright() as p:
          browser=p.chromium.launch(args=['--no-proxy-server']);run(origin,browser,temp);browser.close()
      finally:server.terminate();server.wait(timeout=10)
