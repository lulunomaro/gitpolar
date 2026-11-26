import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { loadEnvFile } from 'node:process';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
const envFile=fileURLToPath(new URL('./.env',import.meta.url));
if(existsSync(envFile))loadEnvFile(envFile);
const {origin,host,port,namespace,githubConfigured}=await import('./backend/config.mjs');
const {repository,db}=await import('./backend/store.mjs');
const {HttpError,requireAuth,json}=await import('./backend/auth.mjs');
const {git,smartHttp,installHook}=await import('./backend/git.mjs');
const {lfs}=await import('./backend/lfs.mjs');
const {api}=await import('./backend/api.mjs');
const {beginOAuth,finishOAuth}=await import('./backend/oauth.mjs');
const events=new EventEmitter();events.setMaxListeners(1000);
const changed=name=>events.emit('repository',name);
const assets=new Map([
  ['/', ['index.html','text/html; charset=utf-8']],['/index.html',['index.html','text/html; charset=utf-8']],
  ['/viewer.js',['public/viewer.js','text/javascript; charset=utf-8']],['/cad-worker.js',['public/cad-worker.js','text/javascript; charset=utf-8']],
  ['/cad-vendor/occt-import-js.js',['public/cad-vendor/occt-import-js.js','text/javascript; charset=utf-8']],['/cad-vendor/occt-import-js.wasm',['public/cad-vendor/occt-import-js.wasm','application/wasm']],
  ['/cad-vendor/LICENSE.occt-import-js.txt',['public/cad-vendor/LICENSE.occt-import-js.txt','text/plain; charset=utf-8']],['/LICENSE.three.txt',['public/LICENSE.three.txt','text/plain; charset=utf-8']],
  ['/tools/Export-SolidWorksPreview.ps1',['tools/Export-SolidWorksPreview.ps1','text/plain; charset=utf-8']],
  ['/tools/Export-SolidWorksProject.ps1',['tools/Export-SolidWorksProject.ps1','text/plain; charset=utf-8']],
  ['/styles.css',['styles.css','text/css; charset=utf-8']],['/demo.js',['demo.js','text/javascript; charset=utf-8']],
  ['/app.js',['app.js','text/javascript; charset=utf-8']],['/live.js',['live.js','text/javascript; charset=utf-8']],
  ['/assets/gitpolar-logo.png',['assets/gitpolar-logo.png','image/png']],['/assets/favicon.png',['assets/favicon.png','image/png']],
]);
async function handle(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  const url=new URL(req.url,origin),path=decodeURIComponent(url.pathname);
  // Emscripten's binding glue uses Function; its policy is scoped to the CAD worker.
  if(path==='/cad-worker.js')res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'self'");
  if(path.startsWith('/api/'))return api(req,res,path,url.searchParams,changed,events);
  if(path==='/auth/logout'&&req.method==='POST')return api(req,res,'/api/logout',url.searchParams,changed,events);
  if(githubConfigured&&path==='/auth/github'&&req.method==='GET')return beginOAuth(res);
  if(githubConfigured&&path==='/auth/github/callback'&&req.method==='GET')return finishOAuth(req,res,url.searchParams);
  const match=path.match(/^\/([a-z0-9][a-z0-9_-]{0,47})\/([a-z0-9][a-z0-9_-]{0,47})\.git(\/.*)$/);
  if(match&&match[1]===namespace) {
    const repo=repository(match[2]);if(!repo)throw new HttpError(404,'Repository not found.');
    if(match[3].startsWith('/info/lfs/'))return lfs(req,res,repo,match[3].slice('/info/lfs'.length),url.searchParams,changed);
    const write=match[3]==='/git-receive-pack'||url.searchParams.get('service')==='git-receive-pack';
    const user=requireAuth(req,res,write,false,true);
    if(!['/info/refs','/git-upload-pack','/git-receive-pack','/HEAD'].includes(match[3]))throw new HttpError(404,'Unsupported Git endpoint.');
    return smartHttp(req,res,repo,user,path,url.searchParams.toString(),changed);
  }
  if(req.method!=='GET')throw new HttpError(405,'Method not allowed.');
  const asset=assets.get(path);if(!asset)throw new HttpError(404,'Not found.');
  if(path.startsWith('/tools/')&&path.endsWith('.ps1'))res.setHeader('Content-Disposition','attachment; filename='+path.split('/').at(-1));
  const bytes=await readFile(new URL(asset[0],import.meta.url));res.writeHead(200,{'Content-Type':asset[1],'Content-Length':bytes.length}).end(bytes);
}
const version=(await git(null,['--version'])).trim();
for(const repo of db.prepare("SELECT * FROM repos WHERE status='ready'").all())await installHook(repo);
export const server=createServer((req,res)=>{
  handle(req,res).catch(error=>{
    if(res.headersSent||res.destroyed){res.destroy();return;}
    if(!(error instanceof HttpError))console.error('gitpolar request failed:',error.message);
    json(res,{error:error instanceof HttpError?error.message:'The server could not complete the request.'},error.status||500);
  });
});
server.requestTimeout=0;
server.listen(port,host,()=>{
  console.log(`gitpolar listening on ${host}:${port}. Open ${origin.origin}`);
  console.log(`${version}; Smart HTTP + Git LFS enabled; workspace ${namespace}`);
});
function shutdown(){events.removeAllListeners();server.close(()=>process.exit(0));server.closeAllConnections();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
