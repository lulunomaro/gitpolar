using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Web.Script.Serialization;
namespace Gitpolar.SolidWorks {
  public sealed class CadMergeFile {
    public string Path {get;set;} public string Relative {get;set;} public string Side {get;set;}
  }
  public sealed class CadMergeOutput {
    public string Source {get;set;} public string Target {get;set;} public string Side {get;set;} public string Hash {get;set;}
  }
  public sealed class CadMergeSession {
    public string Id {get;set;} public string Workspace {get;set;} public string Root {get;set;}
    public string Ours {get;set;} public string Theirs {get;set;} public string OursAssembly {get;set;} public string TheirsAssembly {get;set;}
    public string Parent {get;set;} public string Target {get;set;} public string State {get;set;} public string Commit {get;set;}
    public string PlanId {get;set;} public string Result {get;set;}
    public List<CadMergeFile> Files {get;set;} public List<CadMergeOutput> Plan {get;set;} public List<CadMergeOutput> Applied {get;set;}
    public CadMergeSession(){Files=new List<CadMergeFile>();Plan=new List<CadMergeOutput>();Applied=new List<CadMergeOutput>();}
  }
  // Only metadata lives in Git's private directory. CAD comparison copies never enter the index.
  public static class CadMergeStore {
    static string Metadata(string workspace){string path=Git.Run(workspace,"rev-parse","--git-path","gitpolar-cad-merge.json").Trim();return Path.IsPathRooted(path)?path:Path.Combine(workspace,path);}
    public static CadMergeSession Load(string workspace){string file=Metadata(workspace);return File.Exists(file)?new JavaScriptSerializer().Deserialize<CadMergeSession>(File.ReadAllText(file)):null;}
    public static void Save(string workspace,CadMergeSession session){string file=Metadata(workspace),temporary=file+".tmp";Directory.CreateDirectory(Path.GetDirectoryName(file));File.WriteAllText(temporary,new JavaScriptSerializer().Serialize(session),new UTF8Encoding(false));if(File.Exists(file))File.Replace(temporary,file,null);else File.Move(temporary,file);}
    public static bool Active(CadMergeSession session){return session!=null&&session.State!="completed"&&session.State!="aborted";}
    public static void Validate(string workspace,CadMergeSession session){
      if(!Active(session)||!String.Equals(Path.GetFullPath(workspace),session.Workspace,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("当前没有可继续的人工合图会话。");
      if(Git.Run(workspace,"rev-parse","HEAD").Trim()!=session.Ours||Git.Try(workspace,"rev-parse","--verify","MERGE_HEAD").Trim()!=session.Theirs)throw new InvalidOperationException("合并的提交已经变化。请重新导入两边装配体，不能把旧的合图结果标到另一组合并上。");
    }
    public static object Summary(string workspace){var session=Load(workspace);if(session==null)return new {active=false};bool active=Active(session)&&RepositoryGit.Merging(workspace);return new {active=active,id=session.Id,state=session.State,ours=session.Ours,theirs=session.Theirs,parent=session.Parent,target=session.Target,result=session.Result,files=session.Files.Count,applied=session.Applied.Select(file=>file.Target).ToArray(),commit=session.Commit};}
    public static string Hash(string file){using(var algorithm=SHA256.Create())using(var input=new FileStream(file,FileMode.Open,FileAccess.Read,FileShare.ReadWrite))return BitConverter.ToString(algorithm.ComputeHash(input)).Replace("-","").ToLowerInvariant();}
    public static void RequireSavedResult(string workspace){var session=Load(workspace);if(!Active(session))return;Validate(workspace,session);if(session.State!="applied"||session.Applied.Count==0)throw new InvalidOperationException("请先手工合图，再点击“应用人工结果”并确认保存结果。");foreach(var file in session.Applied){string path=GitpolarPane.SafePath(workspace,file.Target);if(!File.Exists(path)||Hash(path)!=file.Hash)throw new InvalidOperationException("人工结果在应用后又有改动，请重新应用结果并标记解决："+file.Target);}}
    public static string[] MarkSaved(string workspace,IEnumerable<string> paths,bool confirmed){
      if(!confirmed)throw new InvalidOperationException("请先确认图纸已经手工处理并保存，再标记解决。");if(!RepositoryGit.Merging(workspace))throw new InvalidOperationException("当前没有待完成的合并。");
      var files=paths.Distinct(StringComparer.Ordinal).ToArray();if(files.Length==0)throw new InvalidOperationException("请选择已经保存的冲突文件。");var conflicts=new HashSet<string>(RepositoryGit.Conflicts(workspace),StringComparer.Ordinal);
      foreach(string relative in files){string file=GitpolarPane.SafePath(workspace,relative);if(!conflicts.Contains(relative))throw new InvalidOperationException("文件已不是待处理冲突，请刷新："+relative);if(!File.Exists(file))throw new InvalidOperationException("文件不存在。删除冲突请明确选择保留已删除的一边："+relative);if(new FileInfo(file).Length<=1024&&File.ReadAllText(file).StartsWith("version https://git-lfs.github.com/spec/v1"))throw new InvalidOperationException("图纸仍是 LFS 指针，不能标记为人工结果："+relative);if(!GitpolarPane.IsCadFile(relative)){string text=File.ReadAllText(file);if(text.Split('\n').Any(line=>line.StartsWith("<<<<<<< ")||line.StartsWith("=======")||line.StartsWith(">>>>>>> ")))throw new InvalidOperationException("文件仍包含文本冲突标记："+relative);}}
      var args=new List<string>{"add","--"};args.AddRange(files);Git.Run(workspace,args.ToArray());return files;
    }
    public static void Finish(string workspace,bool aborted){var session=Load(workspace);if(!Active(session))return;session.State=aborted?"aborted":"completed";if(!aborted)session.Commit=Git.Run(workspace,"rev-parse","HEAD").Trim();Save(workspace,session);}
  }
}
