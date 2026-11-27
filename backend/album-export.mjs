import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { ZipFile } from 'yazl';
import { loadAlbum } from './album.mjs';
import { unmarked } from './album-curation.mjs';
import { commitInfo, fileContent } from './git.mjs';
import { objectPath } from './lfs.mjs';
import { fail } from './auth.mjs';

// Serpent's external-library reader accepts Eagle metadata.json + images/<id>.info/.
function portable(value) {
  let name = [...value.replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/gu,'_')].slice(0,60).join('').trim().replace(/[. ]+$/u,'') || 'photo';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = '_' + name;
  return name;
}

export async function exportSerpentActivity(repo, ref, albumId, res) {
  if (!/^[a-f0-9]{24}$/.test(albumId || '')) fail(400,'请选择要导出的活动。');
  const {oid,manifest,selections} = await loadAlbum(repo,ref);
  const album = manifest.albums.find(item => item.id === albumId);
  if (!album) fail(404,'此版本中没有这个活动。');
  const photos = manifest.photos.filter(photo => photo.albumId === album.id);
  // Verify the snapshot's Git pointers and the actual LFS sizes before returning a ZIP.
  for (let i = 0; i < photos.length; i += 12) {
    if (res.destroyed) return;
    await Promise.all(photos.slice(i,i + 12).map(async photo => {
      const file = await fileContent(repo,oid,photo.path);
      if (!file.lfsAvailable || file.lfsOid !== photo.lfsOid || file.size !== photo.size) fail(409,'活动中有原图缺失或索引已过期，请先同步相册。');
    }));
  }
  const library = `${portable(album.title || '活动相册')}.library`;
  const date = new Date((await commitInfo(repo,oid)).date);
  const options = {mtime:date,compress:false};
  if (res.destroyed) return;
  const zip = new ZipFile();
  let active;
  const abort = () => { active?.destroy(); zip.outputStream.destroy(); };
  res.once('close',abort);
  zip.on('error',error => zip.outputStream.destroy(error));
  const addJson = (fileName,value) => zip.addBuffer(Buffer.from(JSON.stringify(value)),`${library}/${fileName}`,options);
  try {
    addJson('metadata.json',{folders:[{id:album.id,name:album.title,description:[album.date,album.dateEnd,album.path].filter(Boolean).join(' · '),children:[]}]});
    for (const photo of photos) {
      const originalName = photo.path.split('/').at(-1);
      const extension = extname(originalName);
      let name = portable(originalName.slice(0,-extension.length));
      // Names reserved for Eagle metadata/thumbnail files need a distinct media basename.
      if (/^metadata(?:[.-]|$)|(?:^|[_-])thumbnail$/iu.test(name)) name = `photo-${photo.id}`;
      const dir = `images/${photo.id}.info`;
      const {tags,rating} = selections.get(album.id)?.get(photo.id) || unmarked;
      const metadata = {id:photo.id,name,ext:extension.slice(1),folders:[album.id],tags,star:rating,width:photo.width,height:photo.height,size:photo.size,annotation:[photo.date,photo.path].filter(Boolean).join('\n')};
      if (/^\d{4}-\d{2}-\d{2}$/.test(photo.date)) metadata.lastModified = Date.parse(photo.date+'T12:00:00Z');
      addJson(`${dir}/metadata.json`,metadata);
      zip.addReadStreamLazy(`${library}/${dir}/${name}${extension}`,{...options,size:photo.size},callback => {
        if (res.destroyed) return callback(new Error('Download cancelled.'));
        active = createReadStream(objectPath(repo,photo.lfsOid));
        active.once('error',error => zip.outputStream.destroy(error));
        callback(null,active);
      });
    }
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition',`attachment; filename="serpent-${album.id}.library.zip"; filename*=UTF-8''${encodeURIComponent(library+'.zip')}`);
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Gitpolar-Commit',oid);
    zip.end(size => { if (size >= 0) res.setHeader('Content-Length',size); });
    await pipeline(zip.outputStream,res);
  } finally { res.off('close',abort); abort(); }
}
