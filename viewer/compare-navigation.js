// File and folder icons from Octicons (MIT); see THIRD_PARTY_NOTICES.md.
const treeIcons={"file-directory-fill":[16,16,"<path d=\"M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z\"></path>"],"file":[16,16,"<path d=\"M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z\"></path>"],"chevron-right":[16,16,"<path d=\"M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z\"></path>"]};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const changeLabels={modified:'修改',added:'新增',removed:'删除',moved:'移动',unchanged:'未变'};
const fileCache=new Map();
let navigationPreference={};

function visibleFile(filePath){return filePath!=='.gitpolar'&&!filePath.startsWith('.gitpolar/');}

function comparisonHref(repo,base,head,filePath=''){return '#/repos/'+encodeURIComponent(repo)+'/compare?'+new URLSearchParams({base,head,...(filePath?{path:filePath}:{})});}

function comparisonFiles({changes,baseFiles=[],headFiles=[],path:currentPath=''}) {
  const files=new Map();
  for(const file of [...baseFiles,...headFiles])if(visibleFile(file.path))files.set(file.path,{path:file.path,status:'unchanged'});
  for(const change of changes)if(visibleFile(change.path))files.set(change.path,{...change});
  if(currentPath&&visibleFile(currentPath)&&!files.has(currentPath))files.set(currentPath,{path:currentPath,status:'unchanged'});
  return [...files.values()].sort((a,b)=>a.path.localeCompare(b.path));
}

function filterComparisonFiles(files,{mode='changes',query='',selected=''}) {
  const search=query.trim().toLocaleLowerCase();
  return files.filter(file=>(mode==='all'||file.status!=='unchanged'||file.path===selected)&&(!search||file.path.toLocaleLowerCase().includes(search)));
}

function comparisonTree(files) {
  const root={children:new Map(),count:0};
  for(const file of files){const names=file.path.split('/');let folder=root;for(let i=0;i<names.length;i++){const name=names[i],filePath=names.slice(0,i+1).join('/');if(i===names.length-1){folder.children.set('file:'+name,{name,path:filePath,file});}else{const key='directory:'+name;if(!folder.children.has(key))folder.children.set(key,{name,path:filePath,children:new Map(),count:0});folder=folder.children.get(key);folder.count++;}}root.count++;}
  const order=folder=>[...folder.children.values()].sort((a,b)=>Number(Boolean(b.children))-Number(Boolean(a.children))||a.name.localeCompare(b.name)).map(node=>node.children?{...node,children:order(node)}:node);
  return order(root);
}

function svgIcon(name){return '<svg class="icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">'+treeIcons[name][2]+'</svg>';}

function mountComparisonNavigation(host,{repo,data,request,signal}) {
  const key=repo.name+':'+data.base.oid+':'+data.head.oid;
  if(navigationPreference.key!==key)navigationPreference={key,mode:'changes',query:'',expanded:new Set(),scroll:0};
  const preference=navigationPreference;
  let files=comparisonFiles(data),complete=false;
  const changes=data.changes.filter(file=>visibleFile(file.path));
  host.innerHTML=`<div class="compare-nav-heading"><h2>Files</h2><span class="count">${changes.length}</span></div><div class="compare-nav-tabs" role="tablist" aria-label="比较文件范围"><button type="button" role="tab" data-scope="changes">改动文件</button><button type="button" role="tab" data-scope="all" disabled>全部文件</button></div><input class="form-input" type="search" data-compare-file-filter aria-label="筛选对比文件" placeholder="Filter files…"><p class="compare-nav-status" role="status">正在读取文件目录…</p><nav class="compare-nav-scroll" aria-label="对比文件目录树"></nav>`;
  const target=host.querySelector('nav'),input=host.querySelector('input'),status=host.querySelector('.compare-nav-status');input.value=preference.query;
  const badge=file=>file.status==='unchanged'?(file.path===data.path?'<small class="compare-current-context">当前</small>':''):`<small class="compare-tree-badge change-${escape(file.status)}" title="${escape(changeLabels[file.status]||file.status)}">${escape({modified:'M',added:'A',removed:'D',moved:'R'}[file.status]||file.status)}</small>`;
  function rows(nodes){return nodes.map(node=>node.children?`<li><details data-directory="${escape(node.path)}"${preference.mode==='changes'||preference.expanded.has(node.path)||data.path.startsWith(node.path+'/')||preference.query?' open':''}><summary>${svgIcon('chevron-right')}${svgIcon('file-directory-fill')}<span>${escape(node.name)}</span><small>${node.count}</small></summary><ul>${rows(node.children)}</ul></details></li>`:`<li><a class="compare-tree-file${node.path===data.path?' is-selected':''}" href="${escape(comparisonHref(repo.name,data.base.oid,data.head.oid,node.path))}" title="${escape(node.path)}"${node.path===data.path?' aria-current="page"':''}>${svgIcon('file')}<span>${escape(node.name)}</span>${badge(node.file)}</a></li>`).join('');}
  function draw(){const scrollTop=target.scrollTop,selected=filterComparisonFiles(files,{mode:preference.mode,query:preference.query,selected:data.path});target.innerHTML=selected.length?'<ul class="compare-file-tree">'+rows(comparisonTree(selected))+'</ul>':'<p class="compare-nav-empty">没有匹配的文件。</p>';target.scrollTop=scrollTop;host.dataset.fileScope=preference.mode;host.querySelectorAll('[data-scope]').forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.scope===preference.mode));});if(complete)status.textContent=`${selected.length} / ${files.length} 个文件 · ${changes.length} 个变化`;}
  host.addEventListener('click',event=>{const scope=event.target.closest('[data-scope]');if(scope&&!scope.disabled){preference.mode=scope.dataset.scope;draw();}if(event.target.closest('[data-compare-tree-retry]'))loadFiles();});
  input.addEventListener('input',()=>{preference.query=input.value;draw();});
  host.addEventListener('toggle',event=>{const folder=event.target.dataset.directory;if(folder){event.target.open?preference.expanded.add(folder):preference.expanded.delete(folder);}},true);
  target.addEventListener('scroll',()=>{preference.scroll=target.scrollTop;});
  async function fileIndex(ref){const indexKey=repo.name+':'+ref;if(fileCache.has(indexKey))return fileCache.get(indexKey);const value=await request('files?'+new URLSearchParams({ref}));const entries=value.files.filter(file=>visibleFile(file.path)).map(file=>({path:file.path}));fileCache.set(indexKey,entries);return entries;}
  async function loadFiles(){status.textContent='正在读取文件目录…';try{const [baseFiles,headFiles]=await Promise.all([fileIndex(data.base.oid),fileIndex(data.head.oid)]);if(signal.aborted||!host.isConnected)return;files=comparisonFiles({...data,baseFiles,headFiles});complete=true;host.querySelector('[data-scope="all"]').disabled=false;draw();const current=target.querySelector('[aria-current="page"]');if(current){const a=current.getBoundingClientRect(),b=target.getBoundingClientRect();if(a.top<b.top||a.bottom>b.bottom)target.scrollTop+=a.top-b.top-60;}}catch(error){if(signal.aborted||!host.isConnected)return;status.innerHTML=escape(error.message)+' <button type="button" data-compare-tree-retry>重试</button>';}}
  draw();target.scrollTop=preference.scroll;loadFiles();
}

export {comparisonHref,comparisonFiles,filterComparisonFiles,comparisonTree,mountComparisonNavigation};
