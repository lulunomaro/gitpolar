import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { serveStatic } from './backend/static-assets.mjs';
import { loadEnvFile } from 'node:process';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
const envFile=fileURLToPath(new URL('./.env',import.meta.url));
if(existsSync(envFile))loadEnvFile(envFile);
const {origin,host,port,namespace,githubConfigured,authProvider}=await import('./backend/config.mjs');
const {withRequestOrigin}=await import('./backend/request-origin.mjs');
const {repository,db}=await import('./backend/store.mjs');
const {HttpError,requireAuth,json}=await import('./backend/auth.mjs');
const {git,smartHttp,installHook}=await import('./backend/git.mjs');
const {lfs}=await import('./backend/lfs.mjs');
const {api}=await import('./backend/api.mjs');
const {startCI,autoRun,needsPushEvents}=await import('./backend/ci.mjs');
const {branches}=await import('./backend/git.mjs');
const {beginOAuth,finishOAuth}=await import('./backend/oauth.mjs');
const {beginFeishu,finishFeishu}=await import('./backend/feishu.mjs');
const {startWarehouseSync}=await import('./backend/feishu-warehouse.mjs');
const {shutdownFeishuCli}=await import('./backend/feishu-cli.mjs');
const runtimeStartedAt = new Date().toISOString();
const applicationVersion = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8')).version;
async function runtimeFingerprint() {
  const modules = (await readdir(new URL('./backend/', import.meta.url))).filter(name => name.endsWith('.mjs')).sort();
  const digest = createHash('sha256');
  for (const name of ['server.mjs', 'package.json', ...modules.map(name => 'backend/' + name)]) {
    digest.update(name).update('\0').update(await readFile(new URL(name, import.meta.url)));
  }
  return digest.digest('hex').slice(0, 16);
}
const runtimeBuild = await runtimeFingerprint();
const events=new EventEmitter();events.setMaxListeners(1000);
const changed=name=>events.emit('repository',name);
const assets=new Map([
  ...['appearance.js','icons.js','shell.js','motion.js','motion.css','github-app.js','collaboration.js','collaboration.css','github.css','workspace-manifest.json'].map(file=>['/ui/'+file,['ui/'+file,file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.json')?'application/json; charset=utf-8':'text/javascript; charset=utf-8']]),
  ['/albums',['albums/index.html','text/html; charset=utf-8']],['/albums/',['albums/index.html','text/html; charset=utf-8']],
  ...['ui.js','ai.js','pulls.js','vendor/serpent-selection.js'].map(file=>['/albums/'+file,['albums/'+file,'text/javascript; charset=utf-8']]),
  ['/albums/vendor/serpent-layout.js',['albums/vendor/serpent-layout.js','text/javascript; charset=utf-8']],
  ['/albums/ai.css',['albums/ai.css','text/css; charset=utf-8']],['/albums/app.js',['albums/app.js','text/javascript; charset=utf-8']],['/albums/styles.css',['albums/styles.css','text/css; charset=utf-8']],
  ['/login',['login/index.html','text/html; charset=utf-8']],['/login/',['login/index.html','text/html; charset=utf-8']],
  ['/login/app.js',['login/app.js','text/javascript; charset=utf-8']],['/login/styles.css',['login/styles.css','text/css; charset=utf-8']],
  ['/login/feishu-mark.png',['login/feishu-mark.png','image/png']],
  ['/login/feishu-illustration.webp',['login/feishu-illustration.webp','image/webp']],
  ['/procurement',['procurement/index.html','text/html; charset=utf-8']],['/procurement/',['procurement/index.html','text/html; charset=utf-8']],
  ['/procurement/index.html',['procurement/index.html','text/html; charset=utf-8']],['/procurement/app.js',['procurement/app.js','text/javascript; charset=utf-8']],
  ['/procurement/workbench.js',['procurement/workbench.js','text/javascript; charset=utf-8']],
  ['/procurement/styles.css',['procurement/styles.css','text/css; charset=utf-8']],['/procurement-viewer.js',['public/procurement-viewer.js','text/javascript; charset=utf-8']],
  ['/admin',['admin/index.html','text/html; charset=utf-8']],['/admin/',['admin/index.html','text/html; charset=utf-8']],
  ['/admin/index.html',['admin/index.html','text/html; charset=utf-8']],
  ['/admin/admin.js',['admin/admin.js','text/javascript; charset=utf-8']],['/admin/admin.css',['admin/admin.css','text/css; charset=utf-8']],
  ['/', ['index.html','text/html; charset=utf-8']],['/index.html',['index.html','text/html; charset=utf-8']],
  ['/cad-engine.js',['public/cad-engine.js','text/javascript; charset=utf-8']],
  ['/viewer.js',['public/viewer.js','text/javascript; charset=utf-8']],['/cad-worker.js',['public/cad-worker.js','text/javascript; charset=utf-8']],
  ['/cad-vendor/occt-import-js.js',['public/cad-vendor/occt-import-js.js','text/javascript; charset=utf-8']],['/cad-vendor/occt-import-js.wasm',['public/cad-vendor/occt-import-js.wasm','application/wasm']],
  ['/cad-vendor/LICENSE.occt-import-js.txt',['public/cad-vendor/LICENSE.occt-import-js.txt','text/plain; charset=utf-8']],['/LICENSE.three.txt',['public/LICENSE.three.txt','text/plain; charset=utf-8']],
  ['/tools/Export-SolidWorksPreview.ps1',['tools/Export-SolidWorksPreview.ps1','text/plain; charset=utf-8']],
  ['/tools/Export-SolidWorksProject.ps1',['tools/Export-SolidWorksProject.ps1','text/plain; charset=utf-8']],
  ['/styles.css',['styles.css','text/css; charset=utf-8']],['/demo.js',['demo.js','text/javascript; charset=utf-8']],
  ['/app.js',['app.js','text/javascript; charset=utf-8']],['/live.js',['live.js','text/javascript; charset=utf-8']],
  ['/assets/gitpolar-logo.png',['assets/gitpolar-logo.png','image/png']],['/assets/favicon.png',['assets/favicon.png','image/png']],
  ['/assets/fonts/MonaSansVF.woff2',['assets/fonts/MonaSansVF.woff2','font/woff2']],
  ['/assets/fonts/MonaSans-OFL.txt',['assets/fonts/MonaSans-OFL.txt','text/plain; charset=utf-8']],
]);
async function handle(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  const url=new URL(req.url,origin),path=decodeURIComponent(url.pathname);
  // Emscripten's binding glue uses Function; its policy is scoped to the CAD worker.
  if(path==='/albums'||path==='/albums/')res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  if(path==='/cad-worker.js')res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'self'");
  if(path==='/api/runtime'&&req.method==='GET')return json(res,{
    service:'gitpolar',version:applicationVersion,build:runtimeBuild,startedAt:runtimeStartedAt,
    updateAvailable:await runtimeFingerprint()!==runtimeBuild
  });
  if(path.startsWith('/api/'))return api(req,res,path,url.searchParams,changed,events);
  if(path==='/auth/logout'&&req.method==='POST')return api(req,res,'/api/logout',url.searchParams,changed,events);
  if(path==='/auth/feishu'&&req.method==='GET')return beginFeishu(req,res,url.searchParams);
  if(path==='/auth/feishu/callback'&&req.method==='GET')return finishFeishu(req,res,url.searchParams);
  if(authProvider==='feishu'&&path.startsWith('/auth/github'))throw new HttpError(403,'Only Feishu sign-in is enabled.');
  if(githubConfigured&&path==='/auth/github'&&req.method==='GET')return beginOAuth(res);
  if(githubConfigured&&path==='/auth/github/callback'&&req.method==='GET')return finishOAuth(req,res,url.searchParams);
  const match=path.match(/^\/([a-z0-9][a-z0-9_-]{0,47})\/([a-z0-9][a-z0-9_-]{0,47})\.git(\/.*)$/);
  if(match&&match[1]===namespace) {
    const repo=repository(match[2]);if(!repo)throw new HttpError(404,'Repository not found.');
    if(match[3].startsWith('/info/lfs/'))return lfs(req,res,repo,match[3].slice('/info/lfs'.length),url.searchParams,changed);
    const write=match[3]==='/git-receive-pack'||url.searchParams.get('service')==='git-receive-pack';
    const user=requireAuth(req,res,write,false,true);
    if(!['/info/refs','/git-upload-pack','/git-receive-pack','/HEAD'].includes(match[3]))throw new HttpError(404,'Unsupported Git endpoint.');
    const tips=write && req.method==='POST' && needsPushEvents(repo)?new Map((await branches(repo)).map(b=>[b.name,b.oid])):null;
    return smartHttp(req,res,repo,user,path,url.searchParams.toString(),name=>{
      changed(name);
      if(tips) branches(repo).then(refs=>Promise.all(refs.filter(b=>tips.get(b.name)!==b.oid).map(b=>autoRun(repo,b.name,b.oid)))).catch(e=>console.error('CI dispatch:',e.message));
    });
  }
  if(req.method!=='GET'&&req.method!=='HEAD')throw new HttpError(405,'Method not allowed.');
  const asset=assets.get(path);if(!asset)throw new HttpError(404,'Not found.');
  if(path.startsWith('/tools/')&&path.endsWith('.ps1'))res.setHeader('Content-Disposition','attachment; filename='+path.split('/').at(-1));
  return serveStatic(req,res,asset);
}
const version=(await git(null,['--version'])).trim();
for(const repo of db.prepare("SELECT * FROM repos WHERE status='ready'").all())await installHook(repo);
export const server=createServer((req,res)=>withRequestOrigin(req,()=>{
  handle(req,res).catch(error=>{
    if(res.headersSent||res.destroyed){res.destroy();return;}
    if(!(error instanceof HttpError))console.error('gitpolar request failed:',error.message);
    json(res,{error:error instanceof HttpError?error.message:'The server could not complete the request.'},error.status||500);
  });
}));
server.requestTimeout=0;
server.listen(port,host,()=>{
  console.log(`gitpolar listening on ${host}:${port}. Open ${origin.origin}`);
  console.log(`${version}; Smart HTTP + Git LFS enabled; workspace ${namespace}`);
});
startCI(changed);
const { startAlbumAI } = await import('./backend/album-ai.mjs');
const stopAlbumAI = startAlbumAI(events);
const stopWarehouseSync=startWarehouseSync();
let stopping=false;
async function shutdown(){if(stopping)return;stopping=true;stopAlbumAI();stopWarehouseSync?.();events.removeAllListeners();server.closeAllConnections();await shutdownFeishuCli();server.close(()=>process.exit(0));}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
