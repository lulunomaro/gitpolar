using System;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
namespace Gitpolar.SolidWorks {
  // Continuations belong to the add-in pane, rather than WinForms' hidden thread window.
  // SolidWorks may destroy that hidden window before pending Git reads finish during ExitApp.
  internal sealed class UiLifetimeContext:SynchronizationContext {
    readonly Control dispatcher;readonly Func<bool> running;
    public UiLifetimeContext(Control dispatcher,Func<bool> running){this.dispatcher=dispatcher;this.running=running;}
    bool Alive{get{return running()&&!dispatcher.IsDisposed&&!dispatcher.Disposing&&dispatcher.IsHandleCreated;}}
    void InvokeCallback(SendOrPostCallback callback,object state){if(!Alive)return;var previous=Current;SetSynchronizationContext(this);try{callback(state);}finally{SetSynchronizationContext(previous);}}
    public override void Post(SendOrPostCallback callback,object state){if(!Alive)return;try{dispatcher.BeginInvoke(new Action(()=>InvokeCallback(callback,state)));}catch(InvalidOperationException){}}
    public override void Send(SendOrPostCallback callback,object state){if(!Alive)return;if(dispatcher.InvokeRequired){try{dispatcher.Invoke(new Action(()=>InvokeCallback(callback,state)));}catch(InvalidOperationException){}}else InvokeCallback(callback,state);}
    public override SynchronizationContext CreateCopy(){return this;}
  }
}
