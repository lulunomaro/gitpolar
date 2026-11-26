const pending=new Map();let serial=0;
const native=window.chrome?.webview;
if(native){
  document.body.classList.add('solidworks-host');
  native.addEventListener('message',event=>{
    const data=event.data;if(data?.type==='gitpolar-progress'){window.dispatchEvent(new CustomEvent('gitpolar-native-progress',{detail:data}));return;}
    if(data?.type!=='gitpolar-response')return;
    const request=pending.get(data.id);if(!request)return;pending.delete(data.id);clearTimeout(request.timer);
    data.error?request.reject(new Error(data.error)):request.resolve(data.result);
  });
}
export const solidworks={available:!!native,request(action,values={}){
  if(!native)return Promise.reject(new Error('请在 SolidWorks 的 gitpolar 插件中使用此操作。'));
  return new Promise((resolve,reject)=>{const id=String(++serial),timer=setTimeout(()=>{pending.delete(id);reject(new Error('SolidWorks 操作超时，请查看插件日志。'));},20*60*1000);pending.set(id,{resolve,reject,timer});const match=location.hash.match(/^#\/repos\/([^/?]+)/);native.postMessage({type:'gitpolar-request',id,action,values,repository:match?decodeURIComponent(match[1]):''});});
}};
