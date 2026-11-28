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
    public string Branch {get;set;}
    public long MergeWriteTime {get;set;}
    public string Ours {get;set;} public string Theirs {get;set;} public string OursAssembly {get;set;} public string TheirsAssembly {get;set;}
    public string Parent {get;set;} public string Target {get;set;} public string State {get;set;} public string Commit {get;set;}
    public string PlanId {get;set;} public string Result {get;set;}
    public List<CadMergeFile> Files {get;set;} public List<CadMergeOutput> Plan {get;set;} public List<CadMergeOutput> Applied {get;set;}
    public CadMergeSession(){Files=new List<CadMergeFile>();Plan=new List<CadMergeOutput>();Applied=new List<CadMergeOutput>();}
  }
  // Only metadata lives in Git's private directory. CAD comparison copies never enter the index.
  public static class CadMergeStore {
    static string Metadata(string workspace){return RepositoryGit.GitFile(workspace,"gitpolar-cad-merge.json");}
    public static CadMergeSession Load(string workspace){string file=Metadata(workspace);return File.Exists(file)?new JavaScriptSerializer().Deserialize<CadMergeSession>(File.ReadAllText(file)):null;}
    public static void Save(string workspace,CadMergeSession session){string file=Metadata(workspace),temporary=file+".tmp";Directory.CreateDirectory(Path.GetDirectoryName(file));File.WriteAllText(temporary,new JavaScriptSerializer().Serialize(session),new UTF8Encoding(false));if(File.Exists(file))File.Replace(temporary,file,null);else File.Move(temporary,file);}
    public static bool Active(CadMergeSession session){return session!=null&&session.State!="completed"&&session.State!="aborted"&&session.State!="superseded";}
    internal static bool Matches(string workspace,CadMergeSession session){
      if(!Active(session)||!String.Equals(Path.GetFullPath(workspace).TrimEnd('\\','/'),session.Workspace,StringComparison.OrdinalIgnoreCase))return false;
      long writeTime;
      string incoming=RepositoryGit.SingleMergeHead(workspace,out writeTime);
      if(session.MergeWriteTime!=0&&session.MergeWriteTime!=writeTime)return false;
      if(incoming==null||incoming!=session.Theirs||Git.Run(workspace,"rev-parse","HEAD").Trim()!=session.Ours)return false;
      string current=RepositoryGit.CurrentRef(workspace);
      if(!current.StartsWith(RepositoryGit.Heads,StringComparison.Ordinal))return false;
      if(!String.IsNullOrEmpty(session.Branch))return current==session.Branch;
      // Older sessions stored only commit IDs. Resume automatically only with one possible local branch.
      string branches=Git.Run(workspace,"for-each-ref","--format=%(refname)","--points-at="+session.Ours,RepositoryGit.Heads);
      return branches.TrimEnd('\r','\n')==current;
    }
    public static void Validate(string workspace,CadMergeSession session){
      if(!Active(session))throw new InvalidOperationException("当前没有可继续的人工合图会话。");
      if(!Matches(workspace,session))throw new InvalidOperationException("工作副本、目标分支或合并父提交与原合图会话不符。请重新导入当前两边的装配体，原合图副本仍保留。");
    }
    internal static void ValidateActive(string workspace){
      var session=Load(workspace);
      if(Active(session))Validate(workspace,session);
    }
    // A new ordinary merge started from a clean checkout supersedes any session ended outside the add-in.
    internal static void Supersede(string workspace){
      var session=Load(workspace);
      if(Active(session)){session.State="superseded";Save(workspace,session);}
    }
    public static object Summary(string workspace){var session=Load(workspace);if(session==null)return new {active=false};bool active=Matches(workspace,session);return new {active=active,id=session.Id,state=session.State,ours=session.Ours,theirs=session.Theirs,parent=session.Parent,target=session.Target,result=session.Result,files=session.Files.Count,applied=session.Applied.Select(file=>file.Target).ToArray(),commit=session.Commit};}
    public static string Hash(string file){using(var algorithm=SHA256.Create())using(var input=new FileStream(file,FileMode.Open,FileAccess.Read,FileShare.ReadWrite))return BitConverter.ToString(algorithm.ComputeHash(input)).Replace("-","").ToLowerInvariant();}
    public static void RequireSavedResult(string workspace){
      var session=Load(workspace);
      if(!Active(session))return;
      Validate(workspace,session);
      if(session.State!="applied"||session.Applied.Count==0)throw new InvalidOperationException("请先手工合图，再点击“应用人工结果”并确认保存结果。");
      foreach(var file in session.Applied){
        string path=GitpolarPane.SafePath(workspace,file.Target);
        if(!File.Exists(path)||Hash(path)!=file.Hash)throw new InvalidOperationException("人工结果在应用后又有改动，请重新应用结果并标记解决："+file.Target);
      }
      // An untracked dependency or an assume-unchanged entry can produce an empty git diff.
      // Compare the actual stage-zero blobs, using the clean filter for each reviewed path (including LFS).
      var staged=new Dictionary<string,string>(StringComparer.Ordinal);
      foreach(string record in Git.Run(workspace,"ls-files","--stage","-z").Split(new[]{'\0'},StringSplitOptions.RemoveEmptyEntries)){
        int tab=record.IndexOf('\t');
        string[] entry=record.Substring(0,tab).Split(' ');
        if(entry[2]=="0"&&(entry[0]=="100644"||entry[0]=="100755"))staged.Add(record.Substring(tab+1),entry[1]);
      }
      string[] paths=session.Applied.Select(file=>file.Target).ToArray();
      string hashes=Git.WithInputAsync(workspace,String.Join("\n",paths)+"\n","hash-object","--stdin-paths").GetAwaiter().GetResult();
      string[] blobs=hashes.Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries);
      if(blobs.Length!=paths.Length)throw new InvalidOperationException("无法核对全部人工结果的 Git 对象。");
      for(int i=0;i<paths.Length;i++){
        string blob;
        if(!staged.TryGetValue(paths[i],out blob)||blob!=blobs[i])throw new InvalidOperationException("暂存区缺少已确认的人工结果，或暂存内容不同。请重新应用结果："+paths[i]);
      }
    }
    static bool HasConflictMarkers(string workspace,string relative,string path){
      using(var input=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.ReadWrite)){
        byte[] sample=new byte[8000];int count=input.Read(sample,0,sample.Length);
        bool unicodeBom=count>=2&&((sample[0]==0xff&&sample[1]==0xfe)||(sample[0]==0xfe&&sample[1]==0xff));
        if(!unicodeBom&&Array.IndexOf(sample,(byte)0,0,count)>=0)return false;
        string[] attr=Git.Run(workspace,"check-attr","-z","conflict-marker-size","--",relative).Split('\0');
        int size;if(!Int32.TryParse(attr[2],out size)||size<=0)size=7;
        input.Position=0;
        using(var reader=new StreamReader(input,Encoding.UTF8,true)){
          string line;
          while((line=reader.ReadLine())!=null){
            if(line.Length<size)continue;
            char marker=line[0];
            if(marker!='<'&&marker!='='&&marker!='>'&&marker!='|')continue;
            if(line.Length>size&&(marker=='='||line[size]!=' '))continue;
            int run=1;while(run<size&&line[run]==marker)run++;
            if(run==size)return true;
          }
        }
        return false;
      }
    }
    public static string[] MarkSaved(string workspace,IEnumerable<string> paths,bool confirmed){
      if(!confirmed)throw new InvalidOperationException("请先确认图纸已经手工处理并保存，再标记解决。");
      if(RepositoryGit.Merging(workspace))ValidateActive(workspace);
      var files=paths.Distinct(StringComparer.Ordinal).ToArray();
      if(files.Length==0)throw new InvalidOperationException("请选择已经保存的冲突文件。");
      var conflicts=new HashSet<string>(RepositoryGit.Conflicts(workspace),StringComparer.Ordinal);
      foreach(string relative in files){
        string file=GitpolarPane.SafePath(workspace,relative);
        if(!conflicts.Contains(relative))throw new InvalidOperationException("文件已不是待处理冲突，请刷新："+relative);
        if(!File.Exists(file))throw new InvalidOperationException("文件不存在。删除冲突请明确选择保留已删除的一边："+relative);
        if(GitpolarPane.IsPointer(file))throw new InvalidOperationException("图纸仍是 LFS 指针，不能标记为人工结果："+relative);
        if(HasConflictMarkers(workspace,relative,file))throw new InvalidOperationException("文件仍包含文本冲突标记："+relative);
      }
      Git.WithPathsAsync(workspace,files,"add").GetAwaiter().GetResult();return files;
    }
    public static void Finish(string workspace,bool aborted){var session=Load(workspace);if(!Active(session))return;session.State=aborted?"aborted":"completed";if(!aborted)session.Commit=Git.Run(workspace,"rev-parse","HEAD").Trim();Save(workspace,session);}
  }
}
