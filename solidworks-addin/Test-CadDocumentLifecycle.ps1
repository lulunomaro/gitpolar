[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Workspace,[int]$Cycles=6,[string]$Report)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$taskInterop='D:\SOLDWORKS\SOLIDWORKS\api\redist\SolidWorks.Interop.sldworks.dll'
Add-Type -Path $taskInterop
Add-Type -ReferencedAssemblies $taskInterop -TypeDefinition @'
using System;using System.IO;using System.Linq;using System.Collections.Generic;using SolidWorks.Interop.sldworks;
public static class CadDocumentCycles {
 public static object Run(object instance,string workspace,int cycles){var app=(ISldWorks)instance;workspace=Path.GetFullPath(workspace).TrimEnd(Path.DirectorySeparatorChar);string assembly=Path.Combine(workspace,"机器人总装.SLDASM");int pid=app.GetProcessID();for(int i=0;i<cycles;i++){
  var owned=new List<KeyValuePair<string,string>>();for(var doc=(IModelDoc2)app.GetFirstDocument();doc!=null;doc=(IModelDoc2)doc.GetNext()){string file=doc.GetPathName();if(String.IsNullOrEmpty(file)||!file.StartsWith(workspace+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)||doc.GetSaveFlag())throw new Exception("Only saved fixture CAD documents may participate in this test.");owned.Add(new KeyValuePair<string,string>(file,doc.GetTitle()));}foreach(var item in owned)if(app.GetOpenDocumentByName(item.Key)!=null)app.CloseDoc(item.Value);if(app.GetFirstDocument()!=null)throw new Exception("The fixture did not close completely.");int errors=0,warnings=0;var opened=(IModelDoc2)app.OpenDoc6(assembly,2,1,"",ref errors,ref warnings);if(opened==null||!String.Equals(opened.GetPathName(),assembly,StringComparison.OrdinalIgnoreCase))throw new Exception("Cannot reopen the fixture assembly: "+errors);if(app.GetProcessID()!=pid)throw new Exception("SolidWorks process changed during document cycles.");
 }return new {ok=true,cycles=cycles,pid=pid,active=app.IActiveDoc2==null?"":app.IActiveDoc2.GetPathName()};}
}
'@
$taskSw=[Runtime.InteropServices.Marshal]::GetActiveObject('SldWorks.Application')
$taskResult=[CadDocumentCycles]::Run($taskSw,$Workspace,$Cycles)
if($Report){[IO.File]::WriteAllText([IO.Path]::GetFullPath($Report),($taskResult|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))}
$taskResult|ConvertTo-Json -Compress
