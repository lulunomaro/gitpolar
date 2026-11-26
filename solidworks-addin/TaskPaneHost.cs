using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
namespace Gitpolar.SolidWorks {
  // SolidWorks owns this HWND. Keep scrolling and DPI layout in the child view.
  internal sealed class TaskPaneHost:UserControl {
    readonly NativeTaskPane view;
    readonly Timer sizing=new Timer(){Interval=250};
    int handleCreations,visibilityRecoveries;DateTime nextVisibilityCheck=DateTime.UtcNow.AddSeconds(1);public Func<bool> RecoverVisibility;
    [StructLayout(LayoutKind.Sequential)] struct Rect {public int Left,Top,Right,Bottom;}
    [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hwnd,out Rect rect);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    public TaskPaneHost(NativeTaskPane view){
      this.view=view;AutoScaleMode=AutoScaleMode.None;AutoScroll=false;TabStop=false;
      BackColor=Dark.Background;Size=new Size(320,720);
      view.Dock=DockStyle.Fill;Controls.Add(view);
      sizing.Tick+=(s,e)=>{FitToParent();if(!IsDisposed&&IsHandleCreated&&!IsWindowVisible(Handle)&&DateTime.UtcNow>=nextVisibilityCheck){nextVisibilityCheck=DateTime.UtcNow.AddSeconds(2);if(RecoverVisibility!=null&&RecoverVisibility())visibilityRecoveries++;}};
    }
    protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);handleCreations++;}
    public void Start(){FitToParent();sizing.Start();}
    public void FitToParent(){
      if(IsDisposed||Disposing||!IsHandleCreated)return;
      Rect rect;IntPtr parent=GetParent(Handle);
      if(parent==IntPtr.Zero||!GetClientRect(parent,out rect)||rect.Right<=0||rect.Bottom<=0)return;
      if(Left!=0||Top!=0||Width!=rect.Right||Height!=rect.Bottom)SetBounds(0,0,rect.Right,rect.Bottom);
    }
    public object Snapshot(){
      Rect parentRect=new Rect(),nativeRect=new Rect();IntPtr parent=IsHandleCreated?GetParent(Handle):IntPtr.Zero;
      if(parent!=IntPtr.Zero)GetClientRect(parent,out parentRect);
      if(IsHandleCreated)GetClientRect(Handle,out nativeRect);
      return new {hwnd=IsHandleCreated?Handle.ToInt64():0,parent=parent.ToInt64(),width=nativeRect.Right,height=nativeRect.Bottom,parentWidth=parentRect.Right,parentHeight=parentRect.Bottom,visible=IsHandleCreated&&IsWindowVisible(Handle),handleCreations=handleCreations,visibilityRecoveries=visibilityRecoveries,contentWidth=view.Width,contentHeight=view.Height};
    }
    protected override void Dispose(bool disposing){if(disposing){sizing.Stop();sizing.Dispose();}base.Dispose(disposing);}
  }
}
