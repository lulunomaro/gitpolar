import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { db } from './store.mjs';
import { git, fileIndex, lfsPointer, resolveRef } from './git.mjs';
import { objectPath } from './lfs.mjs';

export const cadTypes = new Map([
  ['.sldasm','assembly'], ['.sldprt','part'], ['.slddrw','drawing'],
  ['.sldlfp','library'], ['.slddrt','template'], ['.prtdot','template'],
  ['.asmdot','template'], ['.drwdot','template'],
  ['.step','exchange'], ['.stp','exchange'], ['.x_t','exchange'],
  ['.x_b','exchange'], ['.stl','exchange'], ['.3mf','exchange'],
]);

// Read only small blobs in batches. Large CAD objects are never loaded into RAM.
async function pointers(repo, files) {
  const ids = [...new Set(files.filter(f=>f.size<=1024 && f.mode!=='120000').map(f=>f.oid))];
  const result = new Map();
  for (let start=0; start<ids.length; start+=128) {
    const selected = ids.slice(start,start+128);
    const bytes = await git(repo.name,['cat-file','--batch'],{input:selected.join('\n')+'\n',buffer:true,max:256*1024});
    let offset = 0;
    for (const id of selected) {
      const end = bytes.indexOf(10,offset);
      const [oid,type,length] = bytes.subarray(offset,end).toString().split(' ');
      const size = Number(length);
      if (end<0 || oid!==id || type!=='blob' || !Number.isSafeInteger(size) || size<0 || end+size+2>bytes.length) throw new Error('Cannot inspect Git snapshot.');
      const pointer = lfsPointer(bytes.subarray(end+1,end+1+size));
      if (pointer) result.set(id,pointer);
      offset = end+size+2;
    }
  }
  return result;
}

export async function snapshot(repo, ref) {
  const oid = await resolveRef(repo,ref);
  const files = await fileIndex(repo,oid);
  const pointerMap = await pointers(repo,files);
  const record = db.prepare('SELECT size,complete FROM lfs_objects WHERE repo_id=? AND oid=?');
  for (let start=0; start<files.length; start+=32) {
    await Promise.all(files.slice(start,start+32).map(async file=>{
      const pointer = pointerMap.get(file.oid);
      file.kind = cadTypes.get(extname(file.path).toLowerCase()) || null;
      file.lfs = Boolean(pointer);
      file.available = true;
      if (pointer) {
        file.gitSize = file.size;
        file.size = pointer.size;
        file.lfsOid = pointer.oid;
        const saved = record.get(repo.id,pointer.oid);
        const info = saved?.complete ? await stat(objectPath(repo,pointer.oid)).catch(()=>null) : null;
        file.available = Boolean(saved?.complete && saved.size===pointer.size && info?.isFile() && info.size===pointer.size);
      }
    }));
  }
  return {ref,oid,files};
}

export async function cadProject(repo,ref) {
  const data = await snapshot(repo,ref);
  const files = data.files.filter(f=>f.kind);
  const counts = Object.fromEntries(['assembly','part','drawing','library','template','exchange'].map(kind=>[kind,files.filter(f=>f.kind===kind).length]));
  const locks = db.prepare('SELECT l.id,l.path,l.locked_at,u.username AS owner FROM locks l JOIN users u ON u.id=l.owner_id WHERE l.repo_id=? ORDER BY l.locked_at').all(repo.id);
  return {ref,oid:data.oid,files,counts,locks,totalFiles:data.files.length,totalBytes:data.files.reduce((sum,f)=>sum+f.size,0),missingLfs:data.files.filter(f=>!f.available).map(f=>f.path),nativeInGit:files.filter(f=>f.kind!=='exchange' && !f.lfs).map(f=>f.path),referencesVerified:false};
}
