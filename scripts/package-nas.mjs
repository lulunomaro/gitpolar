import { readdir,mkdir,stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { ZipFile } from 'yazl';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(process.argv[2]||resolve(root,'artifacts','gitpolar-nas.zip'));
const roots=['index.html','styles.css','app.js','demo.js','live.js','server.mjs','package.json','package-lock.json','README.md','THIRD_PARTY_NOTICES.md','Dockerfile','compose.yaml','.env.example','.gitignore','.dockerignore','backend','docs','templates','assets','viewer','public','tools','scripts','tests','solidworks-addin'];
const files=[];
async function collect(path){
  if(path.endsWith('/__pycache__')||path==='tools/firmware/station.json')return;
  if(path==='solidworks-addin/bin'||path==='solidworks-addin/bin-native'||path==='solidworks-addin/vendor')return;
  const info=await stat(resolve(root,path));
  if(info.isDirectory()){for(const entry of await readdir(resolve(root,path),{withFileTypes:true})){if(!entry.isSymbolicLink())await collect(path+'/'+entry.name);}}
  else if(path!=='assets/gitpolar-original.png')files.push(path);
}
for(const path of roots)await collect(path);
if(files.some(path=>path==='.env'||path.startsWith('data/')||path.startsWith('node_modules/')))throw new Error('Unexpected private or runtime files in deployment package.');
await mkdir(dirname(output),{recursive:true});
const zip=new ZipFile(),target=createWriteStream(output),done=pipeline(zip.outputStream,target);
zip.on('error',error=>zip.outputStream.destroy(error));
for(const path of files)zip.addFile(resolve(root,path),'gitpolar/'+path);
zip.end();await done;
console.log(JSON.stringify({path:output,files:files.length,bytes:(await stat(output)).size}));
