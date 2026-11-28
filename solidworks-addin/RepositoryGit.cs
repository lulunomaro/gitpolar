using System;
using System.IO;
using System.Linq;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
namespace Gitpolar.SolidWorks {
  public static class RepositoryGit {
    static string Text(IDictionary<string,object> values,string key){object value;return values.TryGetValue(key,out value)&&value!=null?Convert.ToString(value):"";}
    static bool Flag(IDictionary<string,object> values,string key){object value;return values.TryGetValue(key,out value)&&value is bool&&(bool)value;}
    public static bool ChangesWorktree(string action,IDictionary<string,object> values){return new string[]{"checkout","pull","merge","merge-manual","abort-merge","resolve-conflict","stash-save","stash-apply"}.Contains(action)||(action=="create-branch"&&Flag(values,"switch"));}
    public static void CheckName(string workspace,string name,string kind){if(String.IsNullOrWhiteSpace(name)||name.StartsWith("-")||name=="HEAD")throw new InvalidOperationException("请输入有效的"+(kind=="tags"?"标签":"分支")+"名称。");Git.Run(workspace,"check-ref-format","refs/"+kind+"/"+name);}
    public static string Resolve(string workspace,string reference){if(String.IsNullOrEmpty(reference))reference="HEAD";if(reference.StartsWith("-")||reference.IndexOf('\0')>=0)throw new InvalidOperationException("起点无效。");return Git.Run(workspace,"rev-parse","--verify","--end-of-options",reference+"^{commit}").Trim();}
    static string LocalName(string workspace,string reference){if(!reference.StartsWith("refs/heads/",StringComparison.Ordinal))throw new InvalidOperationException("请先选择一个本地分支。");string name=reference.Substring(11);CheckName(workspace,name,"heads");Resolve(workspace,reference);return name;}
    static string RemoteName(string workspace,string reference){const string prefix="refs/remotes/origin/";if(!reference.StartsWith(prefix,StringComparison.Ordinal)||reference==prefix+"HEAD")throw new InvalidOperationException("请选择 origin 的远端分支。");string name=reference.Substring(prefix.Length);CheckName(workspace,name,"heads");Resolve(workspace,reference);return name;}
    public static string[] Conflicts(string workspace){return Git.Run(workspace,"diff","--name-only","--diff-filter=U","-z").Split(new char[]{'\0'},StringSplitOptions.RemoveEmptyEntries);}
    internal static string GitFile(string workspace,string name){
      string path=Git.Run(workspace,"rev-parse","--git-path",name).TrimEnd('\r','\n');
      return Path.IsPathRooted(path)?path:Path.Combine(workspace,path);
    }
    public static bool Merging(string workspace){return File.Exists(GitFile(workspace,"MERGE_HEAD"));}
    internal static string SingleMergeHead(string workspace){
      long writeTime;
      return SingleMergeHead(workspace,out writeTime);
    }
    internal static string SingleMergeHead(string workspace,out long writeTime){
      string path=GitFile(workspace,"MERGE_HEAD");
      writeTime=0;
      if(!File.Exists(path))return null;
      writeTime=File.GetLastWriteTimeUtc(path).Ticks;
      string[] heads=File.ReadAllLines(path);
      return heads.Length==1?heads[0]:null;
    }
    public static void Clean(string workspace){if(!String.IsNullOrEmpty(Git.Run(workspace,"status","--porcelain=v1")))throw new InvalidOperationException("当前有未提交改动。请先点击“保存当前成果”，或在“暂存”页保存改动后再切换、更新或合并分支。");if(Merging(workspace))throw new InvalidOperationException("请先在“冲突”页完成或中止当前合并。");}
    internal const string Heads="refs/heads/";
    internal static string CurrentRef(string workspace){return Git.Try(workspace,"symbolic-ref","--quiet","HEAD").Trim();}
    internal static string RequireBranchRef(string workspace){
      string reference=CurrentRef(workspace);
      if(!reference.StartsWith(Heads,StringComparison.Ordinal))throw new InvalidOperationException("当前是游离 HEAD，请先从该提交创建并切换到一个分支。");
      return reference;
    }
    static void Origin(string workspace){if(String.IsNullOrEmpty(Git.Try(workspace,"remote","get-url","origin").Trim()))throw new InvalidOperationException("尚未配置 origin，请在“仓库连接”中填写 NAS 克隆地址。");}
    public static object Snapshot(string workspace){
      var branches=new List<object>();string currentRef=CurrentRef(workspace);
      string current=currentRef.StartsWith(Heads,StringComparison.Ordinal)?currentRef.Substring(Heads.Length):"";
      string format="%(refname)%00%(objectname)%00%(upstream:short)%00%(upstream:track)%00%(subject)";
      foreach(string line in Git.Run(workspace,"for-each-ref","--format="+format,Heads,"refs/remotes/origin/").Split('\n')){
        var f=line.TrimEnd('\r').Split('\0');
        if(f.Length<5||f[0]=="refs/remotes/origin/HEAD")continue;
        bool remote=f[0].StartsWith("refs/remotes/",StringComparison.Ordinal);
        branches.Add(new {reference=f[0],name=f[0].Substring(remote?"refs/remotes/".Length:Heads.Length),oid=f[1],upstream=f[2],tracking=f[3],subject=f[4],remote=remote,current=f[0]==currentRef});
      }
      var stashes=new List<object>();foreach(string line in Git.Run(workspace,"stash","list","--format=%gd%x00%H%x00%gs").Split('\n')){var f=line.TrimEnd('\r').Split('\0');if(f.Length>=3)stashes.Add(new {reference=f[0],oid=f[1],message=f[2]});}
      var tags=new List<object>();foreach(string line in Git.Run(workspace,"for-each-ref","--format=%(refname:strip=2)%00%(objectname)%00%(subject)","refs/tags/").Split('\n')){var f=line.TrimEnd('\r').Split('\0');if(f.Length>=3)tags.Add(new {name=f[0],oid=f[1],message=f[2]});}
      return new {workspace=workspace,current=current,origin=Git.Try(workspace,"remote","get-url","origin").Trim(),branches=branches,stashes=stashes,tags=tags,conflicts=Conflicts(workspace),merging=Merging(workspace),manualMerge=CadMergeStore.Summary(workspace),changes=GitpolarPane.ChangedFiles(workspace)};
    }
    public static async Task Push(string workspace){Origin(workspace);string branch=RequireBranchRef(workspace);await Git.Async(workspace,"push","--set-upstream","origin",branch+":"+branch);}
    static void StashEntry(string workspace,IDictionary<string,object> values,out string reference,out string oid){reference=Text(values,"reference");oid=Text(values,"oid");if(!System.Text.RegularExpressions.Regex.IsMatch(reference,"^stash@\\{[0-9]+\\}$")||Resolve(workspace,reference)!=oid)throw new InvalidOperationException("暂存列表已变化，请刷新后重新选择。");}
    public static async Task<object> Execute(string workspace,string action,Dictionary<string,object> values){
      string reference=Text(values,"reference"),name=Text(values,"name");
      switch(action){
        case "repository-state":return await Task.Run(()=>Snapshot(workspace));
        case "create-branch":{
          CheckName(workspace,name,"heads");string start=Resolve(workspace,Text(values,"start"));if(Flag(values,"switch"))Clean(workspace);
          await Git.Async(workspace,"branch","--",name,start);if(Flag(values,"switch"))await Git.Async(workspace,"switch","--",name);
          if(Flag(values,"publish")){Origin(workspace);await Git.Async(workspace,"push","--set-upstream","origin","refs/heads/"+name+":refs/heads/"+name);}return new {ok=true,message="已创建分支 "+name};
        }
        case "checkout":{
          Clean(workspace);if(reference.StartsWith("refs/heads/")){name=LocalName(workspace,reference);await Git.Async(workspace,"switch","--",name);}else{name=RemoteName(workspace,reference);if(!String.IsNullOrEmpty(Git.Try(workspace,"show-ref","--verify","refs/heads/"+name)))throw new InvalidOperationException("本地已有 "+name+"，请选择对应本地分支进行切换。");await Git.Async(workspace,"switch","--track","-c",name,"--",reference);}return new {ok=true,message="已切换到 "+name};
        }
        case "rename-branch":{string old=LocalName(workspace,reference);CheckName(workspace,name,"heads");if(Merging(workspace)&&reference==CurrentRef(workspace))throw new InvalidOperationException("请先完成或中止当前合并，再重命名所在分支。");await Git.Async(workspace,"branch","-m","--",old,name);return new {ok=true,message="分支已重命名为 "+name};}
        case "delete-branch":{
          if(reference.StartsWith(Heads,StringComparison.Ordinal)){
            name=LocalName(workspace,reference);
            // Git's branch -d otherwise tests the upstream when one is configured.
            if(Git.Run(workspace,"rev-list","-1","HEAD.."+reference,"--").Length!=0)throw new InvalidOperationException("所选本地分支还有未合入当前分支的提交："+name);
            await Git.Async(workspace,"branch","-d","--",name);
          }else{name=RemoteName(workspace,reference);await Git.Async(workspace,"push","origin","--delete","refs/heads/"+name);}
          return new {ok=true,message="已删除分支 "+name};
        }
        case "set-upstream":{name=RemoteName(workspace,reference);await Git.Async(workspace,"branch","--set-upstream-to="+reference);return new {ok=true,message="当前分支已跟踪 origin/"+name};}
        case "fetch":Origin(workspace);await Git.Async(workspace,"fetch","--prune","origin");return new {ok=true,message="已刷新远端分支"};
        case "pull":Clean(workspace);Origin(workspace);if(String.IsNullOrEmpty(Git.Try(workspace,"rev-parse","--abbrev-ref","--symbolic-full-name","@{upstream}").Trim()))throw new InvalidOperationException("当前分支尚未跟踪远端。请先发布分支，或选择远端分支并点击“设置跟踪”。");await Git.Async(workspace,"pull","--ff-only");return new {ok=true,message="当前分支已更新到远端最新版本"};
        case "push":await Push(workspace);return new {ok=true,message="当前分支和 Git LFS 文件已推送"};
        case "merge":{
          string branch=RequireBranchRef(workspace);Clean(workspace);string oid=Resolve(workspace,reference);CadMergeStore.Supersede(workspace);try{await Git.Async(workspace,"merge","--no-ff","--no-edit","-m","合并分支 "+reference.Replace("refs/heads/","").Replace("refs/remotes/",""),oid);}catch(Exception){var conflicts=Conflicts(workspace);if(conflicts.Length>0)return new {ok=false,conflicted=true,message="合并存在冲突，请在“冲突”页选择保留的版本，然后完成合并。",conflicts=conflicts};throw;}return new {ok=true,message="已合并到 "+branch.Substring(Heads.Length)};
        }
        case "merge-manual":{
          string branch=RequireBranchRef(workspace);Clean(workspace);string ours=Resolve(workspace,"HEAD"),oid=Resolve(workspace,reference);try{await Git.Async(workspace,"merge","--no-ff","--no-commit","-m","人工合图合并 "+reference.Replace("refs/heads/","").Replace("refs/remotes/",""),oid);}catch(Exception){if(!Merging(workspace)||Conflicts(workspace).Length==0)throw;}
          long mergeWriteTime;
          if(SingleMergeHead(workspace,out mergeWriteTime)!=oid)throw new InvalidOperationException("当前没有对应的双亲合并。请核对该分支是否已合入。");
          var pending=new CadMergeSession{Id=Guid.NewGuid().ToString("N"),Workspace=Path.GetFullPath(workspace).TrimEnd(Path.DirectorySeparatorChar),Branch=branch,MergeWriteTime=mergeWriteTime,Ours=ours,Theirs=oid,State="pending"};
          CadMergeStore.Validate(workspace,pending);CadMergeStore.Save(workspace,pending);return new {ok=true,message="合并已暂停。请导入双分支装配，手工合图后应用结果，再完成合并。"};
        }
        case "mark-manual-resolved":{string[] files=Text(values,"path").Length>0?new string[]{Text(values,"path")}:new string[0];CadMergeStore.MarkSaved(workspace,files,Flag(values,"confirmed"));return new {ok=true,message="已将保存的人工结果标记解决；尚未生成合并提交。"};}
        case "resolve-conflict":{
          if(Merging(workspace))CadMergeStore.ValidateActive(workspace);
          string file=Text(values,"path"),side=Text(values,"side");GitpolarPane.SafePath(workspace,file);if(!Conflicts(workspace).Contains(file))throw new InvalidOperationException("该文件已不是待处理冲突，请刷新。");if(side!="ours"&&side!="theirs")throw new InvalidOperationException("请选择当前分支或合入分支版本。");
          string stage=side=="ours"?"2":"3";bool exists=Git.Run(workspace,"--literal-pathspecs","ls-files","-u","--",file).Split('\n').Any(line=>line.Split('\t')[0].EndsWith(" "+stage));
          if(exists){await Git.Async(workspace,"--literal-pathspecs","checkout","--"+side,"--",file);await Git.Async(workspace,"--literal-pathspecs","add","--",file);}else await Git.Async(workspace,"--literal-pathspecs","rm","--",file);return new {ok=true,message="已保留"+(side=="ours"?"当前分支":"合入分支")+"版本："+file};
        }
        case "continue-merge":{
          if(!Merging(workspace))throw new InvalidOperationException("当前没有待完成的合并。");
          RequireBranchRef(workspace);
          if(Conflicts(workspace).Length>0)throw new InvalidOperationException("请先处理所有冲突文件。");
          CadMergeStore.RequireSavedResult(workspace);
          if(Git.Run(workspace,"diff","--name-only").Length!=0)throw new InvalidOperationException("还有保存后未暂存的修改，请先暂存改动，再完成合并。");
          await Git.Async(workspace,"commit","--no-edit");
          CadMergeStore.Finish(workspace,false);
          return new {ok=true,message="合并已完成，提交保留两边历史，可点击推送"};
        }
        case "abort-merge":{
          if(!Merging(workspace))throw new InvalidOperationException("当前没有待中止的合并。");
          CadMergeStore.ValidateActive(workspace);
          await Git.Async(workspace,"merge","--abort");
          CadMergeStore.Finish(workspace,true);
          return new {ok=true,message="已中止本次合并；人工合图副本仍保留在本机"};
        }
        case "stash-save":if(Merging(workspace)||Conflicts(workspace).Length>0)throw new InvalidOperationException("请先处理或中止当前冲突。");await Git.Async(workspace,"stash","push","--include-untracked","-m",String.IsNullOrWhiteSpace(Text(values,"message"))?"gitpolar 暂存 "+DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"):Text(values,"message"));return new {ok=true,message="工作区改动已保存到本地暂存"};
        case "stash-apply":{string stash,oid;StashEntry(workspace,values,out stash,out oid);Clean(workspace);try{await Git.Async(workspace,"stash","apply",oid);}catch(Exception){var conflicts=Conflicts(workspace);if(conflicts.Length>0)return new {ok=false,conflicted=true,message="恢复暂存遇到冲突，原暂存仍保留。请处理冲突后通过“提交选项”提交。",conflicts=conflicts};throw;}return new {ok=true,message="已恢复暂存改动，原暂存仍保留"};}
        case "stash-drop":{string stash,oid;StashEntry(workspace,values,out stash,out oid);await Git.Async(workspace,"stash","drop",stash);return new {ok=true,message="已删除所选暂存"};}
        case "create-tag":CheckName(workspace,name,"tags");await Git.Async(workspace,"tag","--",name,Resolve(workspace,Text(values,"start")));if(Flag(values,"publish"))await Git.Async(workspace,"push","origin","refs/tags/"+name);return new {ok=true,message="标签已创建："+name};
        case "push-tag":CheckName(workspace,name,"tags");Resolve(workspace,"refs/tags/"+name);await Git.Async(workspace,"push","origin","refs/tags/"+name);return new {ok=true,message="标签已推送："+name};
        case "delete-tag":CheckName(workspace,name,"tags");if(Flag(values,"remote"))await Git.Async(workspace,"push","origin","--delete","refs/tags/"+name);else await Git.Async(workspace,"tag","-d","--",name);return new {ok=true,message="标签已删除："+name};
        case "locks":Origin(workspace);return new JavaScriptSerializer().DeserializeObject(await Git.Async(workspace,"lfs","locks","--verify","--json"));
        case "lock":case "unlock":{string file=Text(values,"path");GitpolarPane.SafePath(workspace,file);Origin(workspace);await Git.Async(workspace,"lfs",action=="lock"?"lock":"unlock",file);return new {ok=true,message=(action=="lock"?"已取得编辑锁：":"已释放自己的编辑锁：")+file};}
        case "set-origin":{
          string url=Text(values,"url").Trim();Uri uri;if(!Uri.TryCreate(url,UriKind.Absolute,out uri)||(uri.Scheme!="http"&&uri.Scheme!="https")||!String.IsNullOrEmpty(uri.UserInfo))throw new InvalidOperationException("请输入 HTTP(S) 克隆地址，用户名和令牌请交给 Git 凭据管理器。");
          if(String.IsNullOrEmpty(Git.Try(workspace,"remote","get-url","origin")))await Git.Async(workspace,"remote","add","origin",url);else await Git.Async(workspace,"remote","set-url","origin",url);return new {ok=true,message="origin 已更新，点击刷新远端读取分支"};
        }
        default:throw new InvalidOperationException("未知仓库操作："+action);
      }
    }
  }
}
