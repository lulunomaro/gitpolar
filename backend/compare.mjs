import { git, filePath, resolveRef, commitInfo } from './git.mjs';
import { snapshot } from './snapshot.mjs';
import { readManifest,dependencyScope,dependencyIdentity,nativeFile } from './cad-manifest.mjs';
import { previewInfo } from './preview.mjs';
import { fail } from './auth.mjs';
const supported=path=>/\.(sldasm|sldprt|step|stp|stl)$/i.test(path);
const identity=file=>file.lfs?'lfs:'+file.lfsOid:'git:'+file.oid;
async function version(repo,ref){const data=await snapshot(repo,ref);return {data,manifest:await readManifest(repo,data)};}
function componentChanges(left,right,oldData,newData){
  if(left.format!=='scene'||right.format!=='scene')return [];
  const stable=component=>component.id.replace(/:\d+$/,''),groups=components=>{const result=new Map();for(const component of components||[]){const key=stable(component);if(!result.has(key))result.set(key,[]);result.get(key).push(component);}return result;};
  const oldGroups=groups(left.components),newGroups=groups(right.components);
  const key=component=>oldGroups.get(stable(component))?.length===1&&newGroups.get(stable(component))?.length===1?'body:'+stable(component):'id:'+component.id;
  const a=new Map((left.components||[]).map(c=>[key(c),c])),b=new Map((right.components||[]).map(c=>[key(c),c]));
  const oldFiles=new Map(oldData.files.map(f=>[f.path,f.oid])),newFiles=new Map(newData.files.map(f=>[f.path,f.oid]));
  const oldAssets=new Map(left.assets.map(a=>[a.path,a.contentId])),newAssets=new Map(right.assets.map(a=>[a.path,a.contentId]));
  return [...new Set([...a.keys(),...b.keys()])].map(match=>{
    const old=a.get(match),next=b.get(match);
    const sourceChanged=Boolean(old&&next&&(old.source!==next.source||old.configuration!==next.configuration||oldFiles.get(old.source)!==newFiles.get(next.source)));
    const geometryChanged=Boolean(old&&next&&oldAssets.get(old.asset)!==newAssets.get(next.asset));
    // Scene translations are millimeters. Ignore display-level floating point noise after a rebuild.
    const moved=Boolean(old&&next&&old.transform.some((value,index)=>Math.abs(value-next.transform[index])>(index>=12&&index<=14?0.0001:1e-8)));
    const status=!old?'added':!next?'removed':sourceChanged?'modified':moved?'moved':geometryChanged?'mesh-changed':'unchanged';
    return {id:old?.id||next.id,beforeId:old?.id,afterId:next?.id,name:next?.name||old.name,source:next?.source||old.source,status,sourceChanged,geometryChanged,moved};
  });
}
export async function compareVersions(repo,baseRef,headRef,path='') {
  filePath(path,true);
  const headOid=await resolveRef(repo,headRef||'main');
  if(!baseRef)baseRef=(await git(repo.name,['show','-s','--format=%P',headOid])).trim().split(' ')[0]||headOid;
  const [old,next]=await Promise.all([version(repo,baseRef),version(repo,headOid)]),a=new Map(old.data.files.map(f=>[f.path,f])),b=new Map(next.data.files.map(f=>[f.path,f]));
  const changes=[];
  for(const name of [...new Set([...a.keys(),...b.keys()])].sort()){
    const before=a.get(name),after=b.get(name);
    if(before&&after&&before.oid===after.oid)continue;
    changes.push({path:name,status:!before?'added':!after?'removed':'modified',kind:(after||before).kind,previewable:supported(name),before:before?{oid:before.oid,size:before.size,lfs:before.lfs,available:before.available}:null,after:after?{oid:after.oid,size:after.size,lfs:after.lfs,available:after.available}:null});
  }
  const oldObjects=new Set(old.data.files.map(identity)),seen=new Set();
  const storage={newContentBytes:0,reusedContentBytes:0,newNativeBytes:0,newPreviewBytes:0,newMetadataBytes:0,newObjects:0,changedFiles:changes.length,scope:'Unique contents in head that are absent from base; this is not measured NAS disk usage.'};
  for(const file of next.data.files){const key=identity(file);if(seen.has(key))continue;seen.add(key);if(oldObjects.has(key)){storage.reusedContentBytes+=file.size;continue;}storage.newObjects++;storage.newContentBytes+=file.size;if(nativeFile(file))storage.newNativeBytes+=file.size;else if(file.path.startsWith('.gitpolar/previews/'))storage.newPreviewBytes+=file.size;else storage.newMetadataBytes+=file.size;}
  if(path&&!a.has(path)&&!b.has(path))fail(404,'The selected file does not exist in either version.');
  const selected=path||changes.find(c=>/\.sldasm$/i.test(c.path))?.path||changes.find(c=>c.previewable)?.path||next.data.files.find(f=>supported(f.path))?.path||old.data.files.find(f=>supported(f.path))?.path||'';
  const scopes=selected?[dependencyScope(old.data,old.manifest,selected),dependencyScope(next.data,next.manifest,selected)]:[];
  const dependencyPaths=new Set(scopes.flatMap(s=>s.paths));
  const previews=selected?await Promise.all([previewInfo(repo,old.data.oid,selected,old),previewInfo(repo,next.data.oid,selected,next)]):[{available:false,reason:'unsupported',message:'Select a CAD file to preview.'},{available:false,reason:'unsupported',message:'Select a CAD file to preview.'}];
  return {base:await commitInfo(repo,old.data.oid),head:await commitInfo(repo,next.data.oid),same:old.data.oid===next.data.oid,path:selected,changes:changes.map(c=>({...c,dependency:dependencyPaths.has(c.path)})),storage,dependencyScope:scopes.length&&scopes.every(s=>s.verified)?'explicit':'project-fallback',previews:{base:previews[0],head:previews[1]},components:componentChanges(...previews,old.data,next.data)};
}
export async function dependencyHistory(repo,ref,path,cursor='0'){
  filePath(path);if(!/^\d{1,7}$/.test(cursor))fail(400,'Invalid history cursor.');
  const oid=await resolveRef(repo,ref),skip=Number(cursor),scan=60,limit=25;
  const output=await git(repo.name,['log','--first-parent','-z','--format=%H%x00%an%x00%aI%x00%s%x00%P','--max-count='+String(scan+1),'--skip='+skip,oid]);
  const fields=output.split('\0');if(fields.at(-1)==='')fields.pop();const rows=[];for(let i=0;i+4<fields.length;i+=5)rows.push({oid:fields[i],author:fields[i+1],date:fields[i+2],message:fields[i+3],parent:fields[i+4].split(' ')[0]});
  const cache=new Map(),load=id=>{if(!cache.has(id))cache.set(id,version(repo,id));return cache.get(id);};
  const commits=[];let consumed=0,scope='explicit';
  for(const row of rows.slice(0,scan)){
    const now=await load(row.oid),before=row.parent?await load(row.parent):null;consumed++;
    const hasSource=now.data.files.some(f=>f.path===path),hadSource=before?.data.files.some(f=>f.path===path);
    if(!hasSource&&!hadSource)continue;
    const dep=dependencyScope(now.data,now.manifest,path);if(!dep.verified)scope='project-fallback';
    if(!before||dependencyIdentity(now.data,now.manifest,path)!==dependencyIdentity(before.data,before.manifest,path)){const sourceSame=hasSource&&hadSource&&now.data.files.find(f=>f.path===path).oid===before.data.files.find(f=>f.path===path).oid;const dependenciesChanged=before&&dependencyIdentity(now.data,now.manifest,path,false)!==dependencyIdentity(before.data,before.manifest,path,false);commits.push({oid:row.oid,hash:row.oid.slice(0,7),author:row.author,date:row.date,message:row.message,exists:hasSource,dependencyOnly:Boolean(sourceSame&&dependenciesChanged),previewOnly:Boolean(sourceSame&&!dependenciesChanged)});}
    if(commits.length===limit)break;
  }
  return {ref,oid,path,scope,commits,nextCursor:rows.length>consumed?String(skip+consumed):null};
}
