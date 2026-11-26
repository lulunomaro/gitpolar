import { extname } from 'node:path';
import { filePath } from './git.mjs';
import { snapshot } from './snapshot.mjs';
import { maxPreviewBytes } from './config.mjs';
import { readManifest, dependencyScope, projectFingerprint } from './cad-manifest.mjs';
export { projectFingerprint } from './cad-manifest.mjs';
const formats=new Map([['.step','step'],['.stp','step'],['.stl','stl']]);
const rawUrl=(repo,oid,path)=>'/api/repos/'+repo.name+'/raw?'+new URLSearchParams({ref:oid,path});
export async function previewInfo(repo,ref,path,loaded) {
  filePath(path);
  const data=loaded?.data||await snapshot(repo,ref),source=data.files.find(f=>f.path===path);
  if(!source)return {available:false,reason:'missing',message:'This file does not exist in this version.',oid:data.oid,sourcePath:path};
  const base={oid:data.oid,sourcePath:path,maxBytes:maxPreviewBytes};
  let model=source,configuration='',derived=false;
  if(!formats.has(extname(path).toLowerCase())) {
    if(!['.sldasm','.sldprt'].includes(extname(path).toLowerCase()))return {...base,available:false,reason:'unsupported',message:'This file type has no 3D preview.'};
    const manifest=loaded?.manifest||await readManifest(repo,data);
    if(manifest.error)return {...base,available:false,reason:'manifest',message:manifest.error};
    const scope=dependencyScope(data,manifest,path),entry=scope.entry;
    if(!entry)return {...base,available:false,reason:'not-generated',message:'Generate and commit a SolidWorks preview for this version.'};
    if(scope.error)return {...base,available:false,reason:'manifest',message:scope.error};
    const stale=(manifest.version===1||!entry.dependencies)?entry.projectFingerprint!==projectFingerprint(data.files):scope.stale;
    if(stale)return {...base,available:false,reason:'stale',message:'This model or one of its dependencies changed. Regenerate its preview.'};
    configuration=typeof entry.configuration==='string'?entry.configuration.slice(0,200):'';derived=true;
    if(entry.components!==undefined) {
      if(!Array.isArray(entry.components)||!entry.components.length||entry.components.length>20000)return {...base,available:false,reason:'manifest',message:'Assembly preview has no valid component instances.'};
      const assets=new Map(),ids=new Set(),deps=new Set(scope.paths),files=new Map(data.files.map(f=>[f.path,f]));
      for(const part of entry.components){
        try{filePath(part.path);filePath(part.source);}catch{return {...base,available:false,reason:'manifest',message:'Invalid component asset path.'};}
        if(typeof part.id!=='string'||!part.id||ids.has(part.id)||!deps.has(part.source)||!Array.isArray(part.transform)||part.transform.length!==16||!part.transform.every(Number.isFinite)||part.transform[3]!==0||part.transform[7]!==0||part.transform[11]!==0||part.transform[15]!==1)return {...base,available:false,reason:'manifest',message:'Invalid component identity, dependency or transform.'};
        ids.add(part.id);const file=files.get(part.path),format=file&&formats.get(extname(file.path).toLowerCase());
        if(!file||!format||file.oid!==part.previewOid)return {...base,available:false,reason:'stale',message:'A component preview is missing or changed after export.'};
        if(!file.available)return {...base,available:false,reason:'missing-lfs',message:'A component preview LFS object is missing.'};
        assets.set(file.path,{path:file.path,contentId:file.lfsOid||file.oid,format,size:file.size,url:rawUrl(repo,data.oid,file.path)});
      }
      const size=[...assets.values()].reduce((n,a)=>n+a.size,0);
      if(size>maxPreviewBytes)return {...base,available:false,reason:'too-large',message:'Assembly preview exceeds the configured browser size limit.',size};
      return {...base,available:true,format:'scene',derived,configuration,size,dependencyScope:'explicit',assets:[...assets.values()],components:entry.components.map(c=>({id:c.id,name:typeof c.name==='string'?c.name.slice(0,500):c.id,source:c.source,configuration:typeof c.configuration==='string'?c.configuration.slice(0,200):'',asset:c.path,transform:c.transform}))};
    }
    model=data.files.find(f=>f.path===entry.path);
    if(!model||!formats.has(extname(model.path).toLowerCase()))return {...base,available:false,reason:'missing-preview',message:'Registered STEP/STL preview file is missing.'};
    if(entry.previewOid!==model.oid)return {...base,available:false,reason:'stale',message:'Preview file changed after registration.'};
  }
  if(!model.available)return {...base,available:false,reason:'missing-lfs',message:'Preview LFS content is missing.'};
  if(model.size>maxPreviewBytes)return {...base,available:false,reason:'too-large',message:'Preview exceeds the browser size limit.',size:model.size};
  return {...base,available:true,format:formats.get(extname(model.path).toLowerCase()),path:model.path,contentId:model.lfsOid||model.oid,size:model.size,derived,configuration,url:rawUrl(repo,data.oid,model.path)};
}
