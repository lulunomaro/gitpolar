import {db} from './store.mjs';
import {body, fail, json, requireAuth} from './auth.mjs';
import {families, boardRef, region, repositoryName, withRepository, catalog, head, controlUpdate,
  publish, expectedOid, sourcePath, resolveVersion, run, entry, createCommit, writeTree, mergeIntoMain,
  comparison, knownCommit, sourceDirs, sourceRef, copyDirectory} from './firmware-git.mjs';
import {stationApi} from './firmware-stations.mjs';

const groupPattern = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const own = (object,key) => Object.hasOwn(object,key) ? object[key] : undefined;
function groupInfo(access, id) {
  if (typeof id !== 'string' || !groupPattern.test(id)) fail(400,'Invalid group key.');
  const info = own(access.groups,id);
  if (!info) fail(404,'Firmware group not found.');
  return info;
}
function scopeFor(access, ref) {
  if (ref === 'main') return {ref,grants:access.main,path:'',main:true};
  if (ref === sourceRef) return {ref,legacy:true,grants:own(access.groups,ref)?.grants || access.main,path:''};
  const match = /^teams\/([a-z0-9][a-z0-9_-]{0,39})\/(dji|dm)$/.exec(ref || '');
  if (!match) fail(400,'Choose main or a vehicle firmware branch.');
  const group = groupInfo(access,match[1]);
  return {ref,group:match[1],family:match[2],grants:group.grants,path:group.directories?.[match[2]] || region(match[1],match[2])};
}
function role(user,scope) {
  if (user.role === 'reader') return 'reader';
  if (scope.main && user.role === 'admin') return 'manager';
  return own(scope.grants,user.username) || 'reader';
}
function permit(user,scope,manage=false) {
  const level = role(user,scope);
  if (level === 'reader' || (manage && level !== 'manager')) fail(403,'Insufficient permission for this firmware scope.');
}
function validMember(username) {
  if (typeof username !== 'string') fail(400,'Select an existing writer or administrator.');
  const member = db.prepare('SELECT username,role FROM users WHERE username=?').get(username);
  if (!member || member.role === 'reader') fail(400,'Select an existing writer or administrator.');
  return member.username;
}
function pathIn(scope, path) {
  return (scope.path ? scope.path + '/' : '') + sourcePath(path);
}
async function overview(user, current) {
  const main = scopeFor(current.access,'main');
  const groups = [];
  for (const [id,group] of Object.entries(current.access.groups)) {
    const boards = [];
    for (const family of families) {
      const ref = boardRef(id,family);
      boards.push({family,ref,oid:await head(ref),directory:group.directories?.[family] || region(id,family)});
    }
    groups.push({id,name:group.name,role:role(user,{grants:group.grants}),boards});
  }
  const initial = await head(sourceRef);
  return {repository:repositoryName,accessVersion:current.oid,main:{ref:'main',oid:await head('main'),role:role(user,main)},
    source:initial?{ref:sourceRef,oid:initial,directories:sourceDirs}:null,groups};
}
async function initialize(user,current,input) {
  permit(user,scopeFor(current.access,'main'),true);
  if (input.name !== undefined && (typeof input.name !== 'string' || input.name.length>100)) fail(400,'Invalid group name.');
  if (current.oid || await head('main') || !groupPattern.test(sourceRef) || sourceRef === 'main') fail(409,'Initialize requires a legacy vehicle branch and no aggregate main or catalog.');
  const from = await resolveVersion(sourceRef,expectedOid(input.expectedSource));
  if (from !== await head(sourceRef)) fail(409,'Original branch changed.');
  const owner = validMember(input.manager), updates = [{ref:'main',before:null,after:from}];
  for (const family of families) {
    const directory = await entry(from,sourceDirs[family]);
    if (directory?.type !== 'tree') fail(422,'Original board directory is missing.');
    updates.push({ref:boardRef(sourceRef,family),before:null,after:from});
  }
  current.access.groups[sourceRef] = {name:input.name?.trim() || sourceRef,directories:sourceDirs,grants:{[owner]:'manager'}};
  const control = await controlUpdate(user,current);
  await publish([...updates,control]);
  return {accessVersion:control.after,main:from};
}
async function adminChange(user, current, action, input, method) {
  const main = scopeFor(current.access,'main');
  if (current.oid !== input.expectedAccess) fail(409,'The firmware group catalog or its permissions changed.');
  let updates = [];
  if (action === 'teams') {
    permit(user,main,true);
    const id = input.id;
    if (typeof id !== 'string' || !groupPattern.test(id)) fail(400,'Invalid group key.');
    if (method === 'POST') {
      if (id === 'main') fail(400,'The main identifier belongs to the aggregate branch.');
      if (own(current.access.groups,id)) fail(409,'Group already exists.');
      if (typeof input.name !== 'string' || !input.name.trim() || input.name.length>100) fail(400,'Enter the group display name.');
      const owner = validMember(input.manager);
      const from = await resolveVersion('main',input.from);
      const template = input.templateGroup && groupInfo(current.access,input.templateGroup);
      const directories = id === sourceRef ? sourceDirs : {dji:region(id,'dji'),dm:region(id,'dm')};
      for (const family of families) {
        const ref = boardRef(id,family);
        if (await head(ref)) fail(409,'A branch already exists under this group name.');
        let after = from;
        if (template && !await entry(from,directories[family])) {
          const original = await entry(from,template.directories?.[family] || region(input.templateGroup,family));
          if (original?.type !== 'tree') fail(422,'Integrate the template firmware into main first.');
          const tree = await copyDirectory(from,original.oid,directories[family]);
          after = await createCommit(user,[from],tree,'Initialize ' + ref);
        }
        updates.push({ref,before:null,after});
      }
      current.access.groups[id] = {name:input.name.trim(),directories,grants:{[owner]:'manager'}};
    } else {
      groupInfo(current.access,id);
      for (const family of families) {
        const ref = boardRef(id,family);
        const before = expectedOid(input.expectedHeads?.[family]);
        if (before !== await head(ref)) fail(409,'A branch tip has changed.');
        updates.push({ref,before,after:null});
      }
      delete current.access.groups[id];
    }
  } else {
    const scope = input.scope === 'main' ? main : {grants:groupInfo(current.access,input.scope).grants};
    permit(user,scope,true);
    if (!['manager','writer',null].includes(input.role)) fail(400,'Invalid firmware role.');
    const username = input.role ? validMember(input.username) : input.username;
    if (typeof username !== 'string') fail(400,'Select a member.');
    if (input.role) scope.grants[username] = input.role;
    else delete scope.grants[username];
    if (!scope.main && !Object.values(scope.grants).includes('manager')) fail(409,'A group must keep a manager.');
  }
  const change = await controlUpdate(user,current);
  await publish([...updates,change]);
  return {accessVersion:change.after};
}
const diagramPath = path => {
  if (typeof path !== 'string' || !path.toLowerCase().endsWith('.drawio')) fail(400,'Select a .drawio file.');
  return path;
};
function fileChanges(scope, input, diagram) {
  if (diagram) {
    diagramPath(input.path);
    if (typeof input.xml !== 'string' || !/^\s*(?:<\?xml[^?]*\?>\s*)?<(?:mxfile|mxGraphModel)(?=[\s/>])/.test(input.xml)) fail(400,'Provide a draw.io XML document.');
  }
  const files = diagram ? [{path:input.path,text:input.xml}] : input.files;
  if (!Array.isArray(files) || !files.length || files.length>256) fail(400,'Submit between 1 and 256 changes.');
  const seen = new Set();
  return files.map(file => {
    const path = pathIn(scope,file?.path);
    if (seen.has(path)) fail(400,'Repeated file path.');
    seen.add(path);
    if (file.remove === true) return {path,remove:true};
    if (typeof file.text === 'string') {
      if (Buffer.byteLength(file.text)>3*1024*1024) fail(413,'This file is too large for online editing.');
      return {path,content:file.text};
    }
    if (typeof file.base64 === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.base64)) {
      const content = Buffer.from(file.base64,'base64');
      if (content.length>3*1024*1024) fail(413,'This file is too large for online editing.');
      return {path,content};
    }
    fail(400,'A file change needs text, base64 or remove.');
  });
}
async function readFile(oid, path, diagram) {
  const item = await entry(oid,path);
  if (!item || item.type !== 'blob') fail(404,'File not found in this version.');
  const length = Number(await run(['cat-file','-s',item.oid]));
  if (length>3*1024*1024) fail(413,'This file is too large for online editing.');
  const bytes = await run(['cat-file','blob',item.oid],{buffer:true});
  if (diagram) return {oid,path,blob:item.oid,xml:bytes.toString('utf8')};
  const text = bytes.toString('utf8');
  return {oid,path,blob:item.oid,...(!bytes.includes(0) && Buffer.from(text).equals(bytes)
    ? {text} : {base64:bytes.toString('base64')})};
}
async function recordSource(user, input) {
  return withRepository(async () => {
    const {access} = await catalog();
    const scope = scopeFor(access,input.ref);
    if (!(scope.legacy && user.role === 'admin')) permit(user,scope);
    const oid = await resolveVersion(scope.ref,expectedOid(input.oid));
    const group = scope.main ? input.group : scope.group;
    const family = scope.main ? input.family : scope.family;
    const selectedGroup = scope.legacy ? sourceRef : group;
    const board = scope.legacy ? input.family : family;
    if (!groupPattern.test(selectedGroup || '') || !families.includes(board)) fail(400,'Select a group and board family.');
    const directory = scope.path || (selectedGroup === sourceRef ? sourceDirs[board] : region(selectedGroup,board));
    const subtree = await entry(oid,directory);
    if (!subtree || subtree.type !== 'tree') fail(404,'This revision has no source for the selected board.');
    return {repository:repositoryName,ref:scope.ref,oid,group:selectedGroup,family:board,directory,tree:subtree.oid};
  });
}
async function compareDevice(identity, input) {
  if (!identity) return {state:'unknown',reason:'no-board-version'};
  if (identity.repository !== repositoryName) return {state:'unknown',reason:'different-repository',identity};
  return withRepository(async () => {
    const {access} = await catalog(), selected = scopeFor(access,input.ref);
    const target = await resolveVersion(selected.ref,input.oid);
    if (!await knownCommit(identity.oid)) return {state:'unknown',reason:'board-commit-unavailable',identity};
    return {state:'identified',identity,selected:{ref:selected.ref,oid:target},
      ...await comparison(identity.oid,target,input.path)};
  });
}

export async function firmwareApi(req,res,path,params,changed) {
  const action = path.slice('/api/firmware'.length).replace(/^\//,'');
  if (action.startsWith('station/') || action === 'stations' || action.startsWith('stations/')) {
    return stationApi(req,res,action,params,{recordSource,compareDevice});
  }
  const mutation = req.method !== 'GET';
  const user = requireAuth(req,res,mutation);
  const input = mutation ? await body(req,4*1024*1024) : Object.fromEntries(params);
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400,'Expected a JSON object.');
  const value = await withRepository(async () => {
    const current = await catalog();
    if (!action && !mutation) return overview(user,current);
    if (action === 'initialize' && req.method === 'POST') return initialize(user,current,input);
    if ((action === 'teams' && ['POST','DELETE'].includes(req.method)) || (action === 'access' && req.method === 'PUT')) {
      return adminChange(user,current,action,input,req.method);
    }
    if (action === 'access' && !mutation) {
      const scope = input.scope === 'main' ? scopeFor(current.access,'main') : {grants:groupInfo(current.access,input.scope).grants};
      permit(user,scope,true);
      return {accessVersion:current.oid,grants:scope.grants};
    }
    if (action === 'compare' && !mutation) {
      const left = scopeFor(current.access,input.baseRef), right = scopeFor(current.access,input.headRef);
      return comparison(await resolveVersion(left.ref,input.baseOid),await resolveVersion(right.ref,input.headOid),input.path);
    }
    const scope = scopeFor(current.access,input.ref || 'main');
    if (action === 'merge' && req.method === 'POST') {
      permit(user,scopeFor(current.access,'main'),true);
      if (!scope.family) fail(400,'Select a managed vehicle branch to integrate.');
      return mergeIntoMain(user,scope.ref,scope.path,input.sourceOid,input.mainOid);
    }
    const oid = await resolveVersion(scope.ref,input.oid);
    if (action === 'history' && !mutation) {
      const skip = Number(input.offset || 0);
      if (!Number.isSafeInteger(skip) || skip<0) fail(400,'Invalid history offset.');
      const data = await run(['log','-z','--format=%H%x00%an%x00%aI%x00%s','--max-count=51','--skip='+skip,oid,'--',...(input.path?[pathIn(scope,input.path)]:[])]);
      const parts = data.split('\0'), commits = [];
      for (let i=0;i+3<parts.length;i+=4) commits.push({oid:parts[i],author:parts[i+1],date:parts[i+2],message:parts[i+3]});
      return {oid,commits:commits.slice(0,50),nextOffset:commits.length>50?skip+50:null};
    }
    if (action === 'files' && !mutation) {
      const prefix = scope.path || '';
      const data = await run(['ls-tree','-r','-z','--name-only',oid,'--',...(prefix?[prefix + '/']:[])]);
      return {oid,files:data.split('\0').filter(Boolean).map(p=>prefix?p.slice(prefix.length+1):p)};
    }
    if (['file','drawio'].includes(action) && !mutation) {
      if (action === 'drawio') diagramPath(input.path);
      return readFile(oid,pathIn(scope,input.path),action === 'drawio');
    }
    if ((action === 'commits' && req.method === 'POST') || (action === 'drawio' && req.method === 'PUT')) {
      if (scope.legacy) fail(403,'Edit the corresponding managed vehicle branch.');
      permit(user,scope);
      if (oid !== expectedOid(input.expectedHead) || oid !== await head(scope.ref)) fail(409,'The branch changed since it was opened.');
      if (typeof input.message !== 'string' || !input.message.trim() || input.message.length>300) fail(400,'Enter a commit message.');
      const tree = await writeTree(oid,fileChanges(scope,input,action === 'drawio'));
      if (tree === (await run(['rev-parse',oid + '^{tree}'])).trim()) return {oid,unchanged:true};
      const next = await createCommit(user,[oid],tree,input.message.trim());
      await publish([{ref:scope.ref,before:oid,after:next}]);
      return {oid:next};
    }
    fail(404,'Firmware API route not found.');
  });
  if (mutation && value.merged !== false) changed('firmware');
  return json(res,value,value.merged === false ? 409 : 200);
}
