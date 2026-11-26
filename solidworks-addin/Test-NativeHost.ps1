[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Workspace,[string]$Report,[string]$ScreenshotDirectory,[string]$PartTemplate)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$taskPlugin=Join-Path $env:LOCALAPPDATA 'gitpolar\solidworks\plugin'
$taskInterop=Join-Path $taskPlugin 'SolidWorks.Interop.sldworks.dll'
Add-Type -Path $taskInterop
Add-Type -ReferencedAssemblies $taskInterop -TypeDefinition @'
using System;using System.IO;using System.Collections.Generic;using SolidWorks.Interop.sldworks;
public sealed class HostDocument {public string File;public string Title;public int Kind;public bool ReadOnly;}
public static class NativeHostFixture {
 public static object Api(object instance){return ((ISldWorks)instance).GetAddInObject("Gitpolar.SolidWorks.Addin");}
 public static HostDocument[] CloseSavedWorkspace(object instance,string workspace){var app=(ISldWorks)instance;var files=new List<HostDocument>();workspace=Path.GetFullPath(workspace).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;for(var doc=(IModelDoc2)app.GetFirstDocument();doc!=null;doc=(IModelDoc2)doc.GetNext()){string path=doc.GetPathName();if(doc.GetSaveFlag()||String.IsNullOrEmpty(path)||!Path.GetFullPath(path).StartsWith(workspace,StringComparison.OrdinalIgnoreCase))throw new Exception("Host test requires only saved documents from its explicit fixture workspace.");files.Add(new HostDocument(){File=path,Title=doc.GetTitle(),Kind=doc.GetType(),ReadOnly=doc.IsOpenedReadOnly()});}foreach(var item in files)if(app.GetOpenDocumentByName(item.File)!=null)app.CloseDoc(item.Title);return files.ToArray();}
 public static void Restore(object instance,HostDocument[] files,string active){var app=(ISldWorks)instance;foreach(var file in files){if(app.GetOpenDocumentByName(file.File)!=null)continue;int errors=0,warnings=0;if(app.OpenDoc6(file.File,file.Kind,file.ReadOnly?3:1,"",ref errors,ref warnings)==null)throw new Exception("Cannot restore fixture document: "+file.File);}if(!String.IsNullOrEmpty(active)){int error=0;app.ActivateDoc3(active,false,0,ref error);}}
 public static string NewPart(object instance,string template){var app=(ISldWorks)instance;if(String.IsNullOrEmpty(template))template=app.GetUserPreferenceStringValue(8);if(!File.Exists(template))throw new Exception("Default part template is unavailable.");var doc=(IModelDoc2)app.NewDocument(template,0,0,0);if(doc==null||doc.GetType()!=1||doc.GetPathName().Length>0)throw new Exception("Cannot create an unsaved test part.");return doc.GetTitle();}
 public static string OpenReadOnlyCopy(object instance,string source,string copy){var app=(ISldWorks)instance;File.Copy(source,copy,false);int errors=0,warnings=0;var doc=(IModelDoc2)app.OpenDoc6(copy,1,3,"",ref errors,ref warnings);if(doc==null||!doc.IsOpenedReadOnly())throw new Exception("Cannot open the read-only test copy.");return doc.GetTitle();}
 public static void Close(object instance,string title){((ISldWorks)instance).CloseDoc(title);}
 public static string Active(object instance){var doc=((ISldWorks)instance).IActiveDoc2;return doc==null?"":doc.GetPathName();}
}
'@
$taskSw=[Runtime.InteropServices.Marshal]::GetActiveObject('SldWorks.Application')
$taskApi=[NativeHostFixture]::Api($taskSw)
function Invoke-Native([string]$taskMethod,[string[]]$taskArguments=@()){try{return $taskApi.GetType().InvokeMember($taskMethod,[Reflection.BindingFlags]::InvokeMethod,$null,$taskApi,$taskArguments)}catch{throw ("Native method failed: "+$taskMethod+" :: "+$_.Exception.ToString())}}
function Read-Native {return (Invoke-Native 'GetStateJson'|ConvertFrom-Json)}
function Wait-Native([scriptblock]$taskCondition){$taskTimer=[Diagnostics.Stopwatch]::StartNew();do{$taskSnapshot=Read-Native;if(& $taskCondition $taskSnapshot){return $taskSnapshot};Start-Sleep -Milliseconds 100}while($taskTimer.Elapsed.TotalSeconds -lt 30);throw ('Native context did not settle: '+($taskSnapshot|ConvertTo-Json -Compress -Depth 8))}
$taskInitial=Wait-Native {param($state) -not $state.loading -and -not $state.previewRendering -and -not $state.sidebarLoading}
$taskActive=[NativeHostFixture]::Active($taskSw)
$taskSaved=@()
$taskUnsaved=''
$taskReadOnly=''
$taskModes=@()
try{
  if($taskInitial.contextRefreshMode -ne 'deferred-poll'){throw 'Expected deferred CAD context polling.'}
  if(@($taskInitial.commandTabs|Where-Object {-not $_.registered}).Count){throw 'A part, assembly, or drawing CommandManager tab is missing.'}
  $taskSaved=[NativeHostFixture]::CloseSavedWorkspace($taskSw,$Workspace)
  $taskNone=Wait-Native {param($state) $state.cadContext.DocumentType -eq 0 -and -not $state.checkpointEnabled -and $state.sidebarCad -match '尚未打开'}
  if((Invoke-Native 'CanSaveCheckpoint') -ne 0){throw 'Save command is enabled with no CAD document.'}
  [NativeHostFixture]::Restore($taskSw,$taskSaved,$taskActive)
  $taskEditable=Wait-Native {param($state) $state.cadContext.CanSave -and $state.checkpointEnabled}
  $taskUnsaved=[NativeHostFixture]::NewPart($taskSw,$PartTemplate)
  $taskNew=Wait-Native {param($state) $state.cadContext.DocumentType -eq 1 -and $state.cadContext.File -eq '' -and -not $state.checkpointEnabled -and $state.sidebarCad -match '另存'}
  if((Invoke-Native 'CanSaveCheckpoint') -ne 0){throw 'Save command is enabled for a new unsaved part.'}
  [NativeHostFixture]::Close($taskSw,$taskUnsaved);$taskUnsaved=''
  $taskCopy=Join-Path $env:TEMP ('gitpolar-host-readonly-'+[guid]::NewGuid().ToString('N')+'.SLDPRT')
  $taskSource=Join-Path $Workspace '零件\电池板.SLDPRT'
  $taskReadOnly=[NativeHostFixture]::OpenReadOnlyCopy($taskSw,$taskSource,$taskCopy)
  $taskReadonlyState=Wait-Native {param($state) $state.cadContext.ReadOnly -and -not $state.checkpointEnabled -and $state.sidebarCad -match '只读'}
  if((Invoke-Native 'CanSaveCheckpoint') -ne 0){throw 'Save command is enabled on a read-only document.'}
  [NativeHostFixture]::Close($taskSw,$taskReadOnly);$taskReadOnly=''
  [NativeHostFixture]::Restore($taskSw,$taskSaved,$taskActive)
  foreach($taskMode in @('toolbar','window','sidebar')){
    Invoke-Native 'SetDisplayMode' @($taskMode)|Out-Null
    $taskModeState=Wait-Native {param($state) $state.displayMode -eq $taskMode -and -not $state.loading}
    if($taskMode -eq 'window' -and -not $taskModeState.visible){throw 'Independent Git Graph did not open.'}
    if($taskMode -ne 'window' -and $taskModeState.visible){throw ('Git Graph did not hide in '+$taskMode+' mode.')}
    $taskModes+=$taskMode
  }
  $taskFinal=Wait-Native {param($state) $state.cadContext.File -eq $taskActive -and $state.checkpointEnabled -and -not $state.sidebarLoading}
  if($taskFinal.contextUpdates -le $taskInitial.contextUpdates){throw 'CAD context did not update after document switches.'}
  if($ScreenshotDirectory){[void](New-Item -ItemType Directory -Path $ScreenshotDirectory -Force);Invoke-Native 'SaveSidebarScreenshot' @((Join-Path $ScreenshotDirectory 'gitpolar-native-cad-context.png'))|Out-Null}
  $taskResult=[pscustomobject]@{ok=$true;version=$taskFinal.version;noDocumentDisabled=$true;unsavedPartDisabled=$true;readOnlyDisabled=$true;editableAssemblyEnabled=$true;contextUpdates=($taskFinal.contextUpdates-$taskInitial.contextUpdates);partAssemblyDrawingTabs=$true;modes=$taskModes;activeRestored=($taskFinal.cadContext.File -eq $taskActive);sidebarCad=$taskFinal.sidebarCad;sidebarStatus=$taskFinal.sidebarStatus}
  if($Report){[IO.File]::WriteAllText([IO.Path]::GetFullPath($Report),($taskResult|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))}
  $taskResult|ConvertTo-Json -Compress -Depth 8
}finally{
  if($taskUnsaved){[NativeHostFixture]::Close($taskSw,$taskUnsaved)}
  if($taskReadOnly){[NativeHostFixture]::Close($taskSw,$taskReadOnly)}
  [NativeHostFixture]::Restore($taskSw,$taskSaved,$taskActive)
  Invoke-Native 'SetDisplayMode' @($taskInitial.displayMode)|Out-Null
  if($taskInitial.selected){Invoke-Native 'SelectRevision' @($taskInitial.selected,$taskInitial.baseline,$taskInitial.path)|Out-Null}
}
