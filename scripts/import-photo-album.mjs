// Administrative NAS import. Repository ownership never creates a browser session for that user.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  if (!process.argv[i].startsWith('--') || process.argv[i+1] === undefined) throw new Error('Usage: node scripts/import-photo-album.mjs --source DIR --name NAME --owner-id ID [--title TITLE] [--python python3] [--env FILE]');
  args.set(process.argv[i].slice(2),process.argv[i+1]);
}
if (args.has('env')) loadEnvFile(resolve(args.get('env')));
const { db, getUser, repository } = await import('../backend/store.mjs');
const { dataRoot, lfsRoot } = await import('../backend/config.mjs');
const { createRepository, filePath, git, ZERO } = await import('../backend/git.mjs');
const { albumManifestPath, albumPreviewRoot } = await import('../backend/album.mjs');
const source = resolve(args.get('source') || '');
const ownerId = Number(args.get('owner-id'));
if (!args.has('source') || !(await stat(source)).isDirectory()) throw new Error('An existing --source directory is required.');
const owner = getUser(ownerId);
if (!owner || !db.prepare('SELECT 1 FROM feishu_identities WHERE user_id=?').get(ownerId)) throw new Error('The owner must be an existing verified Feishu identity.');
const name = args.get('name'),title = args.get('title') || '北极熊活动相册';
let repo = repository(name);
if (repo && (repo.kind !== 'album' || repo.creator_id !== ownerId)) throw new Error('An unrelated repository already uses this name.');
if (!repo) repo = await createRepository(owner,{name,description:args.get('description') || `${title} · 按活动日期浏览，原图由 Git LFS 保存`,initialize:false,kind:'album'});
await mkdir(join(dataRoot,'tmp'),{recursive:true});
const work = await mkdtemp(join(dataRoot,'tmp','album-import-'));
const manifestFile = join(work,'album.json'),index = join(work,'index');
try {
  const indexer = fileURLToPath(new URL('./index-photo-album.py',import.meta.url));
  await new Promise((done,reject) => {
    const child = spawn(args.get('python') || (process.platform === 'win32' ? 'python' : 'python3'),[indexer,'--source',source,'--output',manifestFile,'--lfs-root',lfsRoot,'--repo-id',repo.id,'--preview-root',albumPreviewRoot,'--title',title],{windowsHide:true,stdio:['ignore','pipe','inherit']});
    let summary=''; child.stdout.on('data',chunk => summary += chunk);
    child.on('error',reject);
    child.on('close',code => { if (code) reject(new Error('Photo indexing failed; original files were retained.')); else { process.stdout.write(summary); done(); } });
  });
  const manifestText = await readFile(manifestFile,'utf8');
  const manifest = JSON.parse(manifestText);
  if (!manifest.photos?.length) throw new Error('No photos were indexed.');
  if (manifest.errors?.length) throw new Error(`Import stopped before the Git commit: ${manifest.errors.length} photo(s) could not be indexed. See ${manifestFile}.`);
  const parent = (await git(repo.name,['rev-parse','--verify','refs/heads/main'],{allowFailure:true})).trim() || null;
  const env = {GIT_INDEX_FILE:index,GIT_AUTHOR_NAME:'Gitpolar Album Import',GIT_AUTHOR_EMAIL:'album-import@gitpolar.local',GIT_COMMITTER_NAME:'Gitpolar Album Import',GIT_COMMITTER_EMAIL:'album-import@gitpolar.local'};
  if (parent) await git(repo.name,['read-tree',parent],{env});
  let previous=[];
  if (parent) {
    const raw=await git(repo.name,['show',`${parent}:${albumManifestPath}`],{allowFailure:true});
    if (raw) {
      const older=JSON.parse(raw);
      previous=older.photos || [];
      const paths=new Map(manifest.photos.map(p=>[p.path,p]));
      const albums=new Map(manifest.albums.map(a=>[a.id,a]));
      for (const photo of previous.filter(p=>p.origin==='album-pr')) {
        const imported=paths.get(photo.path);
        if (imported) { imported.origin='album-pr'; continue; }
        manifest.photos.push(photo);
        if (!albums.has(photo.albumId)) {
          const group={...older.albums.find(a=>a.id===photo.albumId),count:0,coverId:photo.id};
          albums.set(group.id,group); manifest.albums.push(group);
        }
        albums.get(photo.albumId).count++;
      }
    }
  }
  const records=[];
  const blob=async text => (await git(repo.name,['hash-object','-w','--stdin'],{input:text})).trim();
  const paths=new Set(manifest.photos.map(p=>p.path));
  for (const old of previous) if (!paths.has(old.path)) { filePath(old.path); records.push(`0 ${ZERO}\t${old.path}\0`); }
  const objects=new Map();
  for (const photo of manifest.photos) {
    filePath(photo.path);
    if (!/^[a-f0-9]{64}$/.test(photo.lfsOid) || !Number.isSafeInteger(photo.size) || photo.size < 0) throw new Error('Invalid indexed LFS object.');
    const pointer=`version https://git-lfs.github.com/spec/v1\noid sha256:${photo.lfsOid}\nsize ${photo.size}\n`;
    records.push(`100644 ${await blob(pointer)}\t${photo.path}\0`);
    objects.set(photo.lfsOid,photo.size);
  }
  const readme=`# ${title}\n\n拥有者：${owner.name || owner.username}（飞书账号）\n\n[打开可视化相册](/albums/?repo=${encodeURIComponent(repo.name)})\n\n共 ${manifest.photos.length} 张照片，${manifest.albums.length} 个相册。按原目录中的活动日期组织，未提供日期的照片标记为未知，不使用上传时间冒充拍摄时间。\n\n原图保存在 Git LFS；目录、日期索引和每次导入记录保存在 Git 中。轻量克隆可设置 GIT_LFS_SKIP_SMUDGE=1；需要原图时运行 git lfs pull。\n\n原始上传目录保持不变。再次导入会新增一个 Git 提交，旧版本仍可按提交或分支查看。\n`;
  const attributes=['*.jpg','*.JPG','*.jpeg','*.JPEG','*.png','*.PNG','*.gif','*.GIF','*.webp','*.WEBP'].map(ext=>`${ext} filter=lfs diff=lfs merge=lfs -text`).join('\n')+'\n';
  for (const [path,text] of [[albumManifestPath,JSON.stringify(manifest,null,2)+'\n'],['README.md',readme],['.gitattributes',attributes]]) records.push(`100644 ${await blob(text)}\t${path}\0`);
  await git(repo.name,['update-index','-z','--index-info'],{env,input:records.join('')});
  const tree=(await git(repo.name,['write-tree'],{env})).trim();
  const existingTree=parent ? (await git(repo.name,['rev-parse',`${parent}^{tree}`])).trim() : '';
  db.exec('BEGIN IMMEDIATE');
  try {
    const register=db.prepare('INSERT INTO lfs_objects(repo_id,oid,size,complete) VALUES(?,?,?,1) ON CONFLICT(repo_id,oid) DO UPDATE SET size=excluded.size,complete=1');
    for (const [oid,size] of objects) register.run(repo.id,oid,size);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  let oid=parent;
  if (tree !== existingTree) {
    oid=(await git(repo.name,['commit-tree',tree,...(parent?['-p',parent]:[])],{env,input:`Import ${title}: ${manifest.photos.length} photos in ${manifest.albums.length} albums\n`})).trim();
    await git(repo.name,['update-ref','refs/heads/main',oid,parent || ZERO]);
  }
  console.log(JSON.stringify({repository:repo.name,repositoryId:repo.id,owner:{id:owner.id,name:owner.name,username:owner.username},commit:oid,photos:manifest.photos.length,albums:manifest.albums.length,originalBytes:manifest.photos.reduce((sum,p)=>sum+p.size,0),url:'/albums/?repo='+encodeURIComponent(repo.name)}));
} finally {
  await unlink(index).catch(()=>{});
  await unlink(index+'.lock').catch(()=>{});
  db.close();
}
