import { collaborationRoute, repoCollab, globalCollab, updateInbox } from './collaboration.mjs';
import { nextNumber, deliver, requireManager } from './collab-store.mjs';
import { autoRun } from './ci.mjs';
import { interfaceApi } from './interface.mjs';
import { workbenchApi } from './workbench.mjs';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { db,getUser,userCount,repository,now } from './store.mjs';
import { namespace,githubConfigured,cookieName,sessionSeconds,authProvider,personalWorkspacesEnabled } from './config.mjs';
import { requestOrigin } from './request-origin.mjs';
import { authenticate,requireAuth,requireOrigin,body,json,fail,createUser,checkPassword,newSession,newToken,cookie,hash,setCookie } from './auth.mjs';
import { createRepository,describe,browse,fileContent,resolveRef,commitFiles,streamGit,fileIndex,fileMeta,history,tree,branchOverview,createBranch,deleteBranch } from './git.mjs';
import { objectPath,lockList,createLock,releaseLock } from './lfs.mjs';
import { downloadArchive } from './archive.mjs';
import { cadProject } from './snapshot.mjs';
import { previewInfo } from './preview.mjs';
import { compareVersions,dependencyHistory } from './compare.mjs';
import { commitGraph,graphCommit } from './graph.mjs';
import { repositoryContext,resolveRepositoryContext } from './repository-context.mjs';
import { adminApi } from './admin.mjs';
import { procurementApi } from './procurement.mjs';
import { warehouseApi } from './feishu-warehouse.mjs';
import { feishuCliApi } from './feishu-cli.mjs';
import { dedicatedFeishuLogin,feishuLoginConfigured,hasFeishuIdentity } from './feishu.mjs';
import { firmwareApi } from './firmware.mjs';
import { albumList, albumView, albumMedia, savePhotoSelection, changeAlbumStar, visibleAlbumStars } from './album.mjs';
import { exportSerpentActivity } from './album-export.mjs';
import { albumPullApi } from './album-pulls.mjs';
import { albumRefError } from './album-policy.mjs';

function account(req,res,mutate=false) {
  const auth=authenticate(req);if(!auth)fail(401,'Sign in or use a gitpolar access token.');
  if(mutate&&!auth.token)requireOrigin(req);return auth.user;
}
export async function api(req,res,pathname,params,changed,events) {
  if(pathname==='/api/inbox' && req.method==='PUT') { const user=account(req,res,true);return json(res,updateInbox(user,await body(req))); }
  if(pathname==='/api/inbox' || pathname==='/api/pulls') return globalCollab(req,res,pathname);
  if(pathname.startsWith('/api/me/') || pathname.startsWith('/api/profiles/')) return interfaceApi(req,res,pathname,params);
  if(pathname === '/api/workbench' || pathname.startsWith('/api/workbench/')) return workbenchApi(req,res,pathname,params);
  if(pathname.startsWith('/api/feishu-cli/'))return feishuCliApi(req,res,pathname,params);
  if(pathname.startsWith('/api/procurement/feishu/'))return warehouseApi(req,res,pathname,params);
  if(pathname==='/api/procurement'||pathname.startsWith('/api/procurement/'))return procurementApi(req,res,pathname,params,changed);
  if(pathname==='/api/admin'||pathname.startsWith('/api/admin/'))return adminApi(req,res,pathname,params,changed);
  if(pathname==='/api/firmware' || pathname.startsWith('/api/firmware/'))return firmwareApi(req,res,pathname,params,changed);
  if(pathname==='/api/health')return json(res,{ok:true,service:'gitpolar',storage:'git+sqlite+lfs'});
  if(pathname==='/api/albums' && req.method==='GET') { requireAuth(req,res); return json(res,await albumList()); }
  if(pathname==='/api/session' && req.method==='GET') {
    const auth=authenticate(req,{includePersonal:true}),origin=requestOrigin();
    const team=!auth?.user?.personalOnly;
    const avatars=auth?Object.fromEntries(db.prepare('SELECT u.username,a.version FROM profile_avatars a JOIN users u ON u.id=a.user_id WHERE u.id=? OR (?=1 AND NOT EXISTS(SELECT 1 FROM personal_workspaces w WHERE w.user_id=u.id))').all(auth.user.id,+team).map(v=>[v.username,v.version])):{};
    return json(res,{avatars,mode:'server',namespace,origin:origin.origin,user:auth?.user?{...auth.user,login:auth.user.username}:null,authProvider,setupRequired:!userCount(),feishuLoginMethod:dedicatedFeishuLogin||feishuLoginConfigured?'web':'cli',feishuLoginUrl:feishuLoginConfigured?new URL('/auth/feishu',origin).href:null,feishuCallbackUrl:new URL('/auth/feishu/callback',origin).href,feishuLinked:Boolean(auth?.user && (auth.user.personalOnly || hasFeishuIdentity(auth.user.id))),callbackUrl:new URL('/auth/github/callback',origin).href,loginUrl:authProvider!=='feishu'&&githubConfigured?new URL('/auth/github',origin).href:null,capabilities:{personalWorkbench:personalWorkspacesEnabled,procurement:team,admin:team,repositoryContext:team,git:team,lfs:team,locks:team,cad:team,preview:team,hydratedArchives:team,history:team,ssh:false,issues:team,pulls:team,firmware:team&&Boolean(process.env.FIRMWARE_GIT_URL)}});
  }
  if(pathname==='/api/setup' && req.method==='POST') {
    if(authProvider==='feishu')fail(403,'Only Feishu sign-in is enabled.');
    requireOrigin(req);const user=await createUser(await body(req),true);newSession(res,user);return json(res,{user},201);
  }
  if(pathname==='/api/login' && req.method==='POST') {
    if(authProvider==='feishu')fail(403,'Only Feishu sign-in is enabled.');
    requireOrigin(req);const values=await body(req);
    const record=typeof values.username==='string'&&db.prepare('SELECT * FROM users WHERE username=?').get(values.username);
    if(!record||!await checkPassword(values.password,record.password_hash))fail(401,'Incorrect username or password.');
    const user=getUser(record.id);newSession(res,user);return json(res,{user});
  }
  if(pathname==='/api/logout' && req.method==='POST') {
    const auth=authenticate(req,{includePersonal:true});if(!auth)fail(401,'Sign in first.');
    if(!auth.token)requireOrigin(req);const secret=cookie(req,cookieName);if(secret)db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(secret));
    res.writeHead(204,{'Set-Cookie':setCookie(cookieName,'',0)}).end();return;
  }
  if(pathname==='/api/users') {
    requireAuth(req,res,req.method!=='GET',true);
    if(req.method==='GET')return json(res,{users:db.prepare('SELECT id,username,display_name AS name,role,created_at,github_id FROM users ORDER BY id').all()});
    if(req.method==='POST'){if(authProvider==='feishu')fail(403,'Members join through Feishu sign-in.');return json(res,{user:await createUser(await body(req))},201);}
  }
  if(pathname==='/api/tokens') {
    const user=account(req,res,req.method!=='GET');
    if(req.method==='GET')return json(res,{tokens:db.prepare('SELECT id,name,created_at,last_used FROM tokens WHERE user_id=? ORDER BY created_at DESC').all(user.id)});
    if(req.method==='POST')return json(res,newToken(user.id,(await body(req)).name),201);
  }
  const tokenMatch=pathname.match(/^\/api\/tokens\/([a-f0-9]+)$/);
  if(tokenMatch&&req.method==='DELETE') {
    const user=account(req,res,true);db.prepare('DELETE FROM tokens WHERE id=? AND user_id=?').run(tokenMatch[1],user.id);res.writeHead(204).end();return;
  }
  if(pathname==='/api/events' && req.method==='GET') {
    account(req,res);res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');req.socket.setTimeout(0);
    const listener=name=>res.write(`event: repository\ndata: ${JSON.stringify({name})}\n\n`);
    events.on('repository',listener);const keepAlive=setInterval(()=>res.write(': keepalive\n\n'),25000);
    res.on('close',()=>{events.off('repository',listener);clearInterval(keepAlive);});return;
  }
  if(pathname==='/api/repository-context/resolve' && req.method==='POST') {
    const user=account(req,res,true),result=await resolveRepositoryContext(user,await body(req));
    return json(res,result.body,result.status);
  }
  if(pathname==='/api/repos') {
    const user=requireAuth(req,res,req.method!=='GET');
    if(req.method==='GET') {
      const repos=db.prepare("SELECT * FROM repos WHERE status='ready' ORDER BY created_at DESC").all(),result=[];
      for(let i=0;i<repos.length;i+=4)result.push(...await Promise.all(repos.slice(i,i+4).map(r=>describe(r,user.id))));
      return json(res,{repos:result.sort((a,b)=>b.updated.localeCompare(a.updated))});
    }
    if(req.method==='POST') {const repo=await createRepository(user,await body(req));changed(repo.name);return json(res,await describe(repo,user.id),201);}
  }
  if(pathname==='/api/issues' && req.method==='GET') {
    account(req,res);return json(res,{issues:db.prepare("SELECT i.number AS id,r.name AS repo,'issues' AS kind,i.title,i.body,i.state,(SELECT json_group_array(l.name) FROM issue_labels x JOIN repo_labels l ON x.label_id=l.id WHERE x.issue_id=i.id) labels,(SELECT json_group_array(a.username) FROM issue_assignees x JOIN users a ON x.user_id=a.id WHERE x.issue_id=i.id) assignees,i.created_at AS createdAt,u.username AS author,i.created_at AS updated FROM issues i JOIN repos r ON r.id=i.repo_id JOIN users u ON u.id=i.author_id WHERE r.status='ready' ORDER BY i.created_at DESC").all().map(i=>({...i,labels:JSON.parse(i.labels),assignees:JSON.parse(i.assignees)}))});
  }
  const match=pathname.match(/^\/api\/repos\/([a-z0-9][a-z0-9_-]{0,47})(?:\/(.*))?$/);
  if(match) {
    const proposalRoute = match[2]==='album/pulls' || match[2]?.startsWith('album/pulls/');
    const starTarget = /^album\/stars\/(activity|photo)\/([a-f0-9]{24})$/.exec(match[2] || '');
    const write = !['GET','HEAD'].includes(req.method);
    const user = (proposalRoute || starTarget || match[2]==='preferences') ? account(req,res,write) : requireAuth(req,res,write);
    const repo=repository(match[1]);if(!repo)fail(404,'Repository not found.');
    const expectedRepositoryId=req.headers['x-gitpolar-repository-id'];
    if(expectedRepositoryId!==undefined&&expectedRepositoryId!==repo.id)fail(409,'Repository identity does not match the selected repository. Resolve the document context again.');
    res.setHeader('X-Gitpolar-Repository-Id',repo.id);
    const action=match[2]||'',ref=params.get('ref')||'main',path=params.get('path')||'';
    if(!action && req.method==='GET')return json(res,await describe(repo,user.id));
    if(collaborationRoute.test(action)) return repoCollab(req,res,repo,user,action,params,changed);
    if(proposalRoute) return albumPullApi(req,res,repo,user,action,params,changed);
    if(action==='album/stars' && req.method==='GET')return json(res,await visibleAlbumStars(repo,user.id,ref));
    if (starTarget && ['PUT','DELETE'].includes(req.method)) {
      return json(res, await changeAlbumStar(repo,user,ref,starTarget[1],starTarget[2],req.method==='PUT'));
    }
    if(action==='album' && req.method==='GET')return json(res,await albumView(repo,ref,user.role !== 'reader' && !albumRefError(repo,'refs/heads/'+ref,user.id),user.id));
    if(action==='album/selection' && req.method==='PUT') {
      const result = await savePhotoSelection(repo,user,ref,await body(req));
      changed(repo.name);
      return json(res,result);
    }
    if(action==='album/serpent' && req.method==='GET')return exportSerpentActivity(repo,ref,params.get('activity'),res);
    if(action==='album/media' && ['GET','HEAD'].includes(req.method))return albumMedia(req,res,repo,params);
    if(action==='context' && req.method==='GET')return json(res,await repositoryContext(repo,user,{...(params.has('ref')?{ref:params.get('ref')}:{}),...(params.has('path')?{path:params.get('path')}:{})}));
    if(!action && req.method==='PATCH') {
      requireManager(repo,user);const value=await body(req);if(typeof value.description!=='string'||value.description.length>240)fail(400,'Invalid repository description.');
      db.prepare('UPDATE repos SET description=? WHERE id=?').run(value.description,repo.id);changed(repo.name);return json(res,{ok:true});
    }
    if(action==='branches' && req.method==='GET')return json(res,await branchOverview(repo));
    if(action==='branches' && req.method==='POST') {
      const values=await body(req),branch=await createBranch(repo,values.name,values.from,user.id);
      changed(repo.name);return json(res,branch,201);
    }
    if(action==='branches' && req.method==='DELETE') {
      const values=await body(req);await deleteBranch(repo,values.name,values.expectedOid,user.id);
      changed(repo.name);return json(res,{ok:true});
    }
    if(action==='tree' && req.method==='GET') {
      const oid=await resolveRef(repo,ref);return json(res,{ref,oid,path,entries:await tree(repo,oid,path)});
    }
    if(action==='graph' && req.method==='GET')return json(res,await commitGraph(repo,params));
    if(action==='commit' && req.method==='GET')return json(res,await graphCommit(repo,params.get('ref')||ref));
    if(action==='history' && req.method==='GET')return json(res,await (params.get('scope')==='dependencies' && path ? dependencyHistory(repo,ref,path,params.get('cursor')||'0') : history(repo,ref,path,params.get('cursor')||'0')));
    if(action==='compare' && req.method==='GET')return json(res,await compareVersions(repo,params.get('base'),params.get('head')||ref,path));
    if(action==='preview' && req.method==='GET')return json(res,await previewInfo(repo,ref,path));
    if(action==='cad' && req.method==='GET')return json(res,await cadProject(repo,ref));
    if(action==='files' && req.method==='GET')return json(res,{files:await fileIndex(repo,ref)});
    if(action==='browse' && req.method==='GET')return json(res,await browse(repo,ref,path));
    if(action==='raw' && req.method==='GET') {
      const file=await fileContent(repo,ref,path);
      if(file.lfs) {
        if(!file.lfsAvailable)fail(404,'LFS content is missing.');
        const target=objectPath(repo,file.lfsOid),info=await stat(target);
        res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':info.size,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`});
        createReadStream(target).pipe(res);return;
      }
      const types={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
      return streamGit(repo,['cat-file','blob',file.oid],res,types[extname(path).toLowerCase()]||'application/octet-stream',params.has('download')?file.name:undefined);
    }
    if(action==='archive' && req.method==='GET') {
      return downloadArchive(repo,ref,res);
    }
    if(action==='file' && req.method==='PUT') {
      const values=await body(req);if(typeof values.branch!=='string')fail(400,'Branch is required.');
      const oid=await commitFiles(repo,user,values.branch,[{path:values.path,text:values.text}],String(values.message||`Update ${values.path}`).slice(0,300),values.expectedHead);await autoRun(repo,values.branch,oid);changed(repo.name);return json(res,{oid});
    }
    if(action==='issues' && req.method==='POST') {
      const values=await body(req);if(typeof values.title!=='string'||!values.title.trim()||values.title.length>160||typeof values.body!=='string'||values.body.length>6000)fail(400,'Invalid issue title or description.');
      const number=nextNumber(repo);
      db.prepare('INSERT INTO issues(number,repo_id,author_id,title,body,created_at) VALUES(?,?,?,?,?,?)').run(number,repo.id,user.id,values.title.trim(),values.body,now());deliver(repo,'issues',number,values.title.trim(),user,[],values.body);changed(repo.name);return json(res,{number},201);
    }
    if(action==='locks' && req.method==='POST') {
      const values=await body(req);
      await fileMeta(repo,values.ref||ref,values.path);
      const result=createLock(repo,user,values.path);
      if(!result.created)fail(409,'This file is already locked by '+result.lock.username+'.');
      changed(repo.name);return json(res,{lock:{id:result.lock.id,path:result.lock.path,owner:result.lock.username,locked_at:result.lock.locked_at}},201);
    }
    const unlock=action.match(/^locks\/([a-f0-9-]+)\/unlock$/);
    if(unlock && req.method==='POST') {
      const values=await body(req),lock=releaseLock(repo,user,unlock[1],values.force);
      changed(repo.name);return json(res,{lock:{id:lock.id,path:lock.path,owner:lock.username,locked_at:lock.locked_at}});
    }
    if(action==='locks' && req.method==='GET')return json(res,{locks:lockList(repo,{}).map(l=>({id:l.id,path:l.path,owner:l.username,locked_at:l.locked_at}))});
    if(action==='preferences' && req.method==='POST') {
      const values=await body(req);if(!['star','watch'].includes(values.kind))fail(400,'Invalid preference.');
      if(values.enabled)db.prepare('INSERT OR IGNORE INTO preferences(user_id,repo_id,kind) VALUES(?,?,?)').run(user.id,repo.id,values.kind);else db.prepare('DELETE FROM preferences WHERE user_id=? AND repo_id=? AND kind=?').run(user.id,repo.id,values.kind);
      return json(res,{ok:true});
    }
  }
  fail(404,'API route not found.');
}

