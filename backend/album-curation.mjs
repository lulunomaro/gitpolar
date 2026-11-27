import { branches, commitFiles, fileContent, git } from './git.mjs';
import { fail } from './auth.mjs';

const directory = '.gitpolar/curation';
const idPattern = /^[a-f0-9]{24}$/;
const commitPattern = /^[a-f0-9]{40}$/;
export const unmarked = Object.freeze({rating:0, tags:Object.freeze([])});

function selection(value, status = 400) {
  if (!Number.isInteger(value?.rating) || value.rating < 0 || value.rating > 5) fail(status,'星级应为 0 至 5。');
  if (!Array.isArray(value.tags) || value.tags.length > 20 || value.tags.some(t => typeof t !== 'string' || !t.trim() || t.trim().length > 40 || /[\u0000-\u001f\u007f,，]/u.test(t))) {
    fail(status,'最多可保存 20 个标签，每个标签限 40 个字。');
  }
  return {rating:value.rating, tags:[...new Set(value.tags.map(t => t.trim()))]};
}

export async function readSelections(repo, oid, manifest) {
  const paths = new Set((await git(repo.name,['ls-tree','-r','--name-only','-z',oid,'--',directory])).split('\0'));
  const selections = new Map();
  for (const {id} of manifest.albums) {
    const path = `${directory}/${id}.json`;
    if (!paths.has(path)) continue;
    const file = await fileContent(repo,oid,path);
    let entries;
    try { entries = JSON.parse(file.text); } catch { fail(422,'无法读取照片星级和标签。'); }
    if (!entries || Array.isArray(entries) || typeof entries !== 'object') fail(422,'照片星级和标签的格式错误。');
    const album = new Map();
    for (const [photoId,value] of Object.entries(entries)) {
      if (!idPattern.test(photoId)) fail(422,'照片标识无效。');
      album.set(photoId,selection(value,422));
    }
    selections.set(id,album);
  }
  return selections;
}

export async function isEditableBranch(repo, ref) {
  return !commitPattern.test(ref) && (await branches(repo)).some(b => b.name === ref);
}

export async function saveSelection(repo, user, ref, input, snapshot) {
  if (!idPattern.test(input?.id || '') || !commitPattern.test(input?.expectedHead || '')) fail(400,'请选择照片并提供当前版本。');
  if (!await isEditableBranch(repo,ref)) fail(409,'请在可写分支上保存星级和标签。');
  const {oid,manifest,selections} = snapshot;
  if (oid !== input.expectedHead) fail(409,'分支已有新提交，请刷新后重试。');
  const photo = manifest.photos.find(p => p.id === input.id);
  if (!photo) fail(404,'此版本中没有这张照片。');
  const next = selection(input);
  const entries = new Map(selections.get(photo.albumId));
  const previous = entries.get(photo.id) || unmarked;
  if (previous.rating === next.rating && JSON.stringify(previous.tags) === JSON.stringify(next.tags)) return {oid,...next};
  if (next.rating || next.tags.length) entries.set(photo.id,next);
  else entries.delete(photo.id);
  const path = `${directory}/${photo.albumId}.json`;
  const text = JSON.stringify(Object.fromEntries(entries),null,2) + '\n';
  const message = `整理照片 ${photo.path.split('/').at(-1)}`;
  const commit = await commitFiles(repo,user,ref,[{path,text}],message,oid);
  return {oid:commit,...next};
}
