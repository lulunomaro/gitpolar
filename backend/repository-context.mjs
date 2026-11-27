import { db,repository } from './store.mjs';
import { namespace } from './config.mjs';
import { requestOrigin, isApplicationOrigin } from './request-origin.mjs';
import { fail } from './auth.mjs';
import { git,namePattern,filePath,fileMeta,resolveRef } from './git.mjs';

export function repositoryIdentity(repo) {
  return {id:repo.id,name:repo.name,namespace,cloneUrl:new URL('/'+namespace+'/'+repo.name+'.git',requestOrigin()).href,apiUrl:'/api/repos/'+repo.name};
}

function documentOptions(values) {
  if(!values || typeof values!=='object' || Array.isArray(values))fail(400,'A repository context object is required.');
  if(values.ref!==undefined && (typeof values.ref!=='string'||!values.ref||values.ref.startsWith('-')||values.ref.includes('\0')||values.ref.length>255))fail(400,'Invalid ref.');
  if(values.path!==undefined){filePath(values.path,true);if(/^[a-z]:/i.test(values.path))fail(400,'Use a repository-relative document path, not a workstation path.');}
}

export async function repositoryContext(repo,user,values={}) {
  documentOptions(values);
  const ref=values.ref??((await git(repo.name,['symbolic-ref','--short','HEAD'],{allowFailure:true})).trim()||'main');
  let oid=null;
  try{oid=await resolveRef(repo,ref);}catch(error){if(error.status!==404)throw error;}
  let document=null;
  if(values.path){
    document={path:values.path,state:oid?'not-in-revision':'revision-unavailable',blobOid:null};
    if(oid){
      try{const entry=await fileMeta(repo,oid,values.path);document={path:values.path,state:'tracked',blobOid:entry.oid,mode:entry.mode,size:entry.size};}
      catch(error){if(error.status!==404)throw error;}
    }
  }
  return {schemaVersion:1,resolved:true,repository:repositoryIdentity(repo),permissions:{read:true,write:user.role!=='reader'},revision:{ref,oid,available:Boolean(oid),...(oid?{}:{reason:'ref-not-on-server'})},document};
}

function remoteRepository(remote) {
  if(!remote || typeof remote!=='object' || Array.isArray(remote)||typeof remote.name!=='string'||!remote.name||remote.name.length>100||typeof remote.url!=='string'||!remote.url||remote.url.length>4096)fail(400,'Each remote requires a name and URL.');
  let url;try{url=new URL(remote.url);}catch{return null;}
  if(url.username||url.password||url.search||url.hash)fail(400,'Remote URLs must not contain credentials, query parameters or fragments.');
  if(!['http:','https:'].includes(url.protocol)||!isApplicationOrigin(url.origin))return null;
  let path;try{path=decodeURIComponent(url.pathname);}catch{fail(400,'Invalid remote URL path.');}
  const segments=path.replace(/\/$/,'').split('/');
  if(segments.length!==3||segments[1]!==namespace)return null;
  const name=segments[2].replace(/\.git$/,'');
  return namePattern.test(name)?{remote:remote.name,name}:null;
}

function unresolved(status,reason,error,candidates=[]) {
  return {status,body:{schemaVersion:1,resolved:false,reason,...(error?{error}:{}),...(candidates.length?{candidates:candidates.map(repositoryIdentity)}:{})}};
}

export async function resolveRepositoryContext(user,values) {
  documentOptions(values);
  if(values.repositoryId!==undefined&&(typeof values.repositoryId!=='string'||!values.repositoryId||values.repositoryId.length>100))fail(400,'Invalid repository ID.');
  if(values.remotes!==undefined&&(!Array.isArray(values.remotes)||values.remotes.length>32))fail(400,'Remotes must be an array of at most 32 entries.');
  if(values.preferredRemote!==undefined&&(typeof values.preferredRemote!=='string'||!values.preferredRemote))fail(400,'Invalid preferred remote.');
  const remotes=values.remotes??[],parsed=remotes.map(remoteRepository);
  if(values.preferredRemote!==undefined&&!remotes.some(remote=>remote.name===values.preferredRemote))fail(400,'The preferred remote was not supplied.');
  const matches=parsed.filter((entry,index)=>entry&&(values.preferredRemote===undefined||remotes[index].name===values.preferredRemote));
  const candidates=[...new Map(matches.map(entry=>repository(entry.name)).filter(Boolean).map(repo=>[repo.id,repo])).values()];
  let selected;
  if(values.repositoryId!==undefined){
    selected=db.prepare("SELECT * FROM repos WHERE id=? AND status='ready'").get(values.repositoryId);
    if(!selected)return unresolved(404,'repository-id-not-found','The bound repository ID no longer exists. Resolve or explicitly rebind this working copy.');
    if(matches.length&&!matches.some(entry=>entry.name===selected.name))return unresolved(409,'identity-conflict','The bound repository ID and selected remote refer to different repositories.',candidates);
  }else{
    if(new Set(matches.map(entry=>entry.name)).size>1){
      const result=unresolved(409,'ambiguous-remotes','More than one gitpolar repository path matches. Choose a remote or bind a repository ID.',candidates);
      result.body.remoteChoices=matches.map(entry=>({name:entry.remote,repositoryName:entry.name,repositoryId:candidates.find(repo=>repo.name===entry.name)?.id??null}));
      return result;
    }
    if(matches.length&&!candidates.length)return unresolved(404,'repository-not-found','No ready repository exists for the supplied gitpolar remote.');
    if(!candidates.length)return unresolved(200,remotes.length?'foreign-remote':'no-repository-identity');
    selected=candidates[0];
  }
  const context=await repositoryContext(selected,user,values);
  return {status:200,body:{...context,matchedBy:values.repositoryId===undefined?'remote':'repository-id',matchedRemotes:[...new Set(matches.filter(entry=>entry.name===selected.name).map(entry=>entry.remote))]}};
}
