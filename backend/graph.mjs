import { git,resolveRef,branchOverview,filePath } from './git.mjs';
import { fail } from './auth.mjs';

// Freeze traversal roots in the cursor: a push between pages cannot move or duplicate rows.
export async function graphRefs(repo) {
  const output=await git(repo.name,['for-each-ref','--format=%(refname)%00%(objectname)%00%(*objectname)%00%(objecttype)%00%(*objecttype)','refs/heads/','refs/tags/']);
  const refs=[];
  for(const record of output.trimEnd().split('\n').filter(Boolean)) {
    const [full,object,peeled,type,peeledType]=record.split('\0');
    if(type!=='commit'&&peeledType!=='commit')continue;
    refs.push({name:full.replace(/^refs\/(heads|tags)\//,''),type:full.startsWith('refs/tags/')?'tag':'branch',oid:peeled||object});
  }
  return refs;
}
export async function commitGraph(repo,params) {
  const ref=params.get('ref')||'',cursor=params.get('cursor');
  const {defaultBranch}=await branchOverview(repo),refs=await graphRefs(repo);
  let roots, offset = 0, scope = ref;
  if(cursor) {
    let value;try{if(cursor.length>24000)throw 0;value=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));}catch{fail(400,'Invalid graph cursor.');}
    if(![1,2].includes(value?.version)||!Array.isArray(value.roots)||value.roots.length>256||!value.roots.length||value.roots.some(oid=>typeof oid!=='string'||!/^[a-f0-9]{40}$/.test(oid))||!Number.isSafeInteger(value.offset)||value.offset<0||value.offset>1000000)fail(400,'Invalid graph cursor.');
    if (value.version === 2) {
      if (value.repo !== repo.id || typeof value.ref !== 'string' || (params.has('ref') && value.ref !== ref))
        fail(400, 'This graph cursor belongs to a different repository or branch. Refresh the graph.');
      scope = value.ref;
    }
    roots=value.roots;offset=value.offset;
  } else roots=ref?[await resolveRef(repo,ref)]:[...new Set(refs.map(r=>r.oid))];
  if(roots.length>256)fail(400,'Choose a branch to view this repository graph.');
  if(!roots.length)return {commits:[],refs,defaultBranch,nextCursor:null,roots:[]};
  const limit=100;
  const output=await git(repo.name,['log','--topo-order','-z','--format=%H%x00%P%x00%an%x00%aI%x00%s',
    '--max-count='+String(limit+1),'--skip='+String(offset),...roots,'--']).catch(async error => {
      if (cursor && error.gitCode === 128) {
        const types = await git(repo.name, ['cat-file', '--batch-check=%(objecttype)'], {input: roots.join('\n') + '\n'});
        if (types.trimEnd().split('\n').some(type => type !== 'commit')) fail(410, 'The saved graph snapshot is no longer available. Refresh the graph.');
      }
      throw error;
    });
  const fields=output.split('\0'),commits=[];
  for(let i=0;i+4<fields.length;i+=5){const [oid,parents,author,date,message]=fields.slice(i,i+5);commits.push({oid,hash:oid.slice(0,7),parents:parents?parents.split(' '):[],author,date,message});}
  return {commits:commits.slice(0,limit),refs,defaultBranch,roots,nextCursor:commits.length>limit?Buffer.from(JSON.stringify({version:2,repo:repo.id,ref:scope,roots,offset:offset+limit})).toString('base64url'):null};
}
export async function graphCommit(repo,ref) {
  const oid=await resolveRef(repo,ref);
  const output=await git(repo.name,['show','-s','--format=%H%x00%P%x00%an%x00%aI%x00%cn%x00%cI%x00%B',oid,'--']);
  const [hash,parents,author,date,committer,committedAt,message]=output.trimEnd().split('\0');
  const parentIds=parents?parents.split(' '):[];
  const changes=await git(repo.name,parentIds.length?['diff','--name-status','-z','--find-renames',parentIds[0],oid,'--']:['diff-tree','--root','--no-commit-id','-r','--name-status','-z','--find-renames',oid,'--']);
  const tokens=changes.split('\0'),files=[];
  for(let i=0;i<tokens.length&&tokens[i];){const code=tokens[i++],previousPath=tokens[i++];const renamed=/^[RC]/.test(code),path=renamed?tokens[i++]:previousPath;if(!path)continue;filePath(path);files.push({path,...(renamed?{previousPath}:{}),status:code[0],preview:path.startsWith('.gitpolar/')});}
  return {oid:hash,hash:hash.slice(0,7),parents:parentIds,author,date,committer,committedAt,message,files};
}
