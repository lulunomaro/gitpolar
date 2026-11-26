[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Workspace,[double]$ExpectedThicknessMm=[double]::NaN,[string]$Dimension='D1@gitpolarPlate',[string]$AssemblyDirectory,[string]$Report)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if(-not $AssemblyDirectory){$AssemblyDirectory=Join-Path $PSScriptRoot 'bin-native'}
$references=@('System.dll','System.Core.dll')
foreach($name in @('SolidWorks.Interop.sldworks.dll','SolidWorks.Interop.swpublished.dll','Gitpolar.SolidWorks.dll')){$file=Join-Path $AssemblyDirectory $name;[void][Reflection.Assembly]::LoadFrom($file);$references+=$file}
Add-Type -ReferencedAssemblies $references -TypeDefinition @'
using System;using System.IO;using System.Linq;using System.Collections.Generic;using SolidWorks.Interop.sldworks;using Gitpolar.SolidWorks;
public static class VerifyCadMergeResult {
 public static object Run(object instance,string workspace,double expected,string parameter){
  workspace=Path.GetFullPath(workspace).TrimEnd(Path.DirectorySeparatorChar);var session=CadMergeStore.Load(workspace);if(session==null||session.State!="completed"||RepositoryGit.Merging(workspace))throw new Exception("No completed manual merge to verify.");string oid=Git.Run(workspace,"rev-parse","HEAD").Trim();string[] parents=Git.Run(workspace,"show","-s","--format=%P",oid).Trim().Split(' ');if(oid!=session.Commit||parents.Length!=2||parents[0]!=session.Ours||parents[1]!=session.Theirs)throw new Exception("Merge parent identity does not match the reviewed session.");
  foreach(var output in session.Applied)if(CadMergeStore.Hash(GitpolarPane.SafePath(workspace,output.Target))!=output.Hash)throw new Exception("A result file changed after application: "+output.Target);
  var sw=(ISldWorks)instance;string root=GitpolarPane.SafePath(workspace,session.Target);var doc=(IModelDoc2)sw.GetOpenDocumentByName(root);if(doc==null||!String.Equals(doc.GetPathName(),root,StringComparison.OrdinalIgnoreCase))throw new Exception("Open the saved result assembly in SolidWorks first.");((IAssemblyDoc)doc).ResolveAllLightWeightComponents(false);var parts=new List<object>();var dimensions=new List<double>();
  foreach(IComponent2 component in ((object[])((IAssemblyDoc)doc).GetComponents(false))){string file=component.GetPathName();if(String.IsNullOrEmpty(file)||!Path.GetFullPath(file).StartsWith(workspace+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("A component still references a temporary or external file: "+file);var model=(IModelDoc2)component.GetModelDoc2();if(model==null)throw new Exception("An assembly component could not be resolved: "+file);var dimension=model.IParameter(parameter);if(dimension!=null)dimensions.Add(dimension.SystemValue*1000);parts.Add(new {path=file,thicknessMm=dimension==null?(double?)null:dimension.SystemValue*1000});}
  if(!Double.IsNaN(expected)&&(dimensions.Count==0||dimensions.Any(value=>Math.Abs(value-expected)>1e-6)))throw new Exception("The saved CAD result does not have the expected edited thickness.");if(doc.GetSaveFlag())throw new Exception("The saved result assembly has unsaved changes.");
  return new {ok=true,commit=oid,parents=parents,exactTwoParents=true,appliedFiles=session.Applied.Select(file=>file.Target).ToArray(),appliedBytesMatch=true,allReferencesInRepository=true,dimensionsMm=dimensions,components=parts};
 }
}
'@
$sw=[Runtime.InteropServices.Marshal]::GetActiveObject('SldWorks.Application')
$result=[VerifyCadMergeResult]::Run($sw,$Workspace,$ExpectedThicknessMm,$Dimension)|ConvertTo-Json -Depth 7
if($Report){[IO.File]::WriteAllText([IO.Path]::GetFullPath($Report),$result,[Text.UTF8Encoding]::new($false))}
Write-Output $result
