import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { once } from 'node:events';
import { ZipFile } from 'yazl';
import { snapshot } from './snapshot.mjs';
import { repoPath, filePath, commitInfo } from './git.mjs';
import { objectPath } from './lfs.mjs';
import { fail } from './auth.mjs';

function blobStream(repo,oid) {
  return Readable.from((async function* () {
    const child = spawn('git',['--git-dir='+repoPath(repo.name),'cat-file','blob',oid],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    const closed = once(child,'close');
    let errors = '';
    child.stderr.on('data',chunk=>errors=(errors+chunk).slice(-2048));
    try {
      for await (const chunk of child.stdout) yield chunk;
      const [code] = await closed;
      if (code!==0) throw new Error(errors || 'Git object read failed.');
    } finally { if (child.exitCode===null) child.kill(); }
  })(),{objectMode:false});
}

export async function downloadArchive(repo,ref,res) {
  // Freeze one commit and check every LFS object before sending archive headers.
  const data = await snapshot(repo,ref);
  const missing = data.files.filter(file=>!file.available);
  if (missing.length) fail(409,'Cannot export a complete project: missing LFS content for '+missing.slice(0,5).map(f=>f.path).join(', ')+(missing.length>5?' …':''));
  for (const file of data.files) filePath(file.path);
  const commit = await commitInfo(repo,data.oid);
  if(res.destroyed)return;
  const zip = new ZipFile(), active = new Set();
  // A client may disconnect before the response pipeline has been attached.
  zip.outputStream.on('error',()=>{});
  const abort = () => { for (const stream of active) stream.destroy(); zip.outputStream.destroy(); };
  res.once('close',abort);
  zip.on('error',error=>zip.outputStream.destroy(error));
  try {
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition','attachment; filename="'+repo.name+'-'+data.oid.slice(0,7)+'.zip"');
    res.setHeader('X-Gitpolar-Commit',data.oid);
    res.setHeader('X-Gitpolar-LFS','hydrated');
    for (const file of data.files) {
      zip.addReadStreamLazy(repo.name+'/'+file.path,{size:file.size,mode:parseInt(file.mode,8),mtime:new Date(commit.date),compress:false},callback=>{
        if (res.destroyed) return callback(new Error('Download cancelled.'));
        const stream = file.lfs ? createReadStream(objectPath(repo,file.lfsOid)) : blobStream(repo,file.oid);
        active.add(stream);
        stream.once('close',()=>active.delete(stream));
        stream.once('error',error=>zip.outputStream.destroy(error));
        callback(null,stream);
      });
    }
    // All sizes are known and entries are stored, so length is available before piping.
    zip.end(size=>{if(size>=0)res.setHeader('Content-Length',size);});
    await pipeline(zip.outputStream,res);
  } finally { res.off('close',abort); abort(); }
}
