import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { dataRoot } from './config.mjs';
import { db, getUser } from './store.mjs';
import { fail } from './auth.mjs';
import { filePath, fileMeta, fileContent, resolveRef, git } from './git.mjs';
import { objectPath } from './lfs.mjs';
import { readSelections, saveSelection, isEditableBranch, unmarked } from './album-curation.mjs';

export const albumManifestPath = '.gitpolar/album.json';
export const albumPreviewRoot = join(dataRoot, 'album-previews');
const imageTypes = new Map([['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.png','image/png'],['.gif','image/gif'],['.webp','image/webp']]);
const ids = /^[a-f0-9]{24}$/;
const hashes = /^[a-f0-9]{64}$/;
const manifests = new Map();

function validateManifest(value) {
  if (value?.version !== 1 || !Array.isArray(value.photos) || !Array.isArray(value.albums) || value.photos.length > 100000) fail(422,'相册索引格式不正确。');
  const photoIds = new Set(), albumIds = new Set();
  for (const album of value.albums) {
    if (!ids.test(album.id) || albumIds.has(album.id) || typeof album.title !== 'string' || typeof album.path !== 'string') fail(422,'相册分组索引不正确。');
    albumIds.add(album.id);
  }
  for (const photo of value.photos) {
    filePath(photo.path);
    if (!photo.path.startsWith('photos/') || !imageTypes.has(extname(photo.path).toLowerCase()) || !ids.test(photo.id) || photoIds.has(photo.id) || !albumIds.has(photo.albumId) || !hashes.test(photo.lfsOid) || !Number.isSafeInteger(photo.size) || photo.size < 0) fail(422,'照片索引不正确。');
    photoIds.add(photo.id);
  }
  return value;
}

export async function loadAlbum(repo, ref) {
  if (repo.kind !== 'album') fail(404,'这个仓库没有相册。');
  const oid = await resolveRef(repo, ref);
  const key = repo.id + ':' + oid;
  if (!manifests.has(key)) {
    const work = (async () => {
      const entry = await fileMeta(repo, oid, albumManifestPath);
      if (entry.size > 16 * 1024 ** 2) fail(413,'相册索引过大。');
      const bytes = await git(repo.name, ['cat-file','blob',entry.oid], {buffer:true,max:16 * 1024 ** 2});
      let value;
      try { value = JSON.parse(bytes.toString('utf8')); } catch { fail(422,'相册索引不是有效 JSON。'); }
      const manifest = validateManifest(value);
      return {oid,manifest,selections:await readSelections(repo,oid,manifest)};
    })();
    manifests.set(key, work);
    while (manifests.size > 4) manifests.delete(manifests.keys().next().value);
    work.catch(() => { if (manifests.get(key) === work) manifests.delete(key); });
  }
  return manifests.get(key);
}

const mediaUrl = (repo, oid, id, size) => `/api/repos/${encodeURIComponent(repo.name)}/album/media?` + new URLSearchParams({ref:oid,id,size});

export async function savePhotoSelection(repo,user,ref,input) {
  return saveSelection(repo,user,ref,input,await loadAlbum(repo,ref));
}

export async function albumView(repo, ref = 'main', writable = false) {
  const {oid,manifest,selections} = await loadAlbum(repo, ref);
  const photos = manifest.photos.map(p => ({
    id:p.id,path:p.path,name:p.name || p.path.split('/').at(-1),albumId:p.albumId,
    date:p.date || '',dateSource:p.dateSource || 'unknown',year:p.year || '',
    width:p.width,height:p.height,size:p.size,...(selections.get(p.albumId)?.get(p.id) || unmarked),
    thumbUrl:mediaUrl(repo,oid,p.id,'thumb'),previewUrl:mediaUrl(repo,oid,p.id,'preview'),originalUrl:mediaUrl(repo,oid,p.id,'original')
  }));
  const byAlbum = new Map(manifest.albums.map(a => [a.id,[]]));
  for (const photo of photos) byAlbum.get(photo.albumId).push(photo);
  const albums = manifest.albums.map(a => {
    const items = byAlbum.get(a.id),cover = items.find(p => p.id === a.coverId) || items[0];
    return {id:a.id,title:a.title,path:a.path,date:a.date || '',dateEnd:a.dateEnd || '',datePrecision:a.datePrecision || 'unknown',year:a.year || '',count:items.length,coverId:cover?.id || '',coverUrl:cover?.thumbUrl || ''};
  }).filter(a => a.count);
  const canEdit = writable && await isEditableBranch(repo,ref);
  return {canEdit,name:repo.name,title:manifest.title || repo.name,description:repo.description,ref,oid,owner:getUser(repo.creator_id),importedAt:manifest.importedAt,stats:{photos:photos.length,albums:albums.length,bytes:photos.reduce((sum,p) => sum+p.size,0)},albums,photos};
}

export async function albumList() {
  const repos = db.prepare("SELECT * FROM repos WHERE status='ready' AND kind='album' ORDER BY created_at DESC").all();
  const result = [];
  for (const repo of repos) {
    try {
      const branch = (await git(repo.name,['symbolic-ref','--short','HEAD'])).trim();
      const view = await albumView(repo, branch);
      const dated = [...view.albums].sort((a,b) => b.date.localeCompare(a.date));
      result.push({name:repo.name,title:view.title,description:repo.description,owner:view.owner,photoCount:view.stats.photos,albumCount:view.stats.albums,bytes:view.stats.bytes,years:[...new Set(view.albums.map(a => a.year).filter(Boolean))].sort().reverse(),coverUrl:dated[0]?.coverUrl || ''});
    } catch (error) {
      // A newly created empty album remains visible until its first import completes.
      if (![404,422].includes(error.status)) throw error;
      result.push({name:repo.name,title:repo.name,description:repo.description,owner:getUser(repo.creator_id),photoCount:0,albumCount:0,bytes:0,years:[],coverUrl:''});
    }
  }
  return {repos:result};
}

export async function albumMedia(req, res, repo, params) {
  const ref = params.get('ref') || 'main', id = params.get('id'), size = params.get('size') || 'thumb';
  if (!ids.test(id || '') || !['thumb','preview','original'].includes(size)) fail(400,'无效的照片或预览尺寸。');
  const {oid,manifest} = await loadAlbum(repo, ref);
  const photo = manifest.photos.find(p => p.id === id);
  if (!photo) fail(404,'照片不存在于这个版本。');
  const file = await fileContent(repo, oid, photo.path);
  if (!file.lfsAvailable) fail(404,'照片原图尚未上传到 Git LFS。');
  if (file.lfsOid !== photo.lfsOid || file.size !== photo.size) fail(409,'照片已修改，请更新相册索引后预览。');
  const original = size === 'original';
  const target = original ? objectPath(repo,photo.lfsOid) : join(albumPreviewRoot,repo.id,`${photo.lfsOid}.${size}.jpg`);
  const info = await stat(target).catch(error => { if (error.code === 'ENOENT') fail(404,'照片预览尚未生成。'); throw error; });
  if (!info.isFile()) fail(404,'照片文件不存在。');
  const etag = `"${photo.lfsOid}-${size}"`;
  const mime = [...imageTypes.values()].includes(photo.mime) ? photo.mime : imageTypes.get(extname(photo.path).toLowerCase());
  const headers = {'Content-Type':original ? mime : 'image/jpeg','Content-Length':info.size,'Cache-Control':ref === oid ? 'private, max-age=31536000, immutable' : 'private, no-cache',ETag:etag};
  if (original) headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(photo.name || photo.path.split('/').at(-1))}`;
  if (req.headers['if-none-match'] === etag) { delete headers['Content-Length']; res.writeHead(304,headers).end(); return; }
  res.writeHead(200,headers);
  if (req.method === 'HEAD') { res.end(); return; }
  try { await pipeline(createReadStream(target),res); } catch (error) { if (!res.destroyed) throw error; }
}
