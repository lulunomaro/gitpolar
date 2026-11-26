[CmdletBinding()]
param([string]$Report)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$taskInterop='D:\SOLDWORKS\SOLIDWORKS\api\redist\SolidWorks.Interop.sldworks.dll'
Add-Type -Path $taskInterop
Add-Type -ReferencedAssemblies $taskInterop,'System.Drawing.dll' -TypeDefinition @"
using System;using System.Drawing;using System.Collections.Generic;using System.Runtime.InteropServices;using System.Text;using SolidWorks.Interop.sldworks;
public static class TaskPaneEmbeddingFixture {
 [StructLayout(LayoutKind.Sequential)] struct RECT {public int Left,Top,Right,Bottom;public Rectangle Value{get{return Rectangle.FromLTRB(Left,Top,Right,Bottom);}}}
 delegate bool EnumProc(IntPtr h,IntPtr data);
 [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsChild(IntPtr parent,IntPtr child);
 [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h,EnumProc proc,IntPtr data);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h,StringBuilder text,int length);
 public static object Api(object app){return ((ISldWorks)app).GetAddInObject("Gitpolar.SolidWorks.Addin");}
 public static int Height(object app){return ((ISldWorks)app).FrameHeight;}
 public static void Height(object app,int height){((ISldWorks)app).FrameHeight=height;}
 public static void Resources(object app){if(!((ISldWorks)app).ActivateTaskPane(3))throw new Exception("Could not activate the built-in Task Pane.");}
 public static object Verify(long paneHandle,long hostHandle){
  var pane=new IntPtr(paneHandle);var host=new IntPtr(hostHandle);RECT pr,hr;GetWindowRect(pane,out pr);GetWindowRect(host,out hr);
  if(!IsWindowVisible(host)||!IsWindowVisible(pane))throw new Exception("The selected Task Pane or embedded host is hidden.");
  if(!IsChild(pane,host))throw new Exception("The sidebar is not a native child of its SolidWorks Task Pane.");
  if(pr.Value!=hr.Value)throw new Exception("Native sidebar bounds do not fill the SolidWorks view: "+hr.Value+" vs "+pr.Value);
  Rectangle clipped=hr.Value;IntPtr ancestor=GetParent(host);while(ancestor!=IntPtr.Zero){RECT ar;GetWindowRect(ancestor,out ar);clipped=Rectangle.Intersect(clipped,ar.Value);if(ancestor==pane)break;ancestor=GetParent(ancestor);}
  if(clipped!=hr.Value)throw new Exception("An intermediate native window clips the sidebar.");
  var controls=new List<object>();var required=new HashSet<string>{"打开完整 Git Graph","分支管理 / 合并","保存当前成果"};
  EnumChildWindows(host,(h,data)=>{var text=new StringBuilder(256);GetWindowText(h,text,256);if(required.Contains(text.ToString())){RECT r;GetWindowRect(h,out r);if(!IsWindowVisible(h)||!hr.Value.Contains(r.Value))throw new Exception("A primary action is clipped or hidden: "+text);controls.Add(new {text=text.ToString(),width=r.Right-r.Left,height=r.Bottom-r.Top});required.Remove(text.ToString());}return true;},IntPtr.Zero);
  if(required.Count!=0)throw new Exception("Primary sidebar actions were not found.");
  return new {width=hr.Right-hr.Left,height=hr.Bottom-hr.Top,nativeChild=true,unclipped=true,actions=controls};
 }
}
"@
$taskSw=[Runtime.InteropServices.Marshal]::GetActiveObject('SldWorks.Application')
$taskApi=[TaskPaneEmbeddingFixture]::Api($taskSw)
function Invoke-Native([string]$Method,[string[]]$Values=@()){return $taskApi.GetType().InvokeMember($Method,[Reflection.BindingFlags]::InvokeMethod,$null,$taskApi,$Values)}
function Read-Native{return (Invoke-Native 'GetStateJson'|ConvertFrom-Json)}
function Wait-Native([scriptblock]$Condition){$taskClock=[Diagnostics.Stopwatch]::StartNew();do{$taskState=Read-Native;if(& $Condition $taskState){return $taskState};Start-Sleep -Milliseconds 100}while($taskClock.Elapsed.TotalSeconds -lt 20);throw ('Native embedding did not settle: '+($taskState|ConvertTo-Json -Compress -Depth 6))}
$taskInitial=Wait-Native {param($state) $state.sidebarHost.visible -and $state.taskpaneActive -and -not $state.sidebarLoading}
$taskHandle=$taskInitial.sidebarHost.hwnd
$taskHeight=[TaskPaneEmbeddingFixture]::Height($taskSw)
$taskSnapshots=@()
try{
 $taskSnapshots+=[TaskPaneEmbeddingFixture]::Verify($taskInitial.taskpaneWindow,$taskHandle)
 for($taskCycle=0;$taskCycle -lt 3;$taskCycle++){
  [TaskPaneEmbeddingFixture]::Resources($taskSw)
  $taskOther=Wait-Native {param($state) -not $state.taskpaneActive -and -not $state.sidebarHost.visible}
  $taskClock=[Diagnostics.Stopwatch]::StartNew();do{Start-Sleep -Milliseconds 100;$taskOther=Read-Native;if($taskOther.taskpaneActive){throw 'Visibility recovery took over a different selected Task Pane.'}}while($taskClock.Elapsed.TotalSeconds -lt 2.3)
  Invoke-Native 'OnShowSidebar'|Out-Null
  $taskSelected=Wait-Native {param($state) $state.taskpaneActive -and $state.sidebarHost.visible}
  if($taskSelected.sidebarHost.hwnd -ne $taskHandle){throw 'The native sidebar HWND changed while switching tabs.'}
  $taskSnapshots+=[TaskPaneEmbeddingFixture]::Verify($taskSelected.taskpaneWindow,$taskHandle)
 }
 [TaskPaneEmbeddingFixture]::Height($taskSw,[Math]::Max(720,$taskHeight-250))
 $taskShort=Wait-Native {param($state) $state.sidebarHost.height -lt $taskInitial.sidebarHost.height -and $state.sidebarHost.height -eq $state.sidebarHost.parentHeight}
 $taskSnapshots+=[TaskPaneEmbeddingFixture]::Verify($taskShort.taskpaneWindow,$taskHandle)
 [TaskPaneEmbeddingFixture]::Height($taskSw,$taskHeight)
 $taskRestored=Wait-Native {param($state) $state.sidebarHost.height -eq $taskInitial.sidebarHost.height}
 $taskSnapshots+=[TaskPaneEmbeddingFixture]::Verify($taskRestored.taskpaneWindow,$taskHandle)
 if($taskRestored.sidebarHost.handleCreations -ne 1){throw 'The embedded host handle was recreated.'}
 $taskResult=[pscustomobject]@{ok=$true;version=$taskRestored.version;startupVisible=$true;startupRecoveries=$taskInitial.sidebarHost.visibilityRecoveries;nativeHandleStable=$true;tabSwitches=3;respectsOtherTabs=$true;resizeRestored=$true;snapshots=$taskSnapshots}
 if($Report){[IO.File]::WriteAllText([IO.Path]::GetFullPath($Report),($taskResult|ConvertTo-Json -Depth 9),[Text.UTF8Encoding]::new($false))}
 $taskResult|ConvertTo-Json -Compress -Depth 9
}finally{[TaskPaneEmbeddingFixture]::Height($taskSw,$taskHeight);Invoke-Native 'OnShowSidebar'|Out-Null}
