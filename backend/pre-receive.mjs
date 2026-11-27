// Invoked by Git's pre-receive hook, including pushes from ordinary Git clients.
import { DatabaseSync } from 'node:sqlite';
import { albumRefError } from './album-policy.mjs';
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { dirname,join } from 'node:path';
const input=await new Promise((resolve,reject)=>{let text='';process.stdin.setEncoding('utf8');process.stdin.on('data',s=>text+=s);process.stdin.on('end',()=>resolve(text));process.stdin.on('error',reject);});
const db=new DatabaseSync(process.env.GITPOLAR_DB_PATH,{readOnly:true});
const repoId=process.env.GITPOLAR_REPO_ID,userId=Number(process.env.GITPOLAR_USER_ID),zero='0'.repeat(40);
const git=(args,input)=>execFileSync('git',args,{input,encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true});
try {
  const repo=db.prepare('SELECT kind,creator_id FROM repos WHERE id=?').get(repoId);
  const foreign=db.prepare('SELECT l.path,u.username FROM locks l JOIN users u ON u.id=l.owner_id WHERE l.repo_id=? AND l.owner_id<>?').all(repoId,userId);
  const tips=[];
  for(const line of input.trim().split('\n').filter(Boolean)) {
    const [oldOid,newOid,ref]=line.split(' ');
    const restriction=albumRefError(repo,ref,userId);
    if (restriction) throw new Error(restriction);
    if(newOid===zero)continue;
    tips.push(newOid);
    if(foreign.length) {
      let base=oldOid;
      if(base===zero){try{base=git(['merge-base',newOid,'HEAD']).trim();}catch{base=zero;}}
      const files=(base===zero?git(['ls-tree','-r','--name-only','-z',newOid]):git(['diff-tree','--no-commit-id','--no-renames','--name-only','-r','-z',base,newOid])).split('\0');
      const locked=foreign.find(lock=>files.includes(lock.path));
      if(locked)throw new Error(`File is locked by ${locked.username}: ${locked.path}. Ask the owner to unlock it before pushing.`);
    }
  }
  if(tips.length) {
    const objects=git(['rev-list','--objects','--no-object-names',...tips,'--not','--all']).trim();
    if(objects) {
      const small=git(['cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],objects+'\n').trim().split('\n').map(row=>row.split(' ')).filter(([,type,size])=>type==='blob' && Number(size)<=1024);
      for(let start=0;start<small.length;start+=128){
        const selected=small.slice(start,start+128).map(([oid])=>oid);
        const bytes=execFileSync('git',['cat-file','--batch'],{input:selected.join('\n')+'\n',maxBuffer:256*1024,windowsHide:true});let offset=0;
        for(const id of selected){const end=bytes.indexOf(10,offset),[oid,type,length]=bytes.subarray(offset,end).toString().split(' '),blobSize=Number(length);
          if(end<0||oid!==id||type!=='blob'||!Number.isSafeInteger(blobSize)||blobSize<0||end+blobSize+2>bytes.length)throw Error('Cannot inspect incoming Git pointers.');
          const pointer=bytes.subarray(end+1,end+1+blobSize).toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)\s*$/);offset=end+blobSize+2;
        if(!pointer)continue;
        const [,lfsOid,size]=pointer;
        const record=db.prepare('SELECT size,complete FROM lfs_objects WHERE repo_id=? AND oid=?').get(repoId,lfsOid);
        const location=join(dirname(process.env.GITPOLAR_DB_PATH),'lfs',repoId,lfsOid.slice(0,2),lfsOid.slice(2,4),lfsOid);
        if(!record?.complete || record.size!==Number(size) || statSync(location,{throwIfNoEntry:false})?.size!==Number(size))throw new Error(`LFS object ${lfsOid} is missing or incomplete. Run git lfs push --all origin before pushing refs.`);
        }
      }
    }
  }
} catch(error) {
  console.error(`gitpolar: ${error.message}`);
  process.exitCode=1;
} finally {db.close();}
