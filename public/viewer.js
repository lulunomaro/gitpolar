(()=>{var Hs=["#0969da","#8250df","#1a7f37","#bf3989","#bc4c00","#0598a5","#9a6700","#cf222e"];function Nl(i,{rowHeight:t=42,laneWidth:e=22,padding:n=19}={}){let s=[],r=[],a=[],o=0,c=1,l=()=>{let g=s.findIndex(h=>!h);return g<0?s.length:g};for(let g=0;g<i.length;g++){let h=i[g],f=s.findIndex(d=>d?.oid===h.oid);f<0&&(f=l(),s[f]={oid:h.oid,color:Hs[o++%Hs.length]});let m=s[f],_=g*t+t/2;for(let d=0;d<s.length;d++)s[d]&&d!==f&&a.push({from:d,to:d,y:_,color:s[d].color,target:s[d].oid});s[f]=null;for(let d=0;d<h.parents.length;d++){let u=h.parents[d],x=s.findIndex(M=>M?.oid===u);x<0&&(x=d===0&&!s[f]?f:l(),s[x]={oid:u,color:d===0?m.color:Hs[o++%Hs.length]}),a.push({from:f,to:x,y:_,color:s[x].color,target:u,source:h.oid})}r.push({oid:h.oid,lane:f,x:n+f*e,y:_,color:m.color}),c=Math.max(c,s.length)}let p=n*2+(c-1)*e;return{rows:r,segments:a,width:p,height:i.length*t,rowHeight:t,laneWidth:e,padding:n}}function Ul(i,t){let e=t.padding+i.from*t.laneWidth,n=t.padding+i.to*t.laneWidth,s=i.y,r=s+t.rowHeight;return e===n?"M "+e+" "+s+" V "+r:"M "+e+" "+s+" C "+e+" "+(s+t.rowHeight*.6)+" "+n+" "+(s+t.rowHeight*.4)+" "+n+" "+r}var Ws=new Map,Yh=0,Ki=window.chrome?.webview;Ki&&(document.body.classList.add("solidworks-host"),Ki.addEventListener("message",i=>{let t=i.data;if(t?.type==="gitpolar-progress"){window.dispatchEvent(new CustomEvent("gitpolar-native-progress",{detail:t}));return}if(t?.type!=="gitpolar-response")return;let e=Ws.get(t.id);e&&(Ws.delete(t.id),clearTimeout(e.timer),t.error?e.reject(new Error(t.error)):e.resolve(t.result))}));var Oe={available:!!Ki,request(i,t={}){return Ki?new Promise((e,n)=>{let s=String(++Yh),r=setTimeout(()=>{Ws.delete(s),n(new Error("SolidWorks \u64CD\u4F5C\u8D85\u65F6\uFF0C\u8BF7\u67E5\u770B\u63D2\u4EF6\u65E5\u5FD7\u3002"))},1200*1e3);Ws.set(s,{resolve:e,reject:n,timer:r});let a=location.hash.match(/^#\/repos\/([^/?]+)/);Ki.postMessage({type:"gitpolar-request",id:s,action:i,values:t,repository:a?decodeURIComponent(a[1]):""})}):Promise.reject(new Error("\u8BF7\u5728 SolidWorks \u7684 gitpolar \u63D2\u4EF6\u4E2D\u4F7F\u7528\u6B64\u64CD\u4F5C\u3002"))}};var le=i=>String(i??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),Fl=i=>new Date(i).toLocaleString("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}),$a=(i,t,e)=>window.GitpolarAPI("repos/"+encodeURIComponent(i.name)+"/"+t+(e?"?"+new URLSearchParams(e):"")),Ja=i=>i.path.startsWith(".gitpolar/"),Ol=i=>/\.(sldprt|sldasm|step|stp|stl)$/i.test(i),ji=(i,t,e)=>"#/repos/"+encodeURIComponent(i.name)+(t==="code"?"":"/"+t)+"?"+new URLSearchParams(e),Be;function Bl(){Be&&(Be.abort.abort(),Be.dialog?.remove()),Be=null}async function Zh(i,t,e){Bl();let n={repo:t,container:i,query:e,abort:new AbortController,commits:[],refs:[],selected:e.get("commit")||"",base:e.get("base")||"",path:e.get("path")||"",scope:e.get("branch")||"",source:Oe.available?"local":"nas",cursor:null,detailVersion:0,previewVersion:0};Be=n,i.innerHTML='<section class="git-graph-page"><header class="graph-heading"><div><h1>Git Graph <span class="graph-cad-badge">SolidWorks</span></h1><p>\u6CBF\u7740\u63D0\u4EA4\u56FE\u67E5\u770B\u5206\u652F\u548C\u5408\u5E76\uFF0C\u9009\u4E24\u4E2A\u7248\u672C\u6BD4\u8F83\u96F6\u4EF6\u4E0E\u88C5\u914D\u4F53\u3002</p></div><a class="button" href="'+le(ji(t,"code",{}))+'">\u8FD4\u56DE\u6587\u4EF6</a></header><div class="graph-native" hidden><div class="graph-workspace-info" role="status">\u6B63\u5728\u8FDE\u63A5 SolidWorks\u2026</div><div class="graph-native-actions"><button class="button" data-native="refresh">\u5237\u65B0\u672C\u5730</button><button class="button" data-native="fetch">Fetch</button><button class="button" data-native="pull">Pull</button><button class="button primary" data-native="commit">\u4FDD\u5B58\u5E76\u63D0\u4EA4\u2026</button><button class="button" data-native="push">Push \u5230 NAS</button><button class="button" data-native="checkout">\u5207\u6362\u672C\u5730\u5206\u652F\u2026</button></div></div><div class="graph-toolbar"><label class="graph-source" hidden>\u4F4D\u7F6E <select data-graph-source aria-label="\u63D0\u4EA4\u56FE\u4F4D\u7F6E"><option value="local">\u672C\u5730\u5DE5\u4F5C\u526F\u672C</option><option value="nas">NAS \u4ED3\u5E93</option></select></label><label>\u5206\u652F <select data-graph-ref aria-label="\u7B5B\u9009\u63D0\u4EA4\u56FE\u5206\u652F"><option value="">\u6240\u6709\u5206\u652F</option></select></label><label class="graph-search">\u67E5\u627E <input type="search" class="form-input" data-graph-search placeholder="\u63D0\u4EA4\u8BF4\u660E\u3001\u4F5C\u8005\u3001SHA\u2026" aria-label="\u67E5\u627E\u63D0\u4EA4"></label><button class="button" data-graph-refresh>\u5237\u65B0</button></div><div class="graph-pathbar"><label>\u9884\u89C8\u8DEF\u5F84 <input class="form-input" data-graph-path placeholder="\u9009\u4E2D\u6539\u52A8\u6587\u4EF6\uFF0C\u6216\u8F93\u5165\u88C5\u914D\u4F53 / \u96F6\u4EF6\u8DEF\u5F84" aria-label="\u56FE\u7EB8\u9884\u89C8\u8DEF\u5F84"></label><button class="button" data-graph-path-apply>\u67E5\u770B</button></div><div class="graph-selection" role="status">\u5355\u51FB\u63D0\u4EA4\u67E5\u770B\u8BE6\u60C5\uFF1BCtrl / \u2318 \u5355\u51FB\u7B2C\u4E8C\u4E2A\u63D0\u4EA4\u53EF\u5BF9\u6BD4\u3002</div><p class="graph-error field-error" role="alert" hidden></p><div class="graph-split"><section class="graph-history" aria-label="\u5206\u652F\u63D0\u4EA4\u56FE"><div class="graph-table-head"><span>Graph</span><span>\u63D0\u4EA4 / \u5206\u652F</span><span>\u4F5C\u8005 \xB7 \u65F6\u95F4 \xB7 SHA</span></div><div class="graph-scroll"><div class="graph-canvas"></div></div><div class="graph-history-footer"><span data-graph-count>\u6B63\u5728\u8BFB\u53D6\u2026</span><button class="button small" data-graph-more hidden>\u52A0\u8F7D\u66F4\u591A</button></div></section><aside class="graph-details" aria-label="\u63D0\u4EA4\u8BE6\u60C5\u548C CAD \u9884\u89C8"><div class="graph-empty">\u9009\u4E2D\u4E00\u4E2A\u63D0\u4EA4\uFF0C\u67E5\u770B\u6539\u52A8\u6587\u4EF6\u548C\u5BF9\u5E94\u7248\u672C\u7684 CAD\u3002</div></aside></div></section>',n.canvas=i.querySelector(".graph-canvas"),n.details=i.querySelector(".graph-details"),i.querySelector("[data-graph-path]").value=n.path;let s=_=>{let d=i.querySelector(".graph-error");d.hidden=!_,d.textContent=_?.message||String(_||"")};n.error=s;let r=_=>i.querySelectorAll("[data-native]").forEach(d=>d.disabled=_);async function a(){if(!Oe.available)return;let _=await Oe.request("status");Be===n&&(n.status=_,i.querySelector(".graph-native").hidden=!1,i.querySelector(".graph-source").hidden=!1,i.querySelector(".graph-workspace-info").textContent=(_.activeDocument||"\u65E0\u6D3B\u52A8\u56FE\u7EB8")+" \xB7 "+(_.branch||"detached HEAD")+" \xB7 "+_.files.length+" \u4E2A\u672C\u5730\u6539\u52A8"+(_.ahead?" \xB7 "+_.ahead+" \u4E2A\u5F85\u63A8\u9001\u63D0\u4EA4":""),!n.path&&_.relativePath&&(n.path=_.relativePath,i.querySelector("[data-graph-path]").value=n.path))}async function o(_=!1){s("");let d=n.cursor,u=n.source,x=n.scope;i.querySelector("[data-graph-refresh]").disabled=!0,i.querySelector("[data-graph-more]").disabled=!0;try{let M=n.source==="local"?await Oe.request("graph",{ref:n.scope,cursor:_?"":n.cursor}):await $a(t,"graph",{...n.scope?{ref:n.scope}:{},...!_&&n.cursor?{cursor:n.cursor}:{}});if(Be!==n||u!==n.source||x!==n.scope)return;_&&(n.commits=[],n.refs=M.refs,n.base="",n.details.innerHTML='<div class="graph-empty">\u9009\u4E2D\u63D0\u4EA4\u67E5\u770B\u56FE\u7EB8\u4E0E\u6539\u52A8\u3002</div>',n.detailVersion++,window.GitpolarPreview?.dispose());let b=new Set(n.commits.map(T=>T.oid));n.commits.push(...M.commits.filter(T=>!b.has(T.oid))),n.cursor=M.nextCursor;let A=i.querySelector("[data-graph-ref]");if(A.innerHTML='<option value="">\u6240\u6709\u5206\u652F</option>'+n.refs.filter(T=>T.type!=="tag").map(T=>'<option value="'+le(T.fullName||T.name)+'">'+le(T.name)+"</option>").join(""),A.value=n.scope,c(),i.querySelector("[data-graph-more]").hidden=!n.cursor,i.querySelector("[data-graph-count]").textContent=n.commits.length+" \u4E2A\u63D0\u4EA4"+(n.cursor?" \xB7 \u53EF\u7EE7\u7EED\u52A0\u8F7D":""),_&&n.commits.length){let T=n.commits.find(v=>v.oid===n.selected)||n.commits[0];await h(T.oid)}}catch(M){Be===n&&(n.cursor=d,s(M))}finally{Be===n&&(i.querySelector("[data-graph-refresh]").disabled=!1,i.querySelector("[data-graph-more]").disabled=!1)}}function c(){let _=Nl(n.commits),d=new Map;for(let u of n.refs)d.has(u.oid)||d.set(u.oid,[]),d.get(u.oid).push(u);n.canvas.innerHTML=n.commits.length?'<svg class="graph-lanes" width="'+_.width+'" height="'+_.height+'" viewBox="0 0 '+_.width+" "+_.height+'" aria-label="\u63D0\u4EA4\u4E4B\u95F4\u7684\u7236\u5B50\u8FDE\u7EBF" role="img">'+_.segments.map(u=>'<path d="'+Ul(u,_)+'" stroke="'+u.color+'" fill="none" stroke-width="2"/>').join("")+_.rows.map(u=>'<circle data-node="'+u.oid+'" cx="'+u.x+'" cy="'+u.y+'" r="'+(u.oid===n.selected?6:4)+'" fill="'+u.color+'" stroke="var(--bg-default, white)" stroke-width="2"/>').join("")+'</svg><div class="graph-rows">'+n.commits.map(u=>'<button class="graph-row'+(n.selected===u.oid?" selected":"")+(n.base===u.oid?" comparison-base":"")+'" data-commit="'+u.oid+'" aria-pressed="'+(n.selected===u.oid)+'" title="'+le(u.message)+'"><span class="graph-message">'+(d.get(u.oid)||[]).map(x=>'<span class="graph-ref '+le(x.type)+'">'+(x.type==="tag"?"\u25C7 ":x.type==="remote"?"\u21A5 ":"\u2442 ")+le(x.name)+"</span>").join("")+'<span class="graph-subject">'+(u.parents.length>1?'<span class="graph-merge" title="\u5408\u5E76\u63D0\u4EA4">\u2442</span> ':"")+le(u.message)+'</span></span><span class="graph-author">'+le(u.author)+'</span><time class="graph-date">'+Fl(u.date)+'</time><code class="graph-sha">'+u.hash+"</code></button>").join("")+"</div>":'<div class="graph-empty">\u6B64\u4ED3\u5E93\u8FD8\u6CA1\u6709\u63D0\u4EA4\u3002</div>',l(),p()}function l(){let _=i.querySelector("[data-graph-search]").value.trim().toLowerCase();for(let d of n.canvas.querySelectorAll("[data-commit]")){let u=n.commits.find(x=>x.oid===d.dataset.commit);d.classList.toggle("search-dimmed",!!_&&![u.message,u.oid,u.author,...n.refs.filter(x=>x.oid===u.oid).map(x=>x.name)].join(" ").toLowerCase().includes(_))}}function p(){let _=i.querySelector(".graph-selection");_.innerHTML=(n.base?"\u5BF9\u6BD4\u8D77\u70B9 <code>"+n.base.slice(0,7)+"</code> \u2192 ":"\u5F53\u524D\u63D0\u4EA4 ")+(n.selected?"<code>"+n.selected.slice(0,7)+"</code>":"\u672A\u9009\u62E9")+(n.base&&n.selected&&n.base!==n.selected?' <button class="button small" data-compare-selected>\u6BD4\u8F83\u8FD9\u4E24\u4E2A\u7248\u672C</button>':"")+(n.base?' <button class="button small" data-clear-base>\u6E05\u9664\u8D77\u70B9</button>':"")}async function g(){let _=++n.previewVersion,d=n.details.querySelector(".graph-preview");if(!d)return;window.GitpolarPreview?.dispose(),d.replaceChildren();let u=n.path||n.detail?.files.find(M=>!Ja(M)&&Ol(M.path)&&M.status!=="D")?.path;if(!u){d.innerHTML='<p class="muted">\u4ECE\u4E0A\u65B9\u9009\u62E9\u6587\u4EF6\uFF0C\u6216\u8F93\u5165\u603B\u88C5\u914D\u4F53\u8DEF\u5F84\u3002</p>';return}n.path=u,i.querySelector("[data-graph-path]").value=u;let x=n.details.querySelector(".graph-file-actions");if(x.innerHTML="<strong>"+le(u)+'</strong><div><a class="button small" href="'+le(ji(t,"code",{branch:n.selected,path:u}))+'">\u6D4F\u89C8\u6B64\u7248\u672C</a>'+(n.detail.parents.length?'<a class="button small" href="'+le(ji(t,"compare",{base:n.detail.parents[0],head:n.selected,path:u}))+'">\u4E0E\u4E0A\u4E00\u7248\u5BF9\u6BD4</a>':"")+(Oe.available?'<button class="button small" data-open-snapshot>\u5728 SolidWorks \u6253\u5F00\u6B64\u7248\u672C</button>':"")+"</div>",!Ol(u)){d.innerHTML='<p class="muted">\u6B64\u6587\u4EF6\u53EF\u4EE5\u901A\u8FC7\u201C\u6D4F\u89C8\u6B64\u7248\u672C\u201D\u67E5\u770B\u3002</p>';return}d.textContent="\u6B63\u5728\u8BFB\u53D6\u6B64\u63D0\u4EA4\u7684\u9884\u89C8\u2026";try{let M=await $a(t,"preview",{ref:n.selected,path:u});if(Be!==n||_!==n.previewVersion)return;d.textContent="",d.classList.add("cad-viewer"),d.dataset.repo=t.name,d.dataset.ref=n.selected,d.dataset.path=u,await window.GitpolarPreview.mount(d,{meta:M})}catch(M){Be===n&&_===n.previewVersion&&(d.textContent=n.source==="local"?"NAS \u4E2D\u8FD8\u6CA1\u6709\u6B64\u7248\u672C\u7684\u9884\u89C8\u3002\u53EF\u5728 SolidWorks \u6253\u5F00\u5386\u53F2\u7248\u672C\uFF0C\u6216\u751F\u6210\u9884\u89C8\u5E76\u63A8\u9001\u3002":M.message)}}async function h(_){n.selected=_,c();let d=++n.detailVersion;n.details.innerHTML='<p class="graph-empty" role="status">\u6B63\u5728\u8BFB\u53D6\u63D0\u4EA4\u2026</p>';try{let u=n.source==="local"?await Oe.request("commit-detail",{oid:_}):await $a(t,"commit",{ref:_});if(Be!==n||d!==n.detailVersion)return;n.detail=u;let x=u.files.filter(b=>!Ja(b)),M=u.files.length-x.length;n.details.innerHTML='<header class="graph-detail-head"><code>'+u.hash+"</code><h2>"+le(u.message.split(`
`)[0])+"</h2><p>"+le(u.author)+" \xB7 "+Fl(u.date)+'</p><div class="graph-detail-buttons"><button class="button small" data-set-base>\u8BBE\u4E3A\u5BF9\u6BD4\u8D77\u70B9</button><button class="button small" data-new-branch>\u4ECE\u8FD9\u91CC\u5EFA\u5206\u652F</button><button class="button small" data-copy-sha>\u590D\u5236 SHA</button></div>'+(u.parents.length?'<p class="graph-parents">\u7236\u63D0\u4EA4 '+u.parents.map((b,A)=>'<button class="graph-parent" data-parent="'+b+'">'+(u.parents.length>1?String(A+1)+" \xB7 ":"")+b.slice(0,7)+"</button>").join(" ")+"</p>":'<p class="muted">\u521D\u59CB\u63D0\u4EA4</p>')+'</header><div class="graph-files-head"><strong>\u6539\u52A8\u6587\u4EF6 <span class="count">'+x.length+"</span></strong>"+(M?'<span class="muted">\u53E6\u6709 '+M+" \u4E2A\u9884\u89C8\u8D44\u4EA7</span>":"")+'</div><div class="graph-changed-files">'+x.map(b=>'<button data-graph-file="'+le(b.path)+'" class="graph-changed-file"><span class="graph-file-status status-'+b.status+'">'+b.status+"</span><span>"+le(b.path)+"</span></button>").join("")+'</div><div class="graph-file-actions"></div><div class="graph-preview"></div>',await g()}catch(u){Be===n&&d===n.detailVersion&&(n.details.innerHTML='<p class="field-error">'+le(u.message)+"</p>")}}function f(_,d,u){n.dialog?.remove();let x=document.createElement("dialog");x.className="graph-dialog",x.innerHTML="<form><header><h2>"+le(_)+'</h2><button type="button" class="button small" data-close>\u5173\u95ED</button></header>'+d+'<p class="field-error" role="alert" hidden></p><div class="dialog-actions"><button type="submit" class="button primary">\u786E\u8BA4</button></div></form>',n.dialog=x,document.body.append(x),x.querySelector("[data-close]").onclick=()=>x.close(),x.addEventListener("close",()=>x.remove()),x.querySelector("form").onsubmit=async M=>{M.preventDefault();let b=x.querySelector("[type=submit]");b.disabled=!0;try{await u(new FormData(M.target)),x.close()}catch(A){let T=x.querySelector("[role=alert]");T.hidden=!1,T.textContent=A.message,b.disabled=!1}},x.showModal()}function m(){n.base&&n.selected&&n.base!==n.selected&&(location.hash=ji(t,"compare",{base:n.base,head:n.selected,...n.path?{path:n.path}:{}}))}i.addEventListener("change",_=>{_.target.matches("[data-graph-ref]")&&(n.scope=_.target.value,o(!0)),_.target.matches("[data-graph-source]")&&(n.source=_.target.value,n.scope="",o(!0))}),i.querySelector("[data-graph-search]").addEventListener("input",l),i.addEventListener("contextmenu",async _=>{let d=_.target.closest("[data-commit]");if(!d||(_.preventDefault(),await h(d.dataset.commit),Be!==n))return;f("\u63D0\u4EA4 "+n.selected.slice(0,7),'<div class="graph-context-actions"><button type="button" data-context="base">\u8BBE\u4E3A\u5BF9\u6BD4\u8D77\u70B9</button><button type="button" data-context="branch">\u4ECE\u6B64\u63D0\u4EA4\u521B\u5EFA\u5206\u652F\u2026</button><button type="button" data-context="copy">\u590D\u5236\u5B8C\u6574 SHA</button>'+(n.detail.parents.length?'<a href="'+le(ji(t,"compare",{base:n.detail.parents[0],head:n.selected,...n.path?{path:n.path}:{}}))+'">\u4E0E\u7236\u63D0\u4EA4\u6BD4\u8F83</a>':"")+(Oe.available&&n.path?'<button type="button" data-context="open">\u5728 SolidWorks \u6253\u5F00\u5386\u53F2\u56FE\u7EB8</button>':"")+"</div>",async()=>{});let u=n.dialog;u.querySelector("[type=submit]").hidden=!0,u.addEventListener("click",x=>{let M=x.target.closest("[data-context]")?.dataset.context;if(!M)return;u.close();let b={base:"[data-set-base]",branch:"[data-new-branch]",copy:"[data-copy-sha]",open:"[data-open-snapshot]"};i.querySelector(b[M])?.click()})}),i.addEventListener("click",async _=>{let d=_.target.closest("button");if(!d)return;let u=d.dataset.commit;try{if(u&&((_.ctrlKey||_.metaKey||_.shiftKey)&&n.selected&&n.selected!==u?(n.base=n.selected,await h(u),m()):await h(u)),d.hasAttribute("data-graph-refresh")&&(await a(),await o(!0)),d.hasAttribute("data-graph-more")&&await o(),d.hasAttribute("data-set-base")&&(n.base=n.selected,c()),d.hasAttribute("data-clear-base")&&(n.base="",c()),d.hasAttribute("data-compare-selected")&&m(),d.dataset.parent&&await h(d.dataset.parent),d.dataset.graphFile&&(n.path=d.dataset.graphFile,await g()),d.hasAttribute("data-graph-path-apply")&&(n.path=i.querySelector("[data-graph-path]").value.trim().replaceAll("\\","/"),await g()),d.hasAttribute("data-copy-sha")&&await navigator.clipboard.writeText(n.selected),d.hasAttribute("data-new-branch")&&f("\u4ECE "+n.selected.slice(0,7)+" \u521B\u5EFA\u5206\u652F",'<label>\u5206\u652F\u540D\u79F0<input class="form-input" name="name" required placeholder="design/\u96F6\u4EF6\u6539\u8FDB"></label><p class="muted">\u65B0\u5206\u652F\u4ECE\u9009\u5B9A\u63D0\u4EA4\u5F00\u59CB\u3002</p>',async x=>{n.source==="local"?await Oe.request("create-branch",{name:x.get("name"),oid:n.selected}):await window.GitpolarAPI("repos/"+t.name+"/branches",{method:"POST",body:{name:x.get("name"),from:n.selected}}),await o(!0)}),d.hasAttribute("data-open-snapshot")){r(!0);try{await Oe.request("open-snapshot",{oid:n.selected,path:n.path})}finally{r(!1)}}if(d.dataset.native){let x=d.dataset.native;if(x==="commit"){n.status=await Oe.request("prepare-commit");let M=n.status.files.filter(b=>!Ja(b));f("\u4FDD\u5B58\u5E76\u63D0\u4EA4 CAD",'<p>\u4FDD\u5B58\u5DE5\u4F5C\u526F\u672C\u4E2D\u7684\u5DF2\u6253\u5F00\u56FE\u7EB8\uFF0C\u6309\u9700\u751F\u6210\u5F53\u524D\u96F6\u4EF6 / \u603B\u88C5\u7684\u9884\u89C8\uFF0C\u518D\u63D0\u4EA4\u6240\u9009\u6587\u4EF6\u3002</p><label>\u63D0\u4EA4\u8BF4\u660E<input class="form-input" name="message" required placeholder="\u4F8B\u5982\uFF1A\u7535\u6C60\u4FDD\u62A4\u677F\u539A\u5EA6\u6539\u4E3A 3 mm"></label><label><input type="checkbox" name="preview" checked>\u751F\u6210\u5F53\u524D\u56FE\u7EB8\u7684\u589E\u91CF\u9884\u89C8</label><label><input type="checkbox" name="push" checked>\u63D0\u4EA4\u540E\u63A8\u9001\u5230 NAS</label><div class="graph-commit-files">'+M.map(b=>'<label><input type="checkbox" name="files" value="'+le(b.path)+'" checked><code>'+le(b.status)+"</code> "+le(b.path)+"</label>").join("")+'</div><p class="muted">\u63D0\u4EA4\u6240\u9009\u6587\u4EF6\u53CA\u751F\u6210\u7684\u9884\u89C8\u3002\u4FDD\u5B58\u540E\u65B0\u589E\u7684\u6539\u52A8\u4F1A\u663E\u793A\u5728\u5237\u65B0\u540E\u7684\u6587\u4EF6\u5217\u8868\u4E2D\u3002</p>',async b=>{r(!0);try{await Oe.request("commit",{message:b.get("message"),files:b.getAll("files"),preview:b.has("preview"),push:b.has("push")}),await a(),await o(!0)}finally{r(!1)}})}else if(x==="checkout")f("\u5207\u6362\u672C\u5730\u5206\u652F",'<p>\u5148\u4FDD\u5B58\u5E76\u5173\u95ED\u6B64\u5DE5\u4F5C\u526F\u672C\u4E2D\u7684\u56FE\u7EB8\uFF0C\u4FDD\u6301\u5DE5\u4F5C\u533A\u5E72\u51C0\u3002</p><label>\u672C\u5730\u5206\u652F<select name="name" required>'+n.refs.filter(M=>M.type==="branch").map(M=>"<option>"+le(M.name)+"</option>").join("")+"</select></label>",async M=>{await Oe.request("checkout",{name:M.get("name")}),await a(),await o(!0)});else{r(!0);try{x!=="refresh"&&await Oe.request(x),await a(),await o(!0)}finally{r(!1)}}}}catch(x){s(x)}},{signal:n.abort.signal}),window.addEventListener("gitpolar-native-progress",_=>{i.querySelector(".graph-workspace-info").textContent=_.detail.message},{signal:n.abort.signal});try{await a()}catch(_){n.source="nas",i.querySelector("[data-graph-source]").value="nas",s(_)}await o(!0)}window.GitpolarGraph={mount:Zh,dispose:Bl};var $h={"file-directory-fill":[16,16,'<path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path>'],file:[16,16,'<path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"></path>'],"chevron-right":[16,16,'<path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path>']},En=i=>String(i??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),Jh={modified:"\u4FEE\u6539",added:"\u65B0\u589E",removed:"\u5220\u9664",moved:"\u79FB\u52A8",unchanged:"\u672A\u53D8"},Ka=new Map,ja={};function Qi(i){return i!==".gitpolar"&&!i.startsWith(".gitpolar/")}function to(i,t,e,n=""){return"#/repos/"+encodeURIComponent(i)+"/compare?"+new URLSearchParams({base:t,head:e,...n?{path:n}:{}})}function zl({changes:i,baseFiles:t=[],headFiles:e=[],path:n=""}){let s=new Map;for(let r of[...t,...e])Qi(r.path)&&s.set(r.path,{path:r.path,status:"unchanged"});for(let r of i)Qi(r.path)&&s.set(r.path,{...r});return n&&Qi(n)&&!s.has(n)&&s.set(n,{path:n,status:"unchanged"}),[...s.values()].sort((r,a)=>r.path.localeCompare(a.path))}function Kh(i,{mode:t="changes",query:e="",selected:n=""}){let s=e.trim().toLocaleLowerCase();return i.filter(r=>(t==="all"||r.status!=="unchanged"||r.path===n)&&(!s||r.path.toLocaleLowerCase().includes(s)))}function jh(i){let t={children:new Map,count:0};for(let n of i){let s=n.path.split("/"),r=t;for(let a=0;a<s.length;a++){let o=s[a],c=s.slice(0,a+1).join("/");if(a===s.length-1)r.children.set("file:"+o,{name:o,path:c,file:n});else{let l="directory:"+o;r.children.has(l)||r.children.set(l,{name:o,path:c,children:new Map,count:0}),r=r.children.get(l),r.count++}}t.count++}let e=n=>[...n.children.values()].sort((s,r)=>+!!r.children-+!!s.children||s.name.localeCompare(r.name)).map(s=>s.children?{...s,children:e(s)}:s);return e(t)}function Qa(i){return'<svg class="icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">'+$h[i][2]+"</svg>"}function kl(i,{repo:t,data:e,request:n,signal:s}){let r=t.name+":"+e.base.oid+":"+e.head.oid;ja.key!==r&&(ja={key:r,mode:"changes",query:"",expanded:new Set,scroll:0});let a=ja,o=zl(e),c=!1,l=e.changes.filter(x=>Qi(x.path));i.innerHTML=`<div class="compare-nav-heading"><h2>Files</h2><span class="count">${l.length}</span></div><div class="compare-nav-tabs" role="tablist" aria-label="\u6BD4\u8F83\u6587\u4EF6\u8303\u56F4"><button type="button" role="tab" data-scope="changes">\u6539\u52A8\u6587\u4EF6</button><button type="button" role="tab" data-scope="all" disabled>\u5168\u90E8\u6587\u4EF6</button></div><input class="form-input" type="search" data-compare-file-filter aria-label="\u7B5B\u9009\u5BF9\u6BD4\u6587\u4EF6" placeholder="Filter files\u2026"><p class="compare-nav-status" role="status">\u6B63\u5728\u8BFB\u53D6\u6587\u4EF6\u76EE\u5F55\u2026</p><nav class="compare-nav-scroll" aria-label="\u5BF9\u6BD4\u6587\u4EF6\u76EE\u5F55\u6811"></nav>`;let p=i.querySelector("nav"),g=i.querySelector("input"),h=i.querySelector(".compare-nav-status");g.value=a.query;let f=x=>x.status==="unchanged"?x.path===e.path?'<small class="compare-current-context">\u5F53\u524D</small>':"":`<small class="compare-tree-badge change-${En(x.status)}" title="${En(Jh[x.status]||x.status)}">${En({modified:"M",added:"A",removed:"D",moved:"R"}[x.status]||x.status)}</small>`;function m(x){return x.map(M=>M.children?`<li><details data-directory="${En(M.path)}"${a.mode==="changes"||a.expanded.has(M.path)||e.path.startsWith(M.path+"/")||a.query?" open":""}><summary>${Qa("chevron-right")}${Qa("file-directory-fill")}<span>${En(M.name)}</span><small>${M.count}</small></summary><ul>${m(M.children)}</ul></details></li>`:`<li><a class="compare-tree-file${M.path===e.path?" is-selected":""}" href="${En(to(t.name,e.base.oid,e.head.oid,M.path))}" title="${En(M.path)}"${M.path===e.path?' aria-current="page"':""}>${Qa("file")}<span>${En(M.name)}</span>${f(M.file)}</a></li>`).join("")}function _(){let x=p.scrollTop,M=Kh(o,{mode:a.mode,query:a.query,selected:e.path});p.innerHTML=M.length?'<ul class="compare-file-tree">'+m(jh(M))+"</ul>":'<p class="compare-nav-empty">\u6CA1\u6709\u5339\u914D\u7684\u6587\u4EF6\u3002</p>',p.scrollTop=x,i.dataset.fileScope=a.mode,i.querySelectorAll("[data-scope]").forEach(b=>{b.setAttribute("aria-selected",String(b.dataset.scope===a.mode))}),c&&(h.textContent=`${M.length} / ${o.length} \u4E2A\u6587\u4EF6 \xB7 ${l.length} \u4E2A\u53D8\u5316`)}i.addEventListener("click",x=>{let M=x.target.closest("[data-scope]");M&&!M.disabled&&(a.mode=M.dataset.scope,_()),x.target.closest("[data-compare-tree-retry]")&&u()}),g.addEventListener("input",()=>{a.query=g.value,_()}),i.addEventListener("toggle",x=>{let M=x.target.dataset.directory;M&&(x.target.open?a.expanded.add(M):a.expanded.delete(M))},!0),p.addEventListener("scroll",()=>{a.scroll=p.scrollTop});async function d(x){let M=t.name+":"+x;if(Ka.has(M))return Ka.get(M);let A=(await n("files?"+new URLSearchParams({ref:x}))).files.filter(T=>Qi(T.path)).map(T=>({path:T.path}));return Ka.set(M,A),A}async function u(){h.textContent="\u6B63\u5728\u8BFB\u53D6\u6587\u4EF6\u76EE\u5F55\u2026";try{let[x,M]=await Promise.all([d(e.base.oid),d(e.head.oid)]);if(s.aborted||!i.isConnected)return;o=zl({...e,baseFiles:x,headFiles:M}),c=!0,i.querySelector('[data-scope="all"]').disabled=!1,_();let b=p.querySelector('[aria-current="page"]');if(b){let A=b.getBoundingClientRect(),T=p.getBoundingClientRect();(A.top<T.top||A.bottom>T.bottom)&&(p.scrollTop+=A.top-T.top-60)}}catch(x){if(s.aborted||!i.isConnected)return;h.innerHTML=En(x.message)+' <button type="button" data-compare-tree-retry>\u91CD\u8BD5</button>'}}_(),p.scrollTop=a.scroll,u()}var ce=i=>String(i??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),Xs=i=>i>=1024**3?(i/1024**3).toFixed(2)+" GiB":i>=1024**2?(i/1024**2).toFixed(2)+" MiB":i>=1024?(i/1024).toFixed(1)+" KiB":i+" B",Qh={added:"\u65B0\u589E",removed:"\u5220\u9664",modified:"\u4FEE\u6539",moved:"\u79FB\u52A8",unchanged:"\u672A\u53D8"},gn;function Vl(){gn?.abort.abort(),gn=null}function Gl(i,t,e,n){let s=i.branchList||[],r=s.some(o=>o.name===n),a=n&&!r;return`<div class="compare-version-picker" data-version-picker="${t}"><label for="compare-${t}">${e}</label><select class="select" id="compare-${t}" name="${t}" aria-label="${e}\u5206\u652F\u6216\u63D0\u4EA4">${t==="base"?`<option value=""${n?"":" selected"}>\u4E0A\u4E00\u6B21\u63D0\u4EA4</option>`:""}${s.map(o=>`<option value="${ce(o.name)}"${o.name===n?" selected":""}>${ce(o.name)} \xB7 ${o.oid.slice(0,7)}</option>`).join("")}${a?`<option value="${ce(n)}" selected>${ce(s.find(o=>o.oid===n)?.name||"Commit")} \xB7 ${ce(n.length===40?n.slice(0,7):n)}</option>`:""}<option value="__custom__" data-custom>\u6307\u5B9A\u63D0\u4EA4\u6216\u6807\u7B7E\u2026</option></select><input class="form-input" name="${t}Custom" aria-label="${e}\u6307\u5B9A\u63D0\u4EA4\u6216\u6807\u7B7E" list="compare-versions" placeholder="Commit ID, branch or tag" hidden></div>`}async function Hl(i,t,e){Vl();let n={abort:new AbortController};gn=n,i.dataset.state="loading",delete i.dataset.base,delete i.dataset.head;let s=e.get("base")||"",r=e.get("head")||t.defaultBranch,a="#/repos/"+t.name+"?"+new URLSearchParams({branch:r,...e.get("path")?{path:e.get("path")}:{}});i.innerHTML=`<section class="comparison-page"><div class="compare-heading"><div><h1>\u6BD4\u8F83\u7248\u672C</h1><p>${ce(t.name)} \xB7 \u6309\u6587\u4EF6\u67E5\u770B\u4E24\u4E2A\u7248\u672C</p></div><a class="button" href="${ce(a)}">${e.get("path")?"\u8FD4\u56DE\u6587\u4EF6":"\u8FD4\u56DE\u4ED3\u5E93"}</a></div><form class="compare-form">${Gl(t,"base","\u4FEE\u6539\u524D",s)}<button class="button compare-swap" type="button" data-compare-swap aria-label="\u4EA4\u6362\u4FEE\u6539\u524D\u548C\u4FEE\u6539\u540E" title="\u4EA4\u6362\u4FEE\u6539\u524D\u548C\u4FEE\u6539\u540E" disabled>\u21C4</button>${Gl(t,"head","\u4FEE\u6539\u540E",r)}<button class="button primary" type="submit">\u6BD4\u8F83</button><datalist id="compare-versions"></datalist></form><div class="compare-result" role="status">\u6B63\u5728\u6BD4\u8F83\u7248\u672C\u2026</div></section>`;let o=i.querySelector("form"),c=i.querySelector(".compare-result"),l=f=>o.elements[f].selectedOptions[0]?.hasAttribute("data-custom")?o.elements[f+"Custom"].value.trim():o.elements[f].value,p=(f,m)=>{let _=to(t.name,f,m,e.get("path")||"");_===location.hash?(window.GitpolarPreview?.dispose(),Hl(i,t,new URLSearchParams({base:f,head:m,...e.get("path")?{path:e.get("path")}:{}}))):location.hash=_},g=(f,m)=>{if(l(f))return;let _=o.elements[f],d=document.createElement("option");d.value=m,d.textContent="\u4E0A\u4E00\u6B21\u63D0\u4EA4 \xB7 "+m.slice(0,7),_.append(d),_.value=m};o.addEventListener("change",f=>{if(f.target.matches("select")){let m=f.target.name,_=o.elements[m+"Custom"];_.hidden=!f.target.selectedOptions[0]?.hasAttribute("data-custom"),_.required=!_.hidden,_.hidden||_.focus()}}),o.addEventListener("submit",f=>{f.preventDefault(),p(l("base"),l("head"))}),o.querySelector("[data-compare-swap]").addEventListener("click",()=>p(l("head"),l("base")));let h=async f=>{let m=await fetch("/api/repos/"+t.name+"/"+f,{signal:n.abort.signal,credentials:"same-origin"}),_=await m.json();if(!m.ok)throw Error(_.error||"Cannot compare versions.");return _};try{let f=await h("compare?"+new URLSearchParams({base:l("base"),head:l("head"),...e.get("path")?{path:e.get("path")}:{}}));if(gn!==n)return;let m=C=>{let N=C==="base"?s:r;return(t.branchList||[]).find(V=>V.name===N&&V.oid===f[C].oid)?.name||(t.branchList||[]).find(V=>V.oid===f[C].oid)?.name};g("base",f.base.oid),o.querySelector("[data-compare-swap]").disabled=!1,i.dataset.base=f.base.oid,i.dataset.head=f.head.oid;let _=new Map((t.branchList||[]).map(C=>[C.name,C.name]));_.set(f.base.oid,f.base.message),_.set(f.head.oid,f.head.message);let d=o.querySelector("datalist"),u=()=>{d.innerHTML=[..._].map(([C,N])=>`<option value="${ce(C)}">${ce(N)}</option>`).join("")};u(),h("history?"+new URLSearchParams({ref:f.head.oid})).then(C=>{if(gn===n){for(let N of C.commits)_.set(N.oid,N.hash+" \xB7 "+N.message);u()}}).catch(()=>{});let x=f.changes.filter(C=>C.kind&&!C.path.startsWith(".gitpolar/")),M=e.get("path")?x.filter(C=>C.dependency||C.path===f.path):x,b=C=>"#/repos/"+t.name+"?"+new URLSearchParams({branch:f[C].oid,path:f.path}),A=(C,N)=>`<header><strong>${N}${m(C)?" \xB7 "+ce(m(C)):""}</strong><code>${ce(f[C].hash)}</code><span>${ce(f[C].message)}</span><a href="${ce(b(C))}">\u67E5\u770B\u6B64\u7248\u672C</a></header>`,T=(C,N)=>`<section class="compare-pane" data-side="${C}">${A(C,N)}<div class="cad-viewer" data-cad-viewer data-repo="${ce(t.name)}" data-ref="${f[C].oid}" data-path="${ce(f.path)}"></div></section>`,v=/\.(sldasm|sldprt|step|stp|stl)$/i.test(f.path),E=f.changes.find(C=>C.path===f.path),F=`<div class="compare-model-heading"><h2>${ce(f.path||"\u6587\u4EF6\u6BD4\u8F83")}</h2><div>${E?`<span class="change-badge change-${ce(E.status)}">${ce(Qh[E.status])}</span>`:'<span class="label">\u539F\u6587\u4EF6\u672A\u6539</span>'}${v?'<button class="button primary" data-compare-load>\u52A0\u8F7D\u4E24\u4E2A\u9884\u89C8</button><label><input type="checkbox" data-compare-sync checked> \u540C\u6B65\u89C6\u89D2</label><label><input type="checkbox" data-compare-highlight checked> \u7A81\u51FA\u53D8\u5316</label><label><input type="checkbox" data-compare-focus disabled> \u53EA\u770B\u539F\u56FE\u53D8\u5316\u96F6\u4EF6</label>':""}</div></div>`,L=v?`<p class="compare-note">\u4E24\u4FA7\u5747\u4F7F\u7528\u5BF9\u5E94\u63D0\u4EA4\u7684\u539F\u56FE\u3001\u4F9D\u8D56\u548C\u9884\u89C8\u3002\u7EA2\uFF1A\u5220\u9664 \xB7 \u7EFF\uFF1A\u65B0\u589E \xB7 \u9EC4\uFF1A\u539F\u56FE\u4FEE\u6539 \xB7 \u84DD\uFF1A\u5B9E\u4F8B\u79FB\u52A8 \xB7 \u7D2B\uFF1A\u663E\u793A\u7F51\u683C\u53D8\u5316\u3002</p><div class="compare-panes">${T("base","\u4FEE\u6539\u524D")}${T("head","\u4FEE\u6539\u540E")}</div><details class="compare-preview-notes"><summary>\u9884\u89C8\u4E0E\u88C5\u914D\u4F9D\u8D56\u8BF4\u660E</summary><p class="compare-note">${f.dependencyScope==="project-fallback"?"\u6B64\u7248\u672C\u672A\u8BB0\u5F55\u5B8C\u6574\u4F9D\u8D56\u6E05\u5355\uFF0C\u88C5\u914D\u5386\u53F2\u6309\u6574\u4E2A\u5DE5\u7A0B\u4FDD\u5B88\u68C0\u67E5\u3002":"\u88C5\u914D\u4F9D\u8D56\u5DF2\u8BB0\u5F55\u3002"}\u7D2B\u8272\u7F51\u683C\u53D8\u5316\u53EF\u80FD\u6765\u81EA\u91CD\u5EFA\u6216\u88C5\u914D\u4E0A\u4E0B\u6587\u3002\u989C\u8272\u8868\u793A\u6587\u4EF6\u6216\u88C5\u914D\u5B9E\u4F8B\u53D8\u5316\uFF0C\u4E0D\u4EE3\u8868\u5B54\u5F84\u3001\u5C3A\u5BF8\u7B49\u7279\u5F81\u7684\u81EA\u52A8\u6D4B\u91CF\u3002</p></details>`:`<div class="compare-panes compare-text-panes">${["base","head"].map((C,N)=>`<section class="compare-pane" data-side="${C}">${A(C,N?"\u4FEE\u6539\u540E":"\u4FEE\u6539\u524D")}<div class="compare-text-content" role="status">\u6B63\u5728\u8BFB\u53D6\u6B64\u7248\u672C\u7684\u6587\u4EF6\u5185\u5BB9\u2026</div></section>`).join("")}</div>`;if(c.removeAttribute("role"),c.innerHTML=`${f.same?'<p class="version-banner">\u4E24\u4E2A\u9009\u62E9\u6307\u5411\u540C\u4E00\u6B21\u63D0\u4EA4\u3002\u53EF\u5207\u6362\u4FEE\u6539\u524D\u6216\u4FEE\u6539\u540E\u7684\u5206\u652F\u3001\u6807\u7B7E\u3001\u5386\u53F2\u63D0\u4EA4\u3002</p>':""}<div class="compare-layout"><aside class="compare-navigation" aria-label="\u7248\u672C\u6BD4\u8F83\u6587\u4EF6\u5BFC\u822A"></aside><div class="compare-main"><div class="compare-storage panel"><div><strong>${M.filter(C=>C.kind!=="exchange").length}</strong><span>\u4E2A CAD \u6587\u4EF6\u53D8\u5316</span></div><div><strong>${Xs(f.storage.newNativeBytes)}</strong><span>\u539F\u56FE\u65B0\u589E\u5185\u5BB9</span></div><div><strong>${Xs(f.storage.newPreviewBytes)}</strong><span>\u9884\u89C8\u65B0\u589E\u5185\u5BB9</span></div><div><strong>${Xs(f.storage.reusedContentBytes)}</strong><span>\u590D\u7528\u5DF2\u6709\u5185\u5BB9</span></div></div><p class="compare-note compare-capacity-note">\u5BB9\u91CF\u4E3A\u4E24\u4E2A\u7248\u672C\u95F4\u7684\u72EC\u7ACB\u5185\u5BB9\uFF0C\u4E0D\u7B49\u4E8E NAS \u5B9E\u9645\u78C1\u76D8\u589E\u91CF\u3002</p>${F}${f.path?L:'<div class="panel empty">\u4ECE\u5DE6\u4FA7\u9009\u62E9\u6587\u4EF6\u67E5\u770B\u4E24\u4E2A\u7248\u672C\u7684\u5185\u5BB9\u3002</div>'}</div></div>`,kl(i.querySelector(".compare-navigation"),{repo:t,data:f,request:h,signal:n.abort.signal}),!v&&f.path&&await Promise.all(["base","head"].map(async C=>{let N=i.querySelector(`[data-side="${C}"] .compare-text-content`);try{let V=await h("browse?"+new URLSearchParams({ref:f[C].oid,path:f.path}));if(gn!==n)return;N.removeAttribute("role"),V.missing?N.innerHTML='<p class="compare-file-unavailable">\u6B64\u7248\u672C\u4E2D\u4E0D\u5B58\u5728\u8FD9\u4E2A\u6587\u4EF6\u3002</p>':V.file?V.file.binary?N.innerHTML=`<div class="compare-file-unavailable"><p>\u4E8C\u8FDB\u5236\u6587\u4EF6 \xB7 ${Xs(V.file.size)}</p><p>\u6B64\u6587\u4EF6\u6CA1\u6709\u7F51\u9875\u5185\u5BB9\u9884\u89C8\u3002</p><a class="button" href="${ce(b(C))}">\u67E5\u770B\u539F\u6587\u4EF6\u7248\u672C</a></div>`:N.innerHTML=`<pre class="compare-source-code" tabindex="0" aria-label="${C==="base"?"\u4FEE\u6539\u524D":"\u4FEE\u6539\u540E"}\u6587\u4EF6\u5185\u5BB9"><code>${ce(V.file.text)}</code></pre>`:N.innerHTML='<p class="compare-file-unavailable">\u6B64\u8DEF\u5F84\u5728\u8FD9\u4E2A\u7248\u672C\u4E2D\u4E3A\u76EE\u5F55\u3002</p>'}catch(V){gn===n&&(N.textContent=V.message)}})),v){let C=[...i.querySelectorAll("[data-side]")],N=new Map,V=()=>{let G=i.querySelector("[data-compare-highlight]")?.checked;for(let[X,k]of N){let tt=f.components.length?f.components:f.changes;window.GitpolarPreview.highlight(k,tt.map(q=>({...q,id:q.id||q.path})),X,G)}},P=!1;for(let G of C){let X=G.dataset.side,k=G.querySelector("[data-cad-viewer]");k.addEventListener("preview-ready",tt=>{gn===n&&(N.set(X,tt.detail),V(),N.size===2&&!P&&(P=!0,window.GitpolarPreview.link(N.get("base"),N.get("head"),()=>i.querySelector("[data-compare-sync]").checked),i.querySelector("[data-compare-focus]").disabled=!1))}),await window.GitpolarPreview.mount(k,{meta:f.previews[X]})}i.querySelector("[data-compare-load]")?.addEventListener("click",()=>{for(let G of C){let X=G.querySelector("[data-load]");X&&!X.hidden&&!X.disabled&&X.click()}}),i.querySelector("[data-compare-highlight]")?.addEventListener("change",V),i.querySelector("[data-compare-focus]")?.addEventListener("change",G=>{if(N.size!==2)return;window.GitpolarPreview.focusChanges(N.get("base"),N.get("head"),f.components.length?f.components:f.changes,G.target.checked)||(G.target.checked=!1)}),i.querySelector("[data-compare-sync]")?.addEventListener("change",()=>{if(N.size===2&&i.querySelector("[data-compare-sync]").checked){let G=N.get("base"),X=N.get("head");X.camera.position.copy(G.camera.position),X.camera.up.copy(G.camera.up),X.controls.target.copy(G.controls.target),X.controls.update()}})}gn===n&&(i.dataset.state="ready")}catch(f){gn===n&&f.name!=="AbortError"&&(c.innerHTML=`<p class="field-error" role="alert">${ce(f.message)}</p>`,i.dataset.state="error")}}window.GitpolarComparison={mount:Hl,dispose:Vl};var Kn={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},jn={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},xc=0,Io=1,vc=2;var Rs=1,yc=2,Hi=3,Qn=0,Ue=1,Ke=2,ui=0,Wi=1,Lo=2,Do=3,No=4,Sc=5;var di=100,Mc=101,bc=102,Ec=103,wc=104,Tc=200,Ac=201,Rc=202,Cc=203,Uo=204,Fo=205,Pc=206,Ic=207,Lc=208,Dc=209,Nc=210,Uc=211,Fc=212,Oc=213,Bc=214,vr=0,yr=1,Sr=2,Ii=3,Mr=4,br=5,Er=6,wr=7,Oo=0,zc=1,kc=2,yn=0,Bo=1,zo=2,ko=3,Go=4,Vo=5,Ho=6,Wo=7;var Xo=300,fi=301,Xi=302,Qr=303,ta=304,Tr=1e3,xn=1001,Ar=1002,Me=1003,Gc=1004;var Cs=1005;var De=1006,ea=1007;var On=1008;var Ge=1009,qo=1010,Yo=1011,qi=1012,na=1013,un=1014,dn=1015,fn=1016,ia=1017,sa=1018,pi=1020,Zo=35902,$o=35899,Jo=1021,Ko=1022,pn=1023,Dn=1026,Bn=1027,jo=1028,ra=1029,ti=1030,aa=1031;var oa=1033,Ps=33776,Is=33777,Ls=33778,Ds=33779,la=35840,ca=35841,ha=35842,ua=35843,da=36196,fa=37492,pa=37496,ma=37488,ga=37489,Ns=37490,_a=37491,xa=37808,va=37809,ya=37810,Sa=37811,Ma=37812,ba=37813,Ea=37814,wa=37815,Ta=37816,Aa=37817,Ra=37818,Ca=37819,Pa=37820,Ia=37821,La=36492,Da=36494,Na=36495,Ua=36283,Fa=36284,Us=36285,Oa=36286;var os=2300,Rr=2301,_r=2302,Eo=2303,wo=2400,To=2401,Ao=2402;var Vc=3200;var Ba=0,Hc=1,zn="",Xe="srgb",ls="srgb-linear",cs="linear",Jt="srgb";var xr=7680;var Wc=519,Xc=512,qc=513,Yc=514,Qo=515,Zc=516,$c=517,tl=518,el=519,Jc=35044;var nl="300 es",sn=2e3,Li=2001;function tu(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function eu(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function hs(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Kc(){let i=hs("canvas");return i.style.display="block",i}var Wl={},Di=null;function il(...i){let t="THREE."+i.shift();Di?Di("log",t,...i):console.log(t,...i)}function jc(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Rt(...i){i=jc(i);let t="THREE."+i.shift();if(Di)Di("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Pt(...i){i=jc(i);let t="THREE."+i.shift();if(Di)Di("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function rs(...i){let t=i.join(" ");t in Wl||(Wl[t]=!0,Rt(...i))}function Qc(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}var th={[vr]:vr,[Sr]:Er,[Mr]:Mr,[Ii]:br,[yr]:yr,[Er]:Sr,[wr]:wr,[br]:Ii},hn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let s=n[t];if(s!==void 0){let r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}},Ae=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Xl=1234567,Ci=Math.PI/180,Ni=180/Math.PI;function Yi(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ae[i&255]+Ae[i>>8&255]+Ae[i>>16&255]+Ae[i>>24&255]+"-"+Ae[t&255]+Ae[t>>8&255]+"-"+Ae[t>>16&15|64]+Ae[t>>24&255]+"-"+Ae[e&63|128]+Ae[e>>8&255]+"-"+Ae[e>>16&255]+Ae[e>>24&255]+Ae[n&255]+Ae[n>>8&255]+Ae[n>>16&255]+Ae[n>>24&255]).toLowerCase()}function Ht(i,t,e){return Math.max(t,Math.min(e,i))}function sl(i,t){return(i%t+t)%t}function nu(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function iu(i,t,e){return i!==t?(e-i)/(t-i):0}function as(i,t,e){return(1-e)*i+e*t}function su(i,t,e,n){return as(i,t,1-Math.exp(-e*n))}function ru(i,t=1){return t-Math.abs(sl(i,t*2)-t)}function au(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function ou(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function lu(i,t){return i+Math.floor(Math.random()*(t-i+1))}function cu(i,t){return i+Math.random()*(t-i)}function hu(i){return i*(.5-Math.random())}function uu(i){i!==void 0&&(Xl=i);let t=Xl+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function du(i){return i*Ci}function fu(i){return i*Ni}function pu(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function mu(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function rl(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function gu(i,t,e,n,s){let r=Math.cos,a=Math.sin,o=r(e/2),c=a(e/2),l=r((t+n)/2),p=a((t+n)/2),g=r((t-n)/2),h=a((t-n)/2),f=r((n-t)/2),m=a((n-t)/2);switch(s){case"XYX":i.set(o*p,c*g,c*h,o*l);break;case"YZY":i.set(c*h,o*p,c*g,o*l);break;case"ZXZ":i.set(c*g,c*h,o*p,o*l);break;case"XZX":i.set(o*p,c*m,c*f,o*l);break;case"YXY":i.set(c*f,o*p,c*m,o*l);break;case"ZYZ":i.set(c*m,c*f,o*p,o*l);break;default:Rt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function al(i){switch(i.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function eh(i,t){if(t.constructor===Float32Array)return i;let e=al(t);if(e===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.max(i/e,-1)}function nh(i,t){if(t.constructor===Float32Array)return i;let e=al(t);if(e===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.round(i*e)}var Fs={DEG2RAD:Ci,RAD2DEG:Ni,generateUUID:Yi,clamp:Ht,euclideanModulo:sl,mapLinear:nu,inverseLerp:iu,lerp:as,damp:su,pingpong:ru,smoothstep:au,smootherstep:ou,randInt:lu,randFloat:cu,randFloatSpread:hu,seededRandom:uu,degToRad:du,radToDeg:fu,isPowerOfTwo:pu,ceilPowerOfTwo:mu,floorPowerOfTwo:rl,setQuaternionFromProperEuler:gu,normalize:nh,denormalize:eh},It=class{static{this.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Ht(this.x,t.x,e.x),this.y=Ht(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Ht(this.x,t,e),this.y=Ht(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ht(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Ht(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*s+t.x,this.y=r*s+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ye=class{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,a,o){let c=n[s+0],l=n[s+1],p=n[s+2],g=n[s+3],h=r[a+0],f=r[a+1],m=r[a+2],_=r[a+3];if(g!==_||c!==h||l!==f||p!==m){let d=c*h+l*f+p*m+g*_;d<0&&(h=-h,f=-f,m=-m,_=-_,d=-d);let u=1-o;if(d<.9995){let x=Math.acos(d),M=Math.sin(x);u=Math.sin(u*x)/M,o=Math.sin(o*x)/M,c=c*u+h*o,l=l*u+f*o,p=p*u+m*o,g=g*u+_*o}else{c=c*u+h*o,l=l*u+f*o,p=p*u+m*o,g=g*u+_*o;let x=1/Math.sqrt(c*c+l*l+p*p+g*g);c*=x,l*=x,p*=x,g*=x}}t[e]=c,t[e+1]=l,t[e+2]=p,t[e+3]=g}static multiplyQuaternionsFlat(t,e,n,s,r,a){let o=n[s],c=n[s+1],l=n[s+2],p=n[s+3],g=r[a],h=r[a+1],f=r[a+2],m=r[a+3];return t[e]=o*m+p*g+c*f-l*h,t[e+1]=c*m+p*h+l*g-o*f,t[e+2]=l*m+p*f+o*h-c*g,t[e+3]=p*m-o*g-c*h-l*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,c=Math.sin,l=o(n/2),p=o(s/2),g=o(r/2),h=c(n/2),f=c(s/2),m=c(r/2);switch(a){case"XYZ":this._x=h*p*g+l*f*m,this._y=l*f*g-h*p*m,this._z=l*p*m+h*f*g,this._w=l*p*g-h*f*m;break;case"YXZ":this._x=h*p*g+l*f*m,this._y=l*f*g-h*p*m,this._z=l*p*m-h*f*g,this._w=l*p*g+h*f*m;break;case"ZXY":this._x=h*p*g-l*f*m,this._y=l*f*g+h*p*m,this._z=l*p*m+h*f*g,this._w=l*p*g-h*f*m;break;case"ZYX":this._x=h*p*g-l*f*m,this._y=l*f*g+h*p*m,this._z=l*p*m-h*f*g,this._w=l*p*g+h*f*m;break;case"YZX":this._x=h*p*g+l*f*m,this._y=l*f*g+h*p*m,this._z=l*p*m-h*f*g,this._w=l*p*g-h*f*m;break;case"XZY":this._x=h*p*g-l*f*m,this._y=l*f*g-h*p*m,this._z=l*p*m+h*f*g,this._w=l*p*g+h*f*m;break;default:Rt("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],s=e[4],r=e[8],a=e[1],o=e[5],c=e[9],l=e[2],p=e[6],g=e[10],h=n+o+g;if(h>0){let f=.5/Math.sqrt(h+1);this._w=.25/f,this._x=(p-c)*f,this._y=(r-l)*f,this._z=(a-s)*f}else if(n>o&&n>g){let f=2*Math.sqrt(1+n-o-g);this._w=(p-c)/f,this._x=.25*f,this._y=(s+a)/f,this._z=(r+l)/f}else if(o>g){let f=2*Math.sqrt(1+o-n-g);this._w=(r-l)/f,this._x=(s+a)/f,this._y=.25*f,this._z=(c+p)/f}else{let f=2*Math.sqrt(1+g-n-o);this._w=(a-s)/f,this._x=(r+l)/f,this._y=(c+p)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Ht(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=e._x,c=e._y,l=e._z,p=e._w;return this._x=n*p+a*o+s*l-r*c,this._y=s*p+a*c+r*o-n*l,this._z=r*p+a*l+n*c-s*o,this._w=a*p-n*o-s*c-r*l,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let c=1-e;if(o<.9995){let l=Math.acos(o),p=Math.sin(l);c=Math.sin(c*l)/p,e=Math.sin(e*l)/p,this._x=this._x*c+n*e,this._y=this._y*c+s*e,this._z=this._z*c+r*e,this._w=this._w*c+a*e,this._onChangeCallback()}else this._x=this._x*c+n*e,this._y=this._y*c+s*e,this._z=this._z*c+r*e,this._w=this._w*c+a*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},U=class{static{this.prototype.isVector3=!0}constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(ql.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(ql.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(t){let e=this.x,n=this.y,s=this.z,r=t.x,a=t.y,o=t.z,c=t.w,l=2*(a*s-o*n),p=2*(o*e-r*s),g=2*(r*n-a*e);return this.x=e+c*l+a*g-o*p,this.y=n+c*p+o*l-r*g,this.z=s+c*g+r*p-a*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Ht(this.x,t.x,e.x),this.y=Ht(this.y,t.y,e.y),this.z=Ht(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Ht(this.x,t,e),this.y=Ht(this.y,t,e),this.z=Ht(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ht(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,s=t.y,r=t.z,a=e.x,o=e.y,c=e.z;return this.x=s*c-r*o,this.y=r*a-n*c,this.z=n*o-s*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return eo.copy(this).projectOnVector(t),this.sub(eo)}reflect(t){return this.sub(eo.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Ht(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},eo=new U,ql=new Ye,Dt=class{static{this.prototype.isMatrix3=!0}constructor(t,e,n,s,r,a,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,c,l)}set(t,e,n,s,r,a,o,c,l){let p=this.elements;return p[0]=t,p[1]=s,p[2]=o,p[3]=e,p[4]=r,p[5]=c,p[6]=n,p[7]=a,p[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],p=n[4],g=n[7],h=n[2],f=n[5],m=n[8],_=s[0],d=s[3],u=s[6],x=s[1],M=s[4],b=s[7],A=s[2],T=s[5],v=s[8];return r[0]=a*_+o*x+c*A,r[3]=a*d+o*M+c*T,r[6]=a*u+o*b+c*v,r[1]=l*_+p*x+g*A,r[4]=l*d+p*M+g*T,r[7]=l*u+p*b+g*v,r[2]=h*_+f*x+m*A,r[5]=h*d+f*M+m*T,r[8]=h*u+f*b+m*v,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],p=t[8];return e*a*p-e*o*l-n*r*p+n*o*c+s*r*l-s*a*c}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],p=t[8],g=p*a-o*l,h=o*c-p*r,f=l*r-a*c,m=e*g+n*h+s*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/m;return t[0]=g*_,t[1]=(s*l-p*n)*_,t[2]=(o*n-s*a)*_,t[3]=h*_,t[4]=(p*e-s*c)*_,t[5]=(s*r-o*e)*_,t[6]=f*_,t[7]=(n*c-l*e)*_,t[8]=(a*e-n*r)*_,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,a,o){let c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*a+l*o)+a+t,-s*l,s*c,-s*(-l*a+c*o)+o+e,0,0,1),this}scale(t,e){return rs("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(no.makeScale(t,e)),this}rotate(t){return rs("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(no.makeRotation(-t)),this}translate(t,e){return rs("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(no.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}},no=new Dt,Yl=new Dt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Zl=new Dt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function _u(){let i={enabled:!0,workingColorSpace:ls,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===Jt&&(s.r=Ln(s.r),s.g=Ln(s.g),s.b=Ln(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Jt&&(s.r=Pi(s.r),s.g=Pi(s.g),s.b=Pi(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===zn?cs:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[a].fromXYZ).multiply(this.spaces[r].toXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[ls]:{primaries:t,whitePoint:n,transfer:cs,toXYZ:Yl,fromXYZ:Zl,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Xe},outputColorSpaceConfig:{drawingBufferColorSpace:Xe}},[Xe]:{primaries:t,whitePoint:n,transfer:Jt,toXYZ:Yl,fromXYZ:Zl,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Xe}}}),i}var qt=_u();function Ln(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Pi(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var gi,Cr=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{gi===void 0&&(gi=hs("canvas")),gi.width=t.width,gi.height=t.height;let s=gi.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=gi}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=hs("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=Ln(r[a]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Ln(e[n]/255)*255):e[n]=Ln(e[n]);return{data:e,width:t.width,height:t.height}}else return Rt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},xu=0,Ui=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:xu++}),this.uuid=Yi(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width||0,e.height||0,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(io(s[a].image)):r.push(io(s[a]))}else r=io(s);n.url=r}return e||(t.images[this.uuid]=n),n}};function io(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Cr.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Rt("Texture: Unable to serialize Texture."),{})}var vu=0,so=new U,ke=class i extends hn{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=xn,s=xn,r=De,a=On,o=pn,c=Ge,l=i.DEFAULT_ANISOTROPY,p=zn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:vu++}),this.uuid=Yi(),this.name="",this.source=new Ui(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new It(0,0),this.repeat=new It(1,1),this.center=new It(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Dt,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=p,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(so).x}get height(){return this.source.getSize(so).y}get depth(){return this.source.getSize(so).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.mipmapsAutoUpdate=t.mipmapsAutoUpdate,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isPMREMTexture=t.isPMREMTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){Rt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Rt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Xo)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Tr:t.x=t.x-Math.floor(t.x);break;case xn:t.x=t.x<0?0:1;break;case Ar:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Tr:t.y=t.y-Math.floor(t.y);break;case xn:t.y=t.y<0?0:1;break;case Ar:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};ke.DEFAULT_IMAGE=null;ke.DEFAULT_MAPPING=Xo;ke.DEFAULT_ANISOTROPY=1;var re=class{static{this.prototype.isVector4=!0}constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r,c=t.elements,l=c[0],p=c[4],g=c[8],h=c[1],f=c[5],m=c[9],_=c[2],d=c[6],u=c[10];if(Math.abs(p-h)<.01&&Math.abs(g-_)<.01&&Math.abs(m-d)<.01){if(Math.abs(p+h)<.1&&Math.abs(g+_)<.1&&Math.abs(m+d)<.1&&Math.abs(l+f+u-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let M=(l+1)/2,b=(f+1)/2,A=(u+1)/2,T=(p+h)/4,v=(g+_)/4,E=(m+d)/4;return M>b&&M>A?M<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(M),s=T/n,r=v/n):b>A?b<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(b),n=T/s,r=E/s):A<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(A),n=v/r,s=E/r),this.set(n,s,r,e),this}let x=Math.sqrt((d-m)*(d-m)+(g-_)*(g-_)+(h-p)*(h-p));return Math.abs(x)<.001&&(x=1),this.x=(d-m)/x,this.y=(g-_)/x,this.z=(h-p)/x,this.w=Math.acos((l+f+u-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Ht(this.x,t.x,e.x),this.y=Ht(this.y,t.y,e.y),this.z=Ht(this.z,t.z,e.z),this.w=Ht(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Ht(this.x,t,e),this.y=Ht(this.y,t,e),this.z=Ht(this.z,t,e),this.w=Ht(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ht(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Pr=class extends hn{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:De,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new re(0,0,t,e),this.scissorTest=!1,this.viewport=new re(0,0,t,e),this.textures=[];let s=n.count;for(let r=0;r<s;r++)this.textures[r]=new ke({width:t,height:e,depth:n.depth}),this.textures[r].isRenderTargetTexture=!0,this.textures[r].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:De,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.mipmapsAutoUpdate!==void 0&&(e.mipmapsAutoUpdate=t.mipmapsAutoUpdate),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let s=Object.assign({},t.textures[e].image);this.textures[e].source=new Ui(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;else this.depthTexture=null;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ze=class extends Pr{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},us=class extends ke{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Me,this.minFilter=Me,this.wrapR=xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Ir=class extends ke{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Me,this.minFilter=Me,this.wrapR=xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var Qt=class i{static{this.prototype.isMatrix4=!0}constructor(t,e,n,s,r,a,o,c,l,p,g,h,f,m,_,d){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,c,l,p,g,h,f,m,_,d)}set(t,e,n,s,r,a,o,c,l,p,g,h,f,m,_,d){let u=this.elements;return u[0]=t,u[4]=e,u[8]=n,u[12]=s,u[1]=r,u[5]=a,u[9]=o,u[13]=c,u[2]=l,u[6]=p,u[10]=g,u[14]=h,u[3]=f,u[7]=m,u[11]=_,u[15]=d,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,s=1/_i.setFromMatrixColumn(t,0).length(),r=1/_i.setFromMatrixColumn(t,1).length(),a=1/_i.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,s=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(s),l=Math.sin(s),p=Math.cos(r),g=Math.sin(r);if(t.order==="XYZ"){let h=a*p,f=a*g,m=o*p,_=o*g;e[0]=c*p,e[4]=-c*g,e[8]=l,e[1]=f+m*l,e[5]=h-_*l,e[9]=-o*c,e[2]=_-h*l,e[6]=m+f*l,e[10]=a*c}else if(t.order==="YXZ"){let h=c*p,f=c*g,m=l*p,_=l*g;e[0]=h+_*o,e[4]=m*o-f,e[8]=a*l,e[1]=a*g,e[5]=a*p,e[9]=-o,e[2]=f*o-m,e[6]=_+h*o,e[10]=a*c}else if(t.order==="ZXY"){let h=c*p,f=c*g,m=l*p,_=l*g;e[0]=h-_*o,e[4]=-a*g,e[8]=m+f*o,e[1]=f+m*o,e[5]=a*p,e[9]=_-h*o,e[2]=-a*l,e[6]=o,e[10]=a*c}else if(t.order==="ZYX"){let h=a*p,f=a*g,m=o*p,_=o*g;e[0]=c*p,e[4]=m*l-f,e[8]=h*l+_,e[1]=c*g,e[5]=_*l+h,e[9]=f*l-m,e[2]=-l,e[6]=o*c,e[10]=a*c}else if(t.order==="YZX"){let h=a*c,f=a*l,m=o*c,_=o*l;e[0]=c*p,e[4]=_-h*g,e[8]=m*g+f,e[1]=g,e[5]=a*p,e[9]=-o*p,e[2]=-l*p,e[6]=f*g+m,e[10]=h-_*g}else if(t.order==="XZY"){let h=a*c,f=a*l,m=o*c,_=o*l;e[0]=c*p,e[4]=-g,e[8]=l*p,e[1]=h*g+_,e[5]=a*p,e[9]=f*g-m,e[2]=m*g-f,e[6]=o*p,e[10]=_*g+h}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(yu,t,Su)}lookAt(t,e,n){let s=this.elements;return He.subVectors(t,e),He.lengthSq()===0&&(He.z=1),He.normalize(),Vn.crossVectors(n,He),Vn.lengthSq()===0&&(Math.abs(n.z)===1?He.x+=1e-4:He.z+=1e-4,He.normalize(),Vn.crossVectors(n,He)),Vn.normalize(),qs.crossVectors(He,Vn),s[0]=Vn.x,s[4]=qs.x,s[8]=He.x,s[1]=Vn.y,s[5]=qs.y,s[9]=He.y,s[2]=Vn.z,s[6]=qs.z,s[10]=He.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],p=n[1],g=n[5],h=n[9],f=n[13],m=n[2],_=n[6],d=n[10],u=n[14],x=n[3],M=n[7],b=n[11],A=n[15],T=s[0],v=s[4],E=s[8],F=s[12],L=s[1],C=s[5],N=s[9],V=s[13],P=s[2],G=s[6],X=s[10],k=s[14],tt=s[3],q=s[7],H=s[11],Y=s[15];return r[0]=a*T+o*L+c*P+l*tt,r[4]=a*v+o*C+c*G+l*q,r[8]=a*E+o*N+c*X+l*H,r[12]=a*F+o*V+c*k+l*Y,r[1]=p*T+g*L+h*P+f*tt,r[5]=p*v+g*C+h*G+f*q,r[9]=p*E+g*N+h*X+f*H,r[13]=p*F+g*V+h*k+f*Y,r[2]=m*T+_*L+d*P+u*tt,r[6]=m*v+_*C+d*G+u*q,r[10]=m*E+_*N+d*X+u*H,r[14]=m*F+_*V+d*k+u*Y,r[3]=x*T+M*L+b*P+A*tt,r[7]=x*v+M*C+b*G+A*q,r[11]=x*E+M*N+b*X+A*H,r[15]=x*F+M*V+b*k+A*Y,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],a=t[1],o=t[5],c=t[9],l=t[13],p=t[2],g=t[6],h=t[10],f=t[14],m=t[3],_=t[7],d=t[11],u=t[15],x=c*f-l*h,M=o*f-l*g,b=o*h-c*g,A=a*f-l*p,T=a*h-c*p,v=a*g-o*p;return e*(_*x-d*M+u*b)-n*(m*x-d*A+u*T)+s*(m*M-_*A+u*v)-r*(m*b-_*T+d*v)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],a=t[5],o=t[9],c=t[2],l=t[6],p=t[10];return e*(a*p-o*l)-n*(r*p-o*c)+s*(r*l-a*c)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],c=t[6],l=t[7],p=t[8],g=t[9],h=t[10],f=t[11],m=t[12],_=t[13],d=t[14],u=t[15],x=e*o-n*a,M=e*c-s*a,b=e*l-r*a,A=n*c-s*o,T=n*l-r*o,v=s*l-r*c,E=p*_-g*m,F=p*d-h*m,L=p*u-f*m,C=g*d-h*_,N=g*u-f*_,V=h*u-f*d,P=x*V-M*N+b*C+A*L-T*F+v*E;if(P===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let G=1/P;return t[0]=(o*V-c*N+l*C)*G,t[1]=(s*N-n*V-r*C)*G,t[2]=(_*v-d*T+u*A)*G,t[3]=(h*T-g*v-f*A)*G,t[4]=(c*L-a*V-l*F)*G,t[5]=(e*V-s*L+r*F)*G,t[6]=(d*b-m*v-u*M)*G,t[7]=(p*v-h*b+f*M)*G,t[8]=(a*N-o*L+l*E)*G,t[9]=(n*L-e*N-r*E)*G,t[10]=(m*T-_*b+u*x)*G,t[11]=(g*b-p*T-f*x)*G,t[12]=(o*F-a*C-c*E)*G,t[13]=(e*C-n*F+s*E)*G,t[14]=(_*M-m*A-d*x)*G,t[15]=(p*A-g*M+h*x)*G,this}scale(t){let e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),s=Math.sin(e),r=1-n,a=t.x,o=t.y,c=t.z,l=r*a,p=r*o;return this.set(l*a+n,l*o-s*c,l*c+s*o,0,l*o+s*c,p*o+n,p*c-s*a,0,l*c-s*o,p*c+s*a,r*c*c+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,a){return this.set(1,n,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){let s=this.elements,r=e._x,a=e._y,o=e._z,c=e._w,l=r+r,p=a+a,g=o+o,h=r*l,f=r*p,m=r*g,_=a*p,d=a*g,u=o*g,x=c*l,M=c*p,b=c*g,A=n.x,T=n.y,v=n.z;return s[0]=(1-(_+u))*A,s[1]=(f+b)*A,s[2]=(m-M)*A,s[3]=0,s[4]=(f-b)*T,s[5]=(1-(h+u))*T,s[6]=(d+x)*T,s[7]=0,s[8]=(m+M)*v,s[9]=(d-x)*v,s[10]=(1-(h+_))*v,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){let s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let a=_i.set(s[0],s[1],s[2]).length(),o=_i.set(s[4],s[5],s[6]).length(),c=_i.set(s[8],s[9],s[10]).length();r<0&&(a=-a),on.copy(this);let l=1/a,p=1/o,g=1/c;return on.elements[0]*=l,on.elements[1]*=l,on.elements[2]*=l,on.elements[4]*=p,on.elements[5]*=p,on.elements[6]*=p,on.elements[8]*=g,on.elements[9]*=g,on.elements[10]*=g,e.setFromRotationMatrix(on),n.x=a,n.y=o,n.z=c,this}makePerspective(t,e,n,s,r,a,o=sn,c=!1){let l=this.elements,p=2*r/(e-t),g=2*r/(n-s),h=(e+t)/(e-t),f=(n+s)/(n-s),m,_;if(c)m=r/(a-r),_=a*r/(a-r);else if(o===sn)m=-(a+r)/(a-r),_=-2*a*r/(a-r);else if(o===Li)m=-a/(a-r),_=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=p,l[4]=0,l[8]=h,l[12]=0,l[1]=0,l[5]=g,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,s,r,a,o=sn,c=!1){let l=this.elements,p=2/(e-t),g=2/(n-s),h=-(e+t)/(e-t),f=-(n+s)/(n-s),m,_;if(c)m=1/(a-r),_=a/(a-r);else if(o===sn)m=-2/(a-r),_=-(a+r)/(a-r);else if(o===Li)m=-1/(a-r),_=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=p,l[4]=0,l[8]=0,l[12]=h,l[1]=0,l[5]=g,l[9]=0,l[13]=f,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}},_i=new U,on=new Qt,yu=new U(0,0,0),Su=new U(1,1,1),Vn=new U,qs=new U,He=new U,$l=new Qt,Jl=new Ye,Nn=class i{constructor(t=0,e=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let s=t.elements,r=s[0],a=s[4],o=s[8],c=s[1],l=s[5],p=s[9],g=s[2],h=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(Ht(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-p,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(h,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Ht(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-g,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ht(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-g,f),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Ht(g,-1,1)),Math.abs(g)<.9999999?(this._x=Math.atan2(h,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Ht(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-p,l),this._y=Math.atan2(-g,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Ht(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(h,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-p,f),this._y=0);break;default:Rt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return $l.makeRotationFromQuaternion(t),this.setFromRotationMatrix($l,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Jl.setFromEuler(this),this.setFromQuaternion(Jl,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Nn.DEFAULT_ORDER="XYZ";var ds=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},Mu=0,Kl=new U,xi=new Ye,wn=new Qt,Ys=new U,ts=new U,bu=new U,Eu=new Ye,jl=new U(1,0,0),Ql=new U(0,1,0),tc=new U(0,0,1),ec={type:"added"},wu={type:"removed"},vi={type:"childadded",child:null},ro={type:"childremoved",child:null},Ce=class i extends hn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Mu++}),this.uuid=Yi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new U,e=new Nn,n=new Ye,s=new U(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Qt},normalMatrix:{value:new Dt}}),this.matrix=new Qt,this.matrixWorld=new Qt,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ds,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return xi.setFromAxisAngle(t,e),this.quaternion.multiply(xi),this}rotateOnWorldAxis(t,e){return xi.setFromAxisAngle(t,e),this.quaternion.premultiply(xi),this}rotateX(t){return this.rotateOnAxis(jl,t)}rotateY(t){return this.rotateOnAxis(Ql,t)}rotateZ(t){return this.rotateOnAxis(tc,t)}translateOnAxis(t,e){return Kl.copy(t).applyQuaternion(this.quaternion),this.position.add(Kl.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(jl,t)}translateY(t){return this.translateOnAxis(Ql,t)}translateZ(t){return this.translateOnAxis(tc,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(wn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Ys.copy(t):Ys.set(t,e,n);let s=this.parent;this.updateWorldMatrix(!0,!1),ts.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?wn.lookAt(ts,Ys,this.up):wn.lookAt(Ys,ts,this.up),this.quaternion.setFromRotationMatrix(wn),s&&(wn.extractRotation(s.matrixWorld),xi.setFromRotationMatrix(wn),this.quaternion.premultiply(xi.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Pt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(ec),vi.child=t,this.dispatchEvent(vi),vi.child=null):Pt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(wu),ro.child=t,this.dispatchEvent(ro),ro.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),wn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),wn.multiply(t.parent.matrixWorld)),t.applyMatrix4(wn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(ec),vi.child=t,this.dispatchEvent(vi),vi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ts,t,bu),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ts,Eu,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(t){t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,p=c.length;l<p;l++){let g=c[l];r(t.shapes,g)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(t.materials,this.material[c]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];s.animations.push(r(t.animations,c))}}if(e){let o=a(t.geometries),c=a(t.materials),l=a(t.textures),p=a(t.images),g=a(t.shapes),h=a(t.skeletons),f=a(t.animations),m=a(t.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),p.length>0&&(n.images=p),g.length>0&&(n.shapes=g),h.length>0&&(n.skeletons=h),f.length>0&&(n.animations=f),m.length>0&&(n.nodes=m)}return n.object=s,n;function a(o){let c=[];for(let l in o){let p=o[l];delete p.metadata,c.push(p)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};Ce.DEFAULT_UP=new U(0,1,0);Ce.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ce.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var In=class extends Ce{constructor(){super(),this.isGroup=!0,this.type="Group"}},Tu={type:"move"},Fi=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new In,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new In,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new In,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){a=!0;for(let _ of t.hand.values()){let d=e.getJointPose(_,n),u=this._getHandJoint(l,_);d!==null&&(u.matrix.fromArray(d.transform.matrix),u.matrix.decompose(u.position,u.quaternion,u.scale),u.matrixWorldNeedsUpdate=!0,u.jointRadius=d.radius),u.visible=d!==null}let p=l.joints["index-finger-tip"],g=l.joints["thumb-tip"],h=p.position.distanceTo(g.position),f=.02,m=.005;l.inputState.pinching&&h>f+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&h<=f-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.quaternion,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Tu)))}return o!==null&&(o.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new In;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},ih={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Hn={h:0,s:0,l:0},Zs={h:0,s:0,l:0};function ao(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var Ot=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Xe){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,qt.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=qt.workingColorSpace){return this.r=t,this.g=e,this.b=n,qt.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=qt.workingColorSpace){if(t=sl(t,1),e=Ht(e,0,1),n=Ht(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=ao(a,r,t+1/3),this.g=ao(a,r,t),this.b=ao(a,r,t-1/3)}return qt.colorSpaceToWorking(this,s),this}setStyle(t,e=Xe){function n(r){r!==void 0&&parseFloat(r)<1&&Rt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseFloat(r[1]))/100,Math.min(100,parseFloat(r[2]))/100,Math.min(100,parseFloat(r[3]))/100,e);break;case"hsl":case"hsla":if(r=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Rt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);Rt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Xe){let n=ih[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Rt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ln(t.r),this.g=Ln(t.g),this.b=Ln(t.b),this}copyLinearToSRGB(t){return this.r=Pi(t.r),this.g=Pi(t.g),this.b=Pi(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Xe){return qt.workingToColorSpace(Re.copy(this),t),Math.round(Ht(Re.r*255,0,255))*65536+Math.round(Ht(Re.g*255,0,255))*256+Math.round(Ht(Re.b*255,0,255))}getHexString(t=Xe){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=qt.workingColorSpace){qt.workingToColorSpace(Re.copy(this),e);let n=Re.r,s=Re.g,r=Re.b,a=Math.max(n,s,r),o=Math.min(n,s,r),c,l,p=(o+a)/2;if(o===a)c=0,l=0;else{let g=a-o;switch(l=p<=.5?g/(a+o):g/(2-a-o),a){case n:c=(s-r)/g+(s<r?6:0);break;case s:c=(r-n)/g+2;break;case r:c=(n-s)/g+4;break}c/=6}return t.h=c,t.s=l,t.l=p,t}getRGB(t,e=qt.workingColorSpace){return qt.workingToColorSpace(Re.copy(this),e),t.r=Re.r,t.g=Re.g,t.b=Re.b,t}getStyle(t=Xe){qt.workingToColorSpace(Re.copy(this),t);let e=Re.r,n=Re.g,s=Re.b;return t!==Xe?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Hn),this.setHSL(Hn.h+t,Hn.s+e,Hn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Hn),t.getHSL(Zs);let n=as(Hn.h,Zs.h,e),s=as(Hn.s,Zs.s,e),r=as(Hn.l,Zs.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Re=new Ot;Ot.NAMES=ih;var fs=class extends Ce{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Nn,this.environmentIntensity=1,this.environmentRotation=new Nn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),this.background=t.background!==null?t.background.clone():null,this.environment=t.environment!==null?t.environment.clone():null,this.fog=t.fog!==null?t.fog.clone():null,this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),this.overrideMaterial=t.overrideMaterial!==null?t.overrideMaterial.clone():null,this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},ln=new U,Tn=new U,oo=new U,An=new U,yi=new U,Si=new U,nc=new U,lo=new U,co=new U,ho=new U,uo=new re,fo=new re,po=new re,Pn=class i{constructor(t=new U,e=new U,n=new U){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),ln.subVectors(t,e),s.cross(ln);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){ln.subVectors(s,e),Tn.subVectors(n,e),oo.subVectors(t,e);let a=ln.dot(ln),o=ln.dot(Tn),c=ln.dot(oo),l=Tn.dot(Tn),p=Tn.dot(oo),g=a*l-o*o;if(g===0)return r.set(0,0,0),null;let h=1/g,f=(l*c-o*p)*h,m=(a*p-o*c)*h;return r.set(1-f-m,m,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,An)===null?!1:An.x>=0&&An.y>=0&&An.x+An.y<=1}static getInterpolation(t,e,n,s,r,a,o,c){return this.getBarycoord(t,e,n,s,An)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,An.x),c.addScaledVector(a,An.y),c.addScaledVector(o,An.z),c)}static getInterpolatedAttribute(t,e,n,s,r,a){return uo.setScalar(0),fo.setScalar(0),po.setScalar(0),uo.fromBufferAttribute(t,e),fo.fromBufferAttribute(t,n),po.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(uo,r.x),a.addScaledVector(fo,r.y),a.addScaledVector(po,r.z),a}static isFrontFacing(t,e,n,s){return ln.subVectors(n,e),Tn.subVectors(t,e),ln.cross(Tn).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return ln.subVectors(this.c,this.b),Tn.subVectors(this.a,this.b),ln.cross(Tn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return i.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,s=this.b,r=this.c,a,o;yi.subVectors(s,n),Si.subVectors(r,n),lo.subVectors(t,n);let c=yi.dot(lo),l=Si.dot(lo);if(c<=0&&l<=0)return e.copy(n);co.subVectors(t,s);let p=yi.dot(co),g=Si.dot(co);if(p>=0&&g<=p)return e.copy(s);let h=c*g-p*l;if(h<=0&&c>=0&&p<=0&&c-p>0)return a=c/(c-p),e.copy(n).addScaledVector(yi,a);ho.subVectors(t,r);let f=yi.dot(ho),m=Si.dot(ho);if(m>=0&&f<=m)return e.copy(r);let _=f*l-c*m;if(_<=0&&l>=0&&m<=0)return o=l/(l-m),e.copy(n).addScaledVector(Si,o);let d=p*m-f*g;if(d<=0&&g-p>=0&&f-m>=0)return nc.subVectors(r,s),o=(g-p)/(g-p+(f-m)),e.copy(s).addScaledVector(nc,o);let u=1/(d+_+h);return a=_*u,o=h*u,e.copy(n).addScaledVector(yi,a).addScaledVector(Si,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Ne=class{constructor(t=new U(1/0,1/0,1/0),e=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(cn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(cn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=cn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0&&t.isBatchedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,cn):cn.fromBufferAttribute(r,a),cn.applyMatrix4(t.matrixWorld),this.expandByPoint(cn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),$s.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),$s.copy(n.boundingBox)),$s.applyMatrix4(t.matrixWorld),this.union($s)}let s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,cn),cn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(es),Js.subVectors(this.max,es),Mi.subVectors(t.a,es),bi.subVectors(t.b,es),Ei.subVectors(t.c,es),Wn.subVectors(bi,Mi),Xn.subVectors(Ei,bi),si.subVectors(Mi,Ei);let e=[0,-Wn.z,Wn.y,0,-Xn.z,Xn.y,0,-si.z,si.y,Wn.z,0,-Wn.x,Xn.z,0,-Xn.x,si.z,0,-si.x,-Wn.y,Wn.x,0,-Xn.y,Xn.x,0,-si.y,si.x,0];return!mo(e,Mi,bi,Ei,Js)||(e=[1,0,0,0,1,0,0,0,1],!mo(e,Mi,bi,Ei,Js))?!1:(Ks.crossVectors(Wn,Xn),e=[Ks.x,Ks.y,Ks.z],mo(e,Mi,bi,Ei,Js))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,cn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(cn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Rn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Rn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Rn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Rn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Rn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Rn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Rn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Rn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Rn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Rn=[new U,new U,new U,new U,new U,new U,new U,new U],cn=new U,$s=new Ne,Mi=new U,bi=new U,Ei=new U,Wn=new U,Xn=new U,si=new U,es=new U,Js=new U,Ks=new U,ri=new U;function mo(i,t,e,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){ri.fromArray(i,r);let o=s.x*Math.abs(ri.x)+s.y*Math.abs(ri.y)+s.z*Math.abs(ri.z),c=t.dot(ri),l=e.dot(ri),p=n.dot(ri);if(Math.max(-Math.max(c,l,p),Math.min(c,l,p))>o)return!1}return!0}var ue=new U,js=new It,Au=0,ze=class extends hn{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Au++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Jc,this.updateRanges=[],this.gpuType=dn,this.version=0,this._normalizationScale=t!==void 0?al(t):void 0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this._normalizationScale=t._normalizationScale,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)js.fromBufferAttribute(this,e),js.applyMatrix3(t),this.setXY(e,js.x,js.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)ue.fromBufferAttribute(this,e),ue.applyMatrix3(t),this.setXYZ(e,ue.x,ue.y,ue.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)ue.fromBufferAttribute(this,e),ue.applyMatrix4(t),this.setXYZ(e,ue.x,ue.y,ue.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)ue.fromBufferAttribute(this,e),ue.applyNormalMatrix(t),this.setXYZ(e,ue.x,ue.y,ue.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)ue.fromBufferAttribute(this,e),ue.transformDirection(t),this.setXYZ(e,ue.x,ue.y,ue.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=this._denormalize(n)),n}setComponent(t,e,n){return this.normalized&&(n=this._normalize(n)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=this._denormalize(e)),e}setX(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=this._denormalize(e)),e}setY(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=this._denormalize(e)),e}setZ(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=this._denormalize(e)),e}setW(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),n=this._normalize(n)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),n=this._normalize(n),s=this._normalize(s)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),n=this._normalize(n),s=this._normalize(s),r=this._normalize(r)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}_denormalize(t){let e=this._normalizationScale;return e!==void 0?Math.max(t/e,-1):eh(t,this.array)}_normalize(t){let e=this._normalizationScale;return e!==void 0?Math.round(t*e):nh(t,this.array)}};var ps=class extends ze{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var ms=class extends ze{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var Ee=class extends ze{constructor(t,e,n){super(new Float32Array(t),e,n)}},Ru=new Ne,ns=new U,go=new U,li=class{constructor(t=new U,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):Ru.setFromPoints(t).getCenter(n);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;ns.subVectors(t,this.center);let e=ns.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(ns,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(go.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(ns.copy(t.center).add(go)),this.expandByPoint(ns.copy(t.center).sub(go))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Cu=0,nn=new Qt,_o=new Ce,wi=new U,We=new Ne,is=new Ne,Se=new U,$e=class i extends hn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Cu++}),this.uuid=Yi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(tu(t)?ms:ps)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Dt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return nn.makeRotationFromQuaternion(t),this.applyMatrix4(nn),this}rotateX(t){return nn.makeRotationX(t),this.applyMatrix4(nn),this}rotateY(t){return nn.makeRotationY(t),this.applyMatrix4(nn),this}rotateZ(t){return nn.makeRotationZ(t),this.applyMatrix4(nn),this}translate(t,e,n){return nn.makeTranslation(t,e,n),this.applyMatrix4(nn),this}scale(t,e,n){return nn.makeScale(t,e,n),this.applyMatrix4(nn),this}lookAt(t){return _o.lookAt(t),_o.updateMatrix(),this.applyMatrix4(_o.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(wi).negate(),this.translate(wi.x,wi.y,wi.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let s=0,r=t.length;s<r;s++){let a=t[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Ee(n,3))}else{let n=Math.min(t.length,e.count);for(let s=0;s<n;s++){let r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Rt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ne);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Pt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){let r=e[n];We.setFromBufferAttribute(r),this.morphTargetsRelative?(Se.addVectors(this.boundingBox.min,We.min),this.boundingBox.expandByPoint(Se),Se.addVectors(this.boundingBox.max,We.max),this.boundingBox.expandByPoint(Se)):(this.boundingBox.expandByPoint(We.min),this.boundingBox.expandByPoint(We.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Pt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new li);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Pt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new U,1/0);return}if(t){let n=this.boundingSphere.center;if(We.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){let o=e[r];is.setFromBufferAttribute(o),this.morphTargetsRelative?(Se.addVectors(We.min,is.min),We.expandByPoint(Se),Se.addVectors(We.max,is.max),We.expandByPoint(Se)):(We.expandByPoint(is.min),We.expandByPoint(is.max))}We.getCenter(n);let s=0;for(let r=0,a=t.count;r<a;r++)Se.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Se));if(e)for(let r=0,a=e.length;r<a;r++){let o=e[r],c=this.morphTargetsRelative;for(let l=0,p=o.count;l<p;l++)Se.fromBufferAttribute(o,l),c&&(wi.fromBufferAttribute(t,l),Se.add(wi)),s=Math.max(s,n.distanceToSquared(Se))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Pt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Pt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,s=e.normal,r=e.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new ze(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],c=[],l=new Uint8Array(n.count);for(let F=0;F<n.count;F++)o[F]=new U,c[F]=new U;let p=new U,g=new U,h=new U,f=new It,m=new It,_=new It,d=new U,u=new U;function x(F,L,C){l[F]=l[L]=l[C]=1,p.fromBufferAttribute(n,F),g.fromBufferAttribute(n,L),h.fromBufferAttribute(n,C),f.fromBufferAttribute(r,F),m.fromBufferAttribute(r,L),_.fromBufferAttribute(r,C),g.sub(p),h.sub(p),m.sub(f),_.sub(f);let N=1/(m.x*_.y-_.x*m.y);isFinite(N)&&(d.copy(g).multiplyScalar(_.y).addScaledVector(h,-m.y).multiplyScalar(N),u.copy(h).multiplyScalar(m.x).addScaledVector(g,-_.x).multiplyScalar(N),o[F].add(d),o[L].add(d),o[C].add(d),c[F].add(u),c[L].add(u),c[C].add(u))}let M=this.groups;M.length===0&&(M=[{start:0,count:t.count}]);for(let F=0,L=M.length;F<L;++F){let C=M[F],N=C.start,V=C.count;for(let P=N,G=N+V;P<G;P+=3)x(t.getX(P+0),t.getX(P+1),t.getX(P+2))}let b=new U,A=new U,T=new U,v=new U;function E(F){T.fromBufferAttribute(s,F),v.copy(T);let L=o[F];b.copy(L),b.sub(T.multiplyScalar(T.dot(L))).normalize(),A.crossVectors(v,L);let N=A.dot(c[F])<0?-1:1;a.setXYZW(F,b.x,b.y,b.z,N)}for(let F=0,L=n.count;F<L;++F)l[F]&&E(F);this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new ze(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let h=0,f=n.count;h<f;h++)n.setXYZ(h,0,0,0);let s=new U,r=new U,a=new U,o=new U,c=new U,l=new U,p=new U,g=new U;if(t)for(let h=0,f=t.count;h<f;h+=3){let m=t.getX(h+0),_=t.getX(h+1),d=t.getX(h+2);s.fromBufferAttribute(e,m),r.fromBufferAttribute(e,_),a.fromBufferAttribute(e,d),p.subVectors(a,r),g.subVectors(s,r),p.cross(g),o.fromBufferAttribute(n,m),c.fromBufferAttribute(n,_),l.fromBufferAttribute(n,d),o.add(p),c.add(p),l.add(p),n.setXYZ(m,o.x,o.y,o.z),n.setXYZ(_,c.x,c.y,c.z),n.setXYZ(d,l.x,l.y,l.z)}else for(let h=0,f=e.count;h<f;h+=3)s.fromBufferAttribute(e,h+0),r.fromBufferAttribute(e,h+1),a.fromBufferAttribute(e,h+2),p.subVectors(a,r),g.subVectors(s,r),p.cross(g),n.setXYZ(h+0,p.x,p.y,p.z),n.setXYZ(h+1,p.x,p.y,p.z),n.setXYZ(h+2,p.x,p.y,p.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Se.fromBufferAttribute(t,e),Se.normalize(),t.setXYZ(e,Se.x,Se.y,Se.z)}toNonIndexed(){function t(o,c){let l=o.array,p=o.itemSize,g=o.normalized,h=new l.constructor(c.length*p),f=0,m=0;for(let _=0,d=c.length;_<d;_++){o.isInterleavedBufferAttribute?f=c[_]*o.data.stride+o.offset:f=c[_]*p;for(let u=0;u<p;u++)h[m++]=l[f++]}return new ze(h,p,g)}if(this.index===null)return Rt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,s=this.attributes;for(let o in s){let c=s[o],l=t(c,n);e.setAttribute(o,l)}let r=this.morphAttributes;for(let o in r){let c=[],l=r[o];for(let p=0,g=l.length;p<g;p++){let h=l[p],f=t(h,n);c.push(f)}e.morphAttributes[o]=c}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let c in n){let l=n[c];t.data.attributes[c]=l.toJSON(t.data)}let s={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],p=[];for(let g=0,h=l.length;g<h;g++){let f=l[g];p.push(f.toJSON(t.data))}p.length>0&&(s[c]=p,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let s=t.attributes;for(let l in s){let p=s[l];this.setAttribute(l,p.clone(e))}let r=t.morphAttributes;for(let l in r){let p=[],g=r[l];for(let h=0,f=g.length;h<f;h++)p.push(g[h].clone(e));this.morphAttributes[l]=p}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let l=0,p=a.length;l<p;l++){let g=a[l];this.addGroup(g.start,g.count,g.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var xo=new U,Pu=new U,Iu=new Dt,qe=class{constructor(t=new U(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let s=xo.subVectors(n,e).cross(Pu.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let s=t.delta(xo),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let a=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(s,a)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||Iu.getNormalMatrix(t),s=this.coplanarPoint(xo).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},Lu=0,Un=class extends hn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Lu++}),this.uuid=Yi(),this.name="",this.type="Material",this.blending=Wi,this.side=Qn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Uo,this.blendDst=Fo,this.blendEquation=di,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ot(0,0,0),this.blendAlpha=0,this.depthFunc=Ii,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Wc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=xr,this.stencilZFail=xr,this.stencilZPass=xr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){Rt(`Material: parameter '${e}' has value of undefined.`);continue}let s=this[e];if(s===void 0){Rt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(t).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let c=r[o];delete c.metadata,a.push(c)}return a}if(e){let r=s(t.textures),a=s(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Ot().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.diffuseRoughness!==void 0&&(this.diffuseRoughness=t.diffuseRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=t.iridescenceThicknessMinimum),t.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=t.iridescenceThicknessMaximum),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=t.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=t.iridescenceThicknessRange[1]),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new qe().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new It().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new It().fromArray(t.clearcoatNormalScale)),t.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=e[t.diffuseRoughnessMap]||null),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var Cn=new U,vo=new U,Qs=new U,tr=new U,ci=class{constructor(t=new U,e=new U(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Cn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Cn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Cn.copy(this.origin).addScaledVector(this.direction,e),Cn.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){vo.copy(t).add(e).multiplyScalar(.5),Qs.copy(e).sub(t).normalize(),tr.copy(this.origin).sub(vo);let r=t.distanceTo(e)*.5,a=-this.direction.dot(Qs),o=tr.dot(this.direction),c=-tr.dot(Qs),l=tr.lengthSq(),p=Math.abs(1-a*a),g,h,f,m;if(p>0)if(g=a*c-o,h=a*o-c,m=r*p,g>=0)if(h>=-m)if(h<=m){let _=1/p;g*=_,h*=_,f=g*(g+a*h+2*o)+h*(a*g+h+2*c)+l}else h=r,g=Math.max(0,-(a*h+o)),f=-g*g+h*(h+2*c)+l;else h=-r,g=Math.max(0,-(a*h+o)),f=-g*g+h*(h+2*c)+l;else h<=-m?(g=Math.max(0,-(-a*r+o)),h=g>0?-r:Math.min(Math.max(-r,-c),r),f=-g*g+h*(h+2*c)+l):h<=m?(g=0,h=Math.min(Math.max(-r,-c),r),f=h*(h+2*c)+l):(g=Math.max(0,-(a*r+o)),h=g>0?r:Math.min(Math.max(-r,-c),r),f=-g*g+h*(h+2*c)+l);else h=a>0?-r:r,g=Math.max(0,-(a*h+o)),f=-g*g+h*(h+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,g),s&&s.copy(vo).addScaledVector(Qs,h),f}intersectSphere(t,e){if(t.radius<0)return null;Cn.subVectors(t.center,this.origin);let n=Cn.dot(this.direction),s=Cn.dot(Cn)-n*n,r=t.radius*t.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,a,o,c,l=1/this.direction.x,p=1/this.direction.y,g=1/this.direction.z,h=this.origin;return l>=0?(n=(t.min.x-h.x)*l,s=(t.max.x-h.x)*l):(n=(t.max.x-h.x)*l,s=(t.min.x-h.x)*l),p>=0?(r=(t.min.y-h.y)*p,a=(t.max.y-h.y)*p):(r=(t.max.y-h.y)*p,a=(t.min.y-h.y)*p),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),g>=0?(o=(t.min.z-h.z)*g,c=(t.max.z-h.z)*g):(o=(t.max.z-h.z)*g,c=(t.min.z-h.z)*g),n>c||o>s)||((o>n||n!==n)&&(n=o),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Cn)!==null}intersectTriangle(t,e,n,s,r){let a=this.origin,o=this.direction,c=o.x,l=o.y,p=o.z,g=t.x-a.x,h=t.y-a.y,f=t.z-a.z,m=e.x-a.x,_=e.y-a.y,d=e.z-a.z,u=n.x-a.x,x=n.y-a.y,M=n.z-a.z,b=Math.abs(c),A=Math.abs(l),T=Math.abs(p),v,E,F,L,C,N,V,P,G,X,k,tt;if(b>=A&&b>=T?(F=c,N=g,G=m,tt=u,c>=0?(v=l,E=p,L=h,C=f,V=_,P=d,X=x,k=M):(v=p,E=l,L=f,C=h,V=d,P=_,X=M,k=x)):A>=T?(F=l,N=h,G=_,tt=x,l>=0?(v=p,E=c,L=f,C=g,V=d,P=m,X=M,k=u):(v=c,E=p,L=g,C=f,V=m,P=d,X=u,k=M)):(F=p,N=f,G=d,tt=M,p>=0?(v=c,E=l,L=g,C=h,V=m,P=_,X=u,k=x):(v=l,E=c,L=h,C=g,V=_,P=m,X=x,k=u)),F===0)return null;let q=v/F,H=E/F,Y=1/F,st=L-q*N,Tt=C-H*N,$=V-q*G,dt=P-H*G,pt=X-q*tt,yt=k-H*tt,ft=pt*dt-yt*$,Lt=st*yt-Tt*pt,te=$*Tt-dt*st;if(s){if(ft<0||Lt<0||te<0)return null}else if((ft<0||Lt<0||te<0)&&(ft>0||Lt>0||te>0))return null;let wt=ft+Lt+te;if(wt===0)return null;let Ut=Y*(ft*N+Lt*G+te*tt);return(wt>0?Ut<0:Ut>0)?null:this.at(Ut/wt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Lr=class extends Un{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ot(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Nn,this.combine=Oo,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},ic=new Qt,ai=new ci,er=new li,sc=new U,nr=new U,ir=new U,sr=new U,yo=new U,rr=new U,rc=new U,ar=new U,rn=class extends Ce{constructor(t=new $e,e=new Lr){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0?this.morphTargetInfluences=t.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,t.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(s,t);let o=this.morphTargetInfluences;if(r&&o){rr.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let p=o[c],g=r[c];p!==0&&(yo.fromBufferAttribute(g,t),a?rr.addScaledVector(yo,p):rr.addScaledVector(yo.sub(e),p))}e.add(rr)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),er.copy(n.boundingSphere),er.applyMatrix4(r),ai.copy(t.ray).recast(t.near),!(er.containsPoint(ai.origin)===!1&&(ai.intersectSphere(er,sc)===null||ai.origin.distanceToSquared(sc)>(t.far-t.near)**2))&&(ic.copy(r).invert(),ai.copy(t.ray).applyMatrix4(ic),!(n.boundingBox!==null&&ai.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,ai)))}_computeIntersections(t,e,n){let s,r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,p=r.attributes.uv1,g=r.attributes.normal,h=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,_=h.length;m<_;m++){let d=h[m],u=a[d.materialIndex],x=Math.max(d.start,f.start),M=Math.min(o.count,Math.min(d.start+d.count,f.start+f.count));for(let b=x,A=M;b<A;b+=3){let T=o.getX(b),v=o.getX(b+1),E=o.getX(b+2);s=or(this,u,t,n,l,p,g,T,v,E),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=d.materialIndex,e.push(s))}}else{let m=Math.max(0,f.start),_=Math.min(o.count,f.start+f.count);for(let d=m,u=_;d<u;d+=3){let x=o.getX(d),M=o.getX(d+1),b=o.getX(d+2);s=or(this,a,t,n,l,p,g,x,M,b),s&&(s.faceIndex=Math.floor(d/3),e.push(s))}}else if(c!==void 0)if(Array.isArray(a))for(let m=0,_=h.length;m<_;m++){let d=h[m],u=a[d.materialIndex],x=Math.max(d.start,f.start),M=Math.min(c.count,Math.min(d.start+d.count,f.start+f.count));for(let b=x,A=M;b<A;b+=3){let T=b,v=b+1,E=b+2;s=or(this,u,t,n,l,p,g,T,v,E),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=d.materialIndex,e.push(s))}}else{let m=Math.max(0,f.start),_=Math.min(c.count,f.start+f.count);for(let d=m,u=_;d<u;d+=3){let x=d,M=d+1,b=d+2;s=or(this,a,t,n,l,p,g,x,M,b),s&&(s.faceIndex=Math.floor(d/3),e.push(s))}}}};function Du(i,t,e,n,s,r,a,o){let c;if(t.side===Ue?c=n.intersectTriangle(a,r,s,!0,o):c=n.intersectTriangle(s,r,a,t.side===Qn,o),c===null)return null;ar.copy(o),ar.applyMatrix4(i.matrixWorld);let l=e.ray.origin.distanceTo(ar);return l<e.near||l>e.far?null:{distance:l,point:ar.clone(),object:i}}function or(i,t,e,n,s,r,a,o,c,l){i.getVertexPosition(o,nr),i.getVertexPosition(c,ir),i.getVertexPosition(l,sr);let p=Du(i,t,e,n,nr,ir,sr,rc);if(p){let g=new U;Pn.getBarycoord(rc,nr,ir,sr,g),s&&(p.uv=Pn.getInterpolatedAttribute(s,o,c,l,g,new It)),r&&(p.uv1=Pn.getInterpolatedAttribute(r,o,c,l,g,new It)),a&&(p.normal=Pn.getInterpolatedAttribute(a,o,c,l,g,new U),p.normal.dot(n.direction)>0&&p.normal.multiplyScalar(-1));let h={a:o,b:c,c:l,normal:new U,materialIndex:0};Pn.getNormal(nr,ir,sr,h.normal),p.face=h,p.barycoord=g}return p}var Dr=class extends ke{constructor(t=null,e=1,n=1,s,r,a,o,c,l=Me,p=Me,g,h){super(null,a,o,c,l,p,s,r,g,h),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var oi=new li,Nu=new It(.5,.5),lr=new U,Yn=class{constructor(t=new qe,e=new qe,n=new qe,s=new qe,r=new qe,a=new qe){this.planes=[t,e,n,s,r,a]}set(t,e,n,s,r,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=sn,n=!1){let s=this.planes,r=t.elements,a=r[0],o=r[1],c=r[2],l=r[3],p=r[4],g=r[5],h=r[6],f=r[7],m=r[8],_=r[9],d=r[10],u=r[11],x=r[12],M=r[13],b=r[14],A=r[15];if(s[0].setComponents(l-a,f-p,u-m,A-x).normalize(),s[1].setComponents(l+a,f+p,u+m,A+x).normalize(),s[2].setComponents(l+o,f+g,u+_,A+M).normalize(),s[3].setComponents(l-o,f-g,u-_,A-M).normalize(),n)s[4].setComponents(c,h,d,b).normalize(),s[5].setComponents(l-c,f-h,u-d,A-b).normalize();else if(s[4].setComponents(l-c,f-h,u-d,A-b).normalize(),e===sn)s[5].setComponents(l+c,f+h,u+d,A+b).normalize();else if(e===Li)s[5].setComponents(c,h,d,b).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),oi.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),oi.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(oi)}intersectsSprite(t){oi.center.set(0,0,0);let e=Nu.distanceTo(t.center);return oi.radius=.7071067811865476+e,oi.applyMatrix4(t.matrixWorld),this.intersectsSphere(oi)}intersectsSphere(t){let e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let s=e[n];if(lr.x=s.normal.x>0?t.max.x:t.min.x,lr.y=s.normal.y>0?t.max.y:t.min.y,lr.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(lr)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},ac=new Qt,Nr=class i{constructor(){this.coordinateSystem=sn,this._frustums=[],this._count=0}setFromArrayCamera(t){let e=t.cameras,n=this._frustums;for(let s=0;s<e.length;s++){let r=e[s];ac.multiplyMatrices(r.projectionMatrix,r.matrixWorldInverse),n[s]===void 0&&(n[s]=new Yn),n[s].setFromProjectionMatrix(ac,r.coordinateSystem,r.reversedDepth)}return this._count=e.length,this}getFrustum(t){return this._frustums[t]}intersectsObject(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsObject(t))return!0;return!1}intersectsSprite(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSprite(t))return!0;return!1}intersectsSphere(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSphere(t))return!0;return!1}intersectsBox(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsBox(t))return!0;return!1}containsPoint(t){let e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].containsPoint(t))return!0;return!1}copy(t){this.coordinateSystem=t.coordinateSystem;let e=this._frustums,n=t._frustums;for(let s=0;s<t._count;s++)e[s]===void 0&&(e[s]=new Yn),e[s].copy(n[s]);return this._count=t._count,this}clone(){return new i().copy(this)}};var hi=class extends Un{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ot(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}},Ur=new U,Fr=new U,oc=new Qt,ss=new ci,cr=new li,So=new U,lc=new U,Or=class extends Ce{constructor(t=new $e,e=new hi){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0?this.morphTargetInfluences=t.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,t.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)Ur.fromBufferAttribute(e,s-1),Fr.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=Ur.distanceTo(Fr);t.setAttribute("lineDistance",new Ee(n,1))}else Rt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),cr.copy(n.boundingSphere),cr.applyMatrix4(s),cr.radius+=r,t.ray.intersectsSphere(cr)===!1)return;oc.copy(s).invert(),ss.copy(t.ray).applyMatrix4(oc);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,p=n.index,h=n.attributes.position;if(p!==null){let f=Math.max(0,a.start),m=Math.min(p.count,a.start+a.count);for(let _=f,d=m-1;_<d;_+=l){let u=p.getX(_),x=p.getX(_+1),M=hr(this,t,ss,c,u,x,_);M&&e.push(M)}if(this.isLineLoop){let _=p.getX(m-1),d=p.getX(f),u=hr(this,t,ss,c,_,d,m-1);u&&e.push(u)}}else{let f=Math.max(0,a.start),m=Math.min(h.count,a.start+a.count);for(let _=f,d=m-1;_<d;_+=l){let u=hr(this,t,ss,c,_,_+1,_);u&&e.push(u)}if(this.isLineLoop){let _=hr(this,t,ss,c,m-1,f,m-1);_&&e.push(_)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function hr(i,t,e,n,s,r,a){let o=i.geometry.attributes.position;if(Ur.fromBufferAttribute(o,s),Fr.fromBufferAttribute(o,r),e.distanceSqToSegment(Ur,Fr,So,lc)>n)return;So.applyMatrix4(i.matrixWorld);let l=t.ray.origin.distanceTo(So);if(!(l<t.near||l>t.far))return{distance:l,point:lc.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}var cc=new U,hc=new U,Oi=class extends Or{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let t=this.geometry;if(t.index===null){let e=t.attributes.position,n=[];for(let s=0,r=e.count;s<r;s+=2)cc.fromBufferAttribute(e,s),hc.fromBufferAttribute(e,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+cc.distanceTo(hc);t.setAttribute("lineDistance",new Ee(n,1))}else Rt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var gs=class extends ke{constructor(t=[],e=fi,n,s,r,a,o,c,l,p){super(t,e,n,s,r,a,o,c,l,p),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}};var Fn=class extends ke{constructor(t,e,n=un,s,r,a,o=Me,c=Me,l,p=Dn,g=1){if(p!==Dn&&p!==Bn)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let h={width:t,height:e,depth:g};super(h,s,r,a,o,c,p,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ui(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},_s=class extends Fn{constructor(t,e=un,n=fi,s,r,a=Me,o=Me,c,l=Dn){let p={width:t,height:t,depth:1},g=[p,p,p,p,p,p];super(t,t,e,n,s,r,a,o,c,l),this.image=g,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},xs=class extends ke{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},Bi=class i extends $e{constructor(t=1,e=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let c=[],l=[],p=[],g=[],h=0,f=0;m("z","y","x",-1,-1,n,e,t,a,r,0),m("z","y","x",1,-1,n,e,-t,a,r,1),m("x","z","y",1,1,t,n,e,s,a,2),m("x","z","y",1,-1,t,n,-e,s,a,3),m("x","y","z",1,-1,t,e,n,s,r,4),m("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new Ee(l,3)),this.setAttribute("normal",new Ee(p,3)),this.setAttribute("uv",new Ee(g,2));function m(_,d,u,x,M,b,A,T,v,E,F){let L=b/v,C=A/E,N=b/2,V=A/2,P=T/2,G=v+1,X=E+1,k=0,tt=0,q=new U;for(let H=0;H<X;H++){let Y=H*C-V;for(let st=0;st<G;st++){let Tt=st*L-N;q[_]=Tt*x,q[d]=Y*M,q[u]=P,l.push(q.x,q.y,q.z),q[_]=0,q[d]=0,q[u]=T>0?1:-1,p.push(q.x,q.y,q.z),g.push(st/v),g.push(1-H/E),k+=1}}for(let H=0;H<E;H++)for(let Y=0;Y<v;Y++){let st=h+Y+G*H,Tt=h+Y+G*(H+1),$=h+(Y+1)+G*(H+1),dt=h+(Y+1)+G*H;c.push(st,Tt,dt),c.push(Tt,$,dt),tt+=6}o.addGroup(f,tt,F),f+=tt,h+=k}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var ur=new U,dr=new U,Mo=new U,fr=new Pn,vs=class extends $e{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){let s=Math.pow(10,4),r=Math.cos(Ci*e),a=t.getIndex(),o=t.getAttribute("position"),c=a?a.count:o.count,l=[0,0,0],p=["a","b","c"],g=new Array(3),h=new Map,f=[];for(let m=0;m<c;m+=3){a?(l[0]=a.getX(m),l[1]=a.getX(m+1),l[2]=a.getX(m+2)):(l[0]=m,l[1]=m+1,l[2]=m+2);let{a:_,b:d,c:u}=fr;if(_.fromBufferAttribute(o,l[0]),d.fromBufferAttribute(o,l[1]),u.fromBufferAttribute(o,l[2]),fr.getNormal(Mo),g[0]=`${Math.round(_.x*s)},${Math.round(_.y*s)},${Math.round(_.z*s)}`,g[1]=`${Math.round(d.x*s)},${Math.round(d.y*s)},${Math.round(d.z*s)}`,g[2]=`${Math.round(u.x*s)},${Math.round(u.y*s)},${Math.round(u.z*s)}`,!(g[0]===g[1]||g[1]===g[2]||g[2]===g[0]))for(let x=0;x<3;x++){let M=(x+1)%3,b=g[x],A=g[M],T=fr[p[x]],v=fr[p[M]],E=`${b}_${A}`,F=`${A}_${b}`,L=h.get(F);L?(Mo.dot(L.normal)<=r&&(f.push(T.x,T.y,T.z),f.push(v.x,v.y,v.z)),h.set(F,null)):h.has(E)||h.set(E,{index0:l[x],index1:l[M],normal:Mo.clone()})}}for(let m of h.values())if(m){let{index0:_,index1:d}=m;ur.fromBufferAttribute(o,_),dr.fromBufferAttribute(o,d),f.push(ur.x,ur.y,ur.z),f.push(dr.x,dr.y,dr.z)}this.setAttribute("position",new Ee(f,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}};var ys=class i extends $e{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};let r=t/2,a=e/2,o=Math.floor(n),c=Math.floor(s),l=o+1,p=c+1,g=t/o,h=e/c,f=[],m=[],_=[],d=[];for(let u=0;u<p;u++){let x=u*h-a;for(let M=0;M<l;M++){let b=M*g-r;m.push(b,-x,0),_.push(0,0,1),d.push(M/o),d.push(1-u/c)}}for(let u=0;u<c;u++)for(let x=0;x<o;x++){let M=x+l*u,b=x+l*(u+1),A=x+1+l*(u+1),T=x+1+l*u;f.push(M,b,T),f.push(b,A,T)}this.setIndex(f),this.setAttribute("position",new Ee(m,3)),this.setAttribute("normal",new Ee(_,3)),this.setAttribute("uv",new Ee(d,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}};function mi(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let s=i[e][n];if(uc(s))s.isRenderTargetTexture?(Rt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(uc(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function Pe(i){let t={};for(let e=0;e<i.length;e++){let n=mi(i[e]);for(let s in n)t[s]=n[s]}return t}function uc(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Uu(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function ol(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:qt.workingColorSpace}var sh={clone:mi,merge:Pe},Fu=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Ou=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,vn=class extends Un{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Fu,this.fragmentShader=Ou,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=mi(t.uniforms),this.uniformsGroups=Uu(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new Ot().setHex(s.value);break;case"v2":this.uniforms[n].value=new It().fromArray(s.value);break;case"v3":this.uniforms[n].value=new U().fromArray(s.value);break;case"v4":this.uniforms[n].value=new re().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Dt().fromArray(s.value);break;case"m4":this.uniforms[n].value=new Qt().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},Br=class extends vn{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},zi=class extends Un{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ot(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ot(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ba,this.normalScale=new It(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Nn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var zr=class extends Un{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Vc,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},kr=class extends Un{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function Ti(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function pr(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var Zn=class{constructor(t,e,n,s){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,s=e[n],r=e[n-1];n:{t:{let a;e:{i:if(!(t<s)){for(let o=n+2;;){if(s===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=e[++n],t<s)break t}a=e.length;break e}if(!(t>=r)){let o=e[1];t<o&&(n=2,r=o);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(s=r,r=e[--n-1],t>=r)break t}a=n,n=0;break e}break n}for(;n<a;){let o=n+a>>>1;t<e[o]?a=o:n=o+1}if(s=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,t,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=t*s;for(let a=0;a!==s;++a)e[a]=n[r+a];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Gr=class extends Zn{constructor(t,e,n,s){super(t,e,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:wo,endingEnd:wo}}intervalChanged_(t,e,n){let s=this.parameterPositions,r=t-2,a=t+1,o=s[r],c=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case To:r=t,o=2*e-n;break;case Ao:r=s.length-2,o=e+s[r]-s[r+1];break;default:r=t,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case To:a=t,c=2*n-e;break;case Ao:a=1,c=n+s[1]-s[0];break;default:a=t-1,c=e}let l=(n-e)*.5,p=this.valueSize;this._weightPrev=l/(e-o),this._weightNext=l/(c-n),this._offsetPrev=r*p,this._offsetNext=a*p}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,p=this._offsetPrev,g=this._offsetNext,h=this._weightPrev,f=this._weightNext,m=(n-e)/(s-e),_=m*m,d=_*m,u=-h*d+2*h*_-h*m,x=(1+h)*d+(-1.5-2*h)*_+(-.5+h)*m+1,M=(-1-f)*d+(1.5+f)*_+.5*m,b=f*d-f*_;for(let A=0;A!==o;++A)r[A]=u*a[p+A]+x*a[l+A]+M*a[c+A]+b*a[g+A];return r}},Vr=class extends Zn{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,p=(n-e)/(s-e),g=1-p;for(let h=0;h!==o;++h)r[h]=a[l+h]*g+a[c+h]*p;return r}},Hr=class extends Zn{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t){return this.copySampleValue_(t-1)}},Wr=class extends Zn{interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,p=this.inTangents,g=this.outTangents;if(!p||!g){let m=(n-e)/(s-e),_=1-m;for(let d=0;d!==o;++d)r[d]=a[l+d]*_+a[c+d]*m;return r}let h=o*2,f=t-1;for(let m=0;m!==o;++m){let _=a[l+m],d=a[c+m],u=f*h+m*2,x=g[u],M=g[u+1],b=t*h+m*2,A=p[b],T=p[b+1],v=zu(n,e,x,A,s);r[m]=rh(v,_,M,T,d)}return r}};function rh(i,t,e,n,s){let r=1-i;return r*r*r*t+3*r*r*i*e+3*r*i*i*n+i*i*i*s}function Bu(i,t,e,n,s){let r=1-i;return 3*r*r*(e-t)+6*r*i*(n-e)+3*i*i*(s-n)}function zu(i,t,e,n,s){let r=(i-t)/(s-t);for(let a=0;a<8;a++){let o=rh(r,t,e,n,s)-i;if(Math.abs(o)<1e-10)break;let c=Bu(r,t,e,n,s);if(Math.abs(c)<1e-10)break;r=Math.max(0,Math.min(1,r-o/c))}return r}var Je=class{constructor(t,e,n,s){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Ti(e,this.TimeBufferType),this.values=Ti(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:Ti(t.times,Array),values:Ti(t.values,Array)};let s=t.getInterpolation();s!==t.DefaultInterpolation&&(n.interpolation=s),pr(t.settings)&&(n.settings={inTangents:Ti(t.settings.inTangents,Array),outTangents:Ti(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new Hr(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Vr(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Gr(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new Wr(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case os:e=this.InterpolantFactoryMethodDiscrete;break;case Rr:e=this.InterpolantFactoryMethodLinear;break;case _r:e=this.InterpolantFactoryMethodSmooth;break;case Eo:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Rt("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return os;case this.InterpolantFactoryMethodLinear:return Rr;case this.InterpolantFactoryMethodSmooth:return _r;case this.InterpolantFactoryMethodBezier:return Eo}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]+=t;pr(this.settings)&&(dc(this.settings.inTangents,t),dc(this.settings.outTangents,t))}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,s=e.length;n!==s;++n)e[n]*=t;pr(this.settings)&&(fc(this.settings.inTangents,t),fc(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<t;)++r;for(;a!==-1&&n[a]>e;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Pt("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Pt("KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==r;o++){let c=n[o];if(typeof c=="number"&&isNaN(c)){Pt("KeyframeTrack: Time is not a valid number.",this,o,c),t=!1;break}if(a!==null&&a>c){Pt("KeyframeTrack: Out of order keys.",this,o,c,a),t=!1;break}a=c}if(s!==void 0&&eu(s))for(let o=0,c=s.length;o!==c;++o){let l=s[o];if(isNaN(l)){Pt("KeyframeTrack: Value is not a valid number.",this,o,l),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===_r,r=t.length-1,a=1;for(let o=1;o<r;++o){let c=!1,l=t[o],p=t[o+1];if(l!==p&&(o!==1||l!==t[0]))if(s)c=!0;else{let g=o*n,h=g-n,f=g+n;for(let m=0;m!==n;++m){let _=e[g+m];if(_!==e[h+m]||_!==e[f+m]){c=!0;break}}}if(c){if(o!==a){t[a]=t[o];let g=o*n,h=a*n;for(let f=0;f!==n;++f)e[h+f]=e[g+f]}++a}}if(r>0){t[a]=t[r];for(let o=r*n,c=a*n,l=0;l!==n;++l)e[c+l]=e[o+l];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,s=new n(this.name,t,e);return s.createInterpolant=this.createInterpolant,pr(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}};function dc(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]+=t}function fc(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}Je.prototype.ValueTypeName="";Je.prototype.TimeBufferType=Float32Array;Je.prototype.ValueBufferType=Float32Array;Je.prototype.DefaultInterpolation=Rr;var $n=class extends Je{constructor(t,e,n){super(t,e,n)}};$n.prototype.ValueTypeName="bool";$n.prototype.ValueBufferType=Array;$n.prototype.DefaultInterpolation=os;$n.prototype.InterpolantFactoryMethodLinear=void 0;$n.prototype.InterpolantFactoryMethodSmooth=void 0;var Xr=class extends Je{constructor(t,e,n,s){super(t,e,n,s)}};Xr.prototype.ValueTypeName="color";var qr=class extends Je{constructor(t,e,n,s){super(t,e,n,s)}};qr.prototype.ValueTypeName="number";var Yr=class extends Zn{constructor(t,e,n,s){super(t,e,n,s)}interpolate_(t,e,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-e)/(s-e),l=t*o;for(let p=l+o;l!==p;l+=4)Ye.slerpFlat(r,0,a,l-o,a,l,c);return r}},Ss=class extends Je{constructor(t,e,n,s){super(t,e,n,s)}InterpolantFactoryMethodLinear(t){return new Yr(this.times,this.values,this.getValueSize(),t)}};Ss.prototype.ValueTypeName="quaternion";Ss.prototype.InterpolantFactoryMethodSmooth=void 0;var Jn=class extends Je{constructor(t,e,n){super(t,e,n)}};Jn.prototype.ValueTypeName="string";Jn.prototype.ValueBufferType=Array;Jn.prototype.DefaultInterpolation=os;Jn.prototype.InterpolantFactoryMethodLinear=void 0;Jn.prototype.InterpolantFactoryMethodSmooth=void 0;var Zr=class extends Je{constructor(t,e,n,s){super(t,e,n,s)}};Zr.prototype.ValueTypeName="vector";var $r=class{constructor(t,e,n){let s=this,r=!1,a=0,o=0,c,l=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(p){o++,r===!1&&s.onStart!==void 0&&s.onStart(p,a,o),r=!0},this.itemEnd=function(p){a++,s.onProgress!==void 0&&s.onProgress(p,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(p){s.onError!==void 0&&s.onError(p)},this.resolveURL=function(p){return p=p.normalize("NFC"),c?c(p):p},this.setURLModifier=function(p){return c=p,this},this.addHandler=function(p,g){return l.push(p,g),this},this.removeHandler=function(p){let g=l.indexOf(p);return g!==-1&&l.splice(g,2),this},this.getHandler=function(p){for(let g=0,h=l.length;g<h;g+=2){let f=l[g],m=l[g+1];if(f.global&&(f.lastIndex=0),f.test(p))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},ah=new $r,Jr=class{constructor(t){this.manager=t!==void 0?t:ah,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},this.priority="auto",this.cache="default",typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}setPriority(t){return this.priority=t,this}setCache(t){return this.cache=t,this}abort(){return this}};Jr.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ms=class extends Ce{static registerNode(t){this.prototype._lightNode=t}constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ot(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}};var bo=new Qt,pc=new U,mc=new U,Kr=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new It(512,512),this.mapType=Ge,this.map=null,this.mapPass=null,this.matrix=new Qt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Yn,this._frameExtents=new It(1,1),this._viewportCount=1,this._viewports=[new re(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;pc.setFromMatrixPosition(t.matrixWorld),e.position.copy(pc),mc.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(mc),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){bo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(bo,t.coordinateSystem,t.reversedDepth);let r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,c=s?s.x/r.x:0,l=s?s.y/r.y:0;t.coordinateSystem===Li||t.reversedDepth?e.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,.5,.5,0,0,0,1),e.multiply(bo)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.mapType=t.mapType,this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.mapType=this.mapType,t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},mr=new U,gr=new Ye,_n=new U,bs=class extends Ce{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Qt,this.projectionMatrix=new Qt,this.projectionMatrixInverse=new Qt,this.coordinateSystem=sn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(mr,gr,_n),_n.x===1&&_n.y===1&&_n.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(mr,gr,_n.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(mr,gr,_n),_n.x===1&&_n.y===1&&_n.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(mr,gr,_n.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},qn=new U,gc=new It,_c=new It,Le=class extends bs{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Ni*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Ci*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Ni*2*Math.atan(Math.tan(Ci*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){qn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(qn.x,qn.y).multiplyScalar(-t/qn.z),qn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(qn.x,qn.y).multiplyScalar(-t/qn.z)}getViewSize(t,e){return this.getViewBounds(t,gc,_c),e.subVectors(_c,gc)}setViewOffset(t,e,n,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(Ci*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;r+=a.offsetX*s/c,e-=a.offsetY*n/l,s*=a.width/c,n*=a.height/l}let o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var Es=class extends bs{constructor(t=-1,e=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-t,a=n+t,o=s+e,c=s-e;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,p=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,a=r+l*this.view.width,o-=p*this.view.offsetY,c=o-p*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},Ro=class extends Kr{constructor(){super(new Es(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},ki=class extends Ms{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ce.DEFAULT_UP),this.updateMatrix(),this.target=new Ce,this.shadow=new Ro}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},ws=class extends Ms{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Ai=-90,Ri=1,Gi=class extends Ce{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Le(Ai,Ri,t,e);s.layers=this.layers,this.add(s);let r=new Le(Ai,Ri,t,e);r.layers=this.layers,this.add(r);let a=new Le(Ai,Ri,t,e);a.layers=this.layers,this.add(a);let o=new Le(Ai,Ri,t,e);o.layers=this.layers,this.add(o);let c=new Le(Ai,Ri,t,e);c.layers=this.layers,this.add(c);let l=new Le(Ai,Ri,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,s,r,a,o,c]=e;for(let l of e)this.remove(l);if(t===sn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===Li)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,c,l,p]=this.children,g=t.getRenderTarget(),h=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),m=t.xr.enabled;t.xr.enabled=!1;let _=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let d=!1;t.isWebGLRenderer===!0?d=t.state.buffers.depth.getReversed():d=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,2,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,3,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),t.setRenderTarget(n,4,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),n.texture.mipmapsAutoUpdate=_,t.setRenderTarget(n,5,s),d&&t.autoClear===!1&&t.clearDepth(),t.render(e,p),t.setRenderTarget(g,h,f),t.xr.enabled=m,n.texture.needsPMREMUpdate=!0}},jr=class extends Le{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t,this.perCameraFrustumCulled=!1}};var ll="\\[\\]\\.:\\/",ku=new RegExp("["+ll+"]","g"),cl="[^"+ll+"]",Gu="[^"+ll.replace("\\.","")+"]",Vu=/((?:WC+[\/:])*)/.source.replace("WC",cl),Hu=/(WCOD+)?/.source.replace("WCOD",Gu),Wu=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",cl),Xu=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",cl),qu=new RegExp("^"+Vu+Hu+Wu+Xu+"$"),Yu=["material","materials","bones","map"],Co=class{constructor(t,e,n){let s=n||ne.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,s)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},ne=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(ku,"")}static parseTrackName(t){let e=qu.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Yu.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===e||o.uuid===e)return o;let c=n(o.children);if(c)return c}return null},s=n(t.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)t[e++]=n[s]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,s=e.propertyName,r=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Rt("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=e.objectIndex;switch(n){case"materials":if(!t.material){Pt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Pt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Pt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let p=0;p<t.length;p++)if(t[p].name===l){l=p;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Pt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Pt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Pt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(l!==void 0){if(t[l]===void 0){Pt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[l]}}let a=t[s];if(a===void 0){let l=e.nodeName;Pt("PropertyBinding: Trying to update property for track: "+l+"."+s+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!t.geometry){Pt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Pt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ne.Composite=Co;ne.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ne.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ne.prototype.GetterByBindingType=[ne.prototype._getValue_direct,ne.prototype._getValue_array,ne.prototype._getValue_arrayElement,ne.prototype._getValue_toArray];ne.prototype.SetterByBindingTypeAndVersioning=[[ne.prototype._setValue_direct,ne.prototype._setValue_direct_setNeedsUpdate,ne.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ne.prototype._setValue_array,ne.prototype._setValue_array_setNeedsUpdate,ne.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ne.prototype._setValue_arrayElement,ne.prototype._setValue_arrayElement_setNeedsUpdate,ne.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ne.prototype._setValue_fromArray,ne.prototype._setValue_fromArray_setNeedsUpdate,ne.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var n_=new Float32Array(1);var Vi=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Ht(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(Ht(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Po=class{static{this.prototype.isMatrix2=!0}constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){let r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};var Ts=class extends Oi{constructor(t=10,e=10,n=4473924,s=8947848){n=new Ot(n),s=new Ot(s);let r=e/2,a=t/e,o=t/2,c=[],l=[];for(let h=0,f=0,m=-o;h<=e;h++,m+=a){c.push(-o,0,m,o,0,m),c.push(m,0,-o,m,0,o);let _=h===r?n:s;_.toArray(l,f),f+=3,_.toArray(l,f),f+=3,_.toArray(l,f),f+=3,_.toArray(l,f),f+=3}let p=new $e;p.setAttribute("position",new Ee(c,3)),p.setAttribute("color",new Ee(l,3));let g=new hi({vertexColors:!0,toneMapped:!1});super(p,g),this.type="GridHelper"}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}};var As=class extends hn{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};function hl(i,t,e,n){let s=Zu(n);switch(e){case Jo:return i*t;case jo:return i*t/s.components*s.byteLength;case ra:return i*t/s.components*s.byteLength;case ti:return i*t*2/s.components*s.byteLength;case aa:return i*t*2/s.components*s.byteLength;case Ko:return i*t*3/s.components*s.byteLength;case pn:return i*t*4/s.components*s.byteLength;case oa:return i*t*4/s.components*s.byteLength;case Ps:case Is:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Ls:case Ds:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case ca:case ua:return Math.max(i,16)*Math.max(t,8)/4;case la:case ha:return Math.max(i,8)*Math.max(t,8)/2;case da:case fa:case ma:case ga:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case pa:case Ns:case _a:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case xa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case va:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case ya:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case Sa:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Ma:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case ba:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Ea:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case wa:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Ta:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Aa:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Ra:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case Ca:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Pa:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Ia:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case La:case Da:case Na:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Ua:case Fa:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Us:case Oa:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Zu(i){switch(i){case Ge:case qo:return{byteLength:1,components:1};case qi:case Yo:case fn:return{byteLength:2,components:1};case ia:case sa:return{byteLength:2,components:4};case un:case na:case dn:return{byteLength:4,components:1};case Zo:case $o:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"187"}}));typeof window<"u"&&(window.__THREE__?Rt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="187");function Rh(){let i=null,t=!1,e=null,n=null;function s(r,a){n=i.requestAnimationFrame(s),e(r,a)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function Ju(i){let t=new WeakMap;function e(o,c){let l=o.array,p=o.usage,g=l.byteLength,h=i.createBuffer();i.bindBuffer(c,h),i.bufferData(c,l,p),o.onUploadCallback();let f;if(l instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)f=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=i.SHORT;else if(l instanceof Uint32Array)f=i.UNSIGNED_INT;else if(l instanceof Int32Array)f=i.INT;else if(l instanceof Int8Array)f=i.BYTE;else if(l instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:h,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:g}}function n(o,c,l){let p=c.array,g=c.updateRanges;if(i.bindBuffer(l,o),g.length===0)i.bufferSubData(l,0,p);else{g.sort((f,m)=>f.start-m.start);let h=0;for(let f=1;f<g.length;f++){let m=g[h],_=g[f];_.start<=m.start+m.count+1?m.count=Math.max(m.count,_.start+_.count-m.start):(++h,g[h]=_)}g.length=h+1;for(let f=0,m=g.length;f<m;f++){let _=g[f];i.bufferSubData(l,_.start*p.BYTES_PER_ELEMENT,p,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let c=t.get(o);c&&(i.deleteBuffer(c.buffer),t.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let p=t.get(o);(!p||p.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let l=t.get(o);if(l===void 0)t.set(o,e(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:s,remove:r,update:a}}var Ku=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ju=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Qu=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,td=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ed=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,nd=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,id=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,sd=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,rd=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,ad=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,od=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,ld=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,cd=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,hd=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,ud=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,dd=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,fd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,pd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,md=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,gd=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,_d=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,xd=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,vd=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,yd=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Sd=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Md=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,bd=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Ed=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,wd=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Td="gl_FragColor = linearToOutputTexel( gl_FragColor );",Ad=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Rd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Cd=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,Pd=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Id=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Ld=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Dd=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Nd=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Ud=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Fd=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Od=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Bd=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,zd=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,kd=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Gd=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Vd=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,Hd=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Wd=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Xd=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,qd=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Yd=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Zd=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,$d=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Jd=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Kd=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,jd=`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Qd=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,tf=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ef=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,nf=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,sf=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,rf=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,af=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,of=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,lf=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,cf=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,hf=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,uf=`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,df=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ff=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,pf=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,mf=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,gf=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,_f=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,xf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,vf=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,yf=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Sf=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Mf=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,bf=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ef=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,wf=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Tf=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Af=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Rf=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Cf=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Pf=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,If=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Lf=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Df=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Nf=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Uf=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Ff=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Of=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Bf=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,zf=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,kf=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Gf=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Vf=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Hf=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Wf=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Xf=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,qf=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Yf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Zf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,$f=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Jf=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Kf=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,jf=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Qf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,tp=`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ep=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,np=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ip=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,sp=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,rp=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,ap=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,op=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,lp=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cp=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,hp=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,up=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,dp=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,fp=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,pp=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,mp=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,gp=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_p=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,xp=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,vp=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,yp=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Sp=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Mp=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bp=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ep=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,wp=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Tp=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ap=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Rp=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Cp=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Pp=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Gt={alphahash_fragment:Ku,alphahash_pars_fragment:ju,alphamap_fragment:Qu,alphamap_pars_fragment:td,alphatest_fragment:ed,alphatest_pars_fragment:nd,aomap_fragment:id,aomap_pars_fragment:sd,batching_pars_vertex:rd,batching_vertex:ad,begin_vertex:od,beginnormal_vertex:ld,bsdfs:cd,iridescence_fragment:hd,bumpmap_pars_fragment:ud,clipping_planes_fragment:dd,clipping_planes_pars_fragment:fd,clipping_planes_pars_vertex:pd,clipping_planes_vertex:md,color_fragment:gd,color_pars_fragment:_d,color_pars_vertex:xd,color_vertex:vd,common:yd,defaultnormal_vertex:Sd,displacementmap_pars_vertex:Md,displacementmap_vertex:bd,emissivemap_fragment:Ed,emissivemap_pars_fragment:wd,colorspace_fragment:Td,colorspace_pars_fragment:Ad,envmap_fragment:Rd,envmap_common_pars_fragment:Cd,envmap_pars_fragment:Pd,envmap_pars_vertex:Id,envmap_physical_pars_fragment:Vd,envmap_vertex:Ld,fog_vertex:Dd,fog_pars_vertex:Nd,fog_fragment:Ud,fog_pars_fragment:Fd,gradientmap_pars_fragment:Od,lightmap_pars_fragment:Bd,lights_lambert_fragment:zd,lights_lambert_pars_fragment:kd,lights_pars_begin:Gd,lights_toon_fragment:Hd,lights_toon_pars_fragment:Wd,lights_phong_fragment:Xd,lights_phong_pars_fragment:qd,lights_physical_fragment:Yd,lights_physical_pars_fragment:Zd,lights_fragment_begin:$d,lights_fragment_maps:Jd,lights_fragment_end:Kd,lightprobes_pars_fragment:jd,logdepthbuf_fragment:Qd,logdepthbuf_pars_fragment:tf,logdepthbuf_pars_vertex:ef,logdepthbuf_vertex:nf,map_fragment:sf,map_pars_fragment:rf,map_particle_fragment:af,map_particle_pars_fragment:of,metalnessmap_fragment:lf,metalnessmap_pars_fragment:cf,morphinstance_vertex:hf,morphcolor_vertex:uf,morphnormal_vertex:df,morphtarget_pars_vertex:ff,morphtarget_vertex:pf,normal_fragment_begin:mf,normal_fragment_maps:gf,normal_pars_fragment:_f,normal_pars_vertex:xf,normal_vertex:vf,normalmap_pars_fragment:yf,clearcoat_normal_fragment_begin:Sf,clearcoat_normal_fragment_maps:Mf,clearcoat_pars_fragment:bf,iridescence_pars_fragment:Ef,opaque_fragment:wf,packing:Tf,premultiplied_alpha_fragment:Af,project_vertex:Rf,dithering_fragment:Cf,dithering_pars_fragment:Pf,roughnessmap_fragment:If,roughnessmap_pars_fragment:Lf,shadowmap_pars_fragment:Df,shadowmap_pars_vertex:Nf,shadowmap_vertex:Uf,shadowmask_pars_fragment:Ff,skinbase_vertex:Of,skinning_pars_vertex:Bf,skinning_vertex:zf,skinnormal_vertex:kf,specularmap_fragment:Gf,specularmap_pars_fragment:Vf,tonemapping_fragment:Hf,tonemapping_pars_fragment:Wf,transmission_fragment:Xf,transmission_pars_fragment:qf,uv_pars_fragment:Yf,uv_pars_vertex:Zf,uv_vertex:$f,worldpos_vertex:Jf,background_vert:Kf,background_frag:jf,backgroundCube_vert:Qf,backgroundCube_frag:tp,cube_vert:ep,cube_frag:np,depth_vert:ip,depth_frag:sp,distance_vert:rp,distance_frag:ap,equirect_vert:op,equirect_frag:lp,linedashed_vert:cp,linedashed_frag:hp,meshbasic_vert:up,meshbasic_frag:dp,meshlambert_vert:fp,meshlambert_frag:pp,meshmatcap_vert:mp,meshmatcap_frag:gp,meshnormal_vert:_p,meshnormal_frag:xp,meshphong_vert:vp,meshphong_frag:yp,meshphysical_vert:Sp,meshphysical_frag:Mp,meshtoon_vert:bp,meshtoon_frag:Ep,points_vert:wp,points_frag:Tp,shadow_vert:Ap,shadow_frag:Rp,sprite_vert:Cp,sprite_frag:Pp},_t={common:{diffuse:{value:new Ot(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Dt},alphaMap:{value:null},alphaMapTransform:{value:new Dt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Dt}},envmap:{envMap:{value:null},envMapRotation:{value:new Dt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Dt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Dt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Dt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Dt},normalScale:{value:new It(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Dt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Dt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Dt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Dt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ot(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new Ot(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Dt},alphaTest:{value:0},uvTransform:{value:new Dt}},sprite:{diffuse:{value:new Ot(16777215)},opacity:{value:1},center:{value:new It(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Dt},alphaMap:{value:null},alphaMapTransform:{value:new Dt},alphaTest:{value:0}}},Mn={basic:{uniforms:Pe([_t.common,_t.specularmap,_t.envmap,_t.aomap,_t.lightmap,_t.fog]),vertexShader:Gt.meshbasic_vert,fragmentShader:Gt.meshbasic_frag},lambert:{uniforms:Pe([_t.common,_t.specularmap,_t.envmap,_t.aomap,_t.lightmap,_t.emissivemap,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.fog,_t.lights,{emissive:{value:new Ot(0)},envMapIntensity:{value:1}}]),vertexShader:Gt.meshlambert_vert,fragmentShader:Gt.meshlambert_frag},phong:{uniforms:Pe([_t.common,_t.specularmap,_t.envmap,_t.aomap,_t.lightmap,_t.emissivemap,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.fog,_t.lights,{emissive:{value:new Ot(0)},specular:{value:new Ot(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Gt.meshphong_vert,fragmentShader:Gt.meshphong_frag},standard:{uniforms:Pe([_t.common,_t.envmap,_t.aomap,_t.lightmap,_t.emissivemap,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.roughnessmap,_t.metalnessmap,_t.fog,_t.lights,{emissive:{value:new Ot(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Gt.meshphysical_vert,fragmentShader:Gt.meshphysical_frag},toon:{uniforms:Pe([_t.common,_t.aomap,_t.lightmap,_t.emissivemap,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.gradientmap,_t.fog,_t.lights,{emissive:{value:new Ot(0)}}]),vertexShader:Gt.meshtoon_vert,fragmentShader:Gt.meshtoon_frag},matcap:{uniforms:Pe([_t.common,_t.bumpmap,_t.normalmap,_t.displacementmap,_t.fog,{matcap:{value:null}}]),vertexShader:Gt.meshmatcap_vert,fragmentShader:Gt.meshmatcap_frag},points:{uniforms:Pe([_t.points,_t.fog]),vertexShader:Gt.points_vert,fragmentShader:Gt.points_frag},dashed:{uniforms:Pe([_t.common,_t.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Gt.linedashed_vert,fragmentShader:Gt.linedashed_frag},depth:{uniforms:Pe([_t.common,_t.displacementmap]),vertexShader:Gt.depth_vert,fragmentShader:Gt.depth_frag},normal:{uniforms:Pe([_t.common,_t.bumpmap,_t.normalmap,_t.displacementmap,{opacity:{value:1}}]),vertexShader:Gt.meshnormal_vert,fragmentShader:Gt.meshnormal_frag},sprite:{uniforms:Pe([_t.sprite,_t.fog]),vertexShader:Gt.sprite_vert,fragmentShader:Gt.sprite_frag},background:{uniforms:{uvTransform:{value:new Dt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Gt.background_vert,fragmentShader:Gt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Dt}},vertexShader:Gt.backgroundCube_vert,fragmentShader:Gt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Gt.cube_vert,fragmentShader:Gt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Gt.equirect_vert,fragmentShader:Gt.equirect_frag},distance:{uniforms:Pe([_t.common,_t.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Gt.distance_vert,fragmentShader:Gt.distance_frag},shadow:{uniforms:Pe([_t.lights,_t.fog,{color:{value:new Ot(0)},opacity:{value:1}}]),vertexShader:Gt.shadow_vert,fragmentShader:Gt.shadow_frag}};Mn.physical={uniforms:Pe([Mn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Dt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Dt},clearcoatNormalScale:{value:new It(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Dt},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new Dt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Dt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Dt},sheen:{value:0},sheenColor:{value:new Ot(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Dt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Dt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Dt},transmissionSamplerSize:{value:new It},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Dt},attenuationDistance:{value:0},attenuationColor:{value:new Ot(0)},specularColor:{value:new Ot(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Dt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Dt},anisotropyVector:{value:new It},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Dt}}]),vertexShader:Gt.meshphysical_vert,fragmentShader:Gt.meshphysical_frag};var za={r:0,b:0,g:0},Ip=new Qt,Ch=new Dt;Ch.set(-1,0,0,0,1,0,0,0,1);function Lp(i,t,e,n,s,r){let a=new Ot(0),o=s===!0?0:1,c,l,p=null,g=0,h=null;function f(x){let M=x.isScene===!0?x.background:null;if(M&&M.isTexture){let b=x.backgroundBlurriness>0;M=t.get(M,b)}return M}function m(x){let M=!1,b=f(x);b===null?d(a,o):b&&b.isColor&&(d(b,1),M=!0);let A=i.xr.getEnvironmentBlendMode();A==="additive"?e.buffers.color.setClear(0,0,0,1,r):A==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||M)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function _(x,M){let b=f(M);b&&b.isCubeTexture?(l===void 0&&(l=new rn(new Bi(1,1,1),new vn({name:"BackgroundCubeMaterial",uniforms:mi(Mn.backgroundCube.uniforms),vertexShader:Mn.backgroundCube.vertexShader,fragmentShader:Mn.backgroundCube.fragmentShader,side:Ue,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(A,T,v){this.matrixWorld.copyPosition(v.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),l.material.uniforms.envMap.value=b,l.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Ip.makeRotationFromEuler(M.backgroundRotation)).transpose(),b.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(Ch),l.material.toneMapped=qt.getTransfer(b.colorSpace)!==Jt,(p!==b||g!==b.version||h!==i.toneMapping)&&(l.material.needsUpdate=!0,p=b,g=b.version,h=i.toneMapping),l.layers.enableAll(),x.unshift(l,l.geometry,l.material,0,0,null)):b&&b.isTexture&&(c===void 0&&(c=new rn(new ys(2,2),new vn({name:"BackgroundMaterial",uniforms:mi(Mn.background.uniforms),vertexShader:Mn.background.vertexShader,fragmentShader:Mn.background.fragmentShader,side:Qn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=b,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.toneMapped=qt.getTransfer(b.colorSpace)!==Jt,b.matrixAutoUpdate===!0&&b.updateMatrix(),c.material.uniforms.uvTransform.value.copy(b.matrix),(p!==b||g!==b.version||h!==i.toneMapping)&&(c.material.needsUpdate=!0,p=b,g=b.version,h=i.toneMapping),c.layers.enableAll(),x.unshift(c,c.geometry,c.material,0,0,null))}function d(x,M){x.getRGB(za,ol(i)),e.buffers.color.setClear(za.r,za.g,za.b,M,r)}function u(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(x,M=1){a.set(x),o=M,d(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(x){o=x,d(a,o)},render:m,addToRenderList:_,dispose:u}}function Dp(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=h(null),r=s,a=!1;function o(C,N,V,P,G){let X=!1,k=g(C,P,V,N);r!==k&&(r=k,l(r.object)),X=f(C,P,V,G),X&&m(C,P,V,G),G!==null&&t.update(G,i.ELEMENT_ARRAY_BUFFER),(X||a)&&(a=!1,b(C,N,V,P),G!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(G).buffer))}function c(){return i.createVertexArray()}function l(C){return i.bindVertexArray(C)}function p(C){return i.deleteVertexArray(C)}function g(C,N,V,P){let G=P.wireframe===!0,X=n[N.id];X===void 0&&(X={},n[N.id]=X);let k=C.isInstancedMesh===!0?C.id:0,tt=X[k];tt===void 0&&(tt={},X[k]=tt);let q=tt[V.id];q===void 0&&(q={},tt[V.id]=q);let H=q[G];return H===void 0&&(H=h(c()),q[G]=H),H}function h(C){let N=[],V=[],P=[];for(let G=0;G<e;G++)N[G]=0,V[G]=0,P[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:N,enabledAttributes:V,attributeDivisors:P,object:C,attributes:{},index:null}}function f(C,N,V,P){let G=r.attributes,X=N.attributes,k=0,tt=V.getAttributes();for(let q in tt)if(tt[q].location>=0){let Y=G[q],st=X[q];if(st===void 0&&(q==="instanceMatrix"&&C.instanceMatrix&&(st=C.instanceMatrix),q==="instanceColor"&&C.instanceColor&&(st=C.instanceColor)),Y===void 0||Y.attribute!==st||st&&Y.data!==st.data)return!0;k++}return r.attributesNum!==k||r.index!==P}function m(C,N,V,P){let G={},X=N.attributes,k=0,tt=V.getAttributes();for(let q in tt)if(tt[q].location>=0){let Y=X[q];Y===void 0&&(q==="instanceMatrix"&&C.instanceMatrix&&(Y=C.instanceMatrix),q==="instanceColor"&&C.instanceColor&&(Y=C.instanceColor));let st={};st.attribute=Y,Y&&Y.data&&(st.data=Y.data),G[q]=st,k++}r.attributes=G,r.attributesNum=k,r.index=P}function _(){let C=r.newAttributes;for(let N=0,V=C.length;N<V;N++)C[N]=0}function d(C){u(C,0)}function u(C,N){let V=r.newAttributes,P=r.enabledAttributes,G=r.attributeDivisors;V[C]=1,P[C]===0&&(i.enableVertexAttribArray(C),P[C]=1),G[C]!==N&&(i.vertexAttribDivisor(C,N),G[C]=N)}function x(){let C=r.newAttributes,N=r.enabledAttributes;for(let V=0,P=N.length;V<P;V++)N[V]!==C[V]&&(i.disableVertexAttribArray(V),N[V]=0)}function M(C,N,V,P,G,X,k){k===!0?i.vertexAttribIPointer(C,N,V,G,X):i.vertexAttribPointer(C,N,V,P,G,X)}function b(C,N,V,P){_();let G=P.attributes,X=V.getAttributes(),k=N.defaultAttributeValues;for(let tt in X){let q=X[tt];if(q.location>=0){let H=G[tt];if(H===void 0&&(tt==="instanceMatrix"&&C.instanceMatrix&&(H=C.instanceMatrix),tt==="instanceColor"&&C.instanceColor&&(H=C.instanceColor)),H!==void 0){let Y=H.normalized,st=H.itemSize,Tt=t.get(H);if(Tt===void 0)continue;let $=Tt.buffer,dt=Tt.type,pt=Tt.bytesPerElement,yt=dt===i.INT||dt===i.UNSIGNED_INT||H.gpuType===na;if(H.isInterleavedBufferAttribute){let ft=H.data,Lt=ft.isInterleavedBuffer===!0?ft.stride:ft.itemSize,te=H.offset;if(ft.isInstancedInterleavedBuffer||ft.isInstancedBufferAttribute){for(let wt=0;wt<q.locationSize;wt++)u(q.location+wt,ft.meshPerAttribute);C.isInstancedMesh!==!0&&P._maxInstanceCount===void 0&&(P._maxInstanceCount=ft.meshPerAttribute*ft.count)}else for(let wt=0;wt<q.locationSize;wt++)d(q.location+wt);i.bindBuffer(i.ARRAY_BUFFER,$);for(let wt=0;wt<q.locationSize;wt++)M(q.location+wt,st/q.locationSize,dt,Y,Lt*pt,(te+st/q.locationSize*wt)*pt,yt)}else{if(H.isInstancedBufferAttribute){for(let ft=0;ft<q.locationSize;ft++)u(q.location+ft,H.meshPerAttribute);C.isInstancedMesh!==!0&&P._maxInstanceCount===void 0&&(P._maxInstanceCount=H.meshPerAttribute*H.count)}else for(let ft=0;ft<q.locationSize;ft++)d(q.location+ft);i.bindBuffer(i.ARRAY_BUFFER,$);for(let ft=0;ft<q.locationSize;ft++)M(q.location+ft,st/q.locationSize,dt,Y,st*pt,st/q.locationSize*ft*pt,yt)}}else if(k!==void 0){let Y=k[tt];if(Y!==void 0)switch(Y.length){case 2:i.vertexAttrib2fv(q.location,Y);break;case 3:i.vertexAttrib3fv(q.location,Y);break;case 4:i.vertexAttrib4fv(q.location,Y);break;default:i.vertexAttrib1fv(q.location,Y)}}}}x()}function A(){F();for(let C in n){let N=n[C];for(let V in N){let P=N[V];for(let G in P){let X=P[G];for(let k in X)p(X[k].object),delete X[k];delete P[G]}}delete n[C]}}function T(C){if(n[C.id]===void 0)return;let N=n[C.id];for(let V in N){let P=N[V];for(let G in P){let X=P[G];for(let k in X)p(X[k].object),delete X[k];delete P[G]}}delete n[C.id]}function v(C){for(let N in n){let V=n[N];for(let P in V){let G=V[P];if(G[C.id]===void 0)continue;let X=G[C.id];for(let k in X)p(X[k].object),delete X[k];delete G[C.id]}}}function E(C){for(let N in n){let V=n[N],P=C.isInstancedMesh===!0?C.id:0,G=V[P];if(G!==void 0){for(let X in G){let k=G[X];for(let tt in k)p(k[tt].object),delete k[tt];delete G[X]}delete V[P],Object.keys(V).length===0&&delete n[N]}}}function F(){L(),a=!0,r!==s&&(r=s,l(r.object))}function L(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:F,resetDefaultState:L,dispose:A,releaseStatesOfGeometry:T,releaseStatesOfObject:E,releaseStatesOfProgram:v,initAttributes:_,enableAttribute:d,disableUnusedAttributes:x}}function Np(i,t,e){let n;function s(c){n=c}function r(c,l){i.drawArrays(n,c,l),e.update(l,n,1)}function a(c,l,p){p!==0&&(i.drawArraysInstanced(n,c,l,p),e.update(l,n,p))}function o(c,l,p){if(p===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,l,0,p);let h=0;for(let f=0;f<p;f++)h+=l[f];e.update(h,n,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function Up(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){let v=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(v.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(v){return!(v!==pn&&n.convert(v)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(v){let E=v===fn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(v!==Ge&&v!==dn&&!E&&n.convert(v)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function c(v){if(v==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";v="mediump"}return v==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp",p=c(l);p!==l&&(Rt("WebGLRenderer:",l,"not supported, using",p,"instead."),l=p);let g=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),h=e.logarithmicDepthBuffer===!0&&g===!1;e.reversedDepthBuffer===!0&&g===!1&&Rt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),e.logarithmicDepthBuffer===!0&&g===!0&&Rt("WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),m=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),d=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),u=i.getParameter(i.MAX_VERTEX_ATTRIBS),x=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),M=i.getParameter(i.MAX_VARYING_VECTORS),b=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),A=i.getParameter(i.MAX_SAMPLES),T=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:h,reversedDepthBuffer:g,maxTextures:f,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:d,maxAttributes:u,maxVertexUniforms:x,maxVaryings:M,maxFragmentUniforms:b,maxSamples:A,samples:T}}function Fp(i){let t=this,e=null,n=0,s=!1,r=!1,a=new qe,o=new Dt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(g,h){let f=g.length!==0||h||n!==0||s;return s=h,n=g.length,f},this.beginShadows=function(){r=!0,p(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(g,h){e=p(g,h,0)},this.setState=function(g,h,f){let m=g.clippingPlanes,_=g.clipIntersection,d=g.clipShadows,u=i.get(g);if(!s||m===null||m.length===0||r&&!d)r?p(null):l();else{let x=r?0:n,M=x*4,b=u.clippingState||null;c.value=b,b=p(m,h,M,f);for(let A=0;A!==M;++A)b[A]=e[A];u.clippingState=b,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=x}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function p(g,h,f,m){let _=g!==null?g.length:0,d=null;if(_!==0){if(d=c.value,m!==!0||d===null){let u=f+_*4,x=h.matrixWorldInverse;o.getNormalMatrix(x),(d===null||d.length<u)&&(d=new Float32Array(u));for(let M=0,b=f;M!==_;++M,b+=4)a.copy(g[M]).applyMatrix4(x,o),a.normal.toArray(d,b),d[b+3]=a.constant}c.value=d,c.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,d}}var zs=class extends Ze{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new gs(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Bi(5,5,5),r=new vn({name:"CubemapFromEquirect",uniforms:mi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ue,blending:ui});r.uniforms.tEquirect.value=e;let a=new rn(s,r),o=e.minFilter;return e.minFilter===On&&(e.minFilter=De),new Gi(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){let r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,s);t.setRenderTarget(r)}},oh=256,Op=3,Bp=20,Ph=256,Ih=16,zp=3,kp=new U,Gp=new Ot,Ga=class i{constructor(t){this._renderer=t,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new Gi(1,10,null),this._boxMesh=new rn(new Bi(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){let{size:a=256,position:o=kp}=r,c=this._renderer;this._setSize(a);let l=this._allocateTarget(),p=this._getSourceTarget(!0);e>0&&(p.texture.mipmapsAutoUpdate=!1);let g=c.autoClear,h=c.autoClearColor,f=c.autoClearDepth,m=c.autoClearStencil,_=t.background;c.autoClear=!0,c.autoClearColor=!0,c.autoClearDepth=!0,c.autoClearStencil=!0,_===null&&(t.background=c.getClearColor(Gp));let d=new Gi(n,s,p);return d.position.copy(o),d.update(c,t),c.autoClear=g,c.autoClearColor=h,c.autoClearDepth=f,c.autoClearStencil=m,t.background=_,e>0&&(p.texture.mipmapsAutoUpdate=!0,this._blur(l,e)),this._applyPMREM(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=hh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ch(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(t,e){return e>0?1-Math.sqrt(1-t/e):0}_setSize(t){this._cubeSize=Math.max(oh,rl(t))}_fromTexture(t,e){t.mapping===fi||t.mapping===Xi?this._setSize(t.image.length===0?oh:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4);let n=e||this._allocateTarget();return this._textureToCubemap(t),this._applyPMREM(n),n}_allocateTarget(){let t=this._cubeSize,e=lh(t,!1,!1),n=Math.log2(t)-Op;for(let s=0;s<=n;s++)e.texture.mipmaps.push({width:t>>s,height:t>>s});return e.texture.name="PMREM",e.texture.isPMREMTexture=!0,e}_getSourceTarget(t=!1){let e=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==e||t&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=lh(e,!0,t)),this._sourceTarget}_compileMaterial(t){this._boxMesh.material=t,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(t,e,n){let s=this._boxMesh,r=this._cubeCamera;s.material=n,r.renderTarget=t,r.activeMipmapLevel=e;let a=t.width>>e;t.viewport.set(0,0,a,a),r.update(this._renderer,s),t.viewport.set(0,0,t.width,t.height)}_textureToCubemap(t){let e;t.mapping===fi||t.mapping===Xi?(this._cubemapMaterial===null&&(this._cubemapMaterial=hh()),e=this._cubemapMaterial,e.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=ch()),e=this._equirectMaterial),e.uniforms.envMap.value=t,this._renderCube(this._getSourceTarget(),0,e)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=Vp(),this._integrationMaterial=Hp());let e=this._cubeSize,n=t.texture.mipmaps.length-1,s=this._ggxMaterial.uniforms;s.envMap.value=this._sourceTarget.texture;let r=this._integrationMaterial.uniforms;r.envMap.value=this._sourceTarget.texture,r.sourceLod.value=Math.log2(e/Ih);for(let a=0;a<=n;a++){let o=i.lodToRoughness(a,n);if(a>n-zp)r.roughness.value=o,this._renderCube(t,a,this._integrationMaterial);else{let c=o>0?Math.log2(e)+.5*Math.log2(6/(Ph*Math.pow(o,4)))+.5:0;s.roughness.value=o,s.lodBias.value=c,this._renderCube(t,a,this._ggxMaterial)}}}_blur(t,e){this._blurMaterial===null&&(this._blurMaterial=Wp());let n=this._blurMaterial,s=n.uniforms,r=this._sourceTarget;s.sigma.value=Math.min(e,Math.PI)/Math.SQRT2,s.envMap.value=r.texture,this._renderCube(t,0,n),s.envMap.value=t.texture,this._renderCube(r,0,n)}};function lh(i,t,e){return new zs(i,{minFilter:On,generateMipmaps:t,type:fn,colorSpace:ls,depthBuffer:e})}function ks(i,t,e){return new vn({name:i,uniforms:t,vertexShader:Gt.cube_vert,fragmentShader:e,side:Ue,blending:ui,depthTest:!1,depthWrite:!1})}function Vp(){return ks("PMREMGGXConvolution",{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${Ph}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Hp(){return ks("PMREMGGXIntegration",{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Ih}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Wp(){return ks("PMREMSphericalGaussianBlur",{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${Bp}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function ch(){return ks("PMREMEquirectangularToCubemap",{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function hh(){return ks("PMREMCubemapToCubemap",{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function Xp(i){let t=new WeakMap,e=new WeakMap,n=null;function s(h,f=!1){return h==null?null:f?a(h):r(h)}function r(h){if(h&&h.isTexture){let f=h.mapping;if(f===Qr||f===ta)if(t.has(h)){let m=t.get(h).texture;return o(m,h.mapping)}else{let m=h.image;if(m&&m.height>0){let _=new zs(m.height);return _.fromEquirectangularTexture(i,h),t.set(h,_),h.addEventListener("dispose",l),o(_.texture,h.mapping)}else return null}}return h}function a(h){if(h&&h.isTexture&&h.isPMREMTexture!==!0){let f=h.mapping,m=f===Qr||f===ta,_=f===fi||f===Xi;if(m||_){let d=e.get(h),u=d!==void 0?d.texture.pmremVersion:0;if(h.isRenderTargetTexture&&h.pmremVersion!==u)return n===null&&(n=new Ga(i)),d=m?n.fromEquirectangular(h,d):n.fromCubemap(h,d),d.texture.pmremVersion=h.pmremVersion,e.set(h,d),d.texture;if(d!==void 0)return d.texture;{let x=h.image;return m&&x&&x.height>0||_&&x&&c(x)?(n===null&&(n=new Ga(i)),d=m?n.fromEquirectangular(h):n.fromCubemap(h),d.texture.pmremVersion=h.pmremVersion,e.set(h,d),h.addEventListener("dispose",p),d.texture):null}}}return h}function o(h,f){return f===Qr?h.mapping=fi:f===ta&&(h.mapping=Xi),h}function c(h){let f=0,m=6;for(let _=0;_<m;_++)h[_]!==void 0&&f++;return f===m}function l(h){let f=h.target;f.removeEventListener("dispose",l);let m=t.get(f);m!==void 0&&(t.delete(f),m.dispose())}function p(h){let f=h.target;f.removeEventListener("dispose",p);let m=e.get(f);m!==void 0&&(e.delete(f),m.dispose())}function g(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:g}}function qp(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let s=e(n);return s===null&&rs("WebGLRenderer: "+n+" extension not supported."),s}}}function Yp(i,t,e,n){let s={},r=new WeakMap,a=new FinalizationRegistry(m=>delete s[m]);function o(m){c(m.target)}function c(m){m.index!==null&&t.remove(m.index);for(let d in m.attributes)t.remove(m.attributes[d]);m.removeEventListener("dispose",o),delete s[m.id],a.unregister(m);let _=r.get(m);_&&(t.remove(_),r.delete(m)),n.releaseStatesOfGeometry(m),m.isInstancedBufferGeometry===!0&&delete m._maxInstanceCount,e.memory.geometries--}function l(m,_){return s[_.id]!==void 0||(_.addEventListener("dispose",o),s[_.id]=new WeakRef(_),a.register(_,_.id,_),e.memory.geometries++),_}function p(m){let _=m.attributes;for(let d in _)t.update(_[d],i.ARRAY_BUFFER)}function g(m){let _=m.index,d=m.attributes.position,u=0;if(d===void 0)return;let x=_!==null?_.array.length:d.array.length/3-1,M=d.count>=65535?ms:ps,b=new M(Math.ceil(x/3)*6,1),A=b.array;if(_!==null){let v=_.array;u=_.version;for(let E=0,F=0;E<x;E+=3){let L=v[E+0],C=v[E+1],N=v[E+2];A[F++]=L,A[F++]=C,A[F++]=C,A[F++]=N,A[F++]=N,A[F++]=L}}else{u=d.version;for(let v=0,E=0;v<x;v+=3){let F=v+0,L=v+1,C=v+2;A[E++]=F,A[E++]=L,A[E++]=L,A[E++]=C,A[E++]=C,A[E++]=F}}b.version=u;let T=r.get(m);T&&t.remove(T),r.set(m,b)}function h(m){let _=r.get(m);if(_){let d=m.index;d!==null&&_.version<d.version&&g(m)}else g(m);return r.get(m)}function f(){for(let m in s){let _=s[m].deref();_!==void 0&&c(_)}}return{get:l,update:p,getWireframeAttribute:h,dispose:f}}function Zp(i,t,e){let n;function s(g){n=g}let r,a;function o(g){r=g.type,a=g.bytesPerElement}function c(g,h){i.drawElements(n,h,r,g*a),e.update(h,n,1)}function l(g,h,f){f!==0&&(i.drawElementsInstanced(n,h,r,g*a,f),e.update(h,n,f))}function p(g,h,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,h,0,r,g,0,f);let _=0;for(let d=0;d<f;d++)_+=h[d];e.update(_,n,1)}this.setMode=s,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=p}function $p(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(r/3);break;case i.LINES:e.lines+=o*(r/2);break;case i.LINE_STRIP:e.lines+=o*(r-1);break;case i.LINE_LOOP:e.lines+=o*r;break;case i.POINTS:e.points+=o*r;break;default:Pt("WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function Jp(i,t,e){let n=new WeakMap,s=new re;function r(a,o,c){let l=a.morphTargetInfluences,p=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,g=p!==void 0?p.length:0,h=n.get(o);if(h===void 0||h.count!==g){let F=function(){v.dispose(),n.delete(o),o.removeEventListener("dispose",F)};h!==void 0&&h.texture.dispose();let f=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,d=o.morphAttributes.position||[],u=o.morphAttributes.normal||[],x=o.morphAttributes.color||[],M=0;f===!0&&(M=1),m===!0&&(M=2),_===!0&&(M=3);let b=o.attributes.position.count*M,A=1;b>t.maxTextureSize&&(A=Math.ceil(b/t.maxTextureSize),b=t.maxTextureSize);let T=new Float32Array(b*A*4*g),v=new us(T,b,A,g);v.type=dn,v.needsUpdate=!0;let E=M*4;for(let L=0;L<g;L++){let C=d[L],N=u[L],V=x[L],P=b*A*4*L;for(let G=0;G<C.count;G++){let X=G*E;f===!0&&(s.fromBufferAttribute(C,G),T[P+X+0]=s.x,T[P+X+1]=s.y,T[P+X+2]=s.z,T[P+X+3]=0),m===!0&&(s.fromBufferAttribute(N,G),T[P+X+4]=s.x,T[P+X+5]=s.y,T[P+X+6]=s.z,T[P+X+7]=0),_===!0&&(s.fromBufferAttribute(V,G),T[P+X+8]=s.x,T[P+X+9]=s.y,T[P+X+10]=s.z,T[P+X+11]=V.itemSize===4?s.w:1)}}h={count:g,texture:v,size:new It(b,A)},n.set(o,h),o.addEventListener("dispose",F)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let f=0;for(let _=0;_<l.length;_++)f+=l[_];let m=o.morphTargetsRelative?1:1-f;c.getUniforms().setValue(i,"morphTargetBaseInfluence",m),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",h.texture,e),c.getUniforms().setValue(i,"morphTargetsTextureSize",h.size)}return{update:r}}function Kp(i,t,e,n,s){let r=new WeakMap;function a(l){let p=s.render.frame,g=l.geometry,h=t.get(l,g);if(r.get(h)!==p&&(t.update(h),r.set(h,p)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),r.get(l)!==p&&(e.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,i.ARRAY_BUFFER),r.set(l,p))),l.isSkinnedMesh){let f=l.skeleton;r.get(f)!==p&&(f.update(),r.set(f,p))}return h}function o(){r=new WeakMap}function c(l){let p=l.target;p.removeEventListener("dispose",c),n.releaseStatesOfObject(p),e.remove(p.instanceMatrix),p.instanceColor!==null&&e.remove(p.instanceColor)}return{update:a,dispose:o}}var jp={[Bo]:"LINEAR_TONE_MAPPING",[zo]:"REINHARD_TONE_MAPPING",[ko]:"CINEON_TONE_MAPPING",[Go]:"ACES_FILMIC_TONE_MAPPING",[Ho]:"AGX_TONE_MAPPING",[Wo]:"NEUTRAL_TONE_MAPPING",[Vo]:"CUSTOM_TONE_MAPPING"};function Qp(i,t,e,n,s,r){let a=new Ze(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,c=null,l=null,p=new $e;p.setAttribute("position",new Ee([-1,3,0,-1,-1,0,3,-1,0],3)),p.setAttribute("uv",new Ee([0,2,0,0,2,0],2));let g=new Br({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),h=new rn(p,g),f=new Es(-1,1,1,-1,0,1),m=null,_=null,d=!1,u,x=null,M=[],b=!1;this.setSize=function(A,T){a.setSize(A,T),o!==null&&o.setSize(A,T),c!==null&&c.setSize(A,T);for(let v=0;v<M.length;v++){let E=M[v];E.setSize&&E.setSize(A,T)}},this.setEffects=function(A){M=A,b=M.length>0&&M[0].isRenderPass===!0;let T=a.width,v=a.height;M.length>0&&o===null&&(o=new Ze(T,v,{type:fn,depthBuffer:!1,stencilBuffer:!1}),c=new Ze(T,v,{type:fn,depthBuffer:!1,stencilBuffer:!1}));let E=s===!0&&M.some(F=>F.needsDepthTexture===!0);E!==(a.depthTexture!==null)&&(E===!0&&l===null&&(l=new Fn(T,v),r===!0&&(l.format=Bn,l.type=pi)),a.dispose(),a.depthTexture=E?l:null,a.resolveDepthBuffer=E,a.storeMultisampledDepthBuffer=E);for(let F=0;F<M.length;F++){let L=M[F];L.setSize&&L.setSize(T,v),E&&L.needsDepthTexture===!0&&L.setDepthTexture&&L.setDepthTexture(l)}},this.begin=function(A,T){if(d||A.toneMapping===yn&&M.length===0)return!1;if(x=T,T!==null){let v=T.width,E=T.height;(a.width!==v||a.height!==E)&&this.setSize(v,E)}return b===!1&&A.setRenderTarget(a),u=A.toneMapping,A.toneMapping=yn,!0},this.hasRenderPass=function(){return b},this.end=function(A,T){A.toneMapping=u,d=!0;let v=a,E=o;for(let F=0;F<M.length;F++){let L=M[F];L.enabled!==!1&&(L.render(A,E,v,T),L.needsSwap!==!1&&(v=E,E=E===o?c:o))}if(m!==A.outputColorSpace||_!==A.toneMapping){m=A.outputColorSpace,_=A.toneMapping,g.defines={},qt.getTransfer(m)===Jt&&(g.defines.SRGB_TRANSFER="");let F=jp[_];F&&(g.defines[F]=""),g.needsUpdate=!0}g.uniforms.tDiffuse.value=v.texture,A.setRenderTarget(x),A.render(h,f),x=null,d=!1},this.isCompositing=function(){return d},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),c!==null&&c.dispose(),p.dispose(),g.dispose()}}var Lh=new ke,Dh=new Fn(1,1),Nh=new _s(1),Uh=new us,Fh=new Ir,Oh=new gs,uh=[],dh=[],fh=new Float32Array(16),ph=new Float32Array(9),mh=new Float32Array(4);function $i(i,t,e){let n=i[0];if(n<=0||n>0)return i;let s=t*e,r=uh[s];if(r===void 0&&(r=new Float32Array(s),uh[s]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(r,o)}return r}function me(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function ge(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function Ha(i,t){let e=dh[t];e===void 0&&(e=new Int32Array(t),dh[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function tm(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function em(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(me(e,t))return;i.uniform2fv(this.addr,t),ge(e,t)}}function nm(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(me(e,t))return;i.uniform3fv(this.addr,t),ge(e,t)}}function im(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(me(e,t))return;i.uniform4fv(this.addr,t),ge(e,t)}}function sm(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(me(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),ge(e,t)}else{if(me(e,n))return;mh.set(n),i.uniformMatrix2fv(this.addr,!1,mh),ge(e,n)}}function rm(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(me(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),ge(e,t)}else{if(me(e,n))return;ph.set(n),i.uniformMatrix3fv(this.addr,!1,ph),ge(e,n)}}function am(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(me(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),ge(e,t)}else{if(me(e,n))return;fh.set(n),i.uniformMatrix4fv(this.addr,!1,fh),ge(e,n)}}function om(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function lm(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(me(e,t))return;i.uniform2iv(this.addr,t),ge(e,t)}}function cm(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(me(e,t))return;i.uniform3iv(this.addr,t),ge(e,t)}}function hm(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(me(e,t))return;i.uniform4iv(this.addr,t),ge(e,t)}}function um(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function dm(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(me(e,t))return;i.uniform2uiv(this.addr,t),ge(e,t)}}function fm(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(me(e,t))return;i.uniform3uiv(this.addr,t),ge(e,t)}}function pm(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(me(e,t))return;i.uniform4uiv(this.addr,t),ge(e,t)}}function Wa(i){return i.version===0&&(i.compareFunction=el,i.needsUpdate=!0),i}function mm(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?r=Wa(Dh):r=Lh,e.setTexture2D(t||r,s)}function gm(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||Fh,s)}function _m(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_CUBE_SHADOW?r=Wa(Nh):r=Oh,e.setTextureCube(t||r,s)}function xm(i,t,e){let n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||Uh,s)}function vm(i){switch(i){case 5126:return tm;case 35664:return em;case 35665:return nm;case 35666:return im;case 35674:return sm;case 35675:return rm;case 35676:return am;case 5124:case 35670:return om;case 35667:case 35671:return lm;case 35668:case 35672:return cm;case 35669:case 35673:return hm;case 5125:return um;case 36294:return dm;case 36295:return fm;case 36296:return pm;case 35678:case 36198:case 36298:case 36306:case 35682:return mm;case 35679:case 36299:case 36307:return gm;case 35680:case 36300:case 36308:case 36293:return _m;case 36289:case 36303:case 36311:case 36292:return xm}}function ym(i,t){i.uniform1fv(this.addr,t)}function Sm(i,t){let e=$i(t,this.size,2);i.uniform2fv(this.addr,e)}function Mm(i,t){let e=$i(t,this.size,3);i.uniform3fv(this.addr,e)}function bm(i,t){let e=$i(t,this.size,4);i.uniform4fv(this.addr,e)}function Em(i,t){let e=$i(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function wm(i,t){let e=$i(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function Tm(i,t){let e=$i(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function Am(i,t){i.uniform1iv(this.addr,t)}function Rm(i,t){i.uniform2iv(this.addr,t)}function Cm(i,t){i.uniform3iv(this.addr,t)}function Pm(i,t){i.uniform4iv(this.addr,t)}function Im(i,t){i.uniform1uiv(this.addr,t)}function Lm(i,t){i.uniform2uiv(this.addr,t)}function Dm(i,t){i.uniform3uiv(this.addr,t)}function Nm(i,t){i.uniform4uiv(this.addr,t)}function Um(i,t,e){let n=this.cache,s=t.length,r=Ha(e,s);me(n,r)||(i.uniform1iv(this.addr,r),ge(n,r));let a;this.type===i.SAMPLER_2D_SHADOW?a=Wa(Dh):a=Lh;for(let o=0;o!==s;++o)e.setTexture2D(t[o]||a,r[o])}function Fm(i,t,e){let n=this.cache,s=t.length,r=Ha(e,s);me(n,r)||(i.uniform1iv(this.addr,r),ge(n,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||Fh,r[a])}function Om(i,t,e){let n=this.cache,s=t.length,r=Ha(e,s);me(n,r)||(i.uniform1iv(this.addr,r),ge(n,r));let a;this.type===i.SAMPLER_CUBE_SHADOW?a=Wa(Nh):a=Oh;for(let o=0;o!==s;++o)e.setTextureCube(t[o]||a,r[o])}function Bm(i,t,e){let n=this.cache,s=t.length,r=Ha(e,s);me(n,r)||(i.uniform1iv(this.addr,r),ge(n,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||Uh,r[a])}function zm(i){switch(i){case 5126:return ym;case 35664:return Sm;case 35665:return Mm;case 35666:return bm;case 35674:return Em;case 35675:return wm;case 35676:return Tm;case 5124:case 35670:return Am;case 35667:case 35671:return Rm;case 35668:case 35672:return Cm;case 35669:case 35673:return Pm;case 5125:return Im;case 36294:return Lm;case 36295:return Dm;case 36296:return Nm;case 35678:case 36198:case 36298:case 36306:case 35682:return Um;case 35679:case 36299:case 36307:return Fm;case 35680:case 36300:case 36308:case 36293:return Om;case 36289:case 36303:case 36311:case 36292:return Bm}}var fl=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=vm(e.type)}},pl=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=zm(e.type)}},ml=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(t,e[o.id],n)}}},ul=/(\w+)(\])?(\[|\.)?/g;function gh(i,t){i.seq.push(t),i.map[t.id]=t}function km(i,t,e){let n=i.name,s=n.length;for(ul.lastIndex=0;;){let r=ul.exec(n),a=ul.lastIndex,o=r[1],c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===s){gh(e,l===void 0?new fl(o,i,t):new pl(o,i,t));break}else{let g=e.map[o];g===void 0&&(g=new ml(o),gh(e,g)),e=g}}}var Zi=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=t.getActiveUniform(e,a),c=t.getUniformLocation(e,o.name);km(o,c,this)}let s=[],r=[];for(let a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){let r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){let s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,a=e.length;r!==a;++r){let o=e[r],c=n[o.id];c.needsUpdate!==!1&&o.setValue(t,c.value,s)}}static seqWithValue(t,e){let n=[];for(let s=0,r=t.length;s!==r;++s){let a=t[s];a.id in e&&n.push(a)}return n}};function _h(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var Gm=37297,Vm=0;function Hm(i,t){let e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}var xh=new Dt;function Wm(i){qt._getMatrix(xh,qt.workingColorSpace,i);let t=`mat3( ${xh.elements.map(e=>e.toFixed(4))} )`;switch(qt.getTransfer(i)){case cs:return[t,"LinearTransferOETF"];case Jt:return[t,"sRGBTransferOETF"];default:return Rt("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function vh(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+Hm(i.getShaderSource(t),o)}else return r}function Xm(i,t){let e=Wm(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( ${e[0]} * value.rgb, value.a ) );`,"}"].join(`
`)}var qm={[Bo]:"Linear",[zo]:"Reinhard",[ko]:"Cineon",[Go]:"ACESFilmic",[Ho]:"AgX",[Wo]:"Neutral",[Vo]:"Custom"};function Ym(i,t){let e=qm[t];return e===void 0?(Rt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var ka=new U;function Zm(){qt.getLuminanceCoefficients(ka);let i=ka.x.toFixed(4),t=ka.y.toFixed(4),e=ka.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function $m(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Bs).join(`
`)}function Jm(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Km(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(t,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function Bs(i){return i!==""}function yh(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function Sh(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var jm=/^[ \t]*#include +<([\w\d./]+)>/gm;function gl(i){return i.replace(jm,Qm)}function Qm(i,t){let e=Gt[t];if(e===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">");return gl(e)}var tg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Mh(i){return i.replace(tg,eg)}function eg(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function bh(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var ng={[Rs]:"SHADOWMAP_TYPE_PCF",[Hi]:"SHADOWMAP_TYPE_VSM"};function ig(i){return ng[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var sg={[Xi]:"ENVMAP_MODE_REFRACTION"};function rg(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":sg[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var ag={[Oo]:"ENVMAP_BLENDING_MULTIPLY",[zc]:"ENVMAP_BLENDING_MIX",[kc]:"ENVMAP_BLENDING_ADD"};function og(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":ag[i.combine]||"ENVMAP_BLENDING_NONE"}function lg(i,t,e,n){let s=i.getContext(),r=e.defines,a=e.vertexShader,o=e.fragmentShader,c=ig(e),l=e.envMapPMREM===!0?"ENVMAP_TYPE_PMREM":"ENVMAP_TYPE_CUBE",p=rg(e),g=og(e),h=$m(e),f=Jm(r),m=s.createProgram(),_,d,u=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(_=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f].filter(Bs).join(`
`),_.length>0&&(_+=`
`),d=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f].filter(Bs).join(`
`),d.length>0&&(d+=`
`)):(_=[bh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+p:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.diffuseRoughnessMapUv?"#define DIFFUSE_ROUGHNESSMAP_UV "+e.diffuseRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Bs).join(`
`),d=[bh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+p:"",e.envMap?"#define "+g:"",e.envMapPMREM?"#define ENVMAP_MAX_LOD "+e.envMapMaxLod+".0":"",e.envMapPMREM?"#define ENVMAP_SIZE "+e.envMapSize+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.diffuseRoughness?"#define USE_DIFFUSE_ROUGHNESS":"",e.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==yn?"#define TONE_MAPPING":"",e.toneMapping!==yn?Gt.tonemapping_pars_fragment:"",e.toneMapping!==yn?Ym("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Gt.colorspace_pars_fragment,Xm("linearToOutputTexel",e.outputColorSpace),Zm(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Bs).join(`
`)),a=gl(a),a=yh(a,e),a=Sh(a,e),o=gl(o),o=yh(o,e),o=Sh(o,e),a=Mh(a),o=Mh(o),e.isRawShaderMaterial!==!0&&(u=`#version 300 es
`,_=[h,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+_,d=["#define varying in",e.glslVersion===nl?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===nl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+d);let x=u+_+a,M=u+d+o,b=_h(s,s.VERTEX_SHADER,x),A=_h(s,s.FRAGMENT_SHADER,M);s.attachShader(m,b),s.attachShader(m,A),e.index0AttributeName!==void 0?s.bindAttribLocation(m,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(m,0,"position"),s.linkProgram(m);function T(L){if(i.debug.checkShaderErrors){let C=s.getProgramInfoLog(m)||"",N=s.getShaderInfoLog(b)||"",V=s.getShaderInfoLog(A)||"",P=C.trim(),G=N.trim(),X=V.trim(),k=!0,tt=!0;if(s.getProgramParameter(m,s.LINK_STATUS)===!1)if(k=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,m,b,A);else{let q=vh(s,b,"vertex"),H=vh(s,A,"fragment");Pt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(m,s.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+P+`
`+q+`
`+H)}else P!==""?Rt("WebGLProgram: Program Info Log:",P):(G===""||X==="")&&(tt=!1);tt&&(L.diagnostics={runnable:k,programLog:P,vertexShader:{log:G,prefix:_},fragmentShader:{log:X,prefix:d}})}s.deleteShader(b),s.deleteShader(A),v=new Zi(s,m),E=Km(s,m)}let v;this.getUniforms=function(){return v===void 0&&T(this),v};let E;this.getAttributes=function(){return E===void 0&&T(this),E};let F=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return F===!1&&(F=s.getProgramParameter(m,Gm)),F},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(m),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Vm++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=b,this.fragmentShader=A,this}var cg=0,_l=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new xl(t),e.set(t,n)),n}},xl=class{constructor(t){this.id=cg++,this.code=t,this.usedTimes=0}};function hg(i){return i===ti||i===Ns||i===Us}function ug(i,t,e,n,s,r){let a=new ds,o=new _l,c=new Set,l=[],p=new Map,g=n.logarithmicDepthBuffer,h={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function f(v){return c.add(v),v===0?"uv":`uv${v}`}function m(v,E,F,L,C,N){let V=L.fog,P=C.geometry,G=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?L.environment:null,X=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,k=t.get(v.envMap||G,X),tt=h[v.type],q=n.precision;v.precision!==null&&(q=n.getMaxPrecision(v.precision),q!==v.precision&&Rt("WebGLProgram.getParameters:",v.precision,"not supported, using",q,"instead."));let H=P.morphAttributes.position||P.morphAttributes.normal||P.morphAttributes.color,Y=H!==void 0?H.length:0,st=0;P.morphAttributes.position!==void 0&&(st=1),P.morphAttributes.normal!==void 0&&(st=2),P.morphAttributes.color!==void 0&&(st=3);let Tt,$,dt,pt;if(tt){let gt=Mn[tt];Tt=gt.vertexShader,$=gt.fragmentShader}else{Tt=v.vertexShader,$=v.fragmentShader;let gt=o.getVertexShaderStage(v),Kt=o.getFragmentShaderStage(v);o.update(v,gt,Kt),dt=gt.id,pt=Kt.id}let yt=i.getRenderTarget(),ft=i.state.buffers.depth.getReversed(),Lt=C.isInstancedMesh===!0,te=C.isBatchedMesh===!0,wt=!!v.map,Ut=!!v.matcap,Vt=!!k,Bt=Vt&&k.isPMREMTexture===!0,de=!!v.aoMap,fe=!!v.lightMap,Fe=!!v.bumpMap&&v.wireframe===!1,ae=!!v.normalMap,mn=!!v.displacementMap,xe=!!v.emissiveMap,je=!!v.metalnessMap,Qe=!!v.roughnessMap,tn=v.anisotropy>0,D=v.clearcoat>0,en=v.diffuseRoughness>0,ie=v.dispersion>0,se=v.retroreflectivity>0,mt=v.iridescence>0,pe=v.sheen>0,Ct=v.transmission>0,Nt=tn&&!!v.anisotropyMap,w=D&&!!v.clearcoatMap,y=D&&!!v.clearcoatNormalMap,B=D&&!!v.clearcoatRoughnessMap,et=en&&!!v.diffuseRoughnessMap,Q=mt&&!!v.iridescenceMap,rt=mt&&!!v.iridescenceThicknessMap,ht=pe&&!!v.sheenColorMap,J=pe&&!!v.sheenRoughnessMap,K=!!v.specularMap,ot=!!v.specularColorMap,R=!!v.specularIntensityMap,j=Ct&&!!v.transmissionMap,Z=Ct&&!!v.thicknessMap,lt=!!v.gradientMap,it=!!v.alphaMap,at=v.alphaTest>0,Et=!!v.alphaHash,kt=!!v.extensions,nt=yn;v.toneMapped&&(yt===null||yt.isXRRenderTarget===!0)&&(nt=i.toneMapping);let At=Bt?k.isCompressedCubeTexture?k.image[0].mipmaps:k.mipmaps:null,zt={shaderID:tt,shaderType:v.type,shaderName:v.name,vertexShader:Tt,fragmentShader:$,defines:v.defines,customVertexShaderID:dt,customFragmentShaderID:pt,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:q,batching:te,batchingColor:te&&C._colorsTexture!==null,instancing:Lt,instancingColor:Lt&&C.instanceColor!==null,instancingMorph:Lt&&C.morphTexture!==null,outputColorSpace:yt===null?i.outputColorSpace:yt.isXRRenderTarget===!0?yt.texture.colorSpace:qt.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:wt,matcap:Ut,envMap:Vt,envMapMode:Vt&&k.mapping,envMapPMREM:Bt,envMapMaxLod:Bt?At.length-1:null,envMapSize:Bt?At[0].width:null,aoMap:de,lightMap:fe,bumpMap:Fe,normalMap:ae,displacementMap:mn,emissiveMap:xe,normalMapObjectSpace:ae&&v.normalMapType===Hc,normalMapTangentSpace:ae&&v.normalMapType===Ba,packedNormalMap:ae&&v.normalMapType===Ba&&hg(v.normalMap.format),metalnessMap:je,roughnessMap:Qe,anisotropy:tn,anisotropyMap:Nt,clearcoat:D,clearcoatMap:w,clearcoatNormalMap:y,clearcoatRoughnessMap:B,diffuseRoughness:en,diffuseRoughnessMap:et,dispersion:ie,retroreflection:se,iridescence:mt,iridescenceMap:Q,iridescenceThicknessMap:rt,sheen:pe,sheenColorMap:ht,sheenRoughnessMap:J,specularMap:K,specularColorMap:ot,specularIntensityMap:R,transmission:Ct,transmissionMap:j,thicknessMap:Z,gradientMap:lt,opaque:v.transparent===!1&&v.blending===Wi&&v.alphaToCoverage===!1,alphaMap:it,alphaTest:at,alphaHash:Et,combine:v.combine,mapUv:wt&&f(v.map.channel),aoMapUv:de&&f(v.aoMap.channel),lightMapUv:fe&&f(v.lightMap.channel),bumpMapUv:Fe&&f(v.bumpMap.channel),normalMapUv:ae&&f(v.normalMap.channel),displacementMapUv:mn&&f(v.displacementMap.channel),emissiveMapUv:xe&&f(v.emissiveMap.channel),metalnessMapUv:je&&f(v.metalnessMap.channel),roughnessMapUv:Qe&&f(v.roughnessMap.channel),anisotropyMapUv:Nt&&f(v.anisotropyMap.channel),clearcoatMapUv:w&&f(v.clearcoatMap.channel),clearcoatNormalMapUv:y&&f(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:B&&f(v.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:et&&f(v.diffuseRoughnessMap.channel),iridescenceMapUv:Q&&f(v.iridescenceMap.channel),iridescenceThicknessMapUv:rt&&f(v.iridescenceThicknessMap.channel),sheenColorMapUv:ht&&f(v.sheenColorMap.channel),sheenRoughnessMapUv:J&&f(v.sheenRoughnessMap.channel),specularMapUv:K&&f(v.specularMap.channel),specularColorMapUv:ot&&f(v.specularColorMap.channel),specularIntensityMapUv:R&&f(v.specularIntensityMap.channel),transmissionMapUv:j&&f(v.transmissionMap.channel),thicknessMapUv:Z&&f(v.thicknessMap.channel),alphaMapUv:it&&f(v.alphaMap.channel),vertexTangents:!!P.attributes.tangent&&(ae||tn),vertexNormals:!!P.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!P.attributes.color&&P.attributes.color.itemSize===4,pointsUvs:C.isPoints===!0&&!!P.attributes.uv&&(wt||it),fog:!!V,useFog:v.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||P.attributes.normal===void 0&&ae===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:g,reversedDepthBuffer:ft,skinning:C.isSkinnedMesh===!0,hasPositionAttribute:P.attributes.position!==void 0,morphTargets:P.morphAttributes.position!==void 0,morphNormals:P.morphAttributes.normal!==void 0,morphColors:P.morphAttributes.color!==void 0,morphTargetsCount:Y,morphTextureStride:st,numSunLights:E.sun.length,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numSunLightShadows:E.sunShadowMap.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numLightProbeGrids:N.filter(gt=>gt.texture!==null).length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&F.length>0,shadowMapType:i.shadowMap.type,toneMapping:nt,decodeVideoTexture:wt&&v.map.isVideoTexture===!0&&qt.getTransfer(v.map.colorSpace)===Jt,decodeVideoTextureEmissive:xe&&v.emissiveMap.isVideoTexture===!0&&qt.getTransfer(v.emissiveMap.colorSpace)===Jt,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===Ke,flipSided:v.side===Ue,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:kt&&v.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(kt&&v.extensions.multiDraw===!0||te)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return zt.vertexUv1s=c.has(1),zt.vertexUv2s=c.has(2),zt.vertexUv3s=c.has(3),c.clear(),zt}function _(v){let E=[];if(v.shaderID?E.push(v.shaderID):(E.push(v.customVertexShaderID),E.push(v.customFragmentShaderID)),v.defines!==void 0)for(let F in v.defines)E.push(F),E.push(v.defines[F]);return v.isRawShaderMaterial===!1&&(d(E,v),u(E,v),E.push(i.outputColorSpace)),E.push(v.customProgramCacheKey),E.join()}function d(v,E){v.push(E.precision),v.push(E.outputColorSpace),v.push(E.envMapMode),v.push(E.envMapPMREM),v.push(E.envMapMaxLod),v.push(E.envMapSize),v.push(E.mapUv),v.push(E.alphaMapUv),v.push(E.lightMapUv),v.push(E.aoMapUv),v.push(E.bumpMapUv),v.push(E.normalMapUv),v.push(E.displacementMapUv),v.push(E.emissiveMapUv),v.push(E.metalnessMapUv),v.push(E.roughnessMapUv),v.push(E.anisotropyMapUv),v.push(E.clearcoatMapUv),v.push(E.clearcoatNormalMapUv),v.push(E.clearcoatRoughnessMapUv),v.push(E.diffuseRoughnessMapUv),v.push(E.iridescenceMapUv),v.push(E.iridescenceThicknessMapUv),v.push(E.sheenColorMapUv),v.push(E.sheenRoughnessMapUv),v.push(E.specularMapUv),v.push(E.specularColorMapUv),v.push(E.specularIntensityMapUv),v.push(E.transmissionMapUv),v.push(E.thicknessMapUv),v.push(E.combine),v.push(E.fogExp2),v.push(E.sizeAttenuation),v.push(E.morphTargetsCount),v.push(E.numSunLights),v.push(E.numDirLights),v.push(E.numPointLights),v.push(E.numSpotLights),v.push(E.numSpotLightMaps),v.push(E.numHemiLights),v.push(E.numRectAreaLights),v.push(E.numSunLightShadows),v.push(E.numDirLightShadows),v.push(E.numPointLightShadows),v.push(E.numSpotLightShadows),v.push(E.numSpotLightShadowsWithMaps),v.push(E.numLightProbes),v.push(E.numLightProbeGrids),v.push(E.shadowMapType),v.push(E.toneMapping),v.push(E.numClippingPlanes),v.push(E.numClipIntersection),v.push(E.depthPacking)}function u(v,E){a.disableAll(),E.instancing&&a.enable(0),E.instancingColor&&a.enable(1),E.instancingMorph&&a.enable(2),E.matcap&&a.enable(3),E.envMap&&a.enable(4),E.normalMapObjectSpace&&a.enable(5),E.normalMapTangentSpace&&a.enable(6),E.clearcoat&&a.enable(7),E.iridescence&&a.enable(8),E.alphaTest&&a.enable(9),E.vertexColors&&a.enable(10),E.vertexAlphas&&a.enable(11),E.vertexUv1s&&a.enable(12),E.vertexUv2s&&a.enable(13),E.vertexUv3s&&a.enable(14),E.vertexTangents&&a.enable(15),E.anisotropy&&a.enable(16),E.alphaHash&&a.enable(17),E.batching&&a.enable(18),E.dispersion&&a.enable(19),E.retroreflection&&a.enable(24),E.diffuseRoughness&&a.enable(25),E.batchingColor&&a.enable(20),E.gradientMap&&a.enable(21),E.packedNormalMap&&a.enable(22),E.vertexNormals&&a.enable(23),v.push(a.mask),a.disableAll(),E.fog&&a.enable(0),E.useFog&&a.enable(1),E.flatShading&&a.enable(2),E.logarithmicDepthBuffer&&a.enable(3),E.reversedDepthBuffer&&a.enable(4),E.skinning&&a.enable(5),E.morphTargets&&a.enable(6),E.morphNormals&&a.enable(7),E.morphColors&&a.enable(8),E.premultipliedAlpha&&a.enable(9),E.shadowMapEnabled&&a.enable(10),E.doubleSided&&a.enable(11),E.flipSided&&a.enable(12),E.useDepthPacking&&a.enable(13),E.dithering&&a.enable(14),E.transmission&&a.enable(15),E.sheen&&a.enable(16),E.opaque&&a.enable(17),E.pointsUvs&&a.enable(18),E.decodeVideoTexture&&a.enable(19),E.decodeVideoTextureEmissive&&a.enable(20),E.alphaToCoverage&&a.enable(21),E.numLightProbeGrids>0&&a.enable(22),E.hasPositionAttribute&&a.enable(23),v.push(a.mask)}function x(v){let E=h[v.type],F;if(E){let L=Mn[E];F=sh.clone(L.uniforms)}else F=v.uniforms;return F}function M(v,E){let F=p.get(E);return F!==void 0?++F.usedTimes:(F=new lg(i,E,v,s),l.push(F),p.set(E,F)),F}function b(v){if(--v.usedTimes===0){let E=l.indexOf(v);l[E]=l[l.length-1],l.pop(),p.delete(v.cacheKey),v.destroy()}}function A(v){o.remove(v)}function T(){o.dispose()}return{getParameters:m,getProgramCacheKey:_,getUniforms:x,acquireProgram:M,releaseProgram:b,releaseShaderCache:A,programs:l,dispose:T}}function dg(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,c){i.get(a)[o]=c}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function fg(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function Eh(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function wh(){let i=[],t=0,e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function a(h){let f=0;return h.isInstancedMesh&&(f+=2),h.isSkinnedMesh&&(f+=1),f}function o(h,f,m,_,d,u){let x=i[t];return x===void 0?(x={id:h.id,object:h,geometry:f,material:m,materialVariant:a(h),groupOrder:_,renderOrder:h.renderOrder,z:d,group:u},i[t]=x):(x.id=h.id,x.object=h,x.geometry=f,x.material=m,x.materialVariant=a(h),x.groupOrder=_,x.renderOrder=h.renderOrder,x.z=d,x.group=u),t++,x}function c(h,f,m,_,d,u,x){x.reversedDepth===!0&&(d=-d);let M=o(h,f,m,_,d,u);m.transmission>0?n.push(M):m.transparent===!0?s.push(M):e.push(M)}function l(h,f,m,_,d,u){let x=o(h,f,m,_,d,u);m.transmission>0?n.unshift(x):m.transparent===!0?s.unshift(x):e.unshift(x)}function p(h,f){e.length>1&&e.sort(h||fg),n.length>1&&n.sort(f||Eh),s.length>1&&s.sort(f||Eh)}function g(){for(let h=t,f=i.length;h<f;h++){let m=i[h];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:c,unshift:l,finish:g,sort:p}}function pg(){let i=new WeakMap;function t(n,s){let r=i.get(n),a;return r===void 0?(a=new wh,i.set(n,[a])):s>=r.length?(a=new wh,r.push(a)):a=r[s],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function mg(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new U,color:new Ot};break;case"SpotLight":e={position:new U,direction:new U,color:new Ot,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new U,color:new Ot,distance:0,decay:0};break;case"HemisphereLight":e={direction:new U,skyColor:new Ot,groundColor:new Ot};break;case"RectAreaLight":e={color:new Ot,position:new U,halfWidth:new U,halfHeight:new U};break}return i[t.id]=e,e}}}function gg(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new It};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new It};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new It,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var _g=0;function xg(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function vg(i){let t=new mg,e=gg(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new U);let s=new U,r=new Qt,a=new Qt;function o(l){let p=0,g=0,h=0;for(let N=0;N<9;N++)n.probe[N].set(0,0,0);let f=0,m=0,_=0,d=0,u=0,x=0,M=0,b=0,A=0,T=0,v=0,E=0,F=0,L=0;l.sort(xg);for(let N=0,V=l.length;N<V;N++){let P=l[N],G=P.color,X=P.intensity,k=P.distance,tt=null;if(P.shadow&&P.shadow.map&&(P.shadow.map.texture.format===ti?tt=P.shadow.map.texture:tt=P.shadow.map.depthTexture||P.shadow.map.texture),P.isAmbientLight)p+=G.r*X,g+=G.g*X,h+=G.b*X;else if(P.isLightProbe){for(let q=0;q<9;q++)n.probe[q].addScaledVector(P.sh.coefficients[q],X);L++}else if(P.isSunLight){let q=t.get(P);if(q.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let H=P.shadow,Y=e.get(P);Y.shadowIntensity=H.intensity,Y.shadowBias=H.bias,Y.shadowNormalBias=H.normalBias,Y.shadowRadius=H.radius,Y.shadowMapSize.copy(H.mapSize).multiply(H.getFrameExtents()),n.sunShadow[m]=Y,n.sunShadowMap[m]=tt;let st=H.getViewportCount();for(let Tt=0;Tt<st;Tt++)n.sunShadowMatrix[_+Tt]=H.getMatrix(Tt),n.sunShadowCascade[_+Tt]=H._cascadeData[Tt];_+=st,m++}n.sun[f]=q,f++}else if(P.isDirectionalLight){let q=t.get(P);if(q.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let H=P.shadow,Y=e.get(P);Y.shadowIntensity=H.intensity,Y.shadowBias=H.bias,Y.shadowNormalBias=H.normalBias,Y.shadowRadius=H.radius,Y.shadowMapSize=H.mapSize,n.directionalShadow[d]=Y,n.directionalShadowMap[d]=tt,n.directionalShadowMatrix[d]=P.shadow.matrix,A++}n.directional[d]=q,d++}else if(P.isSpotLight){let q=t.get(P);q.position.setFromMatrixPosition(P.matrixWorld),q.color.copy(G).multiplyScalar(X),q.distance=k,q.coneCos=Math.cos(P.angle),q.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),q.decay=P.decay,n.spot[x]=q;let H=P.shadow;if(P.map&&(n.spotLightMap[E]=P.map,E++,H.updateMatrices(P),P.castShadow&&F++),n.spotLightMatrix[x]=H.matrix,P.castShadow){let Y=e.get(P);Y.shadowIntensity=H.intensity,Y.shadowBias=H.bias,Y.shadowNormalBias=H.normalBias,Y.shadowRadius=H.radius,Y.shadowMapSize=H.mapSize,n.spotShadow[x]=Y,n.spotShadowMap[x]=tt,v++}x++}else if(P.isRectAreaLight){let q=t.get(P);q.color.copy(G).multiplyScalar(X),q.halfWidth.set(P.width*.5,0,0),q.halfHeight.set(0,P.height*.5,0),n.rectArea[M]=q,M++}else if(P.isPointLight){let q=t.get(P);if(q.color.copy(P.color).multiplyScalar(P.intensity),q.distance=P.distance,q.decay=P.decay,P.castShadow){let H=P.shadow,Y=e.get(P);Y.shadowIntensity=H.intensity,Y.shadowBias=H.bias,Y.shadowNormalBias=H.normalBias,Y.shadowRadius=H.radius,Y.shadowMapSize=H.mapSize,Y.shadowCameraNear=H.camera.near,Y.shadowCameraFar=H.camera.far,n.pointShadow[u]=Y,n.pointShadowMap[u]=tt,n.pointShadowMatrix[u]=P.shadow.matrix,T++}n.point[u]=q,u++}else if(P.isHemisphereLight){let q=t.get(P);q.skyColor.copy(P.color).multiplyScalar(X),q.groundColor.copy(P.groundColor).multiplyScalar(X),n.hemi[b]=q,b++}}M>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=_t.LTC_FLOAT_1,n.rectAreaLTC2=_t.LTC_FLOAT_2):(n.rectAreaLTC1=_t.LTC_HALF_1,n.rectAreaLTC2=_t.LTC_HALF_2)),n.ambient[0]=p,n.ambient[1]=g,n.ambient[2]=h;let C=n.hash;(C.sunLength!==f||C.directionalLength!==d||C.pointLength!==u||C.spotLength!==x||C.rectAreaLength!==M||C.hemiLength!==b||C.numSunShadows!==m||C.numDirectionalShadows!==A||C.numPointShadows!==T||C.numSpotShadows!==v||C.numSpotMaps!==E||C.numLightProbes!==L)&&(n.sun.length=f,n.directional.length=d,n.spot.length=x,n.rectArea.length=M,n.point.length=u,n.hemi.length=b,n.sunShadow.length=m,n.sunShadowMap.length=m,n.sunShadowMatrix.length=_,n.sunShadowCascade.length=_,n.directionalShadow.length=A,n.directionalShadowMap.length=A,n.directionalShadowMatrix.length=A,n.pointShadow.length=T,n.pointShadowMap.length=T,n.pointShadowMatrix.length=T,n.spotShadow.length=v,n.spotShadowMap.length=v,n.spotLightMatrix.length=v+E-F,n.spotLightMap.length=E,n.numSpotLightShadowsWithMaps=F,n.numLightProbes=L,C.sunLength=f,C.directionalLength=d,C.pointLength=u,C.spotLength=x,C.rectAreaLength=M,C.hemiLength=b,C.numSunShadows=m,C.numDirectionalShadows=A,C.numPointShadows=T,C.numSpotShadows=v,C.numSpotMaps=E,C.numLightProbes=L,n.version=_g++)}function c(l,p){let g=0,h=0,f=0,m=0,_=0,d=0,u=p.matrixWorldInverse;for(let x=0,M=l.length;x<M;x++){let b=l[x];if(b.isSunLight){let A=n.sun[g];A.direction.setFromMatrixPosition(b.matrixWorld),A.direction.transformDirection(u),g++}else if(b.isDirectionalLight){let A=n.directional[h];A.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),A.direction.sub(s),A.direction.transformDirection(u),h++}else if(b.isSpotLight){let A=n.spot[m];A.position.setFromMatrixPosition(b.matrixWorld),A.position.applyMatrix4(u),A.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),A.direction.sub(s),A.direction.transformDirection(u),m++}else if(b.isRectAreaLight){let A=n.rectArea[_];A.position.setFromMatrixPosition(b.matrixWorld),A.position.applyMatrix4(u),a.identity(),r.copy(b.matrixWorld),r.premultiply(u),a.extractRotation(r),A.halfWidth.set(b.width*.5,0,0),A.halfHeight.set(0,b.height*.5,0),A.halfWidth.applyMatrix4(a),A.halfHeight.applyMatrix4(a),_++}else if(b.isPointLight){let A=n.point[f];A.position.setFromMatrixPosition(b.matrixWorld),A.position.applyMatrix4(u),f++}else if(b.isHemisphereLight){let A=n.hemi[d];A.direction.setFromMatrixPosition(b.matrixWorld),A.direction.transformDirection(u),d++}}}return{setup:o,setupView:c,state:n}}function Th(i){let t=new vg(i),e=[],n=[],s=[];function r(g){p.camera=g,e.length=0,n.length=0,s.length=0}function a(g){g.isLightProbeGrid?s.push(g):e.push(g)}function o(g){n.push(g)}function c(){t.setup(e),s.sort((g,h)=>g.priority-h.priority||g.id-h.id)}function l(g){t.setupView(e,g)}let p={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:p,setupLights:c,setupLightsView:l,pushLight:a,pushShadow:o}}function yg(i){let t=new WeakMap;function e(s,r=0){let a=t.get(s),o;return a===void 0?(o=new Th(i),t.set(s,[o])):r>=a.length?(o=new Th(i),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}var Sg=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Mg=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,bg=[new U(1,0,0),new U(-1,0,0),new U(0,1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1)],Eg=[new U(0,-1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1),new U(0,-1,0),new U(0,-1,0)],Ah=new Qt,Os=new U,dl=new U;function wg(i,t,e){let n=new Yn,s=new It,r=new It,a=new re,o=new zr,c=new kr,l={},p=e.maxTextureSize,g={[Qn]:Ue,[Ue]:Qn,[Ke]:Ke},h=new vn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new It},radius:{value:4}},vertexShader:Sg,fragmentShader:Mg}),f=h.clone();f.defines.HORIZONTAL_PASS=1;let m=new $e;m.setAttribute("position",new ze(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new rn(m,h),d=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Rs;let u=this.type;this.render=function(T,v,E){if(d.enabled===!1||d.autoUpdate===!1&&d.needsUpdate===!1||T.length===0)return;this.type===yc&&(Rt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Rs);let F=i.getRenderTarget(),L=i.getActiveCubeFace(),C=i.getActiveMipmapLevel(),N=i.state;N.setBlending(ui),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);let V=u!==this.type;V&&v.traverse(function(P){P.material&&(Array.isArray(P.material)?P.material.forEach(G=>G.needsUpdate=!0):P.material.needsUpdate=!0)});for(let P=0,G=T.length;P<G;P++){let X=T[P],k=X.shadow;if(k===void 0){Rt("WebGLShadowMap:",X,"has no shadow.");continue}if(k.autoUpdate===!1&&k.needsUpdate===!1)continue;s.copy(k.mapSize);let tt=k.getFrameExtents();s.multiply(tt),r.copy(k.mapSize),(s.x>p||s.y>p)&&(s.x>p&&(r.x=Math.floor(p/tt.x),s.x=r.x*tt.x,k.mapSize.x=r.x),s.y>p&&(r.y=Math.floor(p/tt.y),s.y=r.y*tt.y,k.mapSize.y=r.y));let q=i.state.buffers.depth.getReversed();if(k.camera._reversedDepth=q,k.map===null||V===!0){if(k.map!==null&&(k.map.depthTexture!==null&&(k.map.depthTexture.dispose(),k.map.depthTexture=null),k.map.dispose()),this.type===Hi){if(X.isPointLight){Rt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}k.map=new Ze(s.x,s.y,{format:ti,type:fn,minFilter:De,magFilter:De,generateMipmaps:!1}),k.map.texture.name=X.name+".shadowMap",k.map.depthTexture=new Fn(s.x,s.y,dn),k.map.depthTexture.name=X.name+".shadowMapDepth",k.map.depthTexture.format=Dn,k.map.depthTexture.compareFunction=null,k.map.depthTexture.minFilter=Me,k.map.depthTexture.magFilter=Me}else X.isPointLight?(k.map=new zs(s.x),k.map.depthTexture=new _s(s.x,un)):(k.map=new Ze(s.x,s.y),k.map.depthTexture=new Fn(s.x,s.y,un)),k.map.depthTexture.name=X.name+".shadowMap",k.map.depthTexture.format=Dn,this.type===Rs?(k.map.depthTexture.compareFunction=q?tl:Qo,k.map.depthTexture.minFilter=De,k.map.depthTexture.magFilter=De):(k.map.depthTexture.compareFunction=null,k.map.depthTexture.minFilter=Me,k.map.depthTexture.magFilter=Me);k.camera.updateProjectionMatrix()}k.map.isWebGLCubeRenderTarget!==!0&&(k.map.width!==s.x||k.map.height!==s.y)&&k.map.setSize(s.x,s.y);let H=k.map.isWebGLCubeRenderTarget?6:k.getViewportCount();X.isPointLight!==!0&&k.updateMatrices(X,E);let Y=(k.camera.layers.mask&4294967294)!==0?k.camera.layers:E.layers;for(let st=0;st<H;st++){let Tt=k.getCamera(st);if(X.isPointLight){let $=k.camera,dt=k.matrix,pt=X.distance||$.far;pt!==$.far&&($.far=pt,$.updateProjectionMatrix()),Os.setFromMatrixPosition(X.matrixWorld),$.position.copy(Os),dl.copy($.position),dl.add(bg[st]),$.up.copy(Eg[st]),$.lookAt(dl),$.updateMatrixWorld(),dt.makeTranslation(-Os.x,-Os.y,-Os.z),Ah.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse),k._frustum.setFromProjectionMatrix(Ah,$.coordinateSystem,$.reversedDepth)}if(k.map.isWebGLCubeRenderTarget)i.setRenderTarget(k.map,st),i.clear();else{st===0&&(i.setRenderTarget(k.map),i.clear());let $=k.getViewport(st);a.set(r.x*$.x,r.y*$.y,r.x*$.z,r.y*$.w),N.viewport(a)}n=k.getFrustum(st),b(v,E,Tt,X,Y,this.type)}k.isPointLightShadow!==!0&&this.type===Hi&&x(k,E),k.needsUpdate=!1}u=this.type,d.needsUpdate=!1,i.setRenderTarget(F,L,C)};function x(T,v){let E=t.update(_);h.defines.VSM_SAMPLES!==T.blurSamples&&(h.defines.VSM_SAMPLES=T.blurSamples,f.defines.VSM_SAMPLES=T.blurSamples,h.needsUpdate=!0,f.needsUpdate=!0),T.mapPass===null?T.mapPass=new Ze(s.x,s.y,{format:ti,type:fn}):(T.mapPass.width!==T.map.width||T.mapPass.height!==T.map.height)&&T.mapPass.setSize(T.map.width,T.map.height),h.uniforms.shadow_pass.value=T.map.depthTexture,h.uniforms.resolution.value.set(T.map.width,T.map.height),h.uniforms.radius.value=T.radius,i.setRenderTarget(T.mapPass),i.clear(),i.renderBufferDirect(v,null,E,h,_,null),f.uniforms.shadow_pass.value=T.mapPass.texture,f.uniforms.resolution.value.set(T.map.width,T.map.height),f.uniforms.radius.value=T.radius,i.setRenderTarget(T.map),i.clear(),i.renderBufferDirect(v,null,E,f,_,null)}function M(T,v,E,F){let L=null,C=E.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(C!==void 0)L=C;else if(L=E.isPointLight===!0?c:o,i.localClippingEnabled&&v.clipShadows===!0&&Array.isArray(v.clippingPlanes)&&v.clippingPlanes.length!==0||v.displacementMap&&v.displacementScale!==0||v.alphaMap&&v.alphaTest>0||v.map&&v.alphaTest>0||v.alphaToCoverage===!0){let N=L.uuid,V=v.uuid,P=l[N];P===void 0&&(P={},l[N]=P);let G=P[V];G===void 0&&(G=L.clone(),P[V]=G,v.addEventListener("dispose",A)),L=G}if(L.visible=v.visible,L.wireframe=v.wireframe,F===Hi?L.side=v.shadowSide!==null?v.shadowSide:v.side:L.side=v.shadowSide!==null?v.shadowSide:g[v.side],L.alphaMap=v.alphaMap,L.alphaTest=v.alphaToCoverage===!0?.5:v.alphaTest,L.map=v.map,L.clipShadows=v.clipShadows,L.clippingPlanes=v.clippingPlanes,L.clipIntersection=v.clipIntersection,L.displacementMap=v.displacementMap,L.displacementScale=v.displacementScale,L.displacementBias=v.displacementBias,L.wireframeLinewidth=v.wireframeLinewidth,L.linewidth=v.linewidth,E.isPointLight===!0&&L.isMeshDistanceMaterial===!0){let N=i.properties.get(L);N.light=E}return L}function b(T,v,E,F,L,C){if(T.visible===!1)return;if(T.layers.test(L)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&C===Hi)&&(!T.frustumCulled||T.intersectsFrustum(n))){T.modelViewMatrix.multiplyMatrices(E.matrixWorldInverse,T.matrixWorld);let P=t.update(T),G=T.material;if(Array.isArray(G)){let X=P.groups;for(let k=0,tt=X.length;k<tt;k++){let q=X[k],H=G[q.materialIndex];if(H&&H.visible){let Y=M(T,H,F,C);T.onBeforeShadow(i,T,v,E,P,Y,q),i.renderBufferDirect(E,null,P,Y,T,q),T.onAfterShadow(i,T,v,E,P,Y,q)}}}else if(G.visible){let X=M(T,G,F,C);T.onBeforeShadow(i,T,v,E,P,X,null),i.renderBufferDirect(E,null,P,X,T,null),T.onAfterShadow(i,T,v,E,P,X,null)}}let V=T.children;for(let P=0,G=V.length;P<G;P++)b(V[P],v,E,F,L,C)}function A(T){T.target.removeEventListener("dispose",A);for(let E in l){let F=l[E],L=T.target.uuid;L in F&&(F[L].dispose(),delete F[L])}}}function Tg(i,t){function e(){let R=!1,j=new re,Z=null,lt=new re(0,0,0,0);return{setMask:function(it){Z!==it&&!R&&(i.colorMask(it,it,it,it),Z=it)},setLocked:function(it){R=it},setClear:function(it,at,Et,kt,nt){nt===!0&&(it*=kt,at*=kt,Et*=kt),j.set(it,at,Et,kt),lt.equals(j)===!1&&(i.clearColor(it,at,Et,kt),lt.copy(j))},reset:function(){R=!1,Z=null,lt.set(-1,0,0,0)}}}function n(){let R=!1,j=!1,Z=null,lt=null,it=null;return{setReversed:function(at){if(j!==at){let Et=t.get("EXT_clip_control");at?Et.clipControlEXT(Et.LOWER_LEFT_EXT,Et.ZERO_TO_ONE_EXT):Et.clipControlEXT(Et.LOWER_LEFT_EXT,Et.NEGATIVE_ONE_TO_ONE_EXT),j=at;let kt=it;it=null,this.setClear(kt)}},getReversed:function(){return j},setTest:function(at){at?ft(i.DEPTH_TEST):Lt(i.DEPTH_TEST)},setMask:function(at){Z!==at&&!R&&(i.depthMask(at),Z=at)},setFunc:function(at){if(j&&(at=th[at]),lt!==at){switch(at){case vr:i.depthFunc(i.NEVER);break;case yr:i.depthFunc(i.ALWAYS);break;case Sr:i.depthFunc(i.LESS);break;case Ii:i.depthFunc(i.LEQUAL);break;case Mr:i.depthFunc(i.EQUAL);break;case br:i.depthFunc(i.GEQUAL);break;case Er:i.depthFunc(i.GREATER);break;case wr:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}lt=at}},setLocked:function(at){R=at},setClear:function(at){it!==at&&(it=at,j&&(at=1-at),i.clearDepth(at))},reset:function(){R=!1,Z=null,lt=null,it=null,j=!1}}}function s(){let R=!1,j=null,Z=null,lt=null,it=null,at=null,Et=null,kt=null,nt=null;return{setTest:function(At){R||(At?ft(i.STENCIL_TEST):Lt(i.STENCIL_TEST))},setMask:function(At){j!==At&&!R&&(i.stencilMask(At),j=At)},setFunc:function(At,zt,gt){(Z!==At||lt!==zt||it!==gt)&&(i.stencilFunc(At,zt,gt),Z=At,lt=zt,it=gt)},setOp:function(At,zt,gt){(at!==At||Et!==zt||kt!==gt)&&(i.stencilOp(At,zt,gt),at=At,Et=zt,kt=gt)},setLocked:function(At){R=At},setClear:function(At){nt!==At&&(i.clearStencil(At),nt=At)},reset:function(){R=!1,j=null,Z=null,lt=null,it=null,at=null,Et=null,kt=null,nt=null}}}let r=new e,a=new n,o=new s,c={},l=new WeakMap,p={},g={},h={},f=new WeakMap,m=[],_=null,d=!1,u=null,x=null,M=null,b=null,A=null,T=null,v=null,E=new Ot(0,0,0),F=0,L=!1,C=null,N=null,V=null,P=null,G=null,X=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),k=!1,tt=0,q=i.getParameter(i.VERSION);q.indexOf("WebGL")!==-1?(tt=parseFloat(/^WebGL (\d)/.exec(q)[1]),k=tt>=1):q.indexOf("OpenGL ES")!==-1&&(tt=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),k=tt>=2);let H=null,Y={},st=i.getParameter(i.SCISSOR_BOX),Tt=i.getParameter(i.VIEWPORT),$=new re().fromArray(st),dt=new re().fromArray(Tt);function pt(R,j,Z,lt){let it=new Uint8Array(4),at=i.createTexture();i.bindTexture(R,at),i.texParameteri(R,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(R,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Et=0;Et<Z;Et++)R===i.TEXTURE_3D||R===i.TEXTURE_2D_ARRAY?i.texImage3D(j,0,i.RGBA,1,1,lt,0,i.RGBA,i.UNSIGNED_BYTE,it):i.texImage2D(j+Et,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,it);return at}let yt={};yt[i.TEXTURE_2D]=pt(i.TEXTURE_2D,i.TEXTURE_2D,1),yt[i.TEXTURE_CUBE_MAP]=pt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),yt[i.TEXTURE_2D_ARRAY]=pt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),yt[i.TEXTURE_3D]=pt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ft(i.DEPTH_TEST),a.setFunc(Ii),Fe(!1),ae(Io),ft(i.CULL_FACE),de(ui);function ft(R){p[R]!==!0&&(i.enable(R),p[R]=!0)}function Lt(R){p[R]!==!1&&(i.disable(R),p[R]=!1)}function te(R,j){return h[R]!==j?(i.bindFramebuffer(R,j),h[R]=j,R===i.DRAW_FRAMEBUFFER&&(h[i.FRAMEBUFFER]=j),R===i.FRAMEBUFFER&&(h[i.DRAW_FRAMEBUFFER]=j),!0):!1}function wt(R,j){let Z=m,lt=!1;if(R){Z=f.get(j),Z===void 0&&(Z=[],f.set(j,Z));let it=R.textures;if(Z.length!==it.length||Z[0]!==i.COLOR_ATTACHMENT0){for(let at=0,Et=it.length;at<Et;at++)Z[at]=i.COLOR_ATTACHMENT0+at;Z.length=it.length,lt=!0}}else Z[0]!==i.BACK&&(Z[0]=i.BACK,lt=!0);lt&&i.drawBuffers(Z)}function Ut(R){return _!==R?(i.useProgram(R),_=R,!0):!1}let Vt={[di]:i.FUNC_ADD,[Mc]:i.FUNC_SUBTRACT,[bc]:i.FUNC_REVERSE_SUBTRACT};Vt[Ec]=i.MIN,Vt[wc]=i.MAX;let Bt={[Tc]:i.ZERO,[Ac]:i.ONE,[Rc]:i.SRC_COLOR,[Uo]:i.SRC_ALPHA,[Nc]:i.SRC_ALPHA_SATURATE,[Lc]:i.DST_COLOR,[Pc]:i.DST_ALPHA,[Cc]:i.ONE_MINUS_SRC_COLOR,[Fo]:i.ONE_MINUS_SRC_ALPHA,[Dc]:i.ONE_MINUS_DST_COLOR,[Ic]:i.ONE_MINUS_DST_ALPHA,[Uc]:i.CONSTANT_COLOR,[Fc]:i.ONE_MINUS_CONSTANT_COLOR,[Oc]:i.CONSTANT_ALPHA,[Bc]:i.ONE_MINUS_CONSTANT_ALPHA};function de(R,j,Z,lt,it,at,Et,kt,nt,At){if(R===ui){d===!0&&(Lt(i.BLEND),d=!1);return}if(d===!1&&(ft(i.BLEND),d=!0),R!==Sc){if(R!==u||At!==L){if((x!==di||A!==di)&&(i.blendEquation(i.FUNC_ADD),x=di,A=di),At)switch(R){case Wi:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Lo:i.blendFunc(i.ONE,i.ONE);break;case Do:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case No:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Pt("WebGLState: Invalid blending: ",R);break}else switch(R){case Wi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Lo:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Do:Pt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case No:Pt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Pt("WebGLState: Invalid blending: ",R);break}M=null,b=null,T=null,v=null,E.set(0,0,0),F=0,u=R,L=At}return}it=it||j,at=at||Z,Et=Et||lt,(j!==x||it!==A)&&(i.blendEquationSeparate(Vt[j],Vt[it]),x=j,A=it),(Z!==M||lt!==b||at!==T||Et!==v)&&(i.blendFuncSeparate(Bt[Z],Bt[lt],Bt[at],Bt[Et]),M=Z,b=lt,T=at,v=Et),(kt.equals(E)===!1||nt!==F)&&(i.blendColor(kt.r,kt.g,kt.b,nt),E.copy(kt),F=nt),u=R,L=!1}function fe(R,j){R.side===Ke?Lt(i.CULL_FACE):ft(i.CULL_FACE);let Z=R.side===Ue;j&&(Z=!Z),Fe(Z),R.blending===Wi&&R.transparent===!1?de(ui):de(R.blending,R.blendEquation,R.blendSrc,R.blendDst,R.blendEquationAlpha,R.blendSrcAlpha,R.blendDstAlpha,R.blendColor,R.blendAlpha,R.premultipliedAlpha),a.setFunc(R.depthFunc),a.setTest(R.depthTest),a.setMask(R.depthWrite),r.setMask(R.colorWrite);let lt=R.stencilWrite;o.setTest(lt),lt&&(o.setMask(R.stencilWriteMask),o.setFunc(R.stencilFunc,R.stencilRef,R.stencilFuncMask),o.setOp(R.stencilFail,R.stencilZFail,R.stencilZPass)),xe(R.polygonOffset,R.polygonOffsetFactor,R.polygonOffsetUnits),R.alphaToCoverage===!0?ft(i.SAMPLE_ALPHA_TO_COVERAGE):Lt(i.SAMPLE_ALPHA_TO_COVERAGE)}function Fe(R){C!==R&&(R?i.frontFace(i.CW):i.frontFace(i.CCW),C=R)}function ae(R){R!==xc?(ft(i.CULL_FACE),R!==N&&(R===Io?i.cullFace(i.BACK):R===vc?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Lt(i.CULL_FACE),N=R}function mn(R){R!==V&&(k&&i.lineWidth(R),V=R)}function xe(R,j,Z){R?(ft(i.POLYGON_OFFSET_FILL),(P!==j||G!==Z)&&(P=j,G=Z,a.getReversed()&&(j=-j,Z=-Z),i.polygonOffset(j,Z))):Lt(i.POLYGON_OFFSET_FILL)}function je(R){R?ft(i.SCISSOR_TEST):Lt(i.SCISSOR_TEST)}function Qe(R){R===void 0&&(R=i.TEXTURE0+X-1),H!==R&&(i.activeTexture(R),H=R)}function tn(R,j,Z){Z===void 0&&(H===null?Z=i.TEXTURE0+X-1:Z=H);let lt=Y[Z];lt===void 0&&(lt={type:void 0,texture:void 0},Y[Z]=lt),(lt.type!==R||lt.texture!==j)&&(H!==Z&&(i.activeTexture(Z),H=Z),i.bindTexture(R,j||yt[R]),lt.type=R,lt.texture=j)}function D(){let R=Y[H];R!==void 0&&R.type!==void 0&&(i.bindTexture(R.type,null),R.type=void 0,R.texture=void 0)}function en(){try{i.compressedTexImage2D(...arguments)}catch(R){Pt("WebGLState:",R)}}function ie(){try{i.compressedTexImage3D(...arguments)}catch(R){Pt("WebGLState:",R)}}function se(){try{i.texSubImage2D(...arguments)}catch(R){Pt("WebGLState:",R)}}function mt(){try{i.texSubImage3D(...arguments)}catch(R){Pt("WebGLState:",R)}}function pe(){try{i.compressedTexSubImage2D(...arguments)}catch(R){Pt("WebGLState:",R)}}function Ct(){try{i.compressedTexSubImage3D(...arguments)}catch(R){Pt("WebGLState:",R)}}function Nt(){try{i.texStorage2D(...arguments)}catch(R){Pt("WebGLState:",R)}}function w(){try{i.texStorage3D(...arguments)}catch(R){Pt("WebGLState:",R)}}function y(){try{i.texImage2D(...arguments)}catch(R){Pt("WebGLState:",R)}}function B(){try{i.texImage3D(...arguments)}catch(R){Pt("WebGLState:",R)}}function et(R){return g[R]!==void 0?g[R]:i.getParameter(R)}function Q(R,j){g[R]!==j&&(i.pixelStorei(R,j),g[R]=j)}function rt(R){$.equals(R)===!1&&(i.scissor(R.x,R.y,R.z,R.w),$.copy(R))}function ht(R){dt.equals(R)===!1&&(i.viewport(R.x,R.y,R.z,R.w),dt.copy(R))}function J(R,j){let Z=l.get(j);Z===void 0&&(Z=new WeakMap,l.set(j,Z));let lt=Z.get(R);lt===void 0&&(lt=i.getUniformBlockIndex(j,R.name),i.uniformBlockBinding(j,lt,lt),Z.set(R,lt))}function K(R,j,Z){let it=l.get(j).get(R);c[it]!==Z&&(i.bindBufferBase(i.UNIFORM_BUFFER,it,Z),c[it]=Z)}function ot(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),p={},g={},H=null,Y={},h={},c={},f=new WeakMap,m=[],_=null,d=!1,u=null,x=null,M=null,b=null,A=null,T=null,v=null,E=new Ot(0,0,0),F=0,L=!1,C=null,N=null,V=null,P=null,G=null,$.set(0,0,i.canvas.width,i.canvas.height),dt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:ft,disable:Lt,bindFramebuffer:te,drawBuffers:wt,useProgram:Ut,setBlending:de,setMaterial:fe,setFlipSided:Fe,setCullFace:ae,setLineWidth:mn,setPolygonOffset:xe,setScissorTest:je,activeTexture:Qe,bindTexture:tn,unbindTexture:D,compressedTexImage2D:en,compressedTexImage3D:ie,texImage2D:y,texImage3D:B,pixelStorei:Q,getParameter:et,updateUBOMapping:J,uniformBlockBinding:K,texStorage2D:Nt,texStorage3D:w,texSubImage2D:se,texSubImage3D:mt,compressedTexSubImage2D:pe,compressedTexSubImage3D:Ct,scissor:rt,viewport:ht,reset:ot}}function Ag(i,t,e,n,s,r,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new It,p=new WeakMap,g=new Set,h,f=new WeakMap,m=new Set,_=new FinalizationRegistry(w=>m.delete(w)),d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function u(w,y){return d?new OffscreenCanvas(w,y):hs("canvas")}function x(w,y,B){let et=1,Q=Nt(w);if((Q.width>B||Q.height>B)&&(et=B/Math.max(Q.width,Q.height)),et<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){let rt=Math.floor(et*Q.width),ht=Math.floor(et*Q.height);h===void 0&&(h=u(rt,ht));let J=y?u(rt,ht):h;return J.width=rt,J.height=ht,J.getContext("2d").drawImage(w,0,0,rt,ht),Rt("WebGLRenderer: Texture has been resized from ("+Q.width+"x"+Q.height+") to ("+rt+"x"+ht+")."),J}else return"data"in w&&Rt("WebGLRenderer: Image in DataTexture is too big ("+Q.width+"x"+Q.height+")."),w;return w}function M(w){return w.generateMipmaps}function b(w){i.generateMipmap(w)}function A(w){return w.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?i.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function T(w,y,B,et,Q,rt=!1){if(w!==null){if(i[w]!==void 0)return i[w];Rt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let ht;et&&(ht=t.get("EXT_texture_norm16"),ht||Rt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let J=y;if(y===i.RED&&(B===i.FLOAT&&(J=i.R32F),B===i.HALF_FLOAT&&(J=i.R16F),B===i.UNSIGNED_BYTE&&(J=i.R8),B===i.UNSIGNED_SHORT&&ht&&(J=ht.R16_EXT),B===i.SHORT&&ht&&(J=ht.R16_SNORM_EXT)),y===i.RED_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.R8UI),B===i.UNSIGNED_SHORT&&(J=i.R16UI),B===i.UNSIGNED_INT&&(J=i.R32UI),B===i.BYTE&&(J=i.R8I),B===i.SHORT&&(J=i.R16I),B===i.INT&&(J=i.R32I)),y===i.RG&&(B===i.FLOAT&&(J=i.RG32F),B===i.HALF_FLOAT&&(J=i.RG16F),B===i.UNSIGNED_BYTE&&(J=i.RG8),B===i.UNSIGNED_SHORT&&ht&&(J=ht.RG16_EXT),B===i.SHORT&&ht&&(J=ht.RG16_SNORM_EXT)),y===i.RG_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RG8UI),B===i.UNSIGNED_SHORT&&(J=i.RG16UI),B===i.UNSIGNED_INT&&(J=i.RG32UI),B===i.BYTE&&(J=i.RG8I),B===i.SHORT&&(J=i.RG16I),B===i.INT&&(J=i.RG32I)),y===i.RGB_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RGB8UI),B===i.UNSIGNED_SHORT&&(J=i.RGB16UI),B===i.UNSIGNED_INT&&(J=i.RGB32UI),B===i.BYTE&&(J=i.RGB8I),B===i.SHORT&&(J=i.RGB16I),B===i.INT&&(J=i.RGB32I)),y===i.RGBA_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RGBA8UI),B===i.UNSIGNED_SHORT&&(J=i.RGBA16UI),B===i.UNSIGNED_INT&&(J=i.RGBA32UI),B===i.BYTE&&(J=i.RGBA8I),B===i.SHORT&&(J=i.RGBA16I),B===i.INT&&(J=i.RGBA32I)),y===i.RGB&&(B===i.UNSIGNED_SHORT&&ht&&(J=ht.RGB16_EXT),B===i.SHORT&&ht&&(J=ht.RGB16_SNORM_EXT),B===i.UNSIGNED_INT_5_9_9_9_REV&&(J=i.RGB9_E5),B===i.UNSIGNED_INT_10F_11F_11F_REV&&(J=i.R11F_G11F_B10F)),y===i.RGBA){let K=rt?cs:qt.getTransfer(Q);B===i.FLOAT&&(J=i.RGBA32F),B===i.HALF_FLOAT&&(J=i.RGBA16F),B===i.UNSIGNED_BYTE&&(J=K===Jt?i.SRGB8_ALPHA8:i.RGBA8),B===i.UNSIGNED_SHORT&&ht&&(J=ht.RGBA16_EXT),B===i.SHORT&&ht&&(J=ht.RGBA16_SNORM_EXT),B===i.UNSIGNED_SHORT_4_4_4_4&&(J=i.RGBA4),B===i.UNSIGNED_SHORT_5_5_5_1&&(J=i.RGB5_A1)}return(J===i.R16F||J===i.R32F||J===i.RG16F||J===i.RG32F||J===i.RGBA16F||J===i.RGBA32F)&&t.get("EXT_color_buffer_float"),J}function v(w,y){let B;return w?y===null||y===un||y===pi?B=i.DEPTH24_STENCIL8:y===dn?B=i.DEPTH32F_STENCIL8:y===qi&&(B=i.DEPTH24_STENCIL8,Rt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===un||y===pi?B=i.DEPTH_COMPONENT24:y===dn?B=i.DEPTH_COMPONENT32F:y===qi&&(B=i.DEPTH_COMPONENT16),B}function E(w,y){return M(w)===!0||w.isFramebufferTexture&&w.minFilter!==Me&&w.minFilter!==De?Math.log2(Math.max(y.width,y.height))+1:w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?y.mipmaps.length:1}function F(w){let y=new WeakRef(w);n.get(w).__ref=y,m.add(y),_.register(w,y,y)}function L(w){let y=n.get(w).__ref;y!==void 0&&(m.delete(y),_.unregister(y))}function C(w){V(w.target)}function N(w){P(w.target)}function V(w){w.removeEventListener("dispose",C),L(w),X(w),w.isVideoTexture&&p.delete(w),w.isHTMLTexture&&g.delete(w)}function P(w){w.removeEventListener("dispose",N),L(w),tt(w)}function G(){for(let w of m){let y=w.deref();y!==void 0&&(y.isRenderTarget===!0?P(y):V(y))}m.clear(),g.clear()}function X(w){let y=n.get(w);if(y.__webglInit===void 0)return;let B=w.source,et=f.get(B);if(et){let Q=et[y.__cacheKey];Q.usedTimes--,Q.usedTimes===0&&k(w),Object.keys(et).length===0&&f.delete(B)}n.remove(w)}function k(w){let y=n.get(w);i.deleteTexture(y.__webglTexture);let B=w.source,et=f.get(B);delete et[y.__cacheKey],a.memory.textures--}function tt(w){let y=n.get(w);y.__depthDisposeCallback&&y.__depthDisposeCallback();let B=w.depthTexture;if(B&&B.renderTarget===w&&V(B),w.isWebGLCubeRenderTarget)for(let Q=0;Q<6;Q++){if(Array.isArray(y.__webglFramebuffer[Q]))for(let rt=0;rt<y.__webglFramebuffer[Q].length;rt++)i.deleteFramebuffer(y.__webglFramebuffer[Q][rt]);else i.deleteFramebuffer(y.__webglFramebuffer[Q]);y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer[Q])}else{if(Array.isArray(y.__webglFramebuffer))for(let Q=0;Q<y.__webglFramebuffer.length;Q++)i.deleteFramebuffer(y.__webglFramebuffer[Q]);else i.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&i.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let Q=0;Q<y.__webglColorRenderbuffer.length;Q++)y.__webglColorRenderbuffer[Q]&&i.deleteRenderbuffer(y.__webglColorRenderbuffer[Q]);y.__webglDepthRenderbuffer&&i.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let et=w.textures;for(let Q=0,rt=et.length;Q<rt;Q++){let ht=n.get(et[Q]);ht.__webglTexture&&(i.deleteTexture(ht.__webglTexture),a.memory.textures--),n.remove(et[Q])}n.remove(w)}let q=0;function H(){q=0}function Y(){return q}function st(w){q=w}function Tt(){let w=q;return w>=s.maxTextures&&Rt("WebGLTextures: Trying to use "+(w+1)+" texture units while this GPU supports only "+s.maxTextures),q+=1,w}function $(w){let y=[];return y.push(w.wrapS),y.push(w.wrapT),y.push(w.wrapR||0),y.push(w.magFilter),y.push(w.minFilter),y.push(w.anisotropy),y.push(w.internalFormat),y.push(w.format),y.push(w.type),y.push(w.generateMipmaps),y.push(w.mipmapsAutoUpdate),y.push(w.premultiplyAlpha),y.push(w.flipY),y.push(w.unpackAlignment),y.push(w.colorSpace),y.join()}function dt(w,y){let B=n.get(w);if(w.isVideoTexture&&pe(w),w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&B.__version!==w.version){let et=w.image;if(et===null)Rt("WebGLRenderer: Texture marked for update but no image data found.");else if(et.complete===!1)Rt("WebGLRenderer: Texture marked for update but image is incomplete");else{fe(B,w,y);return}}else w.isExternalTexture&&(B.__webglTexture=w.sourceTexture?w.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,B.__webglTexture,i.TEXTURE0+y)}function pt(w,y){let B=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&B.__version!==w.version){fe(B,w,y);return}else w.isExternalTexture&&(B.__webglTexture=w.sourceTexture?w.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,B.__webglTexture,i.TEXTURE0+y)}function yt(w,y){let B=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&B.__version!==w.version){fe(B,w,y);return}e.bindTexture(i.TEXTURE_3D,B.__webglTexture,i.TEXTURE0+y)}function ft(w,y){let B=n.get(w);if(w.version>0&&B.__version!==w.version){Fe(B,w,y);return}e.bindTexture(i.TEXTURE_CUBE_MAP,B.__webglTexture,i.TEXTURE0+y)}let Lt={[Tr]:i.REPEAT,[xn]:i.CLAMP_TO_EDGE,[Ar]:i.MIRRORED_REPEAT},te={[Me]:i.NEAREST,[Gc]:i.NEAREST_MIPMAP_NEAREST,[Cs]:i.NEAREST_MIPMAP_LINEAR,[De]:i.LINEAR,[ea]:i.LINEAR_MIPMAP_NEAREST,[On]:i.LINEAR_MIPMAP_LINEAR},wt={[Xc]:i.NEVER,[el]:i.ALWAYS,[qc]:i.LESS,[Qo]:i.LEQUAL,[Yc]:i.EQUAL,[tl]:i.GEQUAL,[Zc]:i.GREATER,[$c]:i.NOTEQUAL};function Ut(w,y){if(y.type===dn&&t.has("OES_texture_float_linear")===!1&&(y.magFilter===De||y.magFilter===ea||y.magFilter===Cs||y.magFilter===On||y.minFilter===De||y.minFilter===ea||y.minFilter===Cs||y.minFilter===On)&&Rt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(w,i.TEXTURE_WRAP_S,Lt[y.wrapS]),i.texParameteri(w,i.TEXTURE_WRAP_T,Lt[y.wrapT]),(w===i.TEXTURE_3D||w===i.TEXTURE_2D_ARRAY)&&i.texParameteri(w,i.TEXTURE_WRAP_R,Lt[y.wrapR]),i.texParameteri(w,i.TEXTURE_MAG_FILTER,te[y.magFilter]),i.texParameteri(w,i.TEXTURE_MIN_FILTER,te[y.minFilter]),y.compareFunction&&(i.texParameteri(w,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(w,i.TEXTURE_COMPARE_FUNC,wt[y.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===Me||y.minFilter!==Cs&&y.minFilter!==On||y.type===dn&&t.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||n.get(y).__currentAnisotropy){let B=t.get("EXT_texture_filter_anisotropic");i.texParameterf(w,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,s.getMaxAnisotropy())),n.get(y).__currentAnisotropy=y.anisotropy}}}function Vt(w,y){let B=!1;w.__webglInit===void 0&&(w.__webglInit=!0,y.addEventListener("dispose",C),F(y));let et=y.source,Q=f.get(et);Q===void 0&&(Q={},f.set(et,Q));let rt=$(y);if(rt!==w.__cacheKey){Q[rt]===void 0&&(Q[rt]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,B=!0),Q[rt].usedTimes++;let ht=Q[w.__cacheKey];ht!==void 0&&(Q[w.__cacheKey].usedTimes--,ht.usedTimes===0&&k(y)),w.__cacheKey=rt,w.__webglTexture=Q[rt].texture}return B}function Bt(w,y,B){return Math.floor(Math.floor(w/B)/y)}function de(w,y,B,et){let rt=w.updateRanges;if(rt.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,y.width,y.height,B,et,y.data);else{rt.sort((R,j)=>R.start-j.start);let ht=0;for(let R=1;R<rt.length;R++){let j=rt[ht],Z=rt[R],lt=j.start+j.count,it=Bt(Z.start,y.width,4),at=Bt(j.start,y.width,4);Z.start<=lt+1&&it===at&&Bt(Z.start+Z.count-1,y.width,4)===it?j.count=Math.max(j.count,Z.start+Z.count-j.start):(++ht,rt[ht]=Z)}rt.length=ht+1;let J=e.getParameter(i.UNPACK_ROW_LENGTH),K=e.getParameter(i.UNPACK_SKIP_PIXELS),ot=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,y.width);for(let R=0,j=rt.length;R<j;R++){let Z=rt[R],lt=Math.floor(Z.start/4),it=Math.ceil(Z.count/4),at=lt%y.width,Et=Math.floor(lt/y.width),kt=it,nt=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,at),e.pixelStorei(i.UNPACK_SKIP_ROWS,Et),e.texSubImage2D(i.TEXTURE_2D,0,at,Et,kt,nt,B,et,y.data)}w.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,J),e.pixelStorei(i.UNPACK_SKIP_PIXELS,K),e.pixelStorei(i.UNPACK_SKIP_ROWS,ot)}}function fe(w,y,B){let et=i.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(et=i.TEXTURE_2D_ARRAY),y.isData3DTexture&&(et=i.TEXTURE_3D);let Q=Vt(w,y),rt=y.source;e.bindTexture(et,w.__webglTexture,i.TEXTURE0+B);let ht=n.get(rt);if(rt.version!==ht.__version||Q===!0){if(e.activeTexture(i.TEXTURE0+B),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let nt=qt.getPrimaries(qt.workingColorSpace),At=y.colorSpace===zn?null:qt.getPrimaries(y.colorSpace),zt=y.colorSpace===zn||nt===At?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,zt)}e.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment);let K=x(y.image,!1,s.maxTextureSize);K=Ct(y,K);let ot=r.convert(y.format,y.colorSpace),R=r.convert(y.type),j=T(y.internalFormat,ot,R,y.normalized,y.colorSpace,y.isVideoTexture);Ut(et,y);let Z,lt=y.mipmaps,it=y.isVideoTexture!==!0,at=ht.__version===void 0||Q===!0,Et=rt.dataReady,kt=E(y,K);if(y.isDepthTexture)j=v(y.format===Bn,y.type),at&&(it?e.texStorage2D(i.TEXTURE_2D,1,j,K.width,K.height):e.texImage2D(i.TEXTURE_2D,0,j,K.width,K.height,0,ot,R,null));else if(y.isDataTexture)if(lt.length>0){it&&at&&e.texStorage2D(i.TEXTURE_2D,kt,j,lt[0].width,lt[0].height);for(let nt=0,At=lt.length;nt<At;nt++)Z=lt[nt],it?Et&&e.texSubImage2D(i.TEXTURE_2D,nt,0,0,Z.width,Z.height,ot,R,Z.data):e.texImage2D(i.TEXTURE_2D,nt,j,Z.width,Z.height,0,ot,R,Z.data);y.generateMipmaps=!1}else it?(at&&e.texStorage2D(i.TEXTURE_2D,kt,j,K.width,K.height),Et&&de(y,K,ot,R)):e.texImage2D(i.TEXTURE_2D,0,j,K.width,K.height,0,ot,R,K.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){it&&at&&e.texStorage3D(i.TEXTURE_2D_ARRAY,kt,j,lt[0].width,lt[0].height,K.depth);for(let nt=0,At=lt.length;nt<At;nt++)if(Z=lt[nt],y.format!==pn)if(ot!==null)if(it){if(Et)if(y.layerUpdates.size>0){let zt=hl(Z.width,Z.height,y.format,y.type);for(let gt of y.layerUpdates){let Kt=Z.data.subarray(gt*zt/Z.data.BYTES_PER_ELEMENT,(gt+1)*zt/Z.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,nt,0,0,gt,Z.width,Z.height,1,ot,Kt)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,nt,0,0,0,Z.width,Z.height,K.depth,ot,Z.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,nt,j,Z.width,Z.height,K.depth,0,Z.data,0,0);else Rt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else it?Et&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,nt,0,0,0,Z.width,Z.height,K.depth,ot,R,Z.data):e.texImage3D(i.TEXTURE_2D_ARRAY,nt,j,Z.width,Z.height,K.depth,0,ot,R,Z.data);y.layerUpdates.size>0&&y.clearLayerUpdates()}else{it&&at&&e.texStorage2D(i.TEXTURE_2D,kt,j,lt[0].width,lt[0].height);for(let nt=0,At=lt.length;nt<At;nt++)Z=lt[nt],y.format!==pn?ot!==null?it?Et&&e.compressedTexSubImage2D(i.TEXTURE_2D,nt,0,0,Z.width,Z.height,ot,Z.data):e.compressedTexImage2D(i.TEXTURE_2D,nt,j,Z.width,Z.height,0,Z.data):Rt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):it?Et&&e.texSubImage2D(i.TEXTURE_2D,nt,0,0,Z.width,Z.height,ot,R,Z.data):e.texImage2D(i.TEXTURE_2D,nt,j,Z.width,Z.height,0,ot,R,Z.data)}else if(y.isDataArrayTexture)if(it){if(at&&e.texStorage3D(i.TEXTURE_2D_ARRAY,kt,j,K.width,K.height,K.depth),Et)if(y.layerUpdates.size>0){let nt=hl(K.width,K.height,y.format,y.type);for(let At of y.layerUpdates){let zt=K.data.subarray(At*nt/K.data.BYTES_PER_ELEMENT,(At+1)*nt/K.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,At,K.width,K.height,1,ot,R,zt)}y.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,K.width,K.height,K.depth,ot,R,K.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,j,K.width,K.height,K.depth,0,ot,R,K.data);else if(y.isData3DTexture)it?(at&&e.texStorage3D(i.TEXTURE_3D,kt,j,K.width,K.height,K.depth),Et&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,K.width,K.height,K.depth,ot,R,K.data)):e.texImage3D(i.TEXTURE_3D,0,j,K.width,K.height,K.depth,0,ot,R,K.data);else if(y.isFramebufferTexture){if(at)if(it)e.texStorage2D(i.TEXTURE_2D,kt,j,K.width,K.height);else{let nt=K.width,At=K.height;for(let zt=0;zt<kt;zt++)e.texImage2D(i.TEXTURE_2D,zt,j,nt,At,0,ot,R,null),nt>>=1,At>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in i){let nt=i.canvas;if(nt.hasAttribute("layoutsubtree")||nt.setAttribute("layoutsubtree","true"),K.parentNode!==nt){nt.appendChild(K),g.add(y),nt.onpaint=At=>{let zt=At.changedElements;for(let gt of g)zt.includes(gt.image)&&(gt.needsUpdate=!0)},nt.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,K);else{let zt=i.RGBA,gt=i.RGBA,Kt=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,zt,gt,Kt,K)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(lt.length>0){if(it&&at){let nt=Nt(lt[0]);e.texStorage2D(i.TEXTURE_2D,kt,j,nt.width,nt.height)}for(let nt=0,At=lt.length;nt<At;nt++)Z=lt[nt],it?Et&&e.texSubImage2D(i.TEXTURE_2D,nt,0,0,ot,R,Z):e.texImage2D(i.TEXTURE_2D,nt,j,ot,R,Z);y.generateMipmaps=!1}else if(it){if(at){let nt=Nt(K);e.texStorage2D(i.TEXTURE_2D,kt,j,nt.width,nt.height)}Et&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,ot,R,K)}else e.texImage2D(i.TEXTURE_2D,0,j,ot,R,K);M(y)&&y.mipmapsAutoUpdate===!0&&b(et),ht.__version=rt.version,y.onUpdate&&y.onUpdate(y)}w.__version=y.version}function Fe(w,y,B){if(y.image.length!==6)return;let et=Vt(w,y),Q=y.source;e.bindTexture(i.TEXTURE_CUBE_MAP,w.__webglTexture,i.TEXTURE0+B);let rt=n.get(Q);if(Q.version!==rt.__version||et===!0){e.activeTexture(i.TEXTURE0+B);let ht=qt.getPrimaries(qt.workingColorSpace),J=y.colorSpace===zn?null:qt.getPrimaries(y.colorSpace),K=y.colorSpace===zn||ht===J?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,K);let ot=y.isCompressedTexture||y.image[0].isCompressedTexture,R=y.image[0]&&y.image[0].isDataTexture,j=[];for(let gt=0;gt<6;gt++)!ot&&!R?j[gt]=x(y.image[gt],!0,s.maxCubemapSize):j[gt]=R?y.image[gt].image:y.image[gt],j[gt]=Ct(y,j[gt]);let Z=j[0],lt=r.convert(y.format,y.colorSpace),it=r.convert(y.type),at=T(y.internalFormat,lt,it,y.normalized,y.colorSpace),Et=y.isVideoTexture!==!0,kt=rt.__version===void 0||et===!0,nt=Q.dataReady,At=E(y,Z);Ut(i.TEXTURE_CUBE_MAP,y);let zt;if(y.isDepthTexture){if(at=v(y.format===Bn,y.type),kt)if(Et)e.texStorage2D(i.TEXTURE_CUBE_MAP,1,at,Z.width,Z.height);else for(let gt=0;gt<6;gt++)e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,at,Z.width,Z.height,0,lt,it,null)}else if(ot){Et&&kt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,At,at,Z.width,Z.height);for(let gt=0;gt<6;gt++){zt=j[gt].mipmaps;for(let Kt=0;Kt<zt.length;Kt++){let ve=zt[Kt];y.format!==pn?lt!==null?Et?nt&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,Kt,0,0,ve.width,ve.height,lt,ve.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,Kt,at,ve.width,ve.height,0,ve.data):Rt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Et?nt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,Kt,0,0,ve.width,ve.height,lt,it,ve.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,Kt,at,ve.width,ve.height,0,lt,it,ve.data)}}}else{if(zt=y.mipmaps,Et&&kt){zt.length>0&&At++;let gt=Nt(j[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,At,at,gt.width,gt.height)}for(let gt=0;gt<6;gt++)if(R){Et?nt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,0,0,j[gt].width,j[gt].height,lt,it,j[gt].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,at,j[gt].width,j[gt].height,0,lt,it,j[gt].data);for(let Kt=0;Kt<zt.length;Kt++){let kn=zt[Kt].image[gt].image;Et?nt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,Kt+1,0,0,kn.width,kn.height,lt,it,kn.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,Kt+1,at,kn.width,kn.height,0,lt,it,kn.data)}}else{Et?nt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,0,0,lt,it,j[gt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,0,at,lt,it,j[gt]);for(let Kt=0;Kt<zt.length;Kt++){let ve=zt[Kt];Et?nt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,Kt+1,0,0,lt,it,ve.image[gt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+gt,Kt+1,at,lt,it,ve.image[gt])}}}M(y)&&y.mipmapsAutoUpdate===!0&&b(i.TEXTURE_CUBE_MAP),rt.__version=Q.version,y.onUpdate&&y.onUpdate(y)}w.__version=y.version}function ae(w,y,B,et,Q,rt){let ht=r.convert(B.format,B.colorSpace),J=r.convert(B.type),K=T(B.internalFormat,ht,J,B.normalized,B.colorSpace),ot=n.get(y),R=n.get(B);if(R.__renderTarget=y,!ot.__hasExternalTextures){let j=Math.max(1,y.width>>rt),Z=Math.max(1,y.height>>rt);Q===i.TEXTURE_3D||Q===i.TEXTURE_2D_ARRAY?e.texImage3D(Q,rt,K,j,Z,y.depth,0,ht,J,null):e.texImage2D(Q,rt,K,j,Z,0,ht,J,null)}e.bindFramebuffer(i.FRAMEBUFFER,w),mt(y)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,et,Q,R.__webglTexture,0,se(y)):(Q===i.TEXTURE_2D||Q>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Q<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,et,Q,R.__webglTexture,rt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function mn(w,y,B){if(i.bindRenderbuffer(i.RENDERBUFFER,w),y.depthBuffer){let et=y.depthTexture,Q=et&&et.isDepthTexture?et.type:null,rt=v(y.stencilBuffer,Q),ht=y.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;mt(y)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,se(y),rt,y.width,y.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,se(y),rt,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,rt,y.width,y.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,ht,i.RENDERBUFFER,w)}else{let et=y.textures;for(let Q=0;Q<et.length;Q++){let rt=et[Q],ht=r.convert(rt.format,rt.colorSpace),J=r.convert(rt.type),K=T(rt.internalFormat,ht,J,rt.normalized,rt.colorSpace);mt(y)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,se(y),K,y.width,y.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,se(y),K,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,K,y.width,y.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function xe(w,y,B){let et=y.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,w),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let Q=n.get(y.depthTexture);Q.__renderTarget=y;let rt=et?y.depthTexture.image[0]:y.depthTexture.image;(!Q.__webglTexture||rt.width!==y.width||rt.height!==y.height)&&(rt.width=y.width,rt.height=y.height,y.depthTexture.needsUpdate=!0),et?ft(y.depthTexture,0):dt(y.depthTexture,0);let ht=Q.__webglTexture,J=se(y),K=et?i.TEXTURE_CUBE_MAP_POSITIVE_X+B:i.TEXTURE_2D,ot=y.depthTexture.format===Bn?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(y.depthTexture.format===Dn)mt(y)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ot,K,ht,0,J):i.framebufferTexture2D(i.FRAMEBUFFER,ot,K,ht,0);else if(y.depthTexture.format===Bn)mt(y)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ot,K,ht,0,J):i.framebufferTexture2D(i.FRAMEBUFFER,ot,K,ht,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function je(w){let y=n.get(w),B=w.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==w.depthTexture){let et=w.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),et){let Q=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,et.removeEventListener("dispose",Q)};et.addEventListener("dispose",Q),y.__depthDisposeCallback=Q}y.__boundDepthTexture=et}if(w.depthTexture&&!y.__autoAllocateDepthBuffer)if(B)for(let et=0;et<6;et++)xe(y.__webglFramebuffer[et],w,et);else w.texture.mipmaps.length>0?xe(y.__webglFramebuffer[0],w,0):xe(y.__webglFramebuffer,w,0);else if(B){y.__webglDepthbuffer=[];for(let et=0;et<6;et++)if(e.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[et]),y.__webglDepthbuffer[et]===void 0)y.__webglDepthbuffer[et]=i.createRenderbuffer(),mn(y.__webglDepthbuffer[et],w,!1);else{let Q=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,rt=y.__webglDepthbuffer[et];i.bindRenderbuffer(i.RENDERBUFFER,rt),i.framebufferRenderbuffer(i.FRAMEBUFFER,Q,i.RENDERBUFFER,rt)}}else if(w.texture.mipmaps.length>0?e.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=i.createRenderbuffer(),mn(y.__webglDepthbuffer,w,!1);else{let Q=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,rt=y.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,rt),i.framebufferRenderbuffer(i.FRAMEBUFFER,Q,i.RENDERBUFFER,rt)}e.bindFramebuffer(i.FRAMEBUFFER,null)}function Qe(w,y,B){let et=n.get(w);y!==void 0&&ae(et.__webglFramebuffer,w,w.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),B!==void 0&&je(w)}function tn(w){let y=w.texture,B=n.get(w),et=n.get(y);w.addEventListener("dispose",N),F(w);let Q=w.textures,rt=w.isWebGLCubeRenderTarget===!0,ht=Q.length>1;if(ht||(et.__webglTexture===void 0&&(et.__webglTexture=i.createTexture()),et.__version=y.version,a.memory.textures++),rt){B.__webglFramebuffer=[];for(let J=0;J<6;J++)if(y.mipmaps.length>0){B.__webglFramebuffer[J]=[];for(let K=0;K<y.mipmaps.length;K++)B.__webglFramebuffer[J][K]=i.createFramebuffer()}else B.__webglFramebuffer[J]=i.createFramebuffer()}else{if(y.mipmaps.length>0){B.__webglFramebuffer=[];for(let J=0;J<y.mipmaps.length;J++)B.__webglFramebuffer[J]=i.createFramebuffer()}else B.__webglFramebuffer=i.createFramebuffer();if(ht)for(let J=0,K=Q.length;J<K;J++){let ot=n.get(Q[J]);ot.__webglTexture===void 0&&(ot.__webglTexture=i.createTexture(),a.memory.textures++)}if(w.samples>0&&mt(w)===!1){B.__webglMultisampledFramebuffer=i.createFramebuffer(),B.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let J=0;J<Q.length;J++){let K=Q[J];B.__webglColorRenderbuffer[J]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,B.__webglColorRenderbuffer[J]);let ot=r.convert(K.format,K.colorSpace),R=r.convert(K.type),j=T(K.internalFormat,ot,R,K.normalized,K.colorSpace,w.isXRRenderTarget===!0),Z=se(w);i.renderbufferStorageMultisample(i.RENDERBUFFER,Z,j,w.width,w.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+J,i.RENDERBUFFER,B.__webglColorRenderbuffer[J])}i.bindRenderbuffer(i.RENDERBUFFER,null),w.depthBuffer&&(B.__webglDepthRenderbuffer=i.createRenderbuffer(),mn(B.__webglDepthRenderbuffer,w,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(rt){e.bindTexture(i.TEXTURE_CUBE_MAP,et.__webglTexture),Ut(i.TEXTURE_CUBE_MAP,y);for(let J=0;J<6;J++)if(y.mipmaps.length>0)for(let K=0;K<y.mipmaps.length;K++)ae(B.__webglFramebuffer[J][K],w,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,K);else ae(B.__webglFramebuffer[J],w,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0);M(y)?b(i.TEXTURE_CUBE_MAP):y.mipmaps.length>0&&i.texParameteri(i.TEXTURE_CUBE_MAP,i.TEXTURE_MAX_LEVEL,y.mipmaps.length-1),e.unbindTexture()}else if(ht){for(let J=0,K=Q.length;J<K;J++){let ot=Q[J],R=n.get(ot),j=i.TEXTURE_2D;(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(j=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(j,R.__webglTexture),Ut(j,ot),ae(B.__webglFramebuffer,w,ot,i.COLOR_ATTACHMENT0+J,j,0),M(ot)&&b(j)}e.unbindTexture()}else{let J=i.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(J=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(J,et.__webglTexture),Ut(J,y),y.mipmaps.length>0)for(let K=0;K<y.mipmaps.length;K++)ae(B.__webglFramebuffer[K],w,y,i.COLOR_ATTACHMENT0,J,K);else ae(B.__webglFramebuffer,w,y,i.COLOR_ATTACHMENT0,J,0);M(y)?b(J):y.mipmaps.length>0&&i.texParameteri(J,i.TEXTURE_MAX_LEVEL,y.mipmaps.length-1),e.unbindTexture()}w.depthBuffer&&je(w)}function D(w){let y=w.textures;for(let B=0,et=y.length;B<et;B++){let Q=y[B];if(M(Q)&&Q.mipmapsAutoUpdate===!0){let rt=A(w),ht=n.get(Q).__webglTexture;e.bindTexture(rt,ht),b(rt),e.unbindTexture()}}}let en=[];function ie(w){if(w.samples>0){if(mt(w)===!1){let y=w.textures,B=w.width,et=w.height,Q=i.COLOR_BUFFER_BIT,rt=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ht=n.get(w),J=y.length>1;if(J)for(let ot=0;ot<y.length;ot++)e.bindFramebuffer(i.FRAMEBUFFER,ht.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ot,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,ht.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ot,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,ht.__webglMultisampledFramebuffer),w.texture.mipmaps.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,ht.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,ht.__webglFramebuffer);for(let ot=0;ot<y.length;ot++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(Q|=i.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(Q|=i.STENCIL_BUFFER_BIT)),J){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,ht.__webglColorRenderbuffer[ot]);let R=n.get(y[ot]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,R,0)}i.blitFramebuffer(0,0,B,et,0,0,B,et,Q,i.NEAREST),c===!0&&(en.length=0,en.push(i.COLOR_ATTACHMENT0+ot),w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&en.push(rt),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,en))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),J)for(let ot=0;ot<y.length;ot++){e.bindFramebuffer(i.FRAMEBUFFER,ht.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ot,i.RENDERBUFFER,ht.__webglColorRenderbuffer[ot]);let R=n.get(y[ot]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,ht.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ot,i.TEXTURE_2D,R,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,ht.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&c){let y=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[y])}}}function se(w){return Math.min(s.maxSamples,w.samples)}function mt(w){let y=n.get(w);return w.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function pe(w){let y=a.render.frame;p.get(w)!==y&&(p.set(w,y),w.update())}function Ct(w,y){let B=w.colorSpace,et=w.format,Q=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||B!==ls&&B!==zn&&(qt.getTransfer(B)===Jt?(et!==pn||Q!==Ge)&&Rt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Pt("WebGLTextures: Unsupported texture color space:",B)),y}function Nt(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(l.width=w.naturalWidth||w.width,l.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(l.width=w.displayWidth,l.height=w.displayHeight):(l.width=w.width,l.height=w.height),l}this.allocateTextureUnit=Tt,this.resetTextureUnits=H,this.getTextureUnits=Y,this.setTextureUnits=st,this.setTexture2D=dt,this.setTexture2DArray=pt,this.setTexture3D=yt,this.setTextureCube=ft,this.rebindTextures=Qe,this.setupRenderTarget=tn,this.updateRenderTargetMipmap=D,this.updateMultisampleRenderTarget=ie,this.setupDepthRenderbuffer=je,this.setupFrameBufferTexture=ae,this.useMultisampledRTT=mt,this.dispose=G}function Rg(i,t){function e(n,s=zn){let r,a=qt.getTransfer(s);if(n===Ge)return i.UNSIGNED_BYTE;if(n===ia)return i.UNSIGNED_SHORT_4_4_4_4;if(n===sa)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Zo)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===$o)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===qo)return i.BYTE;if(n===Yo)return i.SHORT;if(n===qi)return i.UNSIGNED_SHORT;if(n===na)return i.INT;if(n===un)return i.UNSIGNED_INT;if(n===dn)return i.FLOAT;if(n===fn)return i.HALF_FLOAT;if(n===Jo)return i.ALPHA;if(n===Ko)return i.RGB;if(n===pn)return i.RGBA;if(n===Dn)return i.DEPTH_COMPONENT;if(n===Bn)return i.DEPTH_STENCIL;if(n===jo)return i.RED;if(n===ra)return i.RED_INTEGER;if(n===ti)return i.RG;if(n===aa)return i.RG_INTEGER;if(n===oa)return i.RGBA_INTEGER;if(n===Ps||n===Is||n===Ls||n===Ds)if(a===Jt)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Ps)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Is)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Ls)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ds)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Ps)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Is)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Ls)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ds)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===la||n===ca||n===ha||n===ua)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===la)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===ca)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===ha)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ua)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===da||n===fa||n===pa||n===ma||n===ga||n===Ns||n===_a)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===da||n===fa)return a===Jt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===pa)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===ma)return r.COMPRESSED_R11_EAC;if(n===ga)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Ns)return r.COMPRESSED_RG11_EAC;if(n===_a)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===xa||n===va||n===ya||n===Sa||n===Ma||n===ba||n===Ea||n===wa||n===Ta||n===Aa||n===Ra||n===Ca||n===Pa||n===Ia)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===xa)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===va)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===ya)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Sa)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Ma)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===ba)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ea)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===wa)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Ta)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Aa)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Ra)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Ca)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Pa)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ia)return a===Jt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===La||n===Da||n===Na)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===La)return a===Jt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Da)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Na)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Ua||n===Fa||n===Us||n===Oa)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Ua)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Fa)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Us)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Oa)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===pi?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var Cg=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Pg=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,vl=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new xs(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new vn({vertexShader:Cg,fragmentShader:Pg,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new rn(new ys(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},yl=class extends hn{constructor(t,e){super();let n=this,s=null,r=1,a=null,o="local-floor",c=1,l=null,p=null,g=null,h=null,f=null,m=null,_=typeof XRWebGLBinding<"u",d=new vl,u={},x=e.getContextAttributes(),M=null,b=null,A=[],T=[],v=new It,E=null,F=null,L=new Le;L.viewport=new re;let C=new Le;C.viewport=new re;let N=[L,C],V=new jr,P=null,G=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let dt=A[$];return dt===void 0&&(dt=new Fi,A[$]=dt),dt.getTargetRaySpace()},this.getControllerGrip=function($){let dt=A[$];return dt===void 0&&(dt=new Fi,A[$]=dt),dt.getGripSpace()},this.getHand=function($){let dt=A[$];return dt===void 0&&(dt=new Fi,A[$]=dt),dt.getHandSpace()};function X($){let dt=T.indexOf($.inputSource);if(dt===-1)return;let pt=A[dt];pt!==void 0&&(pt.update($.inputSource,$.frame,l||a),pt.dispatchEvent({type:$.type,data:$.inputSource}))}function k(){s.removeEventListener("select",X),s.removeEventListener("selectstart",X),s.removeEventListener("selectend",X),s.removeEventListener("squeeze",X),s.removeEventListener("squeezestart",X),s.removeEventListener("squeezeend",X),s.removeEventListener("end",k),s.removeEventListener("inputsourceschange",tt);for(let $=0;$<A.length;$++){let dt=T[$];dt!==null&&(T[$]=null,A[$].disconnect(dt))}P=null,G=null,d.reset();for(let $ in u)delete u[$];if(t.setRenderTarget(M),f=null,h=null,g=null,s=null,b=null,Tt.stop(),n.isPresenting=!1,t.setPixelRatio(E),t.setSize(v.width,v.height,!1),F!==null){let $=F.camera;$.fov=F.fov,$.zoom=F.zoom,$.updateProjectionMatrix(),F=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){r=$,n.isPresenting===!0&&Rt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){o=$,n.isPresenting===!0&&Rt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function($){l=$},this.getBaseLayer=function(){return h!==null?h:f},this.getBinding=function(){return g===null&&_&&(g=new XRWebGLBinding(s,e)),g},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function($){if(s=$,s!==null){if(M=t.getRenderTarget(),s.addEventListener("select",X),s.addEventListener("selectstart",X),s.addEventListener("selectend",X),s.addEventListener("squeeze",X),s.addEventListener("squeezestart",X),s.addEventListener("squeezeend",X),s.addEventListener("end",k),s.addEventListener("inputsourceschange",tt),x.xrCompatible!==!0&&await e.makeXRCompatible(),E=t.getPixelRatio(),t.getSize(v),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let pt=null,yt=null,ft=null;x.depth&&(ft=x.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,pt=x.stencil?Bn:Dn,yt=x.stencil?pi:un);let Lt={colorFormat:e.RGBA8,depthFormat:ft,scaleFactor:r};g=this.getBinding(),h=g.createProjectionLayer(Lt),s.updateRenderState({layers:[h]}),t.setPixelRatio(1),t.setSize(h.textureWidth,h.textureHeight,!1),b=new Ze(h.textureWidth,h.textureHeight,{format:pn,type:Ge,depthTexture:new Fn(h.textureWidth,h.textureHeight,yt,void 0,void 0,void 0,void 0,void 0,void 0,pt),stencilBuffer:x.stencil,colorSpace:t.outputColorSpace,samples:x.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1,storeMultisampledDepthBuffer:h.ignoreDepthValues===!1,storeMultisampledStencilBuffer:h.ignoreDepthValues===!1})}else{let pt={antialias:x.antialias,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,pt),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),b=new Ze(f.framebufferWidth,f.framebufferHeight,{format:pn,type:Ge,colorSpace:t.outputColorSpace,stencilBuffer:x.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await s.requestReferenceSpace(o),Tt.setContext(s),Tt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return d.getDepthTexture()};function tt($){for(let dt=0;dt<$.removed.length;dt++){let pt=$.removed[dt],yt=T.indexOf(pt);yt>=0&&(T[yt]=null,A[yt].disconnect(pt))}for(let dt=0;dt<$.added.length;dt++){let pt=$.added[dt],yt=T.indexOf(pt);if(yt===-1){for(let Lt=0;Lt<A.length;Lt++)if(Lt>=T.length){T.push(pt),yt=Lt;break}else if(T[Lt]===null){T[Lt]=pt,yt=Lt;break}if(yt===-1)break}let ft=A[yt];ft&&ft.connect(pt)}}function q($,dt){dt===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(dt.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(s===null)return;let dt=$.near,pt=$.far;d.texture!==null&&(d.depthNear>0&&(dt=d.depthNear),d.depthFar>0&&(pt=d.depthFar)),V.near=C.near=L.near=dt,V.far=C.far=L.far=pt,(P!==V.near||G!==V.far)&&(s.updateRenderState({depthNear:V.near,depthFar:V.far}),P=V.near,G=V.far),V.layers.mask=$.layers.mask|6,L.layers.mask=V.layers.mask&-5,C.layers.mask=V.layers.mask&-3;let yt=$.parent,ft=V.cameras;q(V,yt);for(let Lt=0;Lt<ft.length;Lt++)q(ft[Lt],yt);V.projectionMatrix.copy(L.projectionMatrix),V.projectionMatrixInverse.copy(L.projectionMatrixInverse),F===null&&$.isPerspectiveCamera&&(F={camera:$,fov:$.fov,zoom:$.zoom}),H($,V,yt)};function H($,dt,pt){pt===null?$.matrix.copy(dt.matrixWorld):($.matrix.copy(pt.matrixWorld),$.matrix.invert(),$.matrix.multiply(dt.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(dt.projectionMatrix),$.projectionMatrixInverse.copy(dt.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=Ni*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return V},this.getFoveation=function(){if(!(h===null&&f===null))return c},this.setFoveation=function($){c=$,h!==null&&(h.fixedFoveation=$),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=$)},this.hasDepthSensing=function(){return d.texture!==null},this.getDepthSensingMesh=function(){return d.getMesh(V)},this.getCameraTexture=function($){return u[$]};let Y=null;function st($,dt){if(p=dt.getViewerPose(l||a),m=dt,p!==null){let pt=p.views;f!==null&&(t.setRenderTargetFramebuffer(b,f.framebuffer),t.setRenderTarget(b));let yt=!1;pt.length!==V.cameras.length&&(V.cameras.length=0,yt=!0);for(let wt=0;wt<pt.length;wt++){let Ut=pt[wt],Vt=null;if(f!==null)Vt=f.getViewport(Ut);else{let de=g.getViewSubImage(h,Ut);Vt=de.viewport,wt===0&&(t.setRenderTargetTextures(b,de.colorTexture,de.depthStencilTexture),t.setRenderTarget(b))}let Bt=N[wt];Bt===void 0&&(Bt=new Le,Bt.layers.enable(wt),Bt.viewport=new re,N[wt]=Bt),Bt.matrix.fromArray(Ut.transform.matrix),Bt.matrix.decompose(Bt.position,Bt.quaternion,Bt.scale),Bt.projectionMatrix.fromArray(Ut.projectionMatrix),Bt.projectionMatrixInverse.copy(Bt.projectionMatrix).invert(),Bt.viewport.set(Vt.x,Vt.y,Vt.width,Vt.height),wt===0&&(V.matrix.copy(Bt.matrix),V.matrix.decompose(V.position,V.quaternion,V.scale)),yt===!0&&V.cameras.push(Bt)}let ft=s.enabledFeatures;if(ft&&ft.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&_){g=n.getBinding();let wt=g.getDepthInformation(pt[0]);wt&&wt.isValid&&wt.texture&&d.init(wt,s.renderState)}if(ft&&ft.includes("camera-access")&&_){t.state.unbindTexture(),g=n.getBinding();for(let wt=0;wt<pt.length;wt++){let Ut=pt[wt].camera;if(Ut){let Vt=u[Ut];Vt||(Vt=new xs,u[Ut]=Vt);let Bt=g.getCameraImage(Ut);Vt.sourceTexture=Bt}}}}for(let pt=0;pt<A.length;pt++){let yt=T[pt],ft=A[pt];yt!==null&&ft!==void 0&&ft.update(yt,dt,l||a)}Y&&Y($,dt),dt.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:dt}),m=null}let Tt=new Rh;Tt.setAnimationLoop(st),this.setAnimationLoop=function($){Y=$},this.dispose=function(){}}},Ig=new Qt,Bh=new Dt;Bh.set(-1,0,0,0,1,0,0,0,1);function Lg(i,t){function e(d,u){d.matrixAutoUpdate===!0&&d.updateMatrix(),u.value.copy(d.matrix)}function n(d,u){u.color.getRGB(d.fogColor.value,ol(i)),u.isFog?(d.fogNear.value=u.near,d.fogFar.value=u.far):u.isFogExp2&&(d.fogDensity.value=u.density)}function s(d,u,x,M,b){u.isNodeMaterial?u.uniformsNeedUpdate=!1:u.isMeshBasicMaterial?r(d,u):u.isMeshLambertMaterial?(r(d,u),u.envMap&&(d.envMapIntensity.value=u.envMapIntensity)):u.isMeshToonMaterial?(r(d,u),g(d,u)):u.isMeshPhongMaterial?(r(d,u),p(d,u),u.envMap&&(d.envMapIntensity.value=u.envMapIntensity)):u.isMeshStandardMaterial?(r(d,u),h(d,u),u.isMeshPhysicalMaterial&&f(d,u,b)):u.isMeshMatcapMaterial?(r(d,u),m(d,u)):u.isMeshDepthMaterial?r(d,u):u.isMeshDistanceMaterial?(r(d,u),_(d,u)):u.isMeshNormalMaterial?r(d,u):u.isLineBasicMaterial?(a(d,u),u.isLineDashedMaterial&&o(d,u)):u.isPointsMaterial?c(d,u,x,M):u.isSpriteMaterial?l(d,u):u.isShadowMaterial?(d.color.value.copy(u.color),d.opacity.value=u.opacity):u.isShaderMaterial&&(u.uniformsNeedUpdate=!1)}function r(d,u){d.opacity.value=u.opacity,u.color&&d.diffuse.value.copy(u.color),u.emissive&&d.emissive.value.copy(u.emissive).multiplyScalar(u.emissiveIntensity),u.map&&(d.map.value=u.map,e(u.map,d.mapTransform)),u.alphaMap&&(d.alphaMap.value=u.alphaMap,e(u.alphaMap,d.alphaMapTransform)),u.bumpMap&&(d.bumpMap.value=u.bumpMap,e(u.bumpMap,d.bumpMapTransform),d.bumpScale.value=u.bumpScale,u.side===Ue&&(d.bumpScale.value*=-1)),u.normalMap&&(d.normalMap.value=u.normalMap,e(u.normalMap,d.normalMapTransform),d.normalScale.value.copy(u.normalScale),u.side===Ue&&d.normalScale.value.negate()),u.displacementMap&&(d.displacementMap.value=u.displacementMap,e(u.displacementMap,d.displacementMapTransform),d.displacementScale.value=u.displacementScale,d.displacementBias.value=u.displacementBias),u.emissiveMap&&(d.emissiveMap.value=u.emissiveMap,e(u.emissiveMap,d.emissiveMapTransform)),u.specularMap&&(d.specularMap.value=u.specularMap,e(u.specularMap,d.specularMapTransform)),u.alphaTest>0&&(d.alphaTest.value=u.alphaTest);let x=t.get(u),M=x.envMap,b=x.envMapRotation;M&&(d.envMap.value=M,d.envMapRotation.value.setFromMatrix4(Ig.makeRotationFromEuler(b)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&d.envMapRotation.value.premultiply(Bh),d.reflectivity.value=u.reflectivity,d.ior.value=u.ior,d.refractionRatio.value=u.refractionRatio),u.lightMap&&(d.lightMap.value=u.lightMap,d.lightMapIntensity.value=u.lightMapIntensity,e(u.lightMap,d.lightMapTransform)),u.aoMap&&(d.aoMap.value=u.aoMap,d.aoMapIntensity.value=u.aoMapIntensity,e(u.aoMap,d.aoMapTransform))}function a(d,u){d.diffuse.value.copy(u.color),d.opacity.value=u.opacity,u.map&&(d.map.value=u.map,e(u.map,d.mapTransform))}function o(d,u){d.dashSize.value=u.dashSize,d.totalSize.value=u.dashSize+u.gapSize,d.scale.value=u.scale}function c(d,u,x,M){d.diffuse.value.copy(u.color),d.opacity.value=u.opacity,d.size.value=u.size*x,d.scale.value=M*.5,u.map&&(d.map.value=u.map,e(u.map,d.uvTransform)),u.alphaMap&&(d.alphaMap.value=u.alphaMap,e(u.alphaMap,d.alphaMapTransform)),u.alphaTest>0&&(d.alphaTest.value=u.alphaTest)}function l(d,u){d.diffuse.value.copy(u.color),d.opacity.value=u.opacity,d.rotation.value=u.rotation,u.map&&(d.map.value=u.map,e(u.map,d.mapTransform)),u.alphaMap&&(d.alphaMap.value=u.alphaMap,e(u.alphaMap,d.alphaMapTransform)),u.alphaTest>0&&(d.alphaTest.value=u.alphaTest)}function p(d,u){d.specular.value.copy(u.specular),d.shininess.value=Math.max(u.shininess,1e-4)}function g(d,u){u.gradientMap&&(d.gradientMap.value=u.gradientMap)}function h(d,u){d.metalness.value=u.metalness,u.metalnessMap&&(d.metalnessMap.value=u.metalnessMap,e(u.metalnessMap,d.metalnessMapTransform)),d.roughness.value=u.roughness,u.roughnessMap&&(d.roughnessMap.value=u.roughnessMap,e(u.roughnessMap,d.roughnessMapTransform)),u.envMap&&(d.envMapIntensity.value=u.envMapIntensity)}function f(d,u,x){d.ior.value=u.ior,u.diffuseRoughness>0&&(d.diffuseRoughness.value=u.diffuseRoughness,u.diffuseRoughnessMap&&(d.diffuseRoughnessMap.value=u.diffuseRoughnessMap,e(u.diffuseRoughnessMap,d.diffuseRoughnessMapTransform))),u.sheen>0&&(d.sheenColor.value.copy(u.sheenColor).multiplyScalar(u.sheen),d.sheenRoughness.value=u.sheenRoughness,u.sheenColorMap&&(d.sheenColorMap.value=u.sheenColorMap,e(u.sheenColorMap,d.sheenColorMapTransform)),u.sheenRoughnessMap&&(d.sheenRoughnessMap.value=u.sheenRoughnessMap,e(u.sheenRoughnessMap,d.sheenRoughnessMapTransform))),u.clearcoat>0&&(d.clearcoat.value=u.clearcoat,d.clearcoatRoughness.value=u.clearcoatRoughness,u.clearcoatMap&&(d.clearcoatMap.value=u.clearcoatMap,e(u.clearcoatMap,d.clearcoatMapTransform)),u.clearcoatRoughnessMap&&(d.clearcoatRoughnessMap.value=u.clearcoatRoughnessMap,e(u.clearcoatRoughnessMap,d.clearcoatRoughnessMapTransform)),u.clearcoatNormalMap&&(d.clearcoatNormalMap.value=u.clearcoatNormalMap,e(u.clearcoatNormalMap,d.clearcoatNormalMapTransform),d.clearcoatNormalScale.value.copy(u.clearcoatNormalScale),u.side===Ue&&d.clearcoatNormalScale.value.negate())),u.dispersion>0&&(d.dispersion.value=u.dispersion),u.retroreflectivity>0&&(d.retroreflectivity.value=u.retroreflectivity),u.iridescence>0&&(d.iridescence.value=u.iridescence,d.iridescenceIOR.value=u.iridescenceIOR,d.iridescenceThicknessMinimum.value=u.iridescenceThicknessMinimum,d.iridescenceThicknessMaximum.value=u.iridescenceThicknessMaximum,u.iridescenceMap&&(d.iridescenceMap.value=u.iridescenceMap,e(u.iridescenceMap,d.iridescenceMapTransform)),u.iridescenceThicknessMap&&(d.iridescenceThicknessMap.value=u.iridescenceThicknessMap,e(u.iridescenceThicknessMap,d.iridescenceThicknessMapTransform))),u.transmission>0&&(d.transmission.value=u.transmission,d.transmissionSamplerMap.value=x.texture,d.transmissionSamplerSize.value.set(x.width,x.height),u.transmissionMap&&(d.transmissionMap.value=u.transmissionMap,e(u.transmissionMap,d.transmissionMapTransform)),d.thickness.value=u.thickness,u.thicknessMap&&(d.thicknessMap.value=u.thicknessMap,e(u.thicknessMap,d.thicknessMapTransform)),d.attenuationDistance.value=u.attenuationDistance,d.attenuationColor.value.copy(u.attenuationColor)),u.anisotropy>0&&(d.anisotropyVector.value.set(u.anisotropy*Math.cos(u.anisotropyRotation),u.anisotropy*Math.sin(u.anisotropyRotation)),u.anisotropyMap&&(d.anisotropyMap.value=u.anisotropyMap,e(u.anisotropyMap,d.anisotropyMapTransform))),d.specularIntensity.value=u.specularIntensity,d.specularColor.value.copy(u.specularColor),u.specularColorMap&&(d.specularColorMap.value=u.specularColorMap,e(u.specularColorMap,d.specularColorMapTransform)),u.specularIntensityMap&&(d.specularIntensityMap.value=u.specularIntensityMap,e(u.specularIntensityMap,d.specularIntensityMapTransform))}function m(d,u){u.matcap&&(d.matcap.value=u.matcap)}function _(d,u){let x=t.get(u).light;d.referencePosition.value.setFromMatrixPosition(x.matrixWorld),d.nearDistance.value=x.shadow.camera.near,d.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Dg(i,t,e,n){let s={},r={};function a(x,M){let b=M.program;n.uniformBlockBinding(x,b,s[x.id])}function o(x,M){let b=s[x.id];b===void 0&&(m(x),b=c(x),s[x.id]=b,x.addEventListener("dispose",d));let A=M.program;n.updateUBOMapping(x,A);let T=t.render.frame;r[x.id]!==T&&(l(x),r[x.id]=T)}function c(x){let M=i.createBuffer(),b=x.__size,A=x.usage;return i.bindBuffer(i.UNIFORM_BUFFER,M),i.bufferData(i.UNIFORM_BUFFER,b,A),i.bindBuffer(i.UNIFORM_BUFFER,null),M}function l(x){let M=s[x.id],b=x.uniforms,A=x.__cache;i.bindBuffer(i.UNIFORM_BUFFER,M);for(let T=0,v=b.length;T<v;T++){let E=b[T];if(Array.isArray(E))for(let F=0,L=E.length;F<L;F++)p(E[F],T,F,A);else p(E,T,0,A)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(x,M,b,A){if(h(x,M,b,A)===!0){let T=x.__offset,v=x.value;if(Array.isArray(v)){let E=0;for(let F=0;F<v.length;F++){let L=v[F],C=_(L,!0);g(L,x.__data,E),E+=C.storage/Float32Array.BYTES_PER_ELEMENT}}else g(v,x.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,T,x.__data)}}function g(x,M,b){typeof x=="number"||typeof x=="boolean"?M[b]=x:x.isMatrix3?(M[b]=x.elements[0],M[b+1]=x.elements[1],M[b+2]=x.elements[2],M[b+3]=0,M[b+4]=x.elements[3],M[b+5]=x.elements[4],M[b+6]=x.elements[5],M[b+7]=0,M[b+8]=x.elements[6],M[b+9]=x.elements[7],M[b+10]=x.elements[8],M[b+11]=0):ArrayBuffer.isView(x)?M.set(x.subarray(0,M.length-b),b):x.toArray(M,b)}function h(x,M,b,A){let T=x.value,v=M+"_"+b;if(Array.isArray(T)){A[v]===void 0&&(A[v]=[]);let E=A[v],F=!1;for(let L=0;L<T.length;L++)f(T[L],E,L)===!0&&(F=!0);return F}return f(T,A,v)}function f(x,M,b){if(M[b]===void 0)return typeof x=="number"||typeof x=="boolean"?M[b]=x:ArrayBuffer.isView(x)?M[b]=x.slice():M[b]=x.clone(),!0;{let A=M[b];if(typeof x=="number"||typeof x=="boolean"){if(A!==x)return M[b]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(A.equals(x)===!1)return A.copy(x),!0}}return!1}function m(x){let M=x.uniforms,b=0,A=16;for(let v=0,E=M.length;v<E;v++){let F=Array.isArray(M[v])?M[v]:[M[v]];for(let L=0,C=F.length;L<C;L++){let N=F[L],V=Array.isArray(N.value)?N.value:[N.value],P=Array.isArray(M[v])||Array.isArray(N.value),G=b;for(let k=0,tt=V.length;k<tt;k++){let q=V[k],H=_(q,P),Y=b%A,st=Y%H.boundary,Tt=Y+st;b+=st,Tt!==0&&A-Tt<H.storage&&(b+=A-Tt),k===0&&(G=b),b+=H.storage}let X=N.type==="int"?Int32Array:N.type==="uint"?Uint32Array:Float32Array;N.__data=new X((b-G)/Float32Array.BYTES_PER_ELEMENT),N.__offset=G}}let T=b%A;return T>0&&(b+=A-T),x.__size=b,x.__cache={},this}function _(x,M){let b={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(b.boundary=4,b.storage=4):x.isVector2?(b.boundary=8,b.storage=8):x.isVector3||x.isColor?(b.boundary=16,b.storage=12):x.isVector4?(b.boundary=16,b.storage=16):x.isMatrix3?(b.boundary=16,b.storage=48):x.isMatrix4?(b.boundary=16,b.storage=64):x.isTexture?Rt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(b.boundary=16,b.storage=x.byteLength):Rt("WebGLRenderer: Unsupported uniform value type.",x),M===!0&&(b.boundary=16,b.storage=Math.ceil(b.storage/16)*16),b}function d(x){let M=x.target;M.removeEventListener("dispose",d),i.deleteBuffer(s[M.id]),delete s[M.id],delete r[M.id]}function u(){for(let x in s)i.deleteBuffer(s[x]);s={},r={}}return{bind:a,update:o,dispose:u}}var Ng=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Sn=null;function Ug(){return Sn===null&&(Sn=new Dr(Ng,16,16,ti,fn),Sn.name="DFG_LUT",Sn.minFilter=De,Sn.magFilter=De,Sn.wrapS=xn,Sn.wrapT=xn,Sn.generateMipmaps=!1,Sn.needsUpdate=!0),Sn}var Va=class{constructor(t={}){let{canvas:e=Kc(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:p="default",failIfMajorPerformanceCaveat:g=!1,reversedDepthBuffer:h=!1,outputBufferType:f=Ge}=t;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=a;let _=f,d=new Set([oa,aa,ra]),u=new Set([Ge,un,qi,pi,ia,sa]),x=new Uint32Array(4),M=new Int32Array(4),b={textures:[],min:[],max:[],resolution:[]},A=null,T=null,v=[],E=[],F=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=yn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let L=this,C=!1,N=null,V=null,P=null,G=null;this._outputColorSpace=Xe;let X=0,k=0,tt=null,q=-1,H=null,Y=new re,st=new re,Tt=null,$=new Ot(0),dt=0,pt=e.width,yt=e.height,ft=1,Lt=null,te=null,wt=new re(0,0,pt,yt),Ut=new re(0,0,pt,yt),Vt=!1,Bt=new Yn,de=new Nr,fe=!1,Fe=!1,ae=new Qt,mn=new U,xe=new re,je={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Qe=!1;function tn(){return tt===null?ft:1}let D=n;function en(S,I){return e.getContext(S,I)}let ie,se,mt,pe,Ct,Nt,w,y,B,et,Q,rt,ht,J,K,ot,R,j,Z,lt,it,at,Et;try{let S={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:p,failIfMajorPerformanceCaveat:g};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"187"}`),e.addEventListener("webglcontextlost",At,!1),e.addEventListener("webglcontextrestored",zt,!1),e.addEventListener("webglcontextcreationerror",gt,!1),D===null){let I="webgl2";if(D=en(I,S),D===null)throw en(I)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}kt()}catch(S){throw e.removeEventListener("webglcontextlost",At,!1),e.removeEventListener("webglcontextrestored",zt,!1),e.removeEventListener("webglcontextcreationerror",gt,!1),Pt("WebGLRenderer: "+S.message),S}function kt(){ie=new qp(D),ie.init(),it=new Rg(D,ie),se=new Up(D,ie,t,it),mt=new Tg(D,ie),se.reversedDepthBuffer&&h&&mt.buffers.depth.setReversed(!0),V=D.createFramebuffer(),P=D.createFramebuffer(),G=D.createFramebuffer(),pe=new $p(D),Ct=new dg,Nt=new Ag(D,ie,mt,Ct,se,it,pe),w=new Xp(L),y=new Ju(D),at=new Dp(D,y),B=new Yp(D,y,pe,at),et=new Kp(D,B,y,at,pe),j=new Jp(D,se,Nt),K=new Fp(Ct),Q=new ug(L,w,ie,se,at,K),rt=new Lg(L,Ct),ht=new pg,J=new yg(ie),R=new Lp(L,w,mt,et,m,c),ot=new wg(L,et,se),Et=new Dg(D,pe,se,mt),Z=new Np(D,ie,pe),lt=new Zp(D,ie,pe),pe.programs=Q.programs,L.capabilities=se,L.extensions=ie,L.properties=Ct,L.renderLists=ht,L.shadowMap=ot,L.state=mt,L.info=pe}_!==Ge&&(F=new Qp(_,e.width,e.height,o,s,r));let nt=new yl(L,D);this.xr=nt,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){let S=ie.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=ie.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return ft},this.setPixelRatio=function(S){S!==void 0&&(ft=S,this.setSize(pt,yt,!1))},this.getSize=function(S){return S.set(pt,yt)},this.setSize=function(S,I,W=!0){if(nt.isPresenting){Rt("WebGLRenderer: Can't change size while VR device is presenting.");return}pt=S,yt=I,e.width=Math.floor(S*ft),e.height=Math.floor(I*ft),W===!0&&(e.style.width=S+"px",e.style.height=I+"px"),F!==null&&F.setSize(e.width,e.height),this.setViewport(0,0,S,I)},this.getDrawingBufferSize=function(S){return S.set(pt*ft,yt*ft).floor()},this.setDrawingBufferSize=function(S,I,W){pt=S,yt=I,ft=W,e.width=Math.floor(S*W),e.height=Math.floor(I*W),this.setViewport(0,0,S,I)},this.setEffects=function(S){if(_===Ge){Pt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let I=0;I<S.length;I++)if(S[I].isOutputPass===!0){Rt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}F.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(Y)},this.getViewport=function(S){return S.copy(wt)},this.setViewport=function(S,I,W,O){S.isVector4?wt.set(S.x,S.y,S.z,S.w):wt.set(S,I,W,O),mt.viewport(Y.copy(wt).multiplyScalar(tn()).round())},this.getScissor=function(S){return S.copy(Ut)},this.setScissor=function(S,I,W,O){S.isVector4?Ut.set(S.x,S.y,S.z,S.w):Ut.set(S,I,W,O),mt.scissor(st.copy(Ut).multiplyScalar(tn()).round())},this.getScissorTest=function(){return Vt},this.setScissorTest=function(S){mt.setScissorTest(Vt=S)},this.setOpaqueSort=function(S){Lt=S},this.setTransparentSort=function(S){te=S},this.getClearColor=function(S){return S.copy(R.getClearColor())},this.setClearColor=function(){R.setClearColor(...arguments)},this.getClearAlpha=function(){return R.getClearAlpha()},this.setClearAlpha=function(){R.setClearAlpha(...arguments)},this.clear=function(S=!0,I=!0,W=!0){let O=0;if(S){let z=!1;if(tt!==null){let ut=tt.texture.format;z=d.has(ut)}if(z){let ut=tt.texture.type,vt=u.has(ut),ct=R.getClearColor(),xt=R.getClearAlpha(),bt=ct.r,Ft=ct.g,Wt=ct.b;vt?(x[0]=bt,x[1]=Ft,x[2]=Wt,x[3]=xt,D.clearBufferuiv(D.COLOR,0,x)):(M[0]=bt,M[1]=Ft,M[2]=Wt,M[3]=xt,D.clearBufferiv(D.COLOR,0,M))}else O|=D.COLOR_BUFFER_BIT}I&&(O|=D.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),W&&(O|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),O!==0&&D.clear(O)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),N=S},this.dispose=function(){e.removeEventListener("webglcontextlost",At,!1),e.removeEventListener("webglcontextrestored",zt,!1),e.removeEventListener("webglcontextcreationerror",gt,!1),R.dispose(),ht.dispose(),J.dispose(),Nt.dispose(),Ct.dispose(),w.dispose(),et.dispose(),B.dispose(),at.dispose(),Et.dispose(),Q.dispose(),nt.dispose(),nt.removeEventListener("sessionstart",El),nt.removeEventListener("sessionend",wl),ei.stop()};function At(S){S.preventDefault(),il("WebGLRenderer: Context Lost."),C=!0}function zt(){il("WebGLRenderer: Context Restored."),C=!1;let S=pe.autoReset,I=ot.enabled,W=ot.autoUpdate,O=ot.needsUpdate,z=ot.type;kt(),pe.autoReset=S,ot.enabled=I,ot.autoUpdate=W,ot.needsUpdate=O,ot.type=z}function gt(S){Pt("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function Kt(S){let I=S.target;I.removeEventListener("dispose",Kt),ve(I)}function ve(S){kn(S),Ct.remove(S)}function kn(S){let I=Ct.get(S).programs;I!==void 0&&(I.forEach(function(W){Q.releaseProgram(W)}),S.isShaderMaterial&&Q.releaseShaderCache(S))}this.renderBufferDirect=function(S,I,W,O,z,ut){I===null&&(I=je);let vt=z.isMesh&&z.matrixWorld.determinantAffine()<0,ct=Wh(S,I,W,O,z);mt.setMaterial(O,vt);let xt=W.index,bt=1;if(O.wireframe===!0){if(xt=B.getWireframeAttribute(W),xt===void 0)return;bt=2}let Ft=W.drawRange,Wt=W.attributes.position,St=Ft.start*bt,Xt=(Ft.start+Ft.count)*bt;ut!==null&&(St=Math.max(St,ut.start*bt),Xt=Math.min(Xt,(ut.start+ut.count)*bt)),xt!==null?(St=Math.max(St,0),Xt=Math.min(Xt,xt.count)):Wt!=null&&(St=Math.max(St,0),Xt=Math.min(Xt,Wt.count));let he=Xt-St;if(he<0||he===1/0)return;at.setup(z,O,ct,W,xt);let ee,jt=Z;if(xt!==null&&(ee=y.get(xt),jt=lt,jt.setIndex(ee)),z.isMesh)O.wireframe===!0?(mt.setLineWidth(O.wireframeLinewidth*tn()),jt.setMode(D.LINES)):jt.setMode(D.TRIANGLES);else if(z.isLine){let we=O.linewidth;we===void 0&&(we=1),mt.setLineWidth(we*tn()),z.isLineSegments?jt.setMode(D.LINES):z.isLineLoop?jt.setMode(D.LINE_LOOP):jt.setMode(D.LINE_STRIP)}else z.isPoints?jt.setMode(D.POINTS):z.isSprite&&jt.setMode(D.TRIANGLES);if(z.isBatchedMesh)if(ie.get("WEBGL_multi_draw"))jt.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else{let we=z._multiDrawStarts,Mt=z._multiDrawCounts,Ie=z._multiDrawCount,Zt=xt?y.get(xt).bytesPerElement:1,ni=Ct.get(O).currentProgram.getUniforms();for(let Te=0;Te<Ie;Te++)ni.setValue(D,"_gl_DrawID",Te),jt.render(we[Te]/Zt,Mt[Te])}else if(z.isInstancedMesh)jt.renderInstances(St,he,z.count);else if(W.isInstancedBufferGeometry){let we=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,Mt=Math.min(W.instanceCount,we);jt.renderInstances(St,he,Mt)}else jt.render(St,he)};function bl(S,I,W,O){N!==null&&S.isNodeMaterial&&N.setObject(O,S),fe===!0&&K.setState(S,W,!1),S.transparent===!0&&S.side===Ke&&S.forceSinglePass===!1?(S.side=Ue,S.needsUpdate=!0,Ji(S,I,O),S.side=Qn,S.needsUpdate=!0,Ji(S,I,O),S.side=Ke):Ji(S,I,O)}this.compile=function(S,I,W=null){W===null&&(W=S),N!==null&&N.renderStart(S,I,W),T=J.get(W),T.init(I),E.push(T),W.traverseVisible(function(z){z.isLight&&z.layers.test(I.layers)&&(T.pushLight(z),z.castShadow&&T.pushShadow(z))}),S!==W&&S.traverseVisible(function(z){z.isLight&&z.layers.test(I.layers)&&(T.pushLight(z),z.castShadow&&T.pushShadow(z))}),T.setupLights(),N!==null&&N.updateLights(T.state.lightsArray),Fe=this.localClippingEnabled,fe=K.init(this.clippingPlanes,Fe),fe===!0&&K.setGlobalState(this.clippingPlanes,I),N!==null&&ot.render(T.state.shadowsArray,W,I);let O=new Set;return S.traverse(function(z){if(!(z.isMesh||z.isPoints||z.isLine||z.isSprite))return;let ut=z.material;if(ut)if(Array.isArray(ut))for(let vt=0;vt<ut.length;vt++){let ct=ut[vt];bl(ct,W,I,z),O.add(ct)}else bl(ut,W,I,z),O.add(ut)}),T=E.pop(),N!==null&&N.renderEnd(),O},this.compileAsync=function(S,I,W=null){let O=this.compile(S,I,W);return new Promise(z=>{function ut(){if(O.forEach(function(vt){let xt=Ct.get(vt).currentProgram;(xt===void 0||xt.isReady())&&O.delete(vt)}),O.size===0){z(S);return}setTimeout(ut,10)}ie.get("KHR_parallel_shader_compile")!==null?ut():setTimeout(ut,10)})};let Ya=null;function Vh(S){Ya&&Ya(S)}function El(){ei.stop()}function wl(){ei.start()}let ei=new Rh;ei.setAnimationLoop(Vh),typeof self<"u"&&ei.setContext(self),this.setAnimationLoop=function(S){Ya=S,nt.setAnimationLoop(S),S===null?ei.stop():ei.start()},nt.addEventListener("sessionstart",El),nt.addEventListener("sessionend",wl),this.render=function(S,I){if(I!==void 0&&I.isCamera!==!0){Pt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;N!==null&&N.renderStart(S,I);let W=nt.enabled===!0&&nt.isPresenting===!0,O=F!==null&&(tt===null||W)&&F.begin(L,tt);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),I.parent===null&&I.matrixWorldAutoUpdate===!0&&I.updateMatrixWorld(),nt.enabled===!0&&nt.isPresenting===!0&&(F===null||F.isCompositing()===!1)&&(nt.cameraAutoUpdate===!0&&nt.updateCamera(I),I=nt.getCamera()),S.isScene===!0&&S.onBeforeRender(L,S,I,tt),T=J.get(S,E.length),T.init(I),T.state.textureUnits=Nt.getTextureUnits(),E.push(T),ae.multiplyMatrices(I.projectionMatrix,I.matrixWorldInverse),I.isArrayCamera?de.setFromArrayCamera(I):Bt.setFromProjectionMatrix(ae,sn,I.reversedDepth),Fe=this.localClippingEnabled,fe=K.init(this.clippingPlanes,Fe),A=ht.get(S,v.length),A.init(),v.push(A),this.info.render.frame++,nt.enabled===!0&&nt.isPresenting===!0){let vt=L.xr.getDepthSensingMesh();vt!==null&&Za(vt,I,-1/0,L.sortObjects)}Za(S,I,0,L.sortObjects),A.finish(),N!==null&&N.updateLights(T.state.lightsArray),L.sortObjects===!0&&A.sort(Lt,te),Qe=nt.enabled===!1||nt.isPresenting===!1||nt.hasDepthSensing()===!1,Qe&&R.addToRenderList(A,S),this.info.autoReset===!0&&this.info.reset(),fe===!0&&K.beginShadows();let z=T.state.shadowsArray;if(ot.render(z,S,I),fe===!0&&K.endShadows(),(O&&F.hasRenderPass())===!1){let vt=A.opaque,ct=A.transmissive;if(T.setupLights(),I.isArrayCamera){let xt=I.cameras;if(ct.length>0)for(let bt=0,Ft=xt.length;bt<Ft;bt++){let Wt=xt[bt];Al(vt,ct,S,Wt)}Qe&&R.render(S);for(let bt=0,Ft=xt.length;bt<Ft;bt++){let Wt=xt[bt];Tl(A,S,Wt,Wt.viewport)}}else ct.length>0&&Al(vt,ct,S,I),Qe&&R.render(S),Tl(A,S,I)}tt!==null&&k===0&&(Nt.updateMultisampleRenderTarget(tt),Nt.updateRenderTargetMipmap(tt)),O&&F.end(L),S.isScene===!0&&S.onAfterRender(L,S,I),at.resetDefaultState(),q=-1,H=null,E.pop(),E.length>0?(T=E[E.length-1],Nt.setTextureUnits(T.state.textureUnits),fe===!0&&K.setGlobalState(L.clippingPlanes,T.state.camera)):T=null,v.pop(),v.length>0?A=v[v.length-1]:A=null,N!==null&&N.renderEnd()};function Za(S,I,W,O){if(S.visible===!1)return;if(S.layers.test(I.layers)){if(S.isGroup)W=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(I);else if(S.isLight)T.pushLight(S),S.castShadow&&T.pushShadow(S);else if(S.isSprite){let vt=I.isArrayCamera?de:Bt;if(!S.frustumCulled||S.intersectsFrustum(vt)){O&&xe.setFromMatrixPosition(S.matrixWorld).applyMatrix4(ae);let ct=et.update(S),xt=S.material;xt.visible&&A.push(S,ct,xt,W,xe.z,null,I)}}else if(S.isMesh||S.isLine||S.isPoints){let vt=I.isArrayCamera?de:Bt;if(!S.frustumCulled||S.intersectsFrustum(vt)){let ct=et.update(S),xt=S.material;if(O&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),xe.copy(S.boundingSphere.center)):(ct.boundingSphere===null&&ct.computeBoundingSphere(),xe.copy(ct.boundingSphere.center)),xe.applyMatrix4(S.matrixWorld).applyMatrix4(ae)),Array.isArray(xt)){let bt=ct.groups;for(let Ft=0,Wt=bt.length;Ft<Wt;Ft++){let St=bt[Ft],Xt=xt[St.materialIndex];Xt&&Xt.visible&&A.push(S,ct,Xt,W,xe.z,St,I)}}else xt.visible&&A.push(S,ct,xt,W,xe.z,null,I)}}}let ut=S.children;for(let vt=0,ct=ut.length;vt<ct;vt++)Za(ut[vt],I,W,O)}function Tl(S,I,W,O){let{opaque:z,transmissive:ut,transparent:vt}=S;T.setupLightsView(W),fe===!0&&K.setGlobalState(L.clippingPlanes,W),O&&mt.viewport(Y.copy(O)),z.length>0&&Gs(z,I,W),ut.length>0&&Gs(ut,I,W),vt.length>0&&Gs(vt,I,W),mt.buffers.depth.setTest(!0),mt.buffers.depth.setMask(!0),mt.buffers.color.setMask(!0),mt.setPolygonOffset(!1)}function Al(S,I,W,O){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[O.id]===void 0){let St=ie.has("EXT_color_buffer_half_float")||ie.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[O.id]=new Ze(1,1,{generateMipmaps:!0,type:St?fn:Ge,minFilter:On,samples:Math.max(4,se.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:qt.workingColorSpace})}let ut=T.state.transmissionRenderTarget[O.id],vt=O.viewport||Y;ut.setSize(vt.z*L.transmissionResolutionScale,vt.w*L.transmissionResolutionScale);let ct=L.getRenderTarget(),xt=L.getActiveCubeFace(),bt=L.getActiveMipmapLevel();L.setRenderTarget(ut),L.getClearColor($),dt=L.getClearAlpha(),dt<1&&L.setClearColor(16777215,.5),L.clear(),Qe&&R.render(W);let Ft=L.toneMapping;L.toneMapping=yn;let Wt=O.viewport;if(O.viewport!==void 0&&(O.viewport=void 0),T.setupLightsView(O),fe===!0&&K.setGlobalState(L.clippingPlanes,O),Gs(S,W,O),Nt.updateMultisampleRenderTarget(ut),Nt.updateRenderTargetMipmap(ut),ie.has("WEBGL_multisampled_render_to_texture")===!1){let St=!1;for(let Xt=0,he=I.length;Xt<he;Xt++){let ee=I[Xt],{object:jt,geometry:we,material:Mt,group:Ie}=ee;if(Mt.side===Ke&&jt.layers.test(O.layers)){let Zt=Mt.side;Mt.side=Ue,Mt.needsUpdate=!0,Rl(jt,W,O,we,Mt,Ie),Mt.side=Zt,Mt.needsUpdate=!0,St=!0}}St===!0&&(Nt.updateMultisampleRenderTarget(ut),Nt.updateRenderTargetMipmap(ut))}L.setRenderTarget(ct,xt,bt),L.setClearColor($,dt),Wt!==void 0&&(O.viewport=Wt),L.toneMapping=Ft}function Gs(S,I,W){let O=I.isScene===!0?I.overrideMaterial:null;for(let z=0,ut=S.length;z<ut;z++){let vt=S[z],{object:ct,geometry:xt,group:bt}=vt,Ft=vt.material;Ft.allowOverride===!0&&O!==null&&(Ft=O),ct.layers.test(W.layers)&&Rl(ct,I,W,xt,Ft,bt)}}function Rl(S,I,W,O,z,ut){N!==null&&z.isNodeMaterial&&N.setObject(S,z),S.onBeforeRender(L,I,W,O,z,ut),S.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),z.onBeforeRender(L,I,W,O,S,ut),z.transparent===!0&&z.side===Ke&&z.forceSinglePass===!1?(z.side=Ue,z.needsUpdate=!0,L.renderBufferDirect(W,I,O,z,S,ut),z.side=Qn,z.needsUpdate=!0,L.renderBufferDirect(W,I,O,z,S,ut),z.side=Ke):L.renderBufferDirect(W,I,O,z,S,ut),S.onAfterRender(L,I,W,O,z,ut)}function Cl(S){let I=0;for(let W of S)W.texture!==null&&I++;return I}function Ji(S,I,W){I.isScene!==!0&&(I=je);let O=Ct.get(S),z=T.state.lights,ut=T.state.shadowsArray,vt=z.state.version,ct=Q.getParameters(S,z.state,ut,I,W,T.state.lightProbeGridArray),xt=Q.getProgramCacheKey(ct),bt=O.programs;O.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?I.environment:null,O.fog=I.fog;let Ft=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;O.envMap=w.get(S.envMap||O.environment,Ft),O.envMapRotation=O.environment!==null&&S.envMap===null?I.environmentRotation:S.envMapRotation,bt===void 0&&(S.addEventListener("dispose",Kt),bt=new Map,O.programs=bt,O.programVariants=new Map);let Wt=bt.get(xt);if(Wt!==void 0){if(O.currentProgram===Wt&&O.lightsStateVersion===vt)return Il(S,ct),Wt}else ct.uniforms=Q.getUniforms(S),N!==null&&S.isNodeMaterial&&N.build(S,W,ct),S.onBeforeCompile(ct,L),Wt=Q.acquireProgram(ct,xt),bt.set(xt,Wt),O.uniforms=ct.uniforms;let St=O.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(St.clippingPlanes=K.uniform),Il(S,ct),O.needsLights=qh(S),O.lightsStateVersion=vt,O.needsLights&&(St.ambientLightColor.value=z.state.ambient,St.lightProbe.value=z.state.probe,St.sunLights.value=z.state.sun,St.sunLightShadows.value=z.state.sunShadow,St.directionalLights.value=z.state.directional,St.directionalLightShadows.value=z.state.directionalShadow,St.spotLights.value=z.state.spot,St.spotLightShadows.value=z.state.spotShadow,St.rectAreaLights.value=z.state.rectArea,St.ltc_1.value=z.state.rectAreaLTC1,St.ltc_2.value=z.state.rectAreaLTC2,St.pointLights.value=z.state.point,St.pointLightShadows.value=z.state.pointShadow,St.hemisphereLights.value=z.state.hemi,St.sunShadowMatrix.value=z.state.sunShadowMatrix,St.sunShadowCascade.value=z.state.sunShadowCascade,St.directionalShadowMatrix.value=z.state.directionalShadowMatrix,St.spotLightMatrix.value=z.state.spotLightMatrix,St.spotLightMap.value=z.state.spotLightMap,St.pointShadowMatrix.value=z.state.pointShadowMatrix),O.numLightProbeGrids=Cl(T.state.lightProbeGridArray),O.currentProgram=Wt,O.uniformsList=null,Wt}function Hh(S,I,W,O,z){let ut=Ct.get(S),vt=ut.currentProgram.id+","+O+","+z,ct=ut.programVariants.get(vt);return ct===void 0?(ct=Ji(S,I,W),ut.programVariants.set(vt,ct)):(ut.currentProgram=ct,ut.uniformsList=null,ut.outputColorSpace=O,ut.toneMapping=z),ct}function Pl(S){if(S.uniformsList===null){let I=S.currentProgram.getUniforms();S.uniformsList=Zi.seqWithValue(I.seq,S.uniforms)}return S.uniformsList}function Il(S,I){let W=Ct.get(S);W.outputColorSpace=I.outputColorSpace,W.batching=I.batching,W.batchingColor=I.batchingColor,W.instancing=I.instancing,W.instancingColor=I.instancingColor,W.instancingMorph=I.instancingMorph,W.skinning=I.skinning,W.morphTargets=I.morphTargets,W.morphNormals=I.morphNormals,W.morphColors=I.morphColors,W.morphTargetsCount=I.morphTargetsCount,W.numClippingPlanes=I.numClippingPlanes,W.numIntersection=I.numClipIntersection,W.vertexAlphas=I.vertexAlphas,W.vertexTangents=I.vertexTangents,W.toneMapping=I.toneMapping}function Wh(S,I,W,O,z){I.isScene!==!0&&(I=je),Nt.resetTextureUnits();let ut=I.fog,vt=O.isMeshStandardMaterial||O.isMeshLambertMaterial||O.isMeshPhongMaterial?I.environment:null,ct=tt===null?L.outputColorSpace:tt.isXRRenderTarget===!0?tt.texture.colorSpace:qt.workingColorSpace,xt=O.isMeshStandardMaterial||O.isMeshLambertMaterial&&!O.envMap||O.isMeshPhongMaterial&&!O.envMap,bt=w.get(O.envMap||vt,xt),Ft=O.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Wt=!!W.attributes.tangent&&(!!O.normalMap||O.anisotropy>0),St=!!W.morphAttributes.position,Xt=!!W.morphAttributes.normal,he=!!W.morphAttributes.color,ee=yn;O.toneMapped&&(tt===null||tt.isXRRenderTarget===!0)&&(ee=L.toneMapping);let jt=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,we=jt!==void 0?jt.length:0,Mt=Ct.get(O),Ie=T.state.lights;if(fe===!0&&(Fe===!0||S!==H)){let oe=S===H&&O.id===q;K.setState(O,S,oe)}let Zt=!1,ni=!1;O.version===Mt.__version?Mt.needsLights&&Mt.lightsStateVersion!==Ie.state.version||z.isBatchedMesh&&Mt.batching===!1||!z.isBatchedMesh&&Mt.batching===!0||z.isBatchedMesh&&Mt.batchingColor===!0&&z._colorsTexture===null||z.isBatchedMesh&&Mt.batchingColor===!1&&z._colorsTexture!==null||z.isInstancedMesh&&Mt.instancing===!1||!z.isInstancedMesh&&Mt.instancing===!0||z.isSkinnedMesh&&Mt.skinning===!1||!z.isSkinnedMesh&&Mt.skinning===!0||z.isInstancedMesh&&Mt.instancingColor===!0&&z.instanceColor===null||z.isInstancedMesh&&Mt.instancingColor===!1&&z.instanceColor!==null||z.isInstancedMesh&&Mt.instancingMorph===!0&&z.morphTexture===null||z.isInstancedMesh&&Mt.instancingMorph===!1&&z.morphTexture!==null||Mt.envMap!==bt||O.fog===!0&&Mt.fog!==ut||Mt.numClippingPlanes!==void 0&&(Mt.numClippingPlanes!==K.numPlanes||Mt.numIntersection!==K.numIntersection)||Mt.vertexAlphas!==Ft||Mt.vertexTangents!==Wt||Mt.morphTargets!==St||Mt.morphNormals!==Xt||Mt.morphColors!==he||Mt.morphTargetsCount!==we||Mt.numLightProbeGrids!==Cl(T.state.lightProbeGridArray)?Zt=!0:(Mt.outputColorSpace!==ct||Mt.toneMapping!==ee)&&(ni=!0):(Zt=!0,Mt.__version=O.version);let Te=Mt.currentProgram;(Zt===!0||ni===!0)&&(Te=ni===!0?Hh(O,I,z,ct,ee):Ji(O,I,z),N&&O.isNodeMaterial&&N.onUpdateProgram(O,Te,Mt));let Vs=!1,Gn=!1,ii=!1,Yt=Te.getUniforms(),be=Mt.uniforms;if(mt.useProgram(Te.program)&&(Vs=!0,Gn=!0,ii=!0),O.id!==q&&(q=O.id,Gn=!0),Vs||H!==S){mt.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),Yt.setValue(D,"projectionMatrix",S.projectionMatrix),Yt.setValue(D,"viewMatrix",S.matrixWorldInverse);let ye=Yt.map.cameraPosition;ye!==void 0&&ye.setValue(D,mn.setFromMatrixPosition(S.matrixWorld)),se.logarithmicDepthBuffer&&Yt.setValue(D,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(O.isMeshPhongMaterial||O.isMeshToonMaterial||O.isMeshLambertMaterial||O.isMeshBasicMaterial||O.isMeshStandardMaterial||O.isShaderMaterial)&&Yt.setValue(D,"isOrthographic",S.isOrthographicCamera===!0),H!==S&&(H=S,Gn=!0,ii=!0)}if(Mt.needsLights&&(Ie.state.sunShadowMap.length>0&&Yt.setValue(D,"sunShadowMap",Ie.state.sunShadowMap,Nt),Ie.state.directionalShadowMap.length>0&&Yt.setValue(D,"directionalShadowMap",Ie.state.directionalShadowMap,Nt),Ie.state.spotShadowMap.length>0&&Yt.setValue(D,"spotShadowMap",Ie.state.spotShadowMap,Nt),Ie.state.pointShadowMap.length>0&&Yt.setValue(D,"pointShadowMap",Ie.state.pointShadowMap,Nt)),z.isSkinnedMesh){Yt.setOptional(D,z,"bindMatrix"),Yt.setOptional(D,z,"bindMatrixInverse");let oe=z.skeleton;oe&&(oe.boneTexture===null&&oe.computeBoneTexture(),Yt.setValue(D,"boneTexture",oe.boneTexture,Nt))}z.isBatchedMesh&&(Yt.setOptional(D,z,"batchingTexture"),Yt.setValue(D,"batchingTexture",z._matricesTexture,Nt),Yt.setOptional(D,z,"batchingIdTexture"),Yt.setValue(D,"batchingIdTexture",z._indirectTexture,Nt),Yt.setOptional(D,z,"batchingColorTexture"),z._colorsTexture!==null&&Yt.setValue(D,"batchingColorTexture",z._colorsTexture,Nt));let an=W.morphAttributes;if((an.position!==void 0||an.normal!==void 0||an.color!==void 0)&&j.update(z,W,Te),(Gn||Mt.receiveShadow!==z.receiveShadow)&&(Mt.receiveShadow=z.receiveShadow,Yt.setValue(D,"receiveShadow",z.receiveShadow)),(O.isMeshStandardMaterial||O.isMeshLambertMaterial||O.isMeshPhongMaterial)&&O.envMap===null&&I.environment!==null&&(be.envMapIntensity.value=I.environmentIntensity),be.dfgLUT!==void 0&&(be.dfgLUT.value=Ug()),Gn){if(Yt.setValue(D,"toneMappingExposure",L.toneMappingExposure),Mt.needsLights&&Xh(be,ii),ut&&O.fog===!0&&rt.refreshFogUniforms(be,ut),rt.refreshMaterialUniforms(be,O,ft,yt,T.state.transmissionRenderTarget[S.id]),Mt.needsLights&&Mt.numLightProbeGrids>0){let oe=b,ye=0;for(let bn of T.state.lightProbeGridArray)bn.texture!==null&&(oe.textures[ye]=bn.texture,oe.min[ye]=bn.boundingBox.min,oe.max[ye]=bn.boundingBox.max,oe.resolution[ye]=bn.resolution,ye++);for(let bn in oe)oe[bn].length=ye;be.probesSH.value=oe.textures,be.probesMin.value=oe.min,be.probesMax.value=oe.max,be.probesResolution.value=oe.resolution}Zi.upload(D,Pl(Mt),be,Nt)}if(O.isShaderMaterial&&O.uniformsNeedUpdate===!0&&(Zi.upload(D,Pl(Mt),be,Nt),O.uniformsNeedUpdate=!1),O.isSpriteMaterial&&Yt.setValue(D,"center",z.center),Yt.setValue(D,"modelViewMatrix",z.modelViewMatrix),Yt.setValue(D,"normalMatrix",z.normalMatrix),Yt.setValue(D,"modelMatrix",z.matrixWorld),O.uniformsGroups!==void 0){let oe=O.uniformsGroups;for(let ye=0,bn=oe.length;ye<bn;ye++){let Dl=oe[ye];Et.update(Dl,Te),Et.bind(Dl,Te)}}return Te}function Xh(S,I){S.ambientLightColor.needsUpdate=I,S.lightProbe.needsUpdate=I,S.sunLights.needsUpdate=I,S.sunLightShadows.needsUpdate=I,S.directionalLights.needsUpdate=I,S.directionalLightShadows.needsUpdate=I,S.pointLights.needsUpdate=I,S.pointLightShadows.needsUpdate=I,S.spotLights.needsUpdate=I,S.spotLightShadows.needsUpdate=I,S.rectAreaLights.needsUpdate=I,S.hemisphereLights.needsUpdate=I}function qh(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return X},this.getActiveMipmapLevel=function(){return k},this.getRenderTarget=function(){return tt},this.setRenderTargetTextures=function(S,I,W){let O=Ct.get(S);O.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,O.__autoAllocateDepthBuffer===!1&&(O.__useRenderToTexture=!1),Ct.get(S.texture).__webglTexture=I,Ct.get(S.depthTexture).__webglTexture=O.__autoAllocateDepthBuffer?void 0:W,O.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,I){let W=Ct.get(S);W.__webglFramebuffer=I,W.__useDefaultFramebuffer=I===void 0},this.setRenderTarget=function(S,I=0,W=0){tt=S,X=I,k=W;let O=null,z=!1,ut=!1;if(S){let ct=Ct.get(S);if(ct.__useDefaultFramebuffer!==void 0){mt.bindFramebuffer(D.FRAMEBUFFER,ct.__webglFramebuffer),Y.copy(S.viewport),st.copy(S.scissor),Tt=S.scissorTest,mt.viewport(Y),mt.scissor(st),mt.setScissorTest(Tt),q=-1;return}else if(ct.__webglFramebuffer===void 0)Nt.setupRenderTarget(S);else if(ct.__hasExternalTextures)Nt.rebindTextures(S,Ct.get(S.texture).__webglTexture,Ct.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){let Ft=S.depthTexture;if(ct.__boundDepthTexture!==Ft){if(Ft!==null&&Ct.has(Ft)&&(S.width!==Ft.image.width||S.height!==Ft.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Nt.setupDepthRenderbuffer(S)}}let xt=S.texture;(xt.isData3DTexture||xt.isDataArrayTexture||xt.isCompressedArrayTexture)&&(ut=!0);let bt=Ct.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(bt[I])?O=bt[I][W]:O=bt[I],z=!0):S.samples>0&&Nt.useMultisampledRTT(S)===!1?O=Ct.get(S).__webglMultisampledFramebuffer:Array.isArray(bt)?O=bt[W]:O=bt,Y.copy(S.viewport),st.copy(S.scissor),Tt=S.scissorTest}else Y.copy(wt).multiplyScalar(ft).floor(),st.copy(Ut).multiplyScalar(ft).floor(),Tt=Vt;if(W!==0&&(O=V),mt.bindFramebuffer(D.FRAMEBUFFER,O)&&mt.drawBuffers(S,O),mt.viewport(Y),mt.scissor(st),mt.setScissorTest(Tt),z){let ct=Ct.get(S.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+I,ct.__webglTexture,W)}else if(ut){let ct=I;for(let xt=0;xt<S.textures.length;xt++){let bt=Ct.get(S.textures[xt]);D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0+xt,bt.__webglTexture,W,ct)}}else if(S!==null&&W!==0){let ct=Ct.get(S.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,ct.__webglTexture,W)}q=-1};function Ll(S){let I=Ct.get(S);return(I.__readFormat!==S.format||I.__readType!==S.type)&&(I.__readFormat=S.format,I.__readType=S.type,I.__formatReadable=se.textureFormatReadable(S.format),I.__typeReadable=se.textureTypeReadable(S.type)),I}this.readRenderTargetPixels=function(S,I,W,O,z,ut,vt,ct=0){if(!(S&&S.isWebGLRenderTarget)){Pt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let xt=Ct.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&vt!==void 0&&(xt=xt[vt],Array.isArray(xt)&&(xt=xt[0])),xt){mt.bindFramebuffer(D.FRAMEBUFFER,xt);try{let bt=S.textures[ct],Ft=bt.format,Wt=bt.type;S.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+ct);let St=Ll(bt);if(St.__formatReadable===!1){Pt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(St.__typeReadable===!1){Pt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}I>=0&&I<=S.width-O&&W>=0&&W<=S.height-z&&D.readPixels(I,W,O,z,it.convert(Ft),it.convert(Wt),ut)}finally{let bt=tt!==null?Ct.get(tt).__webglFramebuffer:null;mt.bindFramebuffer(D.FRAMEBUFFER,bt)}}},this.readRenderTargetPixelsAsync=async function(S,I,W,O,z,ut,vt,ct=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let xt=Ct.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&vt!==void 0&&(xt=xt[vt],Array.isArray(xt)&&(xt=xt[0])),xt)if(I>=0&&I<=S.width-O&&W>=0&&W<=S.height-z){mt.bindFramebuffer(D.FRAMEBUFFER,xt);let bt=S.textures[ct],Ft=bt.format,Wt=bt.type;S.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+ct);let St=Ll(bt);if(St.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(St.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Xt=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Xt),D.bufferData(D.PIXEL_PACK_BUFFER,ut.byteLength,D.STREAM_READ),D.readPixels(I,W,O,z,it.convert(Ft),it.convert(Wt),0),D.bindBuffer(D.PIXEL_PACK_BUFFER,null);let he=tt!==null?Ct.get(tt).__webglFramebuffer:null;mt.bindFramebuffer(D.FRAMEBUFFER,he);let ee=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await Qc(D,ee,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Xt),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,ut),D.bindBuffer(D.PIXEL_PACK_BUFFER,null),D.deleteBuffer(Xt),D.deleteSync(ee),ut}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,I=null,W=0){let O=Math.pow(2,-W),z=Math.floor(S.image.width*O),ut=Math.floor(S.image.height*O),vt=I!==null?I.x:0,ct=I!==null?I.y:0;Nt.setTexture2D(S,0),D.copyTexSubImage2D(D.TEXTURE_2D,W,0,0,vt,ct,z,ut),mt.unbindTexture()},this.copyTextureToTexture=function(S,I,W=null,O=null,z=0,ut=0){let vt,ct,xt,bt,Ft,Wt,St,Xt,he,ee=S.isCompressedTexture?S.mipmaps[ut]:S.image;if(W!==null)vt=W.max.x-W.min.x,ct=W.max.y-W.min.y,xt=W.isBox3?W.max.z-W.min.z:1,bt=W.min.x,Ft=W.min.y,Wt=W.isBox3?W.min.z:0;else{let Yt=Math.pow(2,-z);vt=Math.floor(ee.width*Yt),ct=Math.floor(ee.height*Yt),S.isDataArrayTexture?xt=ee.depth:S.isData3DTexture?xt=Math.floor(ee.depth*Yt):xt=1,bt=0,Ft=0,Wt=0}O!==null?(St=O.x,Xt=O.y,he=O.z):(St=0,Xt=0,he=0);let jt=it.convert(I.format),we=it.convert(I.type),Mt;I.isData3DTexture?(Nt.setTexture3D(I,0),Mt=D.TEXTURE_3D):I.isDataArrayTexture||I.isCompressedArrayTexture?(Nt.setTexture2DArray(I,0),Mt=D.TEXTURE_2D_ARRAY):(Nt.setTexture2D(I,0),Mt=D.TEXTURE_2D),mt.activeTexture(D.TEXTURE0),mt.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,I.flipY),mt.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,I.premultiplyAlpha),mt.pixelStorei(D.UNPACK_ALIGNMENT,I.unpackAlignment);let Ie=mt.getParameter(D.UNPACK_ROW_LENGTH),Zt=mt.getParameter(D.UNPACK_IMAGE_HEIGHT),ni=mt.getParameter(D.UNPACK_SKIP_PIXELS),Te=mt.getParameter(D.UNPACK_SKIP_ROWS),Vs=mt.getParameter(D.UNPACK_SKIP_IMAGES);mt.pixelStorei(D.UNPACK_ROW_LENGTH,ee.width),mt.pixelStorei(D.UNPACK_IMAGE_HEIGHT,ee.height),mt.pixelStorei(D.UNPACK_SKIP_PIXELS,bt),mt.pixelStorei(D.UNPACK_SKIP_ROWS,Ft),mt.pixelStorei(D.UNPACK_SKIP_IMAGES,Wt);let Gn=S.isDataArrayTexture||S.isData3DTexture,ii=I.isDataArrayTexture||I.isData3DTexture;if(S.isDepthTexture){let Yt=Ct.get(S),be=Ct.get(I),an=Ct.get(Yt.__renderTarget),oe=Ct.get(be.__renderTarget);mt.bindFramebuffer(D.READ_FRAMEBUFFER,an.__webglFramebuffer),mt.bindFramebuffer(D.DRAW_FRAMEBUFFER,oe.__webglFramebuffer);for(let ye=0;ye<xt;ye++)Gn&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Ct.get(S).__webglTexture,z,Wt+ye),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Ct.get(I).__webglTexture,ut,he+ye)),D.blitFramebuffer(bt,Ft,bt+vt,Ft+ct,St,Xt,St+vt,Xt+ct,D.DEPTH_BUFFER_BIT,D.NEAREST);mt.bindFramebuffer(D.READ_FRAMEBUFFER,null),mt.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(z!==0||S.isRenderTargetTexture||Ct.has(S)){let Yt=Ct.get(S),be=Ct.get(I);mt.bindFramebuffer(D.READ_FRAMEBUFFER,P),mt.bindFramebuffer(D.DRAW_FRAMEBUFFER,G);for(let an=0;an<xt;an++)Gn?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Yt.__webglTexture,z,Wt+an):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Yt.__webglTexture,z),ii?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,be.__webglTexture,ut,he+an):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,be.__webglTexture,ut),z!==0?D.blitFramebuffer(bt,Ft,bt+vt,Ft+ct,St,Xt,St+vt,Xt+ct,D.COLOR_BUFFER_BIT,D.NEAREST):ii?D.copyTexSubImage3D(Mt,ut,St,Xt,he+an,bt,Ft,vt,ct):D.copyTexSubImage2D(Mt,ut,St,Xt,bt,Ft,vt,ct);mt.bindFramebuffer(D.READ_FRAMEBUFFER,null),mt.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else ii?S.isDataTexture||S.isData3DTexture?D.texSubImage3D(Mt,ut,St,Xt,he,vt,ct,xt,jt,we,ee.data):I.isCompressedArrayTexture?D.compressedTexSubImage3D(Mt,ut,St,Xt,he,vt,ct,xt,jt,ee.data):D.texSubImage3D(Mt,ut,St,Xt,he,vt,ct,xt,jt,we,ee):S.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,ut,St,Xt,vt,ct,jt,we,ee.data):S.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,ut,St,Xt,ee.width,ee.height,jt,ee.data):D.texSubImage2D(D.TEXTURE_2D,ut,St,Xt,vt,ct,jt,we,ee);mt.pixelStorei(D.UNPACK_ROW_LENGTH,Ie),mt.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Zt),mt.pixelStorei(D.UNPACK_SKIP_PIXELS,ni),mt.pixelStorei(D.UNPACK_SKIP_ROWS,Te),mt.pixelStorei(D.UNPACK_SKIP_IMAGES,Vs),ut===0&&I.generateMipmaps===!0&&I.mipmapsAutoUpdate===!0&&D.generateMipmap(Mt),mt.unbindTexture()},this.initRenderTarget=function(S){Ct.get(S).__webglFramebuffer===void 0&&Nt.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?Nt.setTextureCube(S,0):S.isData3DTexture?Nt.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?Nt.setTexture2DArray(S,0):Nt.setTexture2D(S,0),mt.unbindTexture()},this.resetState=function(){X=0,k=0,tt=null,mt.reset(),at.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return sn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=qt._getDrawingBufferColorSpace(t),e.unpackColorSpace=qt._getUnpackColorSpace()}};var zh={type:"change"},Ml={type:"start"},Gh={type:"end"},Xa=new ci,kh=new qe,Og=Math.cos(70*Fs.DEG2RAD),_e=new U,Ve=2*Math.PI,$t={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Sl=1e-6,qa=class extends As{constructor(t,e=null){super(t,e),this.state=$t.NONE,this.target=new U,this.cursor=new U,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Kn.ROTATE,MIDDLE:Kn.DOLLY,RIGHT:Kn.PAN},this.touches={ONE:jn.ROTATE,TWO:jn.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new U,this._lastQuaternion=new Ye,this._lastTargetPosition=new U,this._quat=new Ye().setFromUnitVectors(t.up,new U(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Vi,this._sphericalDelta=new Vi,this._scale=1,this._panOffset=new U,this._rotateStart=new It,this._rotateEnd=new It,this._rotateDelta=new It,this._panStart=new It,this._panEnd=new It,this._panDelta=new It,this._dollyStart=new It,this._dollyEnd=new It,this._dollyDelta=new It,this._dollyDirection=new U,this._mouse=new It,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=zg.bind(this),this._onPointerDown=Bg.bind(this),this._onPointerUp=kg.bind(this),this._onContextMenu=Yg.bind(this),this._onMouseWheel=Hg.bind(this),this._onKeyDown=Wg.bind(this),this._onTouchStart=Xg.bind(this),this._onTouchMove=qg.bind(this),this._onMouseDown=Gg.bind(this),this._onMouseMove=Vg.bind(this),this._interceptControlDown=Zg.bind(this),this._interceptControlUp=$g.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=$t.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(zh),this.update(),this.state=$t.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){let e=this.object.position;_e.copy(e).sub(this.target),_e.applyQuaternion(this._quat),this._spherical.setFromVector3(_e),this.autoRotate&&this.state===$t.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=Ve:n>Math.PI&&(n-=Ve),s<-Math.PI?s+=Ve:s>Math.PI&&(s-=Ve),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(_e.setFromSpherical(this._spherical),_e.applyQuaternion(this._quatInverse),e.copy(this.target).add(_e),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=_e.length();a=this._clampDistance(o*this._scale);let c=o-a;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),r=!!c}else if(this.object.isOrthographicCamera){let o=new U(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=c!==this.object.zoom;let l=new U(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(o),this.object.updateMatrixWorld(),a=_e.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(Xa.origin.copy(this.object.position),Xa.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Xa.direction))<Og?this.object.lookAt(this.target):(kh.setFromNormalAndCoplanarPoint(this.object.up,this.target),Xa.intersectPlane(kh,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Sl||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Sl||this._lastTargetPosition.distanceToSquared(this.target)>Sl?(this.dispatchEvent(zh),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?Ve/60*this.autoRotateSpeed*t:Ve/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){_e.setFromMatrixColumn(e,0),_e.multiplyScalar(-t),this._panOffset.add(_e)}_panUp(t,e){this.screenSpacePanning===!0?_e.setFromMatrixColumn(e,1):(_e.setFromMatrixColumn(e,0),_e.crossVectors(this.object.up,_e)),_e.multiplyScalar(t),this._panOffset.add(_e)}_pan(t,e){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;_e.copy(s).sub(this.target);let r=_e.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,a=n.width,o=n.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientY),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Ve*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ve*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(Ve*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-Ve*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(Ve*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-Ve*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(Ve*this._rotateDelta.x/e.clientHeight),this._rotateUp(Ve*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(t.pageX+e.x)*.5,o=(t.pageY+e.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new It,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function Bg(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function zg(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function kg(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Gh),this.state=$t.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function Gg(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Kn.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=$t.DOLLY;break;case Kn.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=$t.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=$t.ROTATE}break;case Kn.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=$t.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=$t.PAN}break;default:this.state=$t.NONE}this.state!==$t.NONE&&this.dispatchEvent(Ml)}function Vg(i){switch(this.state){case $t.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case $t.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case $t.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function Hg(i){this.enabled===!1||this.enableZoom===!1||this.state!==$t.NONE||(i.preventDefault(),this.dispatchEvent(Ml),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Gh))}function Wg(i){this.enabled!==!1&&this._handleKeyDown(i)}function Xg(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case jn.ROTATE:if(this.enableRotate===!1){this.state=$t.NONE;break}this._handleTouchStartRotate(i),this.state=$t.TOUCH_ROTATE;break;case jn.PAN:if(this.enablePan===!1){this.state=$t.NONE;break}this._handleTouchStartPan(i),this.state=$t.TOUCH_PAN;break;default:this.state=$t.NONE}break;case 2:switch(this.touches.TWO){case jn.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=$t.TOUCH_DOLLY_PAN;break;case jn.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=$t.TOUCH_DOLLY_ROTATE;break;default:this.state=$t.NONE}break;default:this.state=$t.NONE}this.state!==$t.NONE&&this.dispatchEvent(Ml)}function qg(i){switch(this._trackPointer(i),this.state){case $t.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case $t.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case $t.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case $t.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=$t.NONE}}function Yg(i){this.enabled!==!1&&i.preventDefault()}function Zg(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function $g(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}(function(){let i=new Set,t=new Map;function e(h){for(let f of h.requests||[])f.users.delete(h),!f.users.size&&!f.done&&(f.abort.abort(),f.worker?.terminate(),f.reject?.(new DOMException("Cancelled","AbortError")),t.delete(f.key));h.requests?.clear()}async function n(h,f){let m=f.format+":"+f.contentId,_=t.get(m);return _||(_={key:m,users:new Set,abort:new AbortController},t.set(m,_),_.promise=(async()=>{try{let d=await fetch(f.url,{signal:_.abort.signal,credentials:"same-origin"});if(!d.ok)throw Error("Preview content is unavailable ("+d.status+").");let u=await d.arrayBuffer();if(u.byteLength>h.meta.maxBytes)throw Error("Preview content exceeds the browser size limit.");if(_.abort.signal.aborted)throw new DOMException("Cancelled","AbortError");let x=new Worker("/cad-worker.js");return _.worker=x,await new Promise((b,A)=>{_.reject=A,x.onmessage=T=>T.data.ok?b(T.data):A(Error(T.data.error)),x.onerror=T=>A(Error(T.message||"CAD parser failed.")),x.postMessage({format:f.format,bytes:u},[u])})}catch(d){throw t.delete(m),d}finally{_.worker?.terminate(),_.worker=null,_.reject=null,_.done=!0}})()),_.users.add(h),h.requests.add(_),_.promise}async function s(h,f){if(f.format!=="scene")return n(h,f);let m=new Map;for(let d=0;d<f.assets.length;d+=2){let u=f.assets.slice(d,d+2);if(await Promise.all(u.map(async x=>m.set(x.path,await n(h,x)))),h.modelAbort.signal.aborted)throw new DOMException("Cancelled","AbortError")}let _=[];for(let d of f.components){let u=m.get(d.asset);for(let[x,M]of u.meshes.entries())_.push({...M,name:d.name+(u.meshes.length>1?" / Body "+(x+1):""),componentId:d.id,source:d.source,assetKey:f.assets.find(b=>b.path===d.asset).contentId+":"+x,transform:d.transform})}return{meshes:_}}let r=h=>h>1024**2?(h/1024**2).toFixed(1)+" MiB":(h/1024).toFixed(1)+" KiB";function a(){for(let h of i){h.abort.abort(),h.modelAbort?.abort(),e(h),h.observer?.disconnect(),h.controls?.dispose(),h.renderer?.setAnimationLoop(null);let f=new Set,m=new Set;h.scene?.traverse(_=>{if(_.geometry&&f.add(_.geometry),_.material)for(let d of Array.isArray(_.material)?_.material:[_.material])m.add(d)});for(let _ of f)_.dispose();for(let _ of m)_.dispose();h.renderer?.dispose(),h.renderer?.forceContextLoss()}i.clear(),t.clear()}async function o(h,f={}){if(!h)return;let m={container:h,abort:new AbortController,requests:new Set,loadId:0},_=new URLSearchParams({ref:h.dataset.ref,path:h.dataset.path});i.add(m),h.innerHTML='<div class="viewer-intro"><strong>3D preview</strong><span class="viewer-status" role="status">Checking preview version\u2026</span></div><div class="viewer-start"><button class="button primary" data-load hidden>Load 3D preview</button><a class="button small" href="/tools/Export-SolidWorksPreview.ps1" data-helper hidden>Download SolidWorks helper</a><button class="button small" data-cancel hidden>Cancel</button></div><div class="viewer-workspace" hidden><div class="viewer-stage" aria-label="Interactive 3D model"></div><aside class="viewer-components"><div class="viewer-components-heading"><strong>Components / bodies</strong><button class="button small" data-show-all>Show all</button></div><div class="viewer-component-list"></div></aside></div><div class="viewer-toolbar" hidden><button class="button small" data-view="iso">Isometric</button><button class="button small" data-view="front">Front</button><button class="button small" data-view="top">Top</button><button class="button small" data-view="right">Right</button><button class="button small" data-view="fit">Fit</button><label>Up <select data-up-axis aria-label="Up axis"><option value="y">Y</option><option value="z">Z</option></select></label><label><input type="checkbox" data-edges>Edges</label><label>Explode <input type="range" data-explode min="0" max="100" value="0" aria-label="Exploded view"></label><button class="button small" data-fullscreen>Fullscreen</button></div><p class="viewer-help" hidden>\u5DE6\u952E\u65CB\u8F6C \xB7 \u53F3\u952E\u5E73\u79FB \xB7 \u6EDA\u8F6E\u7F29\u653E\u3002\u7EC4\u4EF6\u5217\u8868\u53EF\u9690\u85CF\u6216\u5355\u72EC\u67E5\u770B\u5B9E\u4F53\u3002\u9884\u89C8\u7528\u4E8E\u67E5\u770B\uFF0C\u4E0D\u6539\u53D8\u539F\u59CB\u56FE\u7EB8\u3002</p>';let d=h.querySelector(".viewer-status"),u=h.querySelector("[data-load]"),x=h.querySelector("[data-cancel]");try{let M=f.meta;if(!M){let b=await fetch("/api/repos/"+h.dataset.repo+"/preview?"+_,{signal:m.abort.signal,credentials:"same-origin"});if(M=await b.json(),!b.ok)throw new Error(M.error||"Cannot load preview metadata.")}if(m.meta=M,!i.has(m))return;if(!M.available){d.textContent=M.reason==="stale"?"\u9884\u89C8\u5DF2\u8FC7\u671F\uFF1ACAD \u6E90\u6587\u4EF6\u6216\u9884\u89C8\u6587\u4EF6\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210\u5E76\u63D0\u4EA4\u3002":M.reason==="not-generated"?"\u539F\u751F SolidWorks \u6587\u4EF6\u9700\u8981\u914D\u5957\u9884\u89C8\uFF1A\u5728\u672C\u5730\u6253\u5F00\u5E76\u4FDD\u5B58\u88C5\u914D/\u96F6\u4EF6\uFF0C\u8FD0\u884C\u8F85\u52A9\u811A\u672C\u5BFC\u51FA STEP \u540E\u4E00\u8D77\u63D0\u4EA4\u3002":M.message,h.dataset.state=M.reason,["not-generated","stale"].includes(M.reason)&&(h.querySelector("[data-helper]").hidden=!1);return}d.textContent=M.format.toUpperCase()+" \xB7 "+r(M.size)+(M.derived?" \xB7 Source version checked"+(M.configuration?" \xB7 "+M.configuration:""):""),u.hidden=!1,m.load=async()=>{if(u.disabled||h.dataset.state==="ready")return;let b=++m.loadId;u.disabled=!0,x.hidden=!1,m.modelAbort=new AbortController,h.dataset.state="loading",d.textContent="Loading "+M.format.toUpperCase()+" model\u2026";try{let A=await s(m,M);if(!i.has(m)||m.modelAbort.signal.aborted||b!==m.loadId)return;c(m,A),h.querySelector(".viewer-workspace").hidden=!1,h.querySelector(".viewer-toolbar").hidden=!1,h.querySelector(".viewer-help").hidden=!1,u.hidden=!0,x.hidden=!0,m.resize(),m.fit(),h.dataset.state="ready",h.dataset.meshes=String(A.meshes.length),h.dispatchEvent(new CustomEvent("preview-ready",{detail:m})),d.textContent=A.meshes.length+" components / bodies \xB7 "+m.triangles.toLocaleString()+" triangles"+(M.derived?" \xB7 Source version checked":"")+(M.format==="stl"?" \xB7 Units follow STL export":" \xB7 mm")}catch(A){if(!i.has(m)||b!==m.loadId)return;e(m),u.disabled=!1,x.hidden=!0,h.dataset.state="error",d.textContent=A.name==="AbortError"?"Preview loading cancelled.":A.message}},u.addEventListener("click",m.load),x.addEventListener("click",()=>{m.loadId++,m.modelAbort?.abort(),e(m),u.disabled=!1,x.hidden=!0,d.textContent="Preview loading cancelled.",h.dataset.state="idle"})}catch(M){M.name!=="AbortError"&&i.has(m)&&(d.textContent=M.message,h.dataset.state="error")}return m}function c(h,f){let m=h.container,_=m.querySelector(".viewer-stage"),d=new fs,u=new Va({antialias:!0,alpha:!1});h.scene=d,h.renderer=u,u.setPixelRatio(Math.min(devicePixelRatio,2)),u.setClearColor(document.documentElement.dataset.theme==="dark"?1448738:16185594),_.appendChild(u.domElement),u.domElement.tabIndex=0,h.upAxis=h.meta.derived&&/\.sld(?:asm|prt)$/i.test(h.meta.sourcePath)?"y":"z";let x=new Le(40,1,.1,1e6),M=new qa(x,u.domElement);x.up.set(0,0,1),M.enableDamping=!0,h.controls=M,h.camera=x,d.add(new ws(16777215,1.6));let b=new ki(16777215,2.4);b.position.set(1,-2,4),d.add(b);let A=new ki(16777215,1.1);A.position.set(-3,2,1),d.add(A);let T=new Map;function v(H,Y=[]){let st=[...Y,...H.name?[H.name]:[]];for(let Tt of H.meshes||[])T.set(Tt,st.join(" / "));for(let Tt of H.children||[])v(Tt,st)}f.root&&v(f.root);let E=new Map,F=new In;h.model=F,d.add(F);let L=[],C=m.querySelector(".viewer-component-list"),N=0;for(let[H,Y]of f.meshes.entries()){let st=E.get(Y.assetKey);st||(st=new $e,st.setAttribute("position",new ze(Y.attributes.position.array,3)),Y.attributes.normal&&st.setAttribute("normal",new ze(Y.attributes.normal.array,3)),Y.index&&st.setIndex(new ze(Y.index.array,1)),st.attributes.normal||st.computeVertexNormals(),Y.assetKey&&E.set(Y.assetKey,st));let Tt=Y.color?new Ot(...Y.color):new Ot(10398657),$=[new zi({color:Tt,roughness:.55,metalness:.18,side:Ke})],dt=(st.index?.count||st.attributes.position.count)/3;if(N+=dt,Y.brep_faces?.length){st.clearGroups();let Ut=0;for(let Vt of[...Y.brep_faces].sort((Bt,de)=>Bt.first-de.first)){Vt.first>Ut&&st.addGroup(Ut*3,(Vt.first-Ut)*3,0);let Bt=0;Vt.color&&(Bt=$.length,$.push(new zi({color:new Ot(...Vt.color),roughness:.55,metalness:.18,side:Ke}))),st.addGroup(Vt.first*3,(Vt.last-Vt.first+1)*3,Bt),Ut=Vt.last+1}Ut<dt&&st.addGroup(Ut*3,(dt-Ut)*3,0)}let pt=new rn(st,st.groups.length?$:$[0]),yt=T.get(H)||Y.name||"Body "+(H+1);pt.name=yt,pt.userData.componentId=Y.componentId,pt.userData.source=Y.source||h.meta.sourcePath,Y.transform&&pt.applyMatrix4(new Qt().fromArray(Y.transform)),pt.userData.originalPosition=pt.position.clone(),pt.userData.originalColors=$.map(Ut=>Ut.color.clone()),F.add(pt),L.push(pt);let ft=document.createElement("div");ft.className="viewer-component-row";let Lt=document.createElement("label"),te=document.createElement("input");te.type="checkbox",te.checked=!0,Lt.append(te,document.createTextNode(yt)),te.addEventListener("change",()=>{pt.visible=te.checked});let wt=document.createElement("button");wt.className="viewer-isolate",wt.textContent="Only",wt.setAttribute("aria-label","Isolate "+yt),wt.addEventListener("click",()=>{for(let Ut of L)Ut.visible=Ut===pt;C.querySelectorAll("input").forEach((Ut,Vt)=>Ut.checked=L[Vt]===pt)}),ft.append(Lt,wt),C.appendChild(ft)}h.objects=L,h.triangles=N;let V=new Ne().setFromObject(F),P=V.getCenter(new U),G=V.getSize(new U),X=Math.max(G.x,G.y,G.z,.001);for(let H of L)H.userData.explode=new Ne().setFromObject(H).getCenter(new U).sub(P);let k=new Ts(X*2,12,8884894,12107977);k.material.transparent=!0,k.material.opacity=.22,d.add(k);let tt=m.querySelector("[data-up-axis]");h.setUpAxis=(H,Y=!0)=>{h.upAxis=H==="y"?"y":"z",tt.value=h.upAxis,k.rotation.set(h.upAxis==="y"?0:Math.PI/2,0,0),k.position.copy(P),k.position[h.upAxis]=V.min[h.upAxis]-X*.005,Y&&h.fit?.()},h.setUpAxis(h.upAxis,!1),tt.addEventListener("change",()=>h.setUpAxis(tt.value));let q=(H="iso")=>{let Y=h.compareBounds||new Ne().setFromObject(F),st=Y.getCenter(new U),Tt=Math.max(Y.getSize(new U).length()/2,.001),$=Fs.degToRad(x.fov/2),dt=Math.atan(Math.tan($)*x.aspect),pt=Tt/Math.sin(Math.min($,dt))*1.1,yt=h.upAxis==="y",ft=H==="fit"?x.position.clone().sub(M.target).normalize():H==="front"?yt?new U(0,0,1):new U(0,-1,0):H==="top"?yt?new U(0,1,0):new U(0,0,1):H==="right"?new U(1,0,0):(yt?new U(1,.8,1):new U(1,-1,.8)).normalize();H!=="fit"&&x.up.set(0,yt?1:0,yt?0:1),H==="top"&&x.up.set(0,yt?0:1,yt?-1:0),x.near=Tt/1e4,x.far=Tt*1e4,x.position.copy(st).addScaledVector(ft,pt),x.updateProjectionMatrix(),M.target.copy(st),M.update()};h.fit=q,q(),m.querySelectorAll("[data-view]").forEach(H=>H.addEventListener("click",()=>q(H.dataset.view))),m.querySelector("[data-explode]").disabled=L.length<2,m.querySelector("[data-explode]").addEventListener("input",H=>{for(let Y of L)Y.position.copy(Y.userData.originalPosition).addScaledVector(Y.userData.explode,Number(H.target.value)/50)}),m.querySelector("[data-edges]").addEventListener("change",H=>{for(let Y of L){if(H.target.checked&&!Y.userData.edges){let st=new Oi(new vs(Y.geometry,40),new hi({color:5398902,transparent:!0,opacity:.5}));Y.add(st),Y.userData.edges=st}Y.userData.edges&&(Y.userData.edges.visible=H.target.checked)}}),m.querySelector("[data-show-all]").addEventListener("click",()=>{for(let H of L)H.visible=!0;C.querySelectorAll("input").forEach(H=>H.checked=!0)}),m.querySelector("[data-fullscreen]").addEventListener("click",()=>{document.fullscreenElement?document.exitFullscreen():m.requestFullscreen().catch(()=>{})}),h.resize=()=>{let H=Math.max(1,_.clientWidth),Y=Math.max(1,_.clientHeight);u.setSize(H,Y,!1),x.aspect=H/Y,x.updateProjectionMatrix()},h.observer=new ResizeObserver(h.resize),h.observer.observe(_),u.setAnimationLoop(()=>{M.update(),u.render(d,x)})}function l(h,f,m=()=>!0){h.controls.enableDamping=!1,f.controls.enableDamping=!1;let _=!1,d=(u,x)=>{_||!m()||!i.has(u)||!i.has(x)||(_=!0,x.upAxis!==u.upAxis&&x.setUpAxis(u.upAxis,!1),x.camera.position.copy(u.camera.position),x.camera.up.copy(u.camera.up),x.camera.near=u.camera.near,x.camera.far=u.camera.far,x.camera.fov=u.camera.fov,x.camera.updateProjectionMatrix(),x.controls.target.copy(u.controls.target),x.controls.update(),_=!1)};h.compareBounds=new Ne().setFromObject(h.model).union(new Ne().setFromObject(f.model)),f.compareBounds=h.compareBounds,h.fit(),d(h,f),h.controls.addEventListener("change",()=>d(h,f)),f.controls.addEventListener("change",()=>d(f,h))}function p(h,f,m,_=!0){let d={added:1736503,removed:13574702,modified:12551936,moved:616922,"mesh-changed":8540383},u=new Map(f.flatMap(x=>[x.id,x.beforeId,x.afterId].filter(Boolean).map(M=>[M,x.status])));for(let x of h.objects||[]){let M=u.get(x.userData.componentId)||u.get(x.userData.source);(Array.isArray(x.material)?x.material:[x.material]).forEach((A,T)=>A.color.copy(_&&d[M]?new Ot(d[M]):x.userData.originalColors[T]))}}function g(h,f,m,_){let d=new Map(m.flatMap(M=>[M.id||M.path,M.beforeId,M.afterId].filter(Boolean).map(b=>[b,M.status]))),u=M=>["added","removed","modified","moved"].includes(d.get(M.userData.componentId)||d.get(M.userData.source));if(_&&![...h.objects,...f.objects].some(u))return!1;let x=new Ne;for(let M of[h,f]){M.model.updateMatrixWorld(!0);for(let b of M.objects)b.visible=!_||u(b),b.visible&&(b.geometry.boundingBox||b.geometry.computeBoundingBox(),x.union(b.geometry.boundingBox.clone().applyMatrix4(b.matrixWorld)));M.container.querySelectorAll(".viewer-component-list input").forEach((b,A)=>{M.objects[A]&&(b.checked=M.objects[A].visible)})}return x.isEmpty()||(h.compareBounds=x,f.compareBounds=x,h.fit(),f.fit()),!0}window.GitpolarPreview={mount:o,dispose:a,link:l,highlight:p,focusChanges:g}})();})();
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
