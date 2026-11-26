using System;
using System.IO;
using System.Runtime.InteropServices;
using SolidWorks.Interop.sldworks;
namespace Gitpolar.SolidWorks {
  public sealed class CadContext {
    public string File="",Name="",Kind="",State="";public int DocumentType;public bool Dirty,ReadOnly,InWorkspace,CanSave;
    public string Signature {get{return File+"|"+Dirty+"|"+ReadOnly+"|"+CanSave;}}
  }
  public sealed partial class GitpolarPane {
    CadContext cachedCadContext=new CadContext();
    public CadContext CachedCadContext{get{return cachedCadContext;}}
    CadContext RememberCadContext(CadContext context){cachedCadContext=context;return context;}
    public bool HasConfiguredRepository {get{return !IsStopping&&!String.IsNullOrWhiteSpace(Settings.Workspace)&&Directory.Exists(Settings.Workspace);}}
    public CadContext CurrentCadContext(){try{return ReadCadContext();}catch(InvalidCastException error){return TransitionCadContext(error);}catch(COMException error){return TransitionCadContext(error);}catch(InvalidComObjectException error){return TransitionCadContext(error);}}
    CadContext TransitionCadContext(Exception error){if(cachedCadContext.State!="SolidWorks 正在切换图纸")Log.Write("CAD context transition: "+error.ToString());var previous=cachedCadContext;return RememberCadContext(new CadContext(){File=previous.File,Name=previous.Name,Kind=previous.Kind,DocumentType=previous.DocumentType,Dirty=previous.Dirty,ReadOnly=previous.ReadOnly,InWorkspace=previous.InWorkspace,State="SolidWorks 正在切换图纸",CanSave=false});}
    CadContext ReadCadContext(){
      var result=new CadContext();if(IsStopping||app==null){result.State="未连接 SolidWorks";return RememberCadContext(result);}
      var doc=app.IActiveDoc2;if(doc==null){result.State="尚未打开图纸";return RememberCadContext(result);}
      result.File=doc.GetPathName();result.Name=doc.GetTitle();result.DocumentType=doc.GetType();result.Kind=result.DocumentType==1?"零件":result.DocumentType==2?"装配体":result.DocumentType==3?"工程图":"文档";result.Dirty=doc.GetSaveFlag();result.ReadOnly=doc.IsOpenedReadOnly();
      result.InWorkspace=HasConfiguredRepository&&!String.IsNullOrEmpty(result.File)&&Inside(result.File,Settings.Workspace);
      result.State=String.IsNullOrEmpty(result.File)?"请先另存到 Git 工作副本":result.ReadOnly?"只读版本":!result.InWorkspace?"不属于当前工作副本":result.Dirty?"有未保存的修改":"图纸已保存";
      result.CanSave=result.InWorkspace&&!result.ReadOnly&&result.DocumentType>=1&&result.DocumentType<=3&&!IsBusy&&!IsPreviewRendering;
      return RememberCadContext(result);
    }
  }
  public sealed partial class Addin {
    // SolidWorks calls command-enable functions during document teardown. Keep
    // these callbacks managed-only; never query a document from inside them.
    public int CanSaveCheckpoint(){return controller!=null&&!controller.IsStopping&&!controller.IsBusy&&!controller.IsPreviewRendering&&controller.CachedCadContext.CanSave?1:0;}
    public int CanUseRepository(){return controller!=null&&controller.HasConfiguredRepository&&!controller.IsBusy&&!controller.IsPreviewRendering?1:0;}
  }
}
