import { createHash } from 'node:crypto';
import { git, filePath } from './git.mjs';

export const nativeFile = file => Boolean(file.kind && file.kind !== 'exchange');
export function projectFingerprint(files) {
  const hash = createHash('sha256').update('gitpolar-cad-v1\n');
  for (const file of files.filter(nativeFile).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)) hash.update(file.path+'\0'+file.oid+'\n');
  return hash.digest('hex');
}
export async function readManifest(repo, data) {
  const file = data.files.find(f=>f.path==='.gitpolar/previews.json');
  if (!file) return {version:2,previews:[],missing:true};
  if (file.lfs || file.size>4*1024*1024) return {error:'Preview manifest must be a JSON text file up to 4 MiB.'};
  try {
    const value=JSON.parse(await git(repo.name,['cat-file','blob',file.oid],{max:4*1024*1024}));
    if (![1,2].includes(value?.version) || !Array.isArray(value.previews)) throw Error();
    const sources=new Set();
    for(const entry of value.previews){if(!entry||typeof entry.source!=='string'||sources.has(entry.source))throw Error();filePath(entry.source);sources.add(entry.source);}
    return value;
  } catch { return {error:'Cannot read the preview manifest or its version is unsupported.'}; }
}
export function dependencyScope(data,manifest,path) {
  const source=data.files.find(f=>f.path===path),entry=manifest.previews?.find(e=>e.source===path);
  if (manifest.version===2 && entry && !(entry.projectFingerprint&&!entry.dependencies)) {
    const deps=entry.dependencies;
    const invalid = error => ({entry, paths: data.files.filter(nativeFile).map(f => f.path), verified: false, error});
    if (!Array.isArray(deps) || !deps.length || deps.some(d => !d || typeof d.path !== 'string') ||
        !deps.some(d => d.path === path) || new Set(deps.map(d => d.path)).size !== deps.length)
      return invalid('Manifest dependencies must include the source and contain no duplicates.');
    const files = new Map(data.files.map(f => [f.path, f]));
    for (const dep of deps) {
      try { filePath(dep.path); } catch { return invalid('Invalid dependency path.'); }
      const actual = files.get(dep.path);
      if (!/^[a-f0-9]{40}$/.test(dep.oid || '') || (actual && !actual.kind))
        return invalid('A registered CAD dependency is invalid.');
    }
    // Keep deleted dependencies in the scope so later edits to the remaining parts still appear in history.
    return {entry, paths: deps.map(d => d.path), verified: true, stale: deps.some(d => files.get(d.path)?.oid !== d.oid)};
  }
  // Without an explicit dependency list, use the project as a conservative scope.
  return {entry,paths:source?.kind==='part'&&!entry?[path]:data.files.filter(nativeFile).map(f=>f.path),verified:false};
}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function dependencyState(data,manifest,path) {
  const files=new Map(data.files.map(file=>[file.path,file.oid])), source=files.get(path);
  if(!source)return {source:null,dependencies:null,preview:null,verified:false};
  const scope=dependencyScope(data,manifest,path),entry=scope.entry;
  const dependencies=digest(scope.paths.sort().map(name=>[name,files.get(name)]));
  let preview=null;
  if(entry){
    // 每个实例按 ID 比较，其网格既有登记版本，也有本次提交中实际保存的版本。
    const components=Array.isArray(entry.components)?entry.components.map(c=>[
      c?.id,c?.name,c?.source,c?.configuration,c?.path,c?.previewOid,files.get(c?.path),c?.transform
    ]).sort(([a],[b])=>a<b?-1:a>b?1:0):null;
    preview=digest([entry.configuration,entry.path,entry.previewOid,files.get(entry.path),components,
      entry.projectFingerprint,Boolean(scope.stale),scope.error]);
  }
  return {source,dependencies,preview,verified:scope.verified};
}
