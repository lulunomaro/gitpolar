using System;
using System.IO;
using System.Linq;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SolidWorks.Interop.sldworks;
namespace Gitpolar.SolidWorks {
  public sealed partial class GitpolarPane {
    readonly SemaphoreSlim previewRenderer=new SemaphoreSlim(1,1);
    public bool IsPreviewRendering {get;private set;}
    public event Action PreviewFinished;
    async Task<Image> RenderHistoricalPreview(string workspace,string requested,string relative,CancellationToken cancellation){
      SafePath(workspace,relative);string oid=Commit(workspace,requested);
      string root=Path.Combine(Log.DirectoryPath,"renders",CacheKey(workspace),oid,CacheKey(relative));
      string image=Path.Combine(root,"shaded-edges-v3.png"),noteFile=image+".note";
      await previewRenderer.WaitAsync(cancellation);
      try {
        RequireRunning();cancellation.ThrowIfCancellationRequested();
        if(!File.Exists(image)){
          Progress("正在生成实体预览 · "+oid.Substring(0,7)+" · "+Path.GetFileName(relative));
          string copies=Path.Combine(root,"documents-"+Guid.NewGuid().ToString("N").Substring(0,8));Directory.CreateDirectory(copies);
          var session=new CadMergeSession(){Workspace=workspace};int index=0;
          foreach(string path in await Task.Run(()=>TreeCad(workspace,oid)))session.Files.Add(new CadMergeFile(){Relative=path,Side="preview",Path=Path.Combine(copies,"P_"+Path.GetFileName(copies).Substring(10)+"_"+(index++).ToString("D5")+Path.GetExtension(path))});
          RequireRunning();cancellation.ThrowIfCancellationRequested();
          var first=session.Files.FirstOrDefault(file=>file.Relative==relative);
          if(first==null)throw new InvalidOperationException("此提交中没有此图纸："+relative);
          var pending=new Queue<CadMergeFile>();var exported=new HashSet<string>(StringComparer.OrdinalIgnoreCase);var visited=new HashSet<string>(StringComparer.OrdinalIgnoreCase);var frozen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);pending.Enqueue(first);
          while(pending.Count>0){
            cancellation.ThrowIfCancellationRequested();var file=pending.Dequeue();if(!visited.Add(file.Path))continue;
            if(exported.Add(file.Path)){string original=await ExportHistoricalFile(workspace,oid,file.Relative);cancellation.ThrowIfCancellationRequested();File.Copy(original,file.Path);File.SetAttributes(file.Path,FileAttributes.Normal);}RequireRunning();
            foreach(string reference in DirectReferences(file.Path)){
              CadMergeFile dependency;
              try {dependency=FindSource(session,"preview",reference,workspace);}
              catch(InvalidOperationException){
                // Parts already contain saved bodies. An unavailable design-context link must
                // not prevent a read-only view or be substituted with another project's model.
                bool outside=!session.Files.Any(item=>String.Equals(Path.GetFileName(item.Relative),Path.GetFileName(reference),StringComparison.OrdinalIgnoreCase));
                if(file.Relative.EndsWith(".sldprt",StringComparison.OrdinalIgnoreCase)&&outside){frozen.Add(reference);continue;}
                throw new InvalidOperationException("此版本的装配引用无法解析："+Path.GetFileName(reference)+"。请将对应组件纳入仓库。");
              }
              if(exported.Add(dependency.Path)){string original=await ExportHistoricalFile(workspace,oid,dependency.Relative);cancellation.ThrowIfCancellationRequested();File.Copy(original,dependency.Path);File.SetAttributes(dependency.Path,FileAttributes.Normal);}RequireRunning();
              if(!app.ReplaceReferencedDocument(file.Path,reference,dependency.Path))throw new InvalidOperationException("预览无法重连历史引用："+file.Relative+" → "+dependency.Relative);pending.Enqueue(dependency);
            }
            foreach(string reference in DirectReferences(file.Path))if(!session.Files.Any(item=>Same(item.Path,reference))&&!frozen.Contains(reference))throw new InvalidOperationException("历史预览仍有仓库外引用："+Path.GetFileName(reference));
            await Task.Yield();RequireRunning();
          }
          cancellation.ThrowIfCancellationRequested();RenderPreviewCopy(first.Path,copies,image);
          string note=frozen.Count>0?"已保存的实体 · "+frozen.Count+" 个外部引用未更新":"固定提交 · 着色并显示边线";
          File.WriteAllText(noteFile,note);if(frozen.Count>0)Log.Write("Stored bodies preview; external references not loaded: "+String.Join(" | ",frozen));
        }
        using(var bitmap=Image.FromFile(image)){var result=new Bitmap(bitmap);result.Tag=File.Exists(noteFile)?File.ReadAllText(noteFile):"固定提交 · 着色并显示边线";return result;}
      } finally {previewRenderer.Release();if(!IsStopping&&PreviewFinished!=null)PreviewFinished();}
    }
    void RenderPreviewCopy(string file,string copies,string image){
      RequireRunning();var previous=app.IActiveDoc2;string active=previous==null?"":previous.GetPathName();
      int appearance=app.GetUserPreferenceIntegerValue(305),background=app.GetUserPreferenceIntegerValue(99),external=app.GetUserPreferenceIntegerValue(82);string bitmap=image+".bmp";
      IsPreviewRendering=true;
      try {
        // Never update design-context links while viewing a committed snapshot.
        app.SetUserPreferenceIntegerValue(82,2);
        int errors=0,warnings=0;var doc=(IModelDoc2)app.OpenDoc6(file,Path.GetExtension(file).Equals(".sldasm",StringComparison.OrdinalIgnoreCase)?2:Path.GetExtension(file).Equals(".slddrw",StringComparison.OrdinalIgnoreCase)?3:1,3|64,"",ref errors,ref warnings);
        if(doc==null||!Same(doc.GetPathName(),file))throw new InvalidOperationException("无法打开历史预览副本（"+errors+"）。");
        app.SetUserPreferenceIntegerValue(305,0);app.SetUserPreferenceIntegerValue(99,ColorTranslator.ToWin32(CadPreviewStyle.Background));
        doc.ClearSelection2(true);var assembly=doc as IAssemblyDoc;
        if(assembly!=null){assembly.ResolveAllLightWeightComponents(false);foreach(IComponent2 component in ItemsObjects(assembly.GetComponents(false))){string path=component.GetPathName();if(!String.IsNullOrEmpty(path)&&!Inside(path,copies))throw new InvalidOperationException("历史装配载入了副本外的组件："+Path.GetFileName(path));}}
        if(doc.GetType()==1){var bodies=((IPartDoc)doc).GetBodies2(0,false) as Array;if(bodies==null||bodies.Length==0)throw new InvalidOperationException("此版本没有可显示的已保存实体。请在源工程重建并保存后提交。");}
        if(doc.GetType()!=3){doc.ShowNamedView2("*Isometric",7);var view=(IModelView)doc.ActiveView;if(view!=null){view.DisplayMode=5;view.RemovePerspective();}doc.ViewZoomtofit2();}
        doc.GraphicsRedraw2();
        if(!doc.SaveBMP(bitmap,1200,900)||!File.Exists(bitmap))throw new InvalidOperationException("SolidWorks 未生成实体预览。");
        using(var source=Image.FromFile(bitmap))using(var prepared=CadPreviewStyle.Frame(source))prepared.Save(image,ImageFormat.Png);
        Log.Write("Shaded preview: "+file+" -> "+image);
      } finally {
        try {
          var owned=new List<KeyValuePair<string,string>>();
          for(var item=(IModelDoc2)app.GetFirstDocument();item!=null;item=(IModelDoc2)item.GetNext()){string path=item.GetPathName();if(!String.IsNullOrEmpty(path)&&Inside(path,copies))owned.Add(new KeyValuePair<string,string>(path,item.GetTitle()));}
          foreach(var item in owned)if(app.GetOpenDocumentByName(item.Key)!=null)app.CloseDoc(item.Value);
        } finally {
          app.SetUserPreferenceIntegerValue(305,appearance);app.SetUserPreferenceIntegerValue(99,background);app.SetUserPreferenceIntegerValue(82,external);
          if(previous!=null){int error=0;if(!String.IsNullOrEmpty(active))app.ActivateDoc3(active,false,0,ref error);else app.ActivateDoc3(previous.GetTitle(),false,0,ref error);}
          IsPreviewRendering=false;if(File.Exists(bitmap))File.Delete(bitmap);
        }
      }
    }
    static object[] ItemsObjects(object value){var array=value as object[];return array??new object[0];}
  }
}
