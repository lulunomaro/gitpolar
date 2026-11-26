using System;
using System.IO;
using System.Text;
using System.Linq;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swpublished;
using Environment = System.Environment;
[assembly: ComVisible(false)]
[assembly: System.Reflection.AssemblyTitle("gitpolar native Git Graph for SolidWorks")]
[assembly: System.Reflection.AssemblyVersion("0.6.5.5")]
namespace Gitpolar.SolidWorks {
  [ComVisible(true),Guid("5A6D62E9-30BE-442D-A072-0918367BB301"),InterfaceType(ComInterfaceType.InterfaceIsDual)]
  public interface IGitpolarAutomation {
    [DispId(1)] string GetStateJson();
    [DispId(2)] void SelectRevision(string head,string baseline,string path);
    [DispId(3)] void OpenRevision(string oid,string path);
    [DispId(4)] void SaveScreenshot(string path);
    [DispId(5)] void SetDisplayMode(string mode);
    [DispId(6)] void SaveSidebarScreenshot(string path);
    [DispId(10)] void OnQuickSave();
    [DispId(11)] void OnShowGraph();
    [DispId(12)] void OnShowSidebar();
    [DispId(13)] void OnDisplaySettings();
    [DispId(14)] void OnShowBranches();
    [DispId(15)] void OnPull();
    [DispId(16)] void OnPush();
    [DispId(20)] void RunRepositoryAction(string action,string json);
    [DispId(21)] void SaveBranchesScreenshot(string path);
    [DispId(22)] void CloseGraph();
    [DispId(23)] void CloseBranches();
    [DispId(24)] int CanSaveCheckpoint();
    [DispId(25)] int CanUseRepository();
  }
  [ComVisible(true),ComDefaultInterface(typeof(IGitpolarAutomation)),Guid("706C4152-8459-45E2-96DB-778DD8142F61"),ProgId("Gitpolar.SolidWorks.Addin"),ClassInterface(ClassInterfaceType.AutoDispatch)]
  public sealed partial class Addin : ISwAddin, IGitpolarAutomation {
    ISldWorks app;ITaskpaneView pane;TaskPaneHost taskHost;NativeTaskPane control;GitpolarPane controller;ICommandManager commands;ICommandGroup commandGroup;int[] commandIds=new int[0];readonly HashSet<int> registeredCommandTabs=new HashSet<int>();
    public bool ConnectToSW(object ThisSW,int Cookie){try{
      app=(ISldWorks)ThisSW;app.SetAddinCallbackInfo2(0,this,Cookie);string directory=Path.GetDirectoryName(typeof(Addin).Assembly.Location);
      object images=new int[]{20,32,40,64,96,128}.Select(size=>Path.Combine(directory,"icon-"+size+".png")).ToArray();
      pane=(ITaskpaneView)app.CreateTaskpaneView3(images,"gitpolar · Git Graph");if(pane==null)throw new InvalidOperationException("Cannot create gitpolar Task Pane.");
      controller=new GitpolarPane(app);control=new NativeTaskPane(controller);control.DisplayModeRequested+=SetDisplayMode;taskHost=new TaskPaneHost(control);taskHost.CreateControl();control.CreateControl();controller.AttachDispatcher(control);if(!pane.DisplayWindowFromHandlex64(taskHost.Handle.ToInt64()))throw new InvalidOperationException("Cannot attach native gitpolar panel.");taskHost.RecoverVisibility=RecoverSidebarVisibility;taskHost.Start();RegisterCommands(Cookie,directory);control.Start();SetDisplayMode(controller.Settings.DisplayMode);Log.Write("Connected gitpolar "+typeof(Addin).Assembly.GetName().Version+" · SolidWorks "+app.RevisionNumber());return true;
    }catch(Exception error){Log.Write(error.ToString());MessageBox.Show(error.Message,"gitpolar");return false;}}
    bool RecoverSidebarVisibility(){
      if(controller==null||controller.IsStopping||pane==null||controller.Settings.DisplayMode!="sidebar"||!pane.IsActiveTab()||!app.IsTaskPaneVisible()||!app.IsTaskPaneExpanded())return false;
      // At startup SW can retain the prior page while reporting the new tab active.
      // Select a built-in page before reactivating our page to complete native hosting.
      app.ActivateTaskPane(3);pane.ShowView();app.RefreshTaskpaneContent();taskHost.FitToParent();Log.Write("Reactivated gitpolar task pane after initial hidden host.");return true;
    }
    T OnUi<T>(Func<T> action){if(control!=null&&control.IsHandleCreated&&control.InvokeRequired)return (T)control.Invoke(action);return action();}
    void OnUi(Action action){if(controller!=null&&controller.IsStopping)return;if(control!=null&&control.IsHandleCreated&&control.InvokeRequired){control.Invoke(action);return;}action();}
    public string GetStateJson(){return OnUi(()=>ReadStateJson());}
    string ReadStateJson(){var json=new JavaScriptSerializer();var state=control==null?new Dictionary<string,object>():json.Deserialize<Dictionary<string,object>>(control.StateJson());state["version"]=typeof(Addin).Assembly.GetName().Version.ToString();state["sidebarHost"]=taskHost==null?null:taskHost.Snapshot();state["taskpaneActive"]=pane!=null&&pane.IsActiveTab();state["taskpaneWindow"]=pane==null?0:pane.GetTaskpaneViewWndx64();state["displayMode"]=controller==null?"":controller.Settings.DisplayMode;state["toolbarCommands"]=commandIds;state["lastCheckpoint"]=controller==null?"":controller.Settings.LastCheckpointAt;state["checkpointBusy"]=controller!=null&&controller.IsBusy;state["cadContext"]=controller==null?null:controller.CachedCadContext;state["previewRendering"]=controller!=null&&controller.IsPreviewRendering;state["hostEventsConnected"]=false;state["contextRefreshMode"]="deferred-poll";state["contextUpdates"]=control==null?0:control.ContextUpdates;state["commandTabs"]=new int[]{1,2,3}.Select(type=>new {documentType=type,registered=registeredCommandTabs.Contains(type)}).ToArray();return json.Serialize(state);}
    public void SelectRevision(string head,string baseline,string path){OnUi(()=>{if(control==null)throw new InvalidOperationException("Plugin is not connected.");control.SelectRevision(head,baseline,path);});}
    public void OpenRevision(string oid,string path){OnUi(()=>{if(control==null)throw new InvalidOperationException("Plugin is not connected.");control.OpenRevision(oid,path);});}
    public void SaveScreenshot(string path){OnUi(()=>{if(control==null)throw new InvalidOperationException("Plugin is not connected.");control.SaveScreenshot(path);});}
    void RegisterCommands(int cookie,string directory){
      commands=(ICommandManager)app.GetCommandManager(cookie);int error=0;commandGroup=(ICommandGroup)commands.CreateCommandGroup2(7015,"gitpolar","保存当前成果与查看 Git 历史","gitpolar",-1,true,ref error);if(commandGroup==null)throw new InvalidOperationException("Cannot create gitpolar toolbar: "+error);
      object icons=new int[]{20,32,40,64,96,128}.Select(size=>Path.Combine(directory,"icon-"+size+".png")).ToArray();commandGroup.IconList=new int[]{20,32,40,64,96,128}.Select(size=>Path.Combine(directory,"commands-"+size+".png")).ToArray();commandGroup.MainIconList=icons;
      var indices=new List<int>();indices.Add(commandGroup.AddCommandItem2("保存当前成果",-1,"保存项目图纸、提交并按设置推送","保存当前成果",0,"OnQuickSave","CanSaveCheckpoint",1,3));indices.Add(commandGroup.AddCommandItem2("Git Graph",-1,"打开分支与提交图","Git Graph",1,"OnShowGraph","CanUseRepository",2,3));indices.Add(commandGroup.AddCommandItem2("侧边栏",-1,"显示 gitpolar 侧边栏","侧边栏",2,"OnShowSidebar","",3,3));indices.Add(commandGroup.AddCommandItem2("显示设置",-1,"选择侧边栏、工具栏或独立窗口","显示设置",3,"OnDisplaySettings","",4,3));indices.Add(commandGroup.AddCommandItem2("分支管理",-1,"创建、切换、合并、同步分支与管理冲突","分支管理",4,"OnShowBranches","CanUseRepository",5,3));indices.Add(commandGroup.AddCommandItem2("更新分支",-1,"保存并重新载入 NAS 上的最新分支","更新分支",5,"OnPull","CanUseRepository",6,3));indices.Add(commandGroup.AddCommandItem2("推送",-1,"发布当前分支和 Git LFS 文件到 NAS","推送",6,"OnPush","CanUseRepository",7,3));commandGroup.HasToolbar=true;commandGroup.HasMenu=true;if(!commandGroup.Activate())throw new InvalidOperationException("Cannot activate gitpolar toolbar.");commandIds=indices.Select(i=>commandGroup.get_CommandID(i)).ToArray();
      registeredCommandTabs.Clear();foreach(int type in new int[]{1,2,3}){var old=commands.GetCommandTab(type,"gitpolar");if(old!=null)commands.RemoveCommandTab(old);var tab=commands.AddCommandTab(type,"gitpolar");if(tab!=null){registeredCommandTabs.Add(type);var box=tab.AddCommandTabBox();box.AddCommands(commandIds,commandIds.Select(id=>2).ToArray());tab.Visible=true;}}
    }
    public void SetDisplayMode(string mode){OnUi(()=>ApplyDisplayMode(mode));}
    void ApplyDisplayMode(string mode){if(mode!="sidebar"&&mode!="toolbar"&&mode!="window")throw new ArgumentException("Unknown display mode.");controller.Settings.DisplayMode=mode;controller.Settings.Save();control.SetModeSelection(mode);if(mode=="sidebar"){pane.ShowView();taskHost.FitToParent();control.HideGraph();}else if(mode=="toolbar"){pane.HideView();control.HideGraph();var document=app.IActiveDoc2;if(document!=null){var tab=commands.GetCommandTab(document.GetType(),"gitpolar");if(tab!=null)tab.Active=true;}}else{pane.HideView();control.OpenGraph();}}
    public void SaveSidebarScreenshot(string path){OnUi(()=>control.SaveSidebarScreenshot(path));}
    public void OnQuickSave(){OnUi(()=>control.QuickSave());}
    public void OnShowGraph(){OnUi(()=>control.OpenGraph());}
    public void OnShowSidebar(){OnUi(()=>ApplyDisplayMode("sidebar"));}
    public void OnDisplaySettings(){OnUi(()=>control.ConfigureDisplay());}
    public void OnShowBranches(){OnUi(()=>control.OpenBranches(""));}
    public void OnPull(){OnUi(()=>control.RunRepositoryAction("pull","{}"));}
    public void OnPush(){OnUi(()=>control.RunRepositoryAction("push","{}"));}
    public void RunRepositoryAction(string action,string json){OnUi(()=>control.RunRepositoryAction(action,json));}
    public void SaveBranchesScreenshot(string path){OnUi(()=>control.SaveBranchesScreenshot(path));}
    public void CloseGraph(){OnUi(()=>control.CloseGraph());}
    public void CloseBranches(){OnUi(()=>control.CloseBranches());}
    public bool DisconnectFromSW(){Log.Write("Closing gitpolar");if(controller!=null)controller.Stop();if(taskHost!=null){taskHost.Dispose();taskHost=null;control=null;}else if(control!=null){control.Dispose();control=null;}if(commands!=null){try{commands.RemoveCommandGroup2(7015,true);}catch{}commands=null;commandGroup=null;}if(pane!=null){try{pane.DeleteView();}catch{}Marshal.ReleaseComObject(pane);pane=null;}app=null;Log.Write("Closed gitpolar");return true;}
  }
  internal static class Log {
    public static readonly string DirectoryPath=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"gitpolar","solidworks");
    public static void Write(string message){Directory.CreateDirectory(DirectoryPath);File.AppendAllText(Path.Combine(DirectoryPath,"plugin.log"),DateTime.Now.ToString("s")+" "+message+Environment.NewLine,Encoding.UTF8);}
  }
  public sealed class Settings {
    public string Server="http://localhost:4317",Workspace="",Repository="",DisplayMode="sidebar",LastCheckpointAt="",LastCheckpointOid="";
    public bool QuickPreview=true,QuickPush=true;
    public static string FilePath{get{return Path.Combine(Log.DirectoryPath,"settings.json");}}
    public static Settings Load(){try{return new JavaScriptSerializer().Deserialize<Settings>(File.ReadAllText(FilePath));}catch{return new Settings();}}
    public void Save(){if(!String.IsNullOrWhiteSpace(Workspace))Workspace=Path.GetFullPath(Workspace);Directory.CreateDirectory(Log.DirectoryPath);File.WriteAllText(FilePath,new JavaScriptSerializer().Serialize(this),new UTF8Encoding(false));}
  }
  public sealed partial class GitpolarPane {
    readonly ISldWorks app;public Settings Settings;public bool IsBusy{get;private set;}volatile bool stopping;public bool IsStopping{get{return stopping;}}public event Action<string> ProgressChanged;
    public void Stop(){stopping=true;}
    void RequireRunning(){if(IsStopping)throw new OperationCanceledException("gitpolar 正在关闭。");}
    UiLifetimeContext uiContext;
    public void AttachDispatcher(Control dispatcher){uiContext=new UiLifetimeContext(dispatcher,()=>!IsStopping);}
    public void StartUi(Func<Task> body){if(IsStopping)return;var previous=SynchronizationContext.Current;try{if(uiContext!=null)SynchronizationContext.SetSynchronizationContext(uiContext);var task=body();task.ContinueWith(failed=>{Log.Write(failed.Exception.ToString());},TaskContinuationOptions.OnlyOnFaulted);}catch(Exception error){Log.Write(error.ToString());if(!IsStopping)Progress(error.Message);}finally{SynchronizationContext.SetSynchronizationContext(previous);}}
    public EventHandler UiEvent(Func<Task> body){return (sender,args)=>StartUi(body);}
    public GitpolarPane(ISldWorks app){this.app=app;Settings=Settings.Load();}
    Settings settings{get{return Settings;}}
    public IWin32Window Owner{get{return new WindowOwner(new IntPtr(app.IFrameObject().GetHWndx64()));}}
    public void Progress(string message){Log.Write(message);if(IsStopping)return;try{if(app!=null)app.IFrameObject().SetStatusBarText("gitpolar · "+message);}catch(COMException){}if(ProgressChanged!=null)ProgressChanged(message);}
    public string ActivePath(){if(IsStopping||app==null)return "";var doc=app.IActiveDoc2;return doc==null?"":doc.GetPathName();}
    public string Workspace(){string directory=settings.Workspace;if(String.IsNullOrEmpty(directory)){string file=ActivePath();if(String.IsNullOrEmpty(file))throw new InvalidOperationException("请在连接设置中选择本地 Git 工作副本。");directory=Path.GetDirectoryName(file);}string value=Git.Run(directory,"rev-parse","--show-toplevel").Trim();return Path.GetFullPath(value).TrimEnd(Path.DirectorySeparatorChar);}
    public string Repository(string workspace){if(!String.IsNullOrEmpty(settings.Repository))return settings.Repository;string remote=Git.Try(workspace,"remote","get-url","origin").Trim();Uri uri;string name=Uri.TryCreate(remote,UriKind.Absolute,out uri)?Path.GetFileName(uri.AbsolutePath):Path.GetFileName(remote);if(name.EndsWith(".git",StringComparison.OrdinalIgnoreCase))name=name.Substring(0,name.Length-4);return String.IsNullOrEmpty(name)?new DirectoryInfo(workspace).Name:name;}
    static bool Inside(string file,string directory){return Path.GetFullPath(file).StartsWith(Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase);}
    static string Relative(string file,string workspace){if(!Inside(file,workspace))throw new InvalidOperationException("图纸不属于当前 Git 工作副本。");return Path.GetFullPath(file).Substring(workspace.Length+1).Replace('\\','/');}
    static string ValueText(IDictionary<string,object> values,string key){object value;return values.TryGetValue(key,out value)&&value!=null?Convert.ToString(value):"";}
    static bool Flag(IDictionary<string,object> values,string key){object value;return values.TryGetValue(key,out value)&&value is bool&&(bool)value;}
    static string[] Strings(IDictionary<string,object> values,string key){object value;if(!values.TryGetValue(key,out value)||!(value is IEnumerable))return new string[0];return ((IEnumerable)value).Cast<object>().Select(Convert.ToString).ToArray();}
    public async Task<object> Dispatch(string action,Dictionary<string,object> values,string workspace){
      RequireRunning();bool mutation=!new string[]{"status","graph","commit-detail","repository-state","locks","merge-assemblies"}.Contains(action);
      if(mutation&&IsBusy)throw new InvalidOperationException("正在保存或执行 Git 操作，请稍候。");if(mutation)IsBusy=true;
      try{switch(action){
        case "status":{string file=ActivePath();return await Task.Run(()=>Status(workspace,file));}
        case "repository-state":return await Task.Run(()=>RepositoryGit.Snapshot(workspace));
        case "locks":return await RepositoryGit.Execute(workspace,action,values);
        case "prepare-commit":{await SaveProject(workspace);string file=ActivePath();return await Task.Run(()=>Status(workspace,file));}
        case "graph":return await Task.Run(()=>Graph(workspace,ValueText(values,"ref"),ValueText(values,"cursor")));
        case "commit-detail":return await Task.Run(()=>Details(workspace,Commit(workspace,ValueText(values,"oid"))));
        case "commit":return await CommitChanges(workspace,values);
        case "open-snapshot":return await OpenSnapshot(workspace,ValueText(values,"oid"),ValueText(values,"path"));
        case "merge-assemblies":return await Task.Run(()=>MergeAssemblies(workspace,values));
        case "prepare-cad-merge":return await PrepareCadMerge(workspace,values);
        case "open-cad-merge":return OpenCadMerge(workspace);
        case "inspect-cad-result":return await InspectCadResult(workspace,values);
        case "apply-cad-result":return await ApplyCadResult(workspace,values);
        default:return await RepositoryAction(workspace,action,values);
      }}finally{if(mutation)IsBusy=false;}
    }
    sealed class OpenDrawing {public string File,Title,Configuration;public int Kind;}
    readonly List<OpenDrawing> reopen=new List<OpenDrawing>();string reopenActive="";
    async Task<object> RepositoryAction(string workspace,string action,Dictionary<string,object> values){
      if(action=="create-branch"&&!values.ContainsKey("start")&&values.ContainsKey("oid"))values["start"]=values["oid"];
      if(action=="checkout"&&!values.ContainsKey("reference")&&values.ContainsKey("name"))values["reference"]="refs/heads/"+ValueText(values,"name");
      if(action=="continue-merge"||action=="mark-manual-resolved")await SaveProject(workspace);
      if(action=="abort-merge")SaveAndCloseMergeDocuments(workspace);
      bool changes=RepositoryGit.ChangesWorktree(action,values);
      if(changes){
        await SaveProject(workspace);RequireRunning();
        if(action!="stash-save"&&action!="resolve-conflict"&&action!="abort-merge")RepositoryGit.Clean(workspace);
        if(app!=null){if(reopen.Count==0)reopenActive=ActivePath();var opened=new List<OpenDrawing>();
          for(var doc=(IModelDoc2)app.GetFirstDocument();doc!=null;doc=(IModelDoc2)doc.GetNext()){string file=doc.GetPathName();if(!String.IsNullOrEmpty(file)&&Inside(file,workspace)){var configuration=doc.ConfigurationManager.ActiveConfiguration;opened.Add(new OpenDrawing{File=file,Title=doc.GetTitle(),Kind=doc.GetType(),Configuration=configuration==null?"":configuration.Name});}}
          foreach(var drawing in opened){if(!reopen.Any(d=>String.Equals(d.File,drawing.File,StringComparison.OrdinalIgnoreCase)))reopen.Add(drawing);}
          foreach(var drawing in opened)if(app.GetOpenDocumentByName(drawing.File)!=null)app.CloseDoc(drawing.Title);
        }
      }
      try{Progress("正在执行："+ActionTitle(action)+"…");var result=await RepositoryGit.Execute(workspace,action,values);RequireRunning();var message=Data.Text(Data.Map(result),"message");if(!String.IsNullOrEmpty(message))Progress(message);return result;}
      finally{if(!IsStopping&&reopen.Count>0&&RepositoryGit.Conflicts(workspace).Length==0&&(!RepositoryGit.Merging(workspace)||(action!="merge-manual"&&!CadMergeStore.Active(CadMergeStore.Load(workspace))))){
        var drawings=reopen.OrderBy(d=>d.Kind==2?0:d.Kind==3?1:2).ToArray();reopen.Clear();
        foreach(var drawing in drawings){if(!File.Exists(drawing.File)||app.GetOpenDocumentByName(drawing.File)!=null)continue;try{int errors=0,warnings=0;var document=(IModelDoc2)app.OpenDoc6(drawing.File,drawing.Kind,1,drawing.Configuration,ref errors,ref warnings);if(document==null)Progress("分支操作已完成，图纸需重新打开："+Path.GetFileName(drawing.File)+" ("+errors+")");else if(!String.Equals(Path.GetFullPath(document.GetPathName()),Path.GetFullPath(drawing.File),StringComparison.OrdinalIgnoreCase))Progress("其他项目存在同名图纸，请关闭同名图纸后打开："+drawing.File);}catch(COMException error){Log.Write(error.ToString());}}
        if(!String.IsNullOrEmpty(reopenActive)&&app.GetOpenDocumentByName(reopenActive)!=null){int error=0;app.ActivateDoc3(reopenActive,false,0,ref error);}reopenActive="";
      }}
    }
    public static string ActionTitle(string action){switch(action){case "create-branch":return "创建分支";case "checkout":return "切换分支";case "fetch":return "刷新远端";case "pull":return "更新当前分支";case "push":return "推送当前分支";case "merge":return "合并分支";case "merge-manual":return "开始人工合图合并";case "mark-manual-resolved":return "标记已保存的人工结果";case "stash-save":return "暂存工作区";case "stash-apply":return "恢复暂存";case "stash-drop":return "删除暂存";case "rename-branch":return "重命名分支";case "delete-branch":return "删除分支";case "set-upstream":return "设置跟踪分支";case "resolve-conflict":return "处理冲突";case "continue-merge":return "完成合并";case "abort-merge":return "中止合并";case "create-tag":return "创建标签";case "push-tag":return "推送标签";case "delete-tag":return "删除标签";case "lock":return "取得编辑锁";case "unlock":return "释放编辑锁";case "set-origin":return "设置仓库连接";default:return "仓库操作";}}
    void RequireClosed(string workspace){for(var doc=(IModelDoc2)app.GetFirstDocument();doc!=null;doc=(IModelDoc2)doc.GetNext()){string file=doc.GetPathName();if(!String.IsNullOrEmpty(file)&&Inside(file,workspace))throw new InvalidOperationException("请先保存并关闭工作副本中的图纸，再切换分支或 Pull："+Path.GetFileName(file));}}
    static void RequireClean(string workspace){if(!String.IsNullOrEmpty(Git.Run(workspace,"status","--porcelain=v1")))throw new InvalidOperationException("工作副本有未提交改动，请先提交后再操作。");}
    static void CheckBranch(string workspace,string name){if(String.IsNullOrWhiteSpace(name)||name.StartsWith("-")||name=="HEAD")throw new InvalidOperationException("分支名称无效。");Git.Run(workspace,"check-ref-format","refs/heads/"+name);}
    static string Commit(string workspace,string oid){if(!System.Text.RegularExpressions.Regex.IsMatch(oid??"","^[a-f0-9]{40}$"))throw new InvalidOperationException("请选择有效提交。");return Git.Run(workspace,"rev-parse","--verify",oid+"^{commit}").Trim();}
    public static List<Dictionary<string,object>> ChangedFiles(string workspace){
      var result=new List<Dictionary<string,object>>();string[] tokens=Git.Run(workspace,"status","--porcelain=v1","-z","--untracked-files=all").Split('\0');
      for(int i=0;i<tokens.Length;i++){string token=tokens[i];if(token.Length<4)continue;string status=token.Substring(0,2),file=token.Substring(3);var entry=new Dictionary<string,object>{{"path",file},{"status",status.Trim()}};if(status.IndexOf('R')>=0||status.IndexOf('C')>=0){if(i+1<tokens.Length)entry["previousPath"]=tokens[++i];}result.Add(entry);}return result;
    }
    public static object Status(string workspace,string active){
      string branch=Git.Try(workspace,"symbolic-ref","--quiet","--short","HEAD").Trim();string counts=Git.Try(workspace,"rev-list","--left-right","--count","HEAD...@{upstream}").Trim();string[] pair=counts.Split(new char[]{'\t',' '},StringSplitOptions.RemoveEmptyEntries);int ahead=0,behind=0;if(pair.Length==2){Int32.TryParse(pair[0],out ahead);Int32.TryParse(pair[1],out behind);}
      return new {workspace=workspace,activeDocument=String.IsNullOrEmpty(active)?"":Path.GetFileName(active),relativePath=!String.IsNullOrEmpty(active)&&Inside(active,workspace)?Relative(active,workspace):"",branch=branch,files=ChangedFiles(workspace),ahead=ahead,behind=behind};
    }
    public static object Graph(string workspace,string scope,string cursor){
      string[] refLines=Git.Run(workspace,"for-each-ref","--format=%(refname)%00%(objectname)%00%(*objectname)%00%(objecttype)%00%(*objecttype)","refs/heads/","refs/remotes/","refs/tags/").TrimEnd().Split('\n');var refs=new List<Dictionary<string,object>>();var roots=new List<string>();
      foreach(string line in refLines){string[] f=line.Split('\0');if(f.Length<5||(f[3]!="commit"&&f[4]!="commit")||f[0].EndsWith("/HEAD"))continue;string full=f[0],oid=String.IsNullOrEmpty(f[2])?f[1]:f[2];string type=full.StartsWith("refs/heads/")?"branch":full.StartsWith("refs/tags/")?"tag":"remote";string name=System.Text.RegularExpressions.Regex.Replace(full,"^refs/(heads|remotes|tags)/","");refs.Add(new Dictionary<string,object>{{"name",name},{"fullName",full},{"type",type},{"oid",oid}});roots.Add(oid);}
      string head=Git.Try(workspace,"rev-parse","--verify","HEAD").Trim();if(head.Length==40)roots.Add(head);
      int offset=0;var serializer=new JavaScriptSerializer();if(!String.IsNullOrEmpty(cursor)){try{var value=serializer.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)));offset=Convert.ToInt32(value["offset"]);roots=((IEnumerable)value["roots"]).Cast<object>().Select(Convert.ToString).ToList();if(offset<0||roots.Any(r=>!System.Text.RegularExpressions.Regex.IsMatch(r,"^[a-f0-9]{40}$")))throw new Exception();}catch{throw new InvalidOperationException("提交图分页已失效，请刷新。");}}
      else if(!String.IsNullOrEmpty(scope)){if(scope.StartsWith("-")||!scope.StartsWith("refs/"))throw new InvalidOperationException("分支无效。");roots=new List<string>{Git.Run(workspace,"rev-parse","--verify","--end-of-options",scope+"^{commit}").Trim()};}
      roots=roots.Distinct().ToList();var commits=new List<object>();if(roots.Count>0){var args=new List<string>{"log","--topo-order","-z","--format=%H%x00%P%x00%an%x00%aI%x00%s","--max-count=101","--skip="+offset};args.AddRange(roots);args.Add("--");string[] fields=Git.Run(workspace,args.ToArray()).Split('\0');for(int i=0;i+4<fields.Length;i+=5){string oid=fields[i];commits.Add(new {oid=oid,hash=oid.Substring(0,7),parents=fields[i+1].Split(new char[]{' '},StringSplitOptions.RemoveEmptyEntries),author=fields[i+2],date=fields[i+3],message=fields[i+4]});}}
      string next=commits.Count>100?Convert.ToBase64String(Encoding.UTF8.GetBytes(serializer.Serialize(new {roots=roots,offset=offset+100}))):null;return new {commits=commits.Take(100).ToArray(),refs=refs,roots=roots,nextCursor=next};
    }
    public static object Details(string workspace,string oid){
      string[] f=Git.Run(workspace,"show","-s","--format=%H%x00%P%x00%an%x00%aI%x00%cn%x00%cI%x00%B",oid,"--").TrimEnd().Split('\0');string[] parents=f[1].Split(new char[]{' '},StringSplitOptions.RemoveEmptyEntries);
      string changes=parents.Length>0?Git.Run(workspace,"diff","--name-status","-z","--find-renames",parents[0],oid,"--"):Git.Run(workspace,"diff-tree","--root","--no-commit-id","-r","--name-status","-z","--find-renames",oid,"--");string[] tokens=changes.Split('\0');var files=new List<object>();for(int i=0;i<tokens.Length&&!String.IsNullOrEmpty(tokens[i]);){string status=tokens[i++],previous=tokens[i++],file=status.StartsWith("R")||status.StartsWith("C")?tokens[i++]:previous;files.Add(new {path=file,previousPath=previous,status=status.Substring(0,1),preview=file.StartsWith(".gitpolar/")});}
      return new {oid=oid,hash=oid.Substring(0,7),parents=parents,author=f[2],date=f[3],committer=f[4],committedAt=f[5],message=f[6],files=files};
    }
    async Task Push(string workspace){string branch=Git.Run(workspace,"symbolic-ref","--quiet","--short","HEAD").Trim();if(String.IsNullOrEmpty(branch))throw new InvalidOperationException("请先切到本地分支，再推送。");Progress("正在 Push 到 NAS（包含 Git LFS）…");await Git.Async(workspace,"push","--set-upstream","origin","HEAD:refs/heads/"+branch);Progress("已推送到 NAS");}
    public async Task<string> SaveCheckpoint(){
      if(IsBusy)throw new InvalidOperationException("正在保存或执行 Git 操作，请稍候。");IsBusy=true;try{
        string workspace=Workspace();if(RepositoryGit.Merging(workspace))throw new InvalidOperationException("当前正在合并。请在“人工合图 / 冲突”页应用保存结果，再点击“完成合并”。");string source=ActivePath();if(String.IsNullOrEmpty(source)||!Inside(source,workspace))throw new InvalidOperationException("请先打开此工作副本中的可编辑图纸。历史版本请回到编辑副本后再保存成果。");await SaveProject(workspace);var files=await Task.Run(()=>ChangedFiles(workspace));string[] selected=files.Select(f=>Convert.ToString(f["path"])).Where(f=>!f.StartsWith(".gitpolar/",StringComparison.Ordinal)).ToArray();if(selected.Length==0){Progress("当前成果已保存，没有新的文件改动。");return "";}
        bool preview=Settings.QuickPreview&&(source.EndsWith(".sldprt",StringComparison.OrdinalIgnoreCase)||source.EndsWith(".sldasm",StringComparison.OrdinalIgnoreCase));bool push=Settings.QuickPush&&!String.IsNullOrEmpty(Git.Try(workspace,"remote","get-url","origin"));var values=new Dictionary<string,object>{{"message","保存进度："+Path.GetFileNameWithoutExtension(source)+" · "+DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")},{"files",selected},{"preview",preview},{"push",push}};var result=await CommitChanges(workspace,values);var serialized=new JavaScriptSerializer();var data=serialized.Deserialize<Dictionary<string,object>>(serialized.Serialize(result));string oid=Convert.ToString(data["oid"]);Settings.LastCheckpointAt=DateTime.Now.ToString("s");Settings.LastCheckpointOid=oid;Settings.Save();Progress("成果已保存 · "+oid.Substring(0,7)+(push?" · 已推送 NAS":" · 已提交到本地"));return oid;
      }finally{IsBusy=false;}
    }
    async Task EnsureEditable(string workspace,IModelDoc2 document,string file){
      string relative=Relative(file,workspace);string attribute=await Git.Async(workspace,"check-attr","-z","lockable","--",relative);bool lockable=attribute.Split('\0').Contains("set");
      if(lockable&&!String.IsNullOrEmpty(Git.Try(workspace,"remote","get-url","origin"))){
        Progress("正在确认图纸编辑锁："+Path.GetFileName(file));string info=await Git.Async(workspace,"lfs","locks","--verify","--json");var json=new JavaScriptSerializer();var locks=json.Deserialize<Dictionary<string,object>>(info);Func<string,IEnumerable<Dictionary<string,object>>> entries=key=>locks.ContainsKey(key)&&locks[key] is IEnumerable?((IEnumerable)locks[key]).Cast<object>().Select(x=>x as Dictionary<string,object>).Where(x=>x!=null):Enumerable.Empty<Dictionary<string,object>>();var other=entries("theirs").FirstOrDefault(item=>ValueText(item,"path")==relative);if(other!=null){var owner=other.ContainsKey("owner")?other["owner"] as Dictionary<string,object>:null;throw new InvalidOperationException("图纸已由 "+(owner==null?"其他成员":ValueText(owner,"name"))+" 锁定："+relative);}
        if(!entries("ours").Any(item=>ValueText(item,"path")==relative))await Git.Async(workspace,"lfs","lock",relative);
        File.SetAttributes(file,File.GetAttributes(file)&~FileAttributes.ReadOnly);if(document.IsOpenedReadOnly())document.SetReadOnlyState(false);if(document.IsOpenedReadOnly())throw new InvalidOperationException("已取得编辑锁，请重新打开图纸后保存："+relative);
      }else if(document.IsOpenedReadOnly())throw new InvalidOperationException("当前图纸为只读，请先配置 origin 并取得编辑锁："+relative);
    }
    async Task SaveProject(string workspace){
      RequireRunning();Progress("正在保存工作副本中的图纸…");if(app==null)return;
      for(var doc=(IModelDoc2)app.GetFirstDocument();doc!=null;doc=(IModelDoc2)doc.GetNext()){string file=doc.GetPathName();if(!String.IsNullOrEmpty(file)&&Inside(file,workspace)&&doc.GetSaveFlag()){await EnsureEditable(workspace,doc,file);RequireRunning();int errors=0,warnings=0;if(!doc.Save3(1,ref errors,ref warnings)||errors!=0)throw new InvalidOperationException("保存失败："+file+" ("+errors+")");}}
    }
    async Task<object> CommitChanges(string workspace,Dictionary<string,object> values){
      if(RepositoryGit.Merging(workspace))throw new InvalidOperationException("当前正在合并，请在“人工合图 / 冲突”页保存结果并完成合并。");string message=ValueText(values,"message").Trim();if(String.IsNullOrEmpty(message)||message.Length>500)throw new InvalidOperationException("请输入 1–500 字的提交说明。");
      var selected=new HashSet<string>(Strings(values,"files"),StringComparer.Ordinal);foreach(string file in selected)SafePath(workspace,file);
      string source=ActivePath();if(!String.IsNullOrEmpty(source)&&!Inside(source,workspace))throw new InvalidOperationException("当前图纸不属于选定工作副本。");
      await SaveProject(workspace);
      bool preview=Flag(values,"preview");
      if(preview){
        if(String.IsNullOrEmpty(source)||!Inside(source,workspace)||!(source.EndsWith(".sldasm",StringComparison.OrdinalIgnoreCase)||source.EndsWith(".sldprt",StringComparison.OrdinalIgnoreCase)))throw new InvalidOperationException("请激活工作副本内的零件或装配体以生成预览。");
        // A preview fingerprint describes all saved CAD; committing only a subset would make it stale.
        var unselected=ChangedFiles(workspace).Where(f=>IsNative(Convert.ToString(f["path"]))&&!selected.Contains(Convert.ToString(f["path"]))).ToArray();if(unselected.Length>0)throw new InvalidOperationException("生成装配预览需要一起提交依赖图纸改动，请勾选："+String.Join("、",unselected.Take(6).Select(f=>Convert.ToString(f["path"]))));
        Progress("正在生成 SolidWorks 增量预览…");string script=Path.Combine(Path.GetDirectoryName(typeof(Addin).Assembly.Location),"tools","Export-SolidWorksProject.ps1");await Git.ProcessAsync("powershell.exe",workspace,new string[]{"-NoProfile","-ExecutionPolicy","Bypass","-File",script,"-RepoRoot",workspace,"-Source",source});
      }
      var changes=ChangedFiles(workspace);
      var changed=new HashSet<string>(StringComparer.Ordinal);
      var untracked=new List<string>();
      foreach(var file in changes){
        string path=Convert.ToString(file["path"]),status=Convert.ToString(file["status"]);
        changed.Add(path);
        if(preview&&path.StartsWith(".gitpolar/",StringComparison.Ordinal))selected.Add(path);
        if(status.Contains("R")&&file.ContainsKey("previousPath")){
          string oldPath=Convert.ToString(file["previousPath"]);changed.Add(oldPath);
          if(selected.Contains(path))selected.Add(oldPath);
        }
        if(status=="??"&&selected.Contains(path))untracked.Add(path);
      }
      selected.IntersectWith(changed);
      if(selected.Count==0)throw new InvalidOperationException("所选文件没有可提交的改动。");
      Progress("正在提交 CAD 与预览…");
      // --only 从工作树取所选内容。仅新文件需要先登记，已暂存的删除和重命名可直接提交。
      if(untracked.Count>0)await Git.WithPathsAsync(workspace,untracked,"add","--intent-to-add");
      await Git.WithPathsAsync(workspace,selected,"commit","--only","-m",message);
      string oid=Git.Run(workspace,"rev-parse","HEAD").Trim();Progress("本地提交完成："+oid.Substring(0,7));
      if(Flag(values,"push")){try{await Push(workspace);}catch(Exception error){throw new InvalidOperationException("本地提交已完成（"+oid.Substring(0,7)+"），推送失败。可点击 Push 重试。\n"+error.Message);}}
      return new {oid=oid};
    }
    public static bool IsCadFile(string file){return IsNative(file);}
    static bool IsNative(string file){return new string[]{".sldprt",".sldasm",".slddrw",".sldlfp",".slddrt",".prtdot",".asmdot",".drwdot"}.Contains(Path.GetExtension(file).ToLowerInvariant());}
    public static string SafePath(string workspace,string relative){if(String.IsNullOrEmpty(relative)||Path.IsPathRooted(relative)||relative.Split('/','\\').Any(p=>p==".."||p=="."||String.Equals(p,".git",StringComparison.OrdinalIgnoreCase)))throw new InvalidOperationException("仓库文件路径无效。");string file=Path.GetFullPath(Path.Combine(workspace,relative));if(!Inside(file,workspace))throw new InvalidOperationException("路径超出工作副本。");return file;}
    static bool IsPointer(string file){if(new FileInfo(file).Length>1024)return false;return File.ReadAllText(file).StartsWith("version https://git-lfs.github.com/spec/v1");}
    public async Task<object> OpenSnapshot(string workspace,string requested,string relative){
      string oid=Commit(workspace,requested);SafePath(workspace,relative);if(!IsNative(relative))throw new InvalidOperationException("请选择 SolidWorks 图纸。");
      string key;using(var algorithm=SHA256.Create()){key=BitConverter.ToString(algorithm.ComputeHash(Encoding.UTF8.GetBytes(workspace.ToLowerInvariant()))).Replace("-","").Substring(0,16);}
      string directory=Path.Combine(Log.DirectoryPath,"history",key,oid),file=SafePath(directory,relative);Progress("正在准备只读历史工作副本…");
      if(!Directory.Exists(directory)){Directory.CreateDirectory(Path.GetDirectoryName(directory));await Git.ProcessAsync("git.exe",workspace,new string[]{"worktree","add","--detach",directory,oid},true);}
      // Hydrate using normal Git LFS transport and the user's existing Git credential manager.
      var patterns=new List<string>{"lfs","checkout"};foreach(string cadExtension in new string[]{"sldprt","sldasm","slddrw","sldlfp","slddrt","prtdot","asmdot","drwdot","step","stp","x_t","x_b"}){patterns.Add("*."+cadExtension);patterns.Add("*."+cadExtension.ToUpperInvariant());}await Git.Async(directory,patterns.ToArray());
      bool missing=Directory.EnumerateFiles(directory,"*",SearchOption.AllDirectories).Where(IsNative).Any(IsPointer);
      if(missing){if(String.IsNullOrEmpty(Git.Try(workspace,"remote","get-url","origin")))throw new InvalidOperationException("历史图纸的 LFS 内容不在本机缓存中，且未配置 origin。");await Git.Async(directory,"lfs","pull","--include="+String.Join(",",patterns.Skip(2)),"--exclude=");}
      if(!File.Exists(file))throw new InvalidOperationException("此提交中没有此图纸。");
      string header;using(var reader=new StreamReader(file)){var buffer=new char[42];int count=reader.Read(buffer,0,buffer.Length);header=new string(buffer,0,count);}if(header.StartsWith("version https://git-lfs.github.com/spec/v1"))throw new InvalidOperationException("历史 CAD 仍是 LFS 指针，请检查本机访问令牌与 NAS 连接。");
      // SolidWorks resolves open documents by filename: never let an existing same-name part
      // silently replace a dependency from the historical snapshot.
      var names=new HashSet<string>(Directory.EnumerateFiles(directory,"*",SearchOption.AllDirectories).Where(IsNative).Select(Path.GetFileName),StringComparer.OrdinalIgnoreCase);
      for(var open=(IModelDoc2)app.GetFirstDocument();open!=null;open=(IModelDoc2)open.GetNext()){string opened=open.GetPathName();if(String.IsNullOrEmpty(opened))continue;if(!Inside(opened,directory)&&names.Contains(Path.GetFileName(opened)))throw new InvalidOperationException("历史副本已准备好。请先关闭同名图纸后再打开，避免 SolidWorks 引用当前版本："+Path.GetFileName(opened));}
      RequireRunning();int errors=0,warnings=0;string extension=Path.GetExtension(file).ToLowerInvariant();int kind=extension==".sldasm"?2:extension==".slddrw"?3:1;var document=(IModelDoc2)app.OpenDoc6(file,kind,3,"",ref errors,ref warnings);if(document==null)throw new InvalidOperationException("历史图纸打开失败："+errors);if(!String.Equals(Path.GetFullPath(document.GetPathName()),Path.GetFullPath(file),StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("SolidWorks 打开了其他同名图纸。");Progress("已只读打开历史版本 "+oid.Substring(0,7));return new {oid=oid,path=file,warnings=warnings};
    }
    public async Task<string> ExportHistoricalFile(string workspace,string requested,string relative){
      string oid=Commit(workspace,requested);SafePath(workspace,relative);string directory=Path.Combine(Log.DirectoryPath,"previews",CacheKey(workspace),oid);string output=SafePath(directory,relative);if(File.Exists(output))return output;Directory.CreateDirectory(Path.GetDirectoryName(output));
      string objectId=await Git.Async(workspace,"rev-parse","--verify",oid+":"+relative);objectId=objectId.Trim();long size=Int64.Parse((await Git.Async(workspace,"cat-file","-s",objectId)).Trim());string pointer=size<=1024?await Git.Async(workspace,"cat-file","blob",objectId):"";
      string temporary=output+"."+Guid.NewGuid().ToString("N")+".tmp";
      try{if(pointer.StartsWith("version https://git-lfs.github.com/spec/v1"))await Git.BinaryFileAsync(workspace,new string[]{"lfs","smudge","--",relative},temporary,pointer);else await Git.BinaryFileAsync(workspace,new string[]{"cat-file","blob",objectId},temporary,null);File.Move(temporary,output);}catch{if(File.Exists(temporary))File.Delete(temporary);throw;}return output;
    }
    static string CacheKey(string workspace){using(var hash=SHA256.Create()){return BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(workspace.ToLowerInvariant()))).Replace("-","").Substring(0,16);}}
    public Task<Image> Thumbnail(string workspace,string oid,string relative,CancellationToken cancellation){return RenderHistoricalPreview(workspace,oid,relative,cancellation);}
    public Task<Image> Thumbnail(string workspace,string oid,string relative){return RenderHistoricalPreview(workspace,oid,relative,CancellationToken.None);}


  }
  internal sealed class PreviewPicture:AxHost {private PreviewPicture():base("00000000-0000-0000-0000-000000000000"){} public static Image Read(object picture){var image=GetPictureFromIPicture(picture);return image==null?null:new Bitmap(image);}}
  public static class Git {
    public static string Quote(string value){if(value==null)throw new ArgumentNullException("value");var output=new StringBuilder("\"");int slashes=0;foreach(char c in value){if(c=='\\'){slashes++;continue;}if(c=='\"'){output.Append('\\',slashes*2+1).Append(c);slashes=0;continue;}output.Append('\\',slashes).Append(c);slashes=0;}output.Append('\\',slashes*2).Append('"');return output.ToString();}
    public static async Task BinaryFileAsync(string directory,string[] args,string output,string input){
      var start=new ProcessStartInfo("git.exe",String.Join(" ",args.Select(Quote))){WorkingDirectory=directory,UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true,RedirectStandardInput=true,StandardErrorEncoding=Encoding.UTF8};start.EnvironmentVariables["GIT_TERMINAL_PROMPT"]="0";start.EnvironmentVariables["GIT_OPTIONAL_LOCKS"]="0";
      using(var process=new Process(){StartInfo=start,EnableRaisingEvents=true}){var done=new TaskCompletionSource<int>();process.Exited+=(s,e)=>done.TrySetResult(process.ExitCode);process.Start();Task<string> errors=process.StandardError.ReadToEndAsync();if(input!=null)await process.StandardInput.WriteAsync(input).ConfigureAwait(false);process.StandardInput.Close();using(var stream=new FileStream(output,FileMode.CreateNew,FileAccess.Write,FileShare.None)){await process.StandardOutput.BaseStream.CopyToAsync(stream).ConfigureAwait(false);}await done.Task.ConfigureAwait(false);string error=await errors.ConfigureAwait(false);if(process.ExitCode!=0)throw new InvalidOperationException(error.Trim());}
    }
    public static string Run(string directory,params string[] args){return ProcessAsync("git.exe",directory,args).GetAwaiter().GetResult();}
    public static string Try(string directory,params string[] args){try{return Run(directory,args);}catch{return "";}}
    public static Task<string> Async(string directory,params string[] args){return ProcessAsync("git.exe",directory,args);}
    internal static async Task<string> WithPathsAsync(string directory,IEnumerable<string> paths,params string[] args){
      // 大装配的图纸清单可能超过 Windows 命令行长度，按 Git 的 NUL 格式传递原始文件名。
      string list=Path.GetTempFileName();
      try{
        File.WriteAllText(list,String.Join("\0",paths)+"\0",new UTF8Encoding(false));
        var command=new List<string>{"--literal-pathspecs"};
        command.AddRange(args);command.Add("--pathspec-from-file="+list);command.Add("--pathspec-file-nul");
        return await Async(directory,command.ToArray()).ConfigureAwait(false);
      }finally{File.Delete(list);}
    }
    public static async Task<string> ProcessAsync(string executable,string directory,string[] args,bool skipSmudge=false){
      var start=new ProcessStartInfo(executable,String.Join(" ",args.Select(Quote))){WorkingDirectory=directory,UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true,StandardOutputEncoding=Encoding.UTF8,StandardErrorEncoding=Encoding.UTF8};start.EnvironmentVariables["GIT_TERMINAL_PROMPT"]="0";start.EnvironmentVariables["GIT_OPTIONAL_LOCKS"]="0";if(skipSmudge)start.EnvironmentVariables["GIT_LFS_SKIP_SMUDGE"]="1";
      using(var process=new Process(){StartInfo=start,EnableRaisingEvents=true}){var done=new TaskCompletionSource<int>();process.Exited+=(s,e)=>done.TrySetResult(process.ExitCode);process.Start();Task<string> output=process.StandardOutput.ReadToEndAsync(),errors=process.StandardError.ReadToEndAsync();await done.Task.ConfigureAwait(false);string result=await output.ConfigureAwait(false),error=await errors.ConfigureAwait(false);if(process.ExitCode!=0)throw new InvalidOperationException(error.Trim().Length>0?error.Trim():"命令执行失败："+executable);return result;}
    }
  }
}
