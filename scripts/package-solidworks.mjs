import {readdir,stat,mkdir} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {ZipFile} from 'yazl';
const root=fileURLToPath(new URL('../',import.meta.url)),source=resolve(root,'solidworks-addin/bin-native'),output=resolve(root,'artifacts/gitpolar-solidworks-addin.zip');
await stat(resolve(source,'Gitpolar.SolidWorks.dll'));
const files=[];async function collect(directory=''){for(const entry of await readdir(resolve(source,directory),{withFileTypes:true})){const path=directory?directory+'/'+entry.name:entry.name;if(entry.isSymbolicLink())continue;if(entry.isDirectory())await collect(path);else if(!entry.name.startsWith('SolidWorks.Interop.'))files.push(path);}}
await collect();await mkdir(resolve(root,'artifacts'),{recursive:true});
const zip=new ZipFile(),done=pipeline(zip.outputStream,createWriteStream(output));zip.on('error',error=>zip.outputStream.destroy(error));
for(const file of files)zip.addFile(resolve(source,file),'gitpolar-solidworks/'+file);
// Interop assemblies belong to the local SolidWorks installation; installer copies them locally.
zip.end();await done;console.log(JSON.stringify({path:output,files:files.length,bytes:(await stat(output)).size}));
