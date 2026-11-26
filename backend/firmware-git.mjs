import {randomUUID} from 'node:crypto';
import {mkdir, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {dataRoot} from './config.mjs';
import {git, filePath} from './git.mjs';
import {fail} from './auth.mjs';

export const families = ['dji', 'dm'];
export const region = (group, family) => 'vehicles/' + group + '/' + family;
export const boardRef = (group, family) => 'teams/' + group + '/' + family;
export const controlRef = 'gitpolar/firmware-access';
export const oidPattern = /^[0-9a-f]{40}$/;
const configured = (process.env.FIRMWARE_GIT_URL || '').trim();
const upstream = /^https:\/\/(github\.com|gitee\.com)\/([\w.-]+)\/([\w.-]+?)\/?$/i.exec(configured);
export const repositoryName = upstream ? upstream[1].toLowerCase() + '/' + upstream[2] + '/' + upstream[3].replace(/\.git$/i,'') : '';
export const sourceRef = process.env.FIRMWARE_SOURCE_REF || 'engineer';
export const sourceDirs = {dji:'dji_board',dm:'DM_board'};
const cache = join(dataRoot, 'firmware', encodeURIComponent(repositoryName) + '.git');
const mainRef = 'main';
const remoteRef = ref => 'refs/remotes/firmware/' + ref;

export function expectedOid(value) {
  if (typeof value !== 'string' || !oidPattern.test(value)) fail(400, 'A full Git commit ID is required.');
  return value;
}
export function sourcePath(value) {
  filePath(value);
  if (value.length > 1024 || /[\x00-\x1f\x7f]/.test(value) ||
      value.split('/').some(part => part.toLowerCase() === '.git')) fail(400, 'Invalid source path.');
  return value;
}
export function run(args, options = {}) {
  return git(null, ['--git-dir=' + cache, '--literal-pathspecs', '-c', 'core.quotepath=false', ...args], options);
}
let windowsTLS = false;
const transportFailure = error => /schannel|TLS connection|SSL_connect|early EOF|connection (?:was )?reset|unexpected disconnect|server closed abruptly/i.test(error.message);
function network(args) {
  const env = {GIT_TERMINAL_PROMPT:'0', GCM_INTERACTIVE:'Never'};
  const token = process.env.FIRMWARE_GIT_TOKEN;
  if (token) {
    const index = Number(process.env.GIT_CONFIG_COUNT || 0);
    env.GIT_CONFIG_COUNT = String(index+1);
    env['GIT_CONFIG_KEY_'+index] = 'http.https://' + upstream[1] + '/.extraHeader';
    env['GIT_CONFIG_VALUE_'+index] = 'Authorization: Basic ' + Buffer.from((process.env.FIRMWARE_GIT_USER || 'x-access-token') + ':' + token).toString('base64');
  }
  const options = windowsTLS ? ['-c','http.version=HTTP/1.1','-c','http.sslBackend=openssl'] : [];
  return run([...options,...args], {env});
}
function remote() {
  return 'https://' + repositoryName + '.git';
}
let initialized;
async function refresh() {
  if (!repositoryName || repositoryName.split('/').some(x => !x || x === '.' || x === '..')) fail(503, 'Configure a GitHub or Gitee FIRMWARE_GIT_URL.');
  if (!initialized) initialized = (async () => {
    await mkdir(cache, {recursive:true});
    await git(null, ['init', '--bare', '--initial-branch=main', cache]);
  })().catch(error => { initialized = undefined; throw error; });
  await initialized;
  const args = ['fetch','--quiet','--prune','--no-tags',remote(),'+refs/heads/*:refs/remotes/firmware/*'];
  try { await network(args); }
  catch (error) {
    if (!transportFailure(error)) fail(502,'Cannot fetch the firmware repository. Check its URL and Git credentials.');
    if (process.platform === 'win32' && /schannel/i.test(error.message)) windowsTLS = true;
    await network(args).catch(() => fail(502,'The connection to the firmware Git host failed.'));
  }
}
// 串行同步本地镜像。远端的并发写入另由 Git lease 校验。
let queue = Promise.resolve();
export function withRepository(action) {
  const next = queue.then(async () => { await refresh(); return action(); });
  queue = next.catch(() => {});
  return next;
}
export async function head(ref) {
  const value = (await run(['rev-parse', '--verify', '--quiet', remoteRef(ref) + '^{commit}'], {allowFailure:true})).trim();
  return oidPattern.test(value) ? value : null;
}
export async function catalog() {
  const oid = await head(controlRef);
  if (!oid) return {oid:null, access:{main:{}, groups:{}}};
  const access = JSON.parse(await run(['show', oid + ':access.json']));
  return {oid, access};
}
export async function publish(updates) {
  // 原子更新两条板卡分支与登记记录，失败时没有部分创建或删除。
  const leases = updates.map(u => '--force-with-lease=refs/heads/' + u.ref + ':' + (u.before || ''));
  const specs = updates.map(u => (u.after || '') + ':refs/heads/' + u.ref);
  const args = ['push','--atomic',...leases,remote(),...specs];
  try { await network(args); }
  catch {
    await refresh();
    const actual = await Promise.all(updates.map(item=>head(item.ref)));
    if (updates.every((item,i)=>actual[i]===item.after)) return;
    if (updates.some((item,i)=>actual[i]!==item.before)) fail(409, 'An upstream branch changed. Reload before retrying.');
    fail(502, 'The Git host rejected the atomic update. Check credentials, atomic push support and branch rules.');
  }
}
function author(user) {
  return {GIT_AUTHOR_NAME:user.username, GIT_AUTHOR_EMAIL:user.username + '@gitpolar.local',
    GIT_COMMITTER_NAME:user.username, GIT_COMMITTER_EMAIL:user.username + '@gitpolar.local'};
}
export async function createCommit(user, parents, tree, message) {
  return (await run(['commit-tree', tree, ...parents.flatMap(p => ['-p',p])], {env:author(user), input:message + '\n'})).trim();
}
export async function writeTree(parent, files) {
  const index = join(dataRoot, 'firmware', randomUUID() + '.index');
  const env = {GIT_INDEX_FILE:index};
  try {
    await run(parent ? ['read-tree',parent] : ['read-tree','--empty'], {env});
    for (const file of files) {
      sourcePath(file.path);
      if (file.remove) {
        const original = parent && await entry(parent, file.path);
        if (!original) fail(404, 'Cannot delete a missing file.');
        await run(['update-index','-z','--index-info'], {env,input:'0 ' + '0'.repeat(40) + '\t' + file.path + '\0'});
      } else {
        const blob = (await run(['hash-object','-w','--stdin'], {input:file.content})).trim();
        const old = parent && await entry(parent, file.path);
        if (old && !['100644','100755'].includes(old.mode)) fail(409, 'Select a regular file.');
        await run(['update-index','--add','--cacheinfo',old?.mode || '100644',blob,file.path], {env});
      }
    }
    return (await run(['write-tree'], {env})).trim();
  } finally { await rm(index,{force:true}); await rm(index + '.lock',{force:true}); }
}
export async function copyDirectory(oid,source,destination) {
  const index = join(dataRoot,'firmware',randomUUID() + '.index');
  const env = {GIT_INDEX_FILE:index};
  try {
    await run(['read-tree',oid],{env});
    await run(['read-tree','-i','--prefix=' + destination + '/',source],{env});
    return (await run(['write-tree'],{env})).trim();
  } finally { await rm(index,{force:true}); await rm(index + '.lock',{force:true}); }
}
export async function controlUpdate(user, current) {
  const tree = await writeTree(current.oid,[{path:'access.json',content:JSON.stringify(current.access,null,2) + '\n'}]);
  return {ref:controlRef, before:current.oid, after:await createCommit(user,current.oid ? [current.oid] : [],tree,'Update firmware workspace access')};
}
export async function entry(oid, path) {
  const data = await run(['ls-tree','-z',oid,'--',sourcePath(path)]);
  const m = /^(\d+) (\w+) ([0-9a-f]{40})\t([^\0]+)\0$/.exec(data);
  return m ? {mode:m[1],type:m[2],oid:m[3],path:m[4]} : null;
}
export async function resolveVersion(ref, oid) {
  const tip = await head(ref);
  if (!tip) fail(404,'Firmware branch does not exist upstream.');
  if (!oid || oid === tip) return tip;
  expectedOid(oid);
  const base = (await run(['merge-base',tip,oid],{allowFailure:true})).trim();
  if (base !== oid) fail(404,'This commit does not belong to the selected branch history.');
  return oid;
}
export async function knownCommit(oid) {
  expectedOid(oid);
  return (await run(['rev-parse','--verify','--quiet',oid + '^{commit}'],{allowFailure:true})).trim() === oid;
}
export async function mergeResult(left, right) {
  const result = await run(['merge-tree','--write-tree','--name-only','--no-messages','-z',left,right],{result:true});
  if (![0,1].includes(result.code)) fail(422,'Cannot compare these Git histories (no common ancestor or unsupported Git).');
  const [tree,...paths] = result.output.split('\0');
  return {tree, conflicts:paths.filter(Boolean), clean:result.code === 0};
}
export async function comparison(left, right, path) {
  const data = await run(['diff','--name-status','--no-renames','-z',left,right,'--',...(path?[sourcePath(path)]:[])]);
  const parts = data.split('\0'), changes = [];
  for (let i=0;i+1<parts.length;i+=2) changes.push({status:parts[i],path:parts[i+1]});
  const merge = await mergeResult(left,right);
  const result = {base:left,head:right,changes,conflicts:merge.conflicts,mergeable:merge.clean};
  if (path) {
    const output = await run(['diff','--no-ext-diff','--no-textconv',left,right,'--',path],{max:4*1024*1024})
      .catch(() => fail(413,'This patch is too large for inline viewing.'));
    result.patch = output;
  }
  return result;
}
export async function mergeIntoMain(user, ref, scope, source, target) {
  if (await head(ref) !== expectedOid(source) || await head(mainRef) !== expectedOid(target)) fail(409,'The selected tips have changed.');
  const base = (await run(['merge-base',target,source])).trim();
  if (base === source) return {oid:target,alreadyMerged:true};
  const paths = (await run(['diff','--name-only','--no-renames','-z',base,source])).split('\0').filter(Boolean);
  if (paths.some(path => !path.startsWith(scope + '/'))) fail(409,'The group branch also changes files outside its firmware directory.');
  const result = await mergeResult(target,source);
  if (!result.clean) return {merged:false,conflicts:result.conflicts,base:target,head:source};
  const oid = await createCommit(user,[target,source],result.tree,'Integrate ' + ref);
  await publish([{ref:mainRef,before:target,after:oid}]);
  return {merged:true,oid,parents:[target,source]};
}
