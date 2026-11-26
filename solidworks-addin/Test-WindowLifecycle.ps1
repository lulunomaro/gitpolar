[CmdletBinding()]
param([string]$AssemblyDirectory,[int]$Cycles=12)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if(-not $AssemblyDirectory){$AssemblyDirectory=Join-Path $PSScriptRoot 'bin-native'}
$references=@('System.dll','System.Core.dll','System.Windows.Forms.dll','System.Drawing.dll')
foreach($name in @('SolidWorks.Interop.sldworks.dll','SolidWorks.Interop.swpublished.dll','Gitpolar.SolidWorks.dll')){$path=Join-Path $AssemblyDirectory $name;[void][Reflection.Assembly]::LoadFrom($path);$references+=$path}
$fixture=Join-Path $env:TEMP ('gitpolar-window-test-'+[guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $fixture)
[void][Gitpolar.SolidWorks.Git]::Run($fixture,[string[]]@('init','--initial-branch=main'))
[void][Gitpolar.SolidWorks.Git]::Run($fixture,[string[]]@('config','user.name','Window Test'))
[void][Gitpolar.SolidWorks.Git]::Run($fixture,[string[]]@('config','user.email','window@test.invalid'))
[IO.File]::WriteAllText((Join-Path $fixture 'README.md'),'lifecycle fixture')
[void][Gitpolar.SolidWorks.Git]::Run($fixture,[string[]]@('add','.'))
[void][Gitpolar.SolidWorks.Git]::Run($fixture,[string[]]@('commit','-m','base'))
Add-Type -ReferencedAssemblies $references -TypeDefinition @'
using System;using System.IO;using System.Linq;using System.Collections.Generic;using System.Reflection;using System.Threading;using System.Threading.Tasks;using System.Windows.Forms;using Gitpolar.SolidWorks;
public static class GitpolarWindowTest {
  sealed class Host:Form {public Host(){Opacity=0;ShowInTaskbar=false;Text="gitpolar lifecycle test";}protected override bool ShowWithoutActivation{get{return true;}}}
  public static object Run(string workspace,int cycles){
    var errors=new List<string>();int disposed=0,late=0;bool contextPreserved=true;var assembly=typeof(GitpolarPane).Assembly;var controller=new GitpolarPane(null);controller.Settings.Workspace=workspace;controller.Settings.Repository="lifecycle-test";
    ThreadExceptionEventHandler exception=(sender,args)=>{lock(errors)errors.Add(args.Exception.ToString());};Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);Application.ThreadException+=exception;
    using(var host=new Host()){
      host.Shown+=async(sender,args)=>{try{
        controller.AttachDispatcher(host);
        for(int i=0;i<cycles;i++){
          foreach(string type in new string[]{"GraphForm","BranchManagerForm"}){
            var arguments=type=="GraphForm"?new object[]{controller}:new object[]{controller,""};
            var form=(Form)Activator.CreateInstance(assembly.GetType("Gitpolar.SolidWorks."+type),BindingFlags.Instance|BindingFlags.Public|BindingFlags.NonPublic,null,arguments,null);form.Opacity=0;form.ShowInTaskbar=false;form.Show(host);
            await Task.Delay(i%3==0?1:15);form.Close();form.Dispose();disposed++;await Task.Delay(65);
          }
          var previous=SynchronizationContext.Current;controller.StartUi(async()=>{await Task.Delay(1);});contextPreserved&=Object.ReferenceEquals(previous,SynchronizationContext.Current);
        }
        controller.StartUi(async()=>{await Task.Delay(350);Interlocked.Increment(ref late);});controller.Stop();await Task.Delay(30);
      }catch(Exception error){lock(errors)errors.Add(error.ToString());}finally{controller.Stop();host.Close();}};
      Application.Run(host);
    }
    // The delayed continuation now tries to post after the dispatcher has been destroyed.
    Thread.Sleep(700);Application.ThreadException-=exception;
    return new {ok=errors.Count==0&&late==0&&contextPreserved,windowsClosed=disposed,lateCallbacks=late,hostContextPreserved=contextPreserved,errors=errors.ToArray()};
  }
}
'@
$log=Join-Path $env:LOCALAPPDATA 'gitpolar\solidworks\plugin.log'
$before=if(Test-Path -LiteralPath $log){(Get-Item -LiteralPath $log).Length}else{0}
$result=[GitpolarWindowTest]::Run($fixture,$Cycles)
if(Test-Path -LiteralPath $log){$bytes=[IO.File]::ReadAllBytes($log);if($bytes.Length -gt $before){$new=[Text.Encoding]::UTF8.GetString($bytes,[int]$before,$bytes.Length-[int]$before);if($new.Contains('ObjectDisposedException')){throw ('Window disposal exception was logged: '+$new)}}}
$result|ConvertTo-Json -Compress -Depth 5
if(-not $result.ok){throw 'Native window lifecycle validation failed.'}
