[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [Parameter(Mandatory=$true)][string]$Source,
  [string]$Configuration = '',
  [string]$InteropDirectory
)
$ErrorActionPreference='Stop'
$utf8=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=$utf8
$repoResult=& git -C $RepoRoot rev-parse --show-toplevel
if($LASTEXITCODE -ne 0){throw 'RepoRoot must be a Git working copy with Git LFS installed.'}
$projectRoot=[IO.Path]::GetFullPath(($repoResult -join '').Trim()).TrimEnd([IO.Path]::DirectorySeparatorChar)
$projectPrefix=$projectRoot+[IO.Path]::DirectorySeparatorChar
$sourcePath=if([IO.Path]::IsPathRooted($Source)){[IO.Path]::GetFullPath($Source)}else{[IO.Path]::GetFullPath((Join-Path $projectRoot $Source))}
if(-not $sourcePath.StartsWith($projectPrefix,[StringComparison]::OrdinalIgnoreCase)-or -not [IO.File]::Exists($sourcePath)){throw 'Source must be a saved document inside this repository.'}
if(-not $InteropDirectory){
  $classId=(Get-ItemProperty -LiteralPath 'Registry::HKEY_CLASSES_ROOT\SldWorks.Application\CLSID').'(default)'
  $command=(Get-ItemProperty -LiteralPath ('Registry::HKEY_CLASSES_ROOT\CLSID\'+$classId+'\LocalServer32')).'(default)'
  $executable=if($command -match '^"([^"]+)"'){$matches[1]}elseif($command -match '^(.*?\.exe)'){$matches[1]}else{throw 'Cannot locate the SolidWorks installation.'}
  $InteropDirectory=Join-Path ([IO.Path]::GetDirectoryName($executable)) 'api\redist'
}
$interop=Join-Path $InteropDirectory 'SolidWorks.Interop.sldworks.dll'
Add-Type -Path $interop
$code=@'
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Runtime.InteropServices;
using SolidWorks.Interop.sldworks;
public static class GitpolarSceneExporter {
  static string Hash(byte[] data){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(data)).Replace("-","").ToLowerInvariant();}
  public static string FileHash(string path){using(var h=SHA256.Create())using(var s=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.ReadWrite))return BitConverter.ToString(h.ComputeHash(s)).Replace("-","").ToLowerInvariant();}
  static string Relative(string path,string root){var full=Path.GetFullPath(path);if(!full.StartsWith(root,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Dependency is outside this repository. Use Pack and Go first: "+full);return full.Substring(root.Length).Replace('\\','/');}
  static bool Cached(string file){return file.IndexOf("\\VC~~\\",StringComparison.OrdinalIgnoreCase)>=0||file.IndexOf("\\IC~~\\",StringComparison.OrdinalIgnoreCase)>=0;}
  static string ComponentSource(IComponent2 component,string root,string assembly){
    for(var current=component;current!=null;current=(IComponent2)current.GetParent()){
      var file=current.GetPathName();if(String.IsNullOrEmpty(file))continue;
      if(Path.GetFullPath(file).StartsWith(root,StringComparison.OrdinalIgnoreCase)&&File.Exists(file))return Path.GetFullPath(file);
      if(!current.IsVirtual&&!Cached(file))return null;
    }
    return assembly;
  }
  static double[] Point(IMathUtility math,IMathTransform transform,double x,double y,double z){var p=(IMathPoint)math.CreatePoint(new double[]{x,y,z});return (double[])((IMathPoint)p.MultiplyTransform(transform)).ArrayData;}
  static double[] Matrix(IMathUtility math,IMathTransform transform){if(transform==null)return new double[]{1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1};var o=Point(math,transform,0,0,0);var x=Point(math,transform,1,0,0);var y=Point(math,transform,0,1,0);var z=Point(math,transform,0,0,1);return new double[]{x[0]-o[0],x[1]-o[1],x[2]-o[2],0,y[0]-o[0],y[1]-o[1],y[2]-o[2],0,z[0]-o[0],z[1]-o[1],z[2]-o[2],0,o[0]*1000,o[1]*1000,o[2]*1000,1};}
  static List<float> TessellateBody(IBody2 body){
    var tess=(ITessellation)body.GetTessellation(null);if(tess==null)throw new InvalidOperationException("Cannot tessellate body: "+body.Name);
    tess.NeedVertexNormal=true;tess.ImprovedQuality=true;if(!tess.Tessellate())throw new InvalidOperationException("SolidWorks tessellation failed: "+body.Name);
    var points=new Dictionary<int,double[]>();var triangles=new List<float>();int count=tess.GetFacetCount();
    for(int facet=0;facet<count;facet++){var fins=tess.GetFacetFins(facet) as Array;var ids=new List<int>();if(fins!=null)foreach(var fin in fins){var vertices=tess.GetFinVertices(Convert.ToInt32(fin)) as Array;if(vertices!=null)foreach(var vertex in vertices){int id=Convert.ToInt32(vertex);if(!ids.Contains(id))ids.Add(id);}}
      if(ids.Count!=3)throw new InvalidOperationException("Expected a triangular SolidWorks facet in "+body.Name);
      foreach(var id in ids)if(!points.ContainsKey(id))points[id]=(double[])tess.GetVertexPoint(id);
      var a=points[ids[0]];var b=points[ids[1]];var c=points[ids[2]];var normal=tess.GetVertexNormal(ids[0]) as double[];
      if(normal!=null){double ax=b[0]-a[0],ay=b[1]-a[1],az=b[2]-a[2],bx=c[0]-a[0],by=c[1]-a[1],bz=c[2]-a[2];if((ay*bz-az*by)*normal[0]+(az*bx-ax*bz)*normal[1]+(ax*by-ay*bx)*normal[2]<0){int temp=ids[1];ids[1]=ids[2];ids[2]=temp;}}
      foreach(var id in ids)foreach(var value in points[id])triangles.Add((float)(value*1000));
    }
    return triangles;
  }
  static byte[] Mesh(IBody2 body,Array directTriangles){
    var triangles=new List<float>();var faces=directTriangles==null?body.GetFaces() as object[]:null;
    if(directTriangles!=null)foreach(var value in directTriangles)triangles.Add((float)(Convert.ToDouble(value)*1000));
    if(faces!=null)foreach(var faceObject in faces){var face=(IFace2)faceObject;var values=face.GetTessTriangles(true) as Array;if(values==null||values.Length%9!=0){Console.WriteLine("Generating missing body tessellation: "+body.Name);triangles=TessellateBody(body);break;}foreach(var value in values)triangles.Add((float)(Convert.ToDouble(value)*1000));}
    if(triangles.Count==0){double area=0;if(faces!=null)foreach(var f in faces)area+=((IFace2)f).GetArea();if(body.GetType()==1&&area<=1e-10)return new byte[0];throw new InvalidOperationException("Body has no tessellated faces: "+body.Name+"; area="+area+" m2");}
    using(var stream=new MemoryStream())using(var writer=new BinaryWriter(stream)){
      var header=new byte[80];Encoding.ASCII.GetBytes("gitpolar SolidWorks display mesh; millimeters").CopyTo(header,0);writer.Write(header);writer.Write((uint)(triangles.Count/9));
      for(int i=0;i<triangles.Count;i+=9){double ax=triangles[i+3]-triangles[i],ay=triangles[i+4]-triangles[i+1],az=triangles[i+5]-triangles[i+2],bx=triangles[i+6]-triangles[i],by=triangles[i+7]-triangles[i+1],bz=triangles[i+8]-triangles[i+2];double nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,len=Math.Sqrt(nx*nx+ny*ny+nz*nz);writer.Write((float)(len==0?0:nx/len));writer.Write((float)(len==0?0:ny/len));writer.Write((float)(len==0?0:nz/len));for(int j=0;j<9;j++){if(float.IsNaN(triangles[i+j])||float.IsInfinity(triangles[i+j]))throw new InvalidOperationException("Non-finite mesh coordinates.");writer.Write(triangles[i+j]);}writer.Write((ushort)0);}
      writer.Flush();return stream.ToArray();
    }
  }
  public static Dictionary<string,object> Export(string root,string source,string configuration){
    root=Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
    var priorPids=new HashSet<int>();foreach(var p in Process.GetProcessesByName("SLDWORKS"))priorPids.Add(p.Id);
    ISldWorks app=null;IModelDoc2 document=null;bool ownApp=false,ownDocument=false;string previousTitle=null;bool previousCommand=false,commandCaptured=false;
    try{
      try{app=(ISldWorks)Marshal.GetActiveObject("SldWorks.Application");}catch(COMException){app=(ISldWorks)Activator.CreateInstance(Type.GetTypeFromProgID("SldWorks.Application"));}
      ownApp=!priorPids.Contains(app.GetProcessID());if(ownApp)app.Visible=false;previousCommand=app.CommandInProgress;commandCaptured=true;app.CommandInProgress=true;
      var active=app.IActiveDoc2;if(active!=null)previousTitle=active.GetTitle();
      var priorDocuments=new HashSet<string>(StringComparer.OrdinalIgnoreCase);for(var check=(IModelDoc2)app.GetFirstDocument();check!=null;check=(IModelDoc2)check.GetNext()){var saved=check.GetPathName();if(!String.IsNullOrEmpty(saved))priorDocuments.Add(saved);if(!String.IsNullOrEmpty(saved)&&saved.StartsWith(root,StringComparison.OrdinalIgnoreCase)&&check.GetSaveFlag())throw new InvalidOperationException("Save all project documents before exporting: "+saved);}
      document=(IModelDoc2)app.GetOpenDocumentByName(source);ownDocument=document==null;
      if(document==null){int e=0,w=0;document=(IModelDoc2)app.OpenDoc6(source,Path.GetExtension(source).Equals(".sldasm",StringComparison.OrdinalIgnoreCase)?2:1,3,"",ref e,ref w);if(document==null)throw new InvalidOperationException("Cannot open saved document: "+e);if(e!=0)Console.WriteLine("SolidWorks load flags: "+e+"; resolved components will be checked individually.");}
      if(!String.Equals(Path.GetFullPath(document.GetPathName()),Path.GetFullPath(source),StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("SolidWorks opened another document with the same filename.");
      var currentConfig=((IConfiguration)document.ConfigurationManager.ActiveConfiguration).Name;
      if(!String.IsNullOrEmpty(configuration)&&configuration!=currentConfig){if(!ownDocument)throw new InvalidOperationException("Activate and save the requested configuration in SolidWorks before exporting.");if(!document.ShowConfiguration2(configuration))throw new InvalidOperationException("Configuration not found: "+configuration);}
      configuration=((IConfiguration)document.ConfigurationManager.ActiveConfiguration).Name;
      int activation=0;if(app.ActivateDoc3(document.GetTitle(),false,1,ref activation)==null)throw new InvalidOperationException("Cannot activate the export document: "+activation);
      bool assembly=Path.GetExtension(source).Equals(".sldasm",StringComparison.OrdinalIgnoreCase);
      if(assembly)((IAssemblyDoc)document).ResolveAllLightWeightComponents(false);
      document.GraphicsRedraw2();
      var dependencies=new HashSet<string>(StringComparer.OrdinalIgnoreCase);dependencies.Add(Path.GetFullPath(source));
      var unresolved=new HashSet<string>(StringComparer.OrdinalIgnoreCase);var nonGeometric=new List<string>();
      var refs=app.GetDocumentDependencies2(source,true,false,false) as Array;
      if(refs!=null)for(int i=1;i<refs.Length;i+=2){string file=Convert.ToString(refs.GetValue(i));if(String.IsNullOrEmpty(file)||Cached(file))continue;if(File.Exists(file)){Relative(file,root);dependencies.Add(Path.GetFullPath(file));}else unresolved.Add(file);}
      var instances=new List<Dictionary<string,object>>();
      var componentArray=assembly?((IAssemblyDoc)document).GetComponents(false) as object[]:null;
      var hidden=new HashSet<string>();if(componentArray!=null)foreach(var obj in componentArray){var c=(IComponent2)obj;if(c.IsSuppressed()||c.IsHidden(true))hidden.Add(c.Name2);}
      Func<IComponent2,bool> isVisible=c=>{var name=c.Name2;for(;;){if(hidden.Contains(name))return false;int slash=name.LastIndexOf('/');if(slash<0)return true;name=name.Substring(0,slash);}};
      if(componentArray!=null)foreach(var obj in componentArray){var c=(IComponent2)obj;var file=ComponentSource(c,root,source);if(file!=null)dependencies.Add(file);else if(isVisible(c))throw new InvalidOperationException("Visible component must be saved inside the repository: "+c.Name2+" "+c.GetPathName());else unresolved.Add(c.GetPathName());}
      var sourceHashes=new Dictionary<string,string>();foreach(var dep in dependencies){string relative=Relative(dep,root);if(!File.Exists(dep))throw new InvalidOperationException("Missing or virtual component. Save it as a file in this repository: "+dep);sourceHashes[relative]=FileHash(dep);}
      var assetDirectory=Path.Combine(root,".gitpolar","previews");Directory.CreateDirectory(assetDirectory);int reused=0,written=0;
      var seenAssets=new HashSet<string>();
      var meshCache=new Dictionary<string,byte[]>();
      Action<IBody2,string,string,string,double[],int,string,Array> add=(body,id,file,config,matrix,index,cacheKey,directTriangles)=>{
        byte[] mesh;try{if(cacheKey==null||!meshCache.TryGetValue(cacheKey,out mesh)){mesh=Mesh(body,directTriangles);if(cacheKey!=null)meshCache[cacheKey]=mesh;}}catch(Exception e){throw new InvalidOperationException("Cannot export "+id+" / "+body.Name+": "+e.Message,e);}if(mesh.Length==0){nonGeometric.Add(id+" / "+body.Name+" (untessellated sheet area <= 0.0001 mm2)");return;}string hash=Hash(mesh),relative=".gitpolar/previews/"+hash+".stl",target=Path.Combine(root,relative.Replace('/',Path.DirectorySeparatorChar));
        if(seenAssets.Add(hash)){if(File.Exists(target)){if(FileHash(target)!=hash)throw new InvalidOperationException("Existing preview asset is corrupt: "+target);reused++;}else{File.WriteAllBytes(target,mesh);written++;}}
        string name=String.IsNullOrEmpty(body.Name)?"Body "+index:body.Name;
        instances.Add(new Dictionary<string,object>{{"id",id+"/body:"+name+":"+index},{"name",id+" / "+name},{"source",Relative(file,root)},{"configuration",config},{"path",relative},{"transform",matrix}});
      };
      if(assembly){
        var math=(IMathUtility)app.GetMathUtility();int processed=0;var directMeshes=new Dictionary<string,Array>();
        if(componentArray!=null)foreach(var obj in componentArray){var component=(IComponent2)obj;if(!isVisible(component))continue;var rawFile=component.GetPathName();if(!Path.GetExtension(rawFile).Equals(".sldprt",StringComparison.OrdinalIgnoreCase))continue;var file=ComponentSource(component,root,source);
          if(++processed%50==0)Console.WriteLine("Exporting part instance "+processed+"; bodies "+instances.Count+"; unique assets "+seenAssets.Count);
          var model=(IModelDoc2)component.GetModelDoc2();if(model==null)throw new InvalidOperationException("Resolve the component before exporting: "+component.Name2);
          string directKey=rawFile+"\0"+component.ReferencedConfiguration;Array directTriangles;
          if(!directMeshes.TryGetValue(directKey,out directTriangles)){directTriangles=null;var visibleBodies=((IPartDoc)model).GetBodies2(-1,false) as object[];if(visibleBodies!=null&&visibleBodies.Length==1&&((IConfiguration)model.ConfigurationManager.ActiveConfiguration).Name==component.ReferencedConfiguration){var values=((IPartDoc)model).GetTessTriangles(true) as Array;if(values!=null&&values.Length>0&&values.Length%9==0)directTriangles=values;}directMeshes[directKey]=directTriangles;}
          var matrix=Matrix(math,(IMathTransform)component.Transform2);int count=0;
          foreach(int type in new int[]{0,1}){object info;var bodies=component.GetBodies3(type,out info) as object[];var flags=info as Array;if(bodies!=null)for(int bi=0;bi<bodies.Length;bi++){var body=(IBody2)bodies[bi];if(!body.Visible)continue;string cacheKey=flags!=null&&bi<flags.Length&&Convert.ToInt32(flags.GetValue(bi))==1?rawFile+"\0"+component.ReferencedConfiguration+"\0"+body.Name+"\0"+count:null;add(body,component.Name2,file,component.ReferencedConfiguration,matrix,count++,cacheKey,cacheKey==null?null:directTriangles);}}
          if(count==0)nonGeometric.Add(component.Name2);
        }
      }else{
        var part=(IPartDoc)document;int count=0;foreach(int type in new int[]{0,1}){var bodies=part.GetBodies2(type,true) as object[];if(bodies!=null)foreach(var obj in bodies)add((IBody2)obj,Path.GetFileNameWithoutExtension(source),source,configuration,Matrix(null,null),count++,null,null);}
      }
      if(instances.Count==0)throw new InvalidOperationException("The selected configuration has no visible solid or surface bodies.");
      foreach(var pair in sourceHashes){var absolute=Path.Combine(root,pair.Key.Replace('/',Path.DirectorySeparatorChar));if(FileHash(absolute)!=pair.Value)throw new InvalidOperationException("A source changed while exporting: "+pair.Key);}
      for(var check=(IModelDoc2)app.GetFirstDocument();check!=null;check=(IModelDoc2)check.GetNext()){var saved=check.GetPathName();if(!String.IsNullOrEmpty(saved)&&saved.StartsWith(root,StringComparison.OrdinalIgnoreCase)&&check.GetSaveFlag()&&check!=document&&priorDocuments.Contains(saved))throw new InvalidOperationException("A dependency has unsaved changes: "+saved);}
      return new Dictionary<string,object>{{"source",Relative(source,root)},{"configuration",configuration},{"components",instances},{"sourceHashes",sourceHashes},{"writtenAssets",written},{"reusedAssets",reused},{"uniqueAssets",seenAssets.Count},{"unresolvedReferences",unresolved},{"nonGeometricComponents",nonGeometric},{"exporter","SolidWorks saved or API-generated tessellation; mm"}};
    }finally{if(app!=null){if(commandCaptured)try{app.CommandInProgress=previousCommand;}catch{}if(ownDocument&&document!=null)try{app.CloseDoc(document.GetTitle());}catch{}if(ownApp)try{app.ExitApp();}catch{}else if(previousTitle!=null)try{int error=0;app.ActivateDoc3(previousTitle,false,1,ref error);}catch{}}}
  }
}
'@
Add-Type -TypeDefinition $code -ReferencedAssemblies $interop,System.Core
$result=[GitpolarSceneExporter]::Export($projectRoot,$sourcePath,$Configuration)
$statePath=Join-Path ([IO.Path]::GetTempPath()) ('gitpolar-scene-'+[Guid]::NewGuid().ToString('N')+'.json')
[IO.File]::WriteAllText($statePath,(@{root=$projectRoot;source=$sourcePath;result=$result}|ConvertTo-Json -Depth 24 -Compress),$utf8)
Write-Host ('Export checkpoint: '+$statePath)
# A temporary index batches LFS clean filters without changing the caller's staging area.
$relativePaths=@($result['sourceHashes'].Keys)+@($result['components']|ForEach-Object{$_['path']})
$relativePaths=@($relativePaths|Sort-Object -Unique)
$exportId=[Guid]::NewGuid().ToString('N')
$tempIndex=Join-Path ([IO.Path]::GetTempPath()) ('gitpolar-export-'+$exportId+'.index')
$pathspecFile=$tempIndex+'.paths'
$previousIndex=$env:GIT_INDEX_FILE
$blobIds=@{}
try{
  $specs=@($relativePaths|ForEach-Object{':(literal)'+$_})
  [IO.File]::WriteAllText($pathspecFile,($specs -join [char]0)+[char]0,$utf8)
  $env:GIT_INDEX_FILE=$tempIndex
  $addOutput=& git -C $projectRoot add -f ('--pathspec-from-file='+$pathspecFile) --pathspec-file-nul 2>&1
  if($LASTEXITCODE -ne 0){throw ('Cannot filter preview sources: '+($addOutput -join [char]10))}
  $indexOutput=& git -C $projectRoot ls-files --stage -z
  if($LASTEXITCODE -ne 0){throw 'Cannot read filtered preview object IDs.'}
  foreach($record in (($indexOutput -join [char]10).Split([char]0))){if($record -match '^[0-7]{6} ([a-f0-9]{40}) 0\t(.+)$'){$blobIds[$matches[2]]=$matches[1]}}
  if($blobIds.Count -ne $relativePaths.Count){throw 'Filtered object IDs are incomplete.'}
}finally{
  $env:GIT_INDEX_FILE=$previousIndex
  foreach($temporary in @($tempIndex,$tempIndex+'.lock',$pathspecFile)){if([IO.File]::Exists($temporary)){Remove-Item -LiteralPath $temporary -Force}}
}
function Git-BlobId([string]$Relative){
  if(-not $blobIds.ContainsKey($Relative)){throw ('Missing filtered blob ID: '+$Relative)}
  return $blobIds[$Relative]
}
$dependencies=@()
foreach($relative in ($result['sourceHashes'].Keys|Sort-Object)){
  $dependencies+=@{path=$relative;oid=(Git-BlobId $relative)}
  if([GitpolarSceneExporter]::FileHash((Join-Path $projectRoot $relative)) -ne $result['sourceHashes'][$relative]){throw ('A source changed before registration: '+$relative)}
}
$assetOids=@{}
foreach($component in $result['components']){
  if(-not $assetOids.ContainsKey($component['path'])){$assetOids[$component['path']]=Git-BlobId $component['path']}
  $component['previewOid']=$assetOids[$component['path']]
}
$manifestPath=Join-Path $projectRoot '.gitpolar/previews.json'
$entries=@()
if([IO.File]::Exists($manifestPath)){
  $old=[IO.File]::ReadAllText($manifestPath,$utf8)|ConvertFrom-Json
  if(@(1,2)-notcontains $old.version){throw 'Unsupported existing manifest version.'}
  $entries=@($old.previews|Where-Object{$_.source -ne $result['source']})
}
$entries+=@{source=$result['source'];configuration=$result['configuration'];dependencies=$dependencies;components=@($result['components']);unresolvedReferences=@($result['unresolvedReferences']);nonGeometricComponents=@($result['nonGeometricComponents']);exporter=$result['exporter'];generatedAt=[DateTime]::UtcNow.ToString('o')}
$manifest=@{version=2;previews=@($entries)}|ConvertTo-Json -Depth 16 -Compress
[IO.File]::WriteAllText($manifestPath,$manifest+[char]10,$utf8)
Write-Host ('Registered '+$result['source']+' ('+$result['configuration']+'): '+$result['components'].Count+' body instances; '+$result['writtenAssets']+' new assets; '+$result['reusedAssets']+' reused assets.')
if($result['unresolvedReferences'].Count){Write-Host ('Historical or suppressed references not available: '+$result['unresolvedReferences'].Count+'. Visible geometric components were checked; details are recorded in the manifest.')}
Write-Host 'Commit the saved CAD documents, .gitpolar/previews.json and new .gitpolar/previews/ assets together. Unchanged assets need no new copy.'
