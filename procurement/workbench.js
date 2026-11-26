const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const categoryOptions = ['标准件','碳板','cnc','铝方管','打印件','金属3d打印','钢件铨洲','玻纤板','其他'];
const states = {draft:'草稿',submitted:'待组长审核',approved:'待采购',rejected:'已退回',ordered:'待确认到货',received:'待入库',stocked:'已入库'};
const day = value => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(value));
const today = () => day(Date.now());
const choices = (values,current) => (current&&!values.includes(current)?[current,...values]:values).map(value => '<option' + (value === current ? ' selected' : '') + '>' + esc(value) + '</option>').join('');
const blank = () => ({items:[],warnings:[],selected:new Set(),sourceName:'',title:today() + ' 采购与加工',teamId:'',notes:''});

export function createWorkbench(kit) {
  const view = document.querySelector('#view');
  const {api,fetchChecked,icon,money,time,notify} = kit;
  const state = {q:'',state:'',date:'',applicant:'',category:'',mine:false,from:'',to:'',offset:0,mode:'items',selected:new Set(),cache:new Map(),requestId:'',itemId:''};
  let data, stage = blank(), inspectorAbort, inlineViewer, importBusy = false;
  const action = (name,label,extra='',primary=false) => '<button type="button" class="btn' + (primary ? ' primary' : '') + '" data-pc="' + name + '" ' + extra + '>' + label + '</button>';
  const categoryOf = item => item.kind === 'standard' ? '标准件' : item.process || '其他';
  const exportBlob = (blob,name) => { const a = document.createElement('a'),url = URL.createObjectURL(blob); a.href=url;a.download=name;a.click();setTimeout(() => URL.revokeObjectURL(url),1000); };
  function dispose() { inspectorAbort?.abort();inlineViewer?.dispose();inlineViewer=null; }
  function parameters() {
    const params = new URLSearchParams();
    for (const key of ['q','state','date','applicant','category','from','to']) if (state[key]) params.set(key,state[key]);
    if (state.mine) params.set('mine','1');
    return params;
  }
  function rememberView() { const p=parameters();if(state.mode!=='items')p.set('mode',state.mode);history.replaceState(null,'','#requests' + (p.size?'?'+p:'')); }
  function resetSelection() { state.selected.clear();state.cache.clear();state.offset=0; }
  function tree() {
    const dates = new Map();
    for (const row of data.tree) { if(!dates.has(row.date))dates.set(row.date,[]);dates.get(row.date).push(row); }
    return '<aside class="pc-sidebar panel"><div class="pc-sidebar-title">' + icon('clock') + '<b>按日期与提交人</b></div>' +
      '<button class="pc-tree-row' + (!state.date&&!state.applicant?' active':'') + '" data-pc="date" data-date="">' + icon('list') + '<span>全部申请</span><span class="counter">' + data.tree.reduce((n,r)=>n+r.requestCount,0) + '</span></button>' +
      [...dates].map(([date,people],index) => '<details class="pc-date"' + (state.date===date || (!state.date&&index<3)?' open':'') + '><summary><span>' + esc(date===today()?'今天 · '+date:date) + '</span><span class="counter">' + people.reduce((n,r)=>n+r.itemCount,0) + '</span></summary><button class="pc-tree-row pc-tree-child' + (state.date===date&&!state.applicant?' active':'') + '" data-pc="date" data-date="'+date+'">本日全部提交</button>' + people.map(person => '<button class="pc-tree-row pc-tree-child' + (state.date===date&&state.applicant===String(person.applicantId)?' active':'') + '" data-pc="date" data-date="'+date+'" data-person="'+person.applicantId+'"><span class="pc-person">'+esc(person.applicantName.slice(0,1))+'</span><span>'+esc(person.applicantName)+'</span><span class="counter">'+person.itemCount+'</span></button>').join('') + '</details>').join('') +
      (!dates.size?'<p class="muted pc-padding">提交申请后会自动按日期归档。</p>':'') + '</aside>';
  }
  function filters() {
    const people=[...new Map(data.tree.map(row=>[row.applicantId,row.applicantName])).entries()];
    return '<form id="pc-filter" class="pc-filter"><label class="search-box">'+icon('search')+'<input name="q" type="search" placeholder="搜索零件、规格、申请批次…" aria-label="搜索采购明细" value="'+esc(state.q)+'"></label><div class="pc-filter-row"><select name="applicant" aria-label="提交人"><option value="">全部提交人</option>'+people.map(([id,name])=>'<option value="'+id+'"'+(String(id)===state.applicant?' selected':'')+'>'+esc(name)+'</option>').join('')+'</select><select name="state" aria-label="申请状态"><option value="">全部状态</option>'+Object.entries(states).map(([id,label])=>'<option value="'+id+'"'+(id===state.state?' selected':'')+'>'+label+'</option>').join('')+'</select><label class="check-row"><input type="checkbox" name="mine"'+(state.mine?' checked':'')+'>仅我的</label><button class="btn" type="submit">筛选</button>'+action('reset','清除')+'</div><details class="pc-date-range"><summary>日期范围'+(state.from||state.to?' · '+esc(state.from)+' ～ '+esc(state.to):'')+'</summary><div class="pc-filter-row"><input type="date" name="from" value="'+esc(state.from)+'" aria-label="开始日期"><span>至</span><input type="date" name="to" value="'+esc(state.to)+'" aria-label="结束日期"><button class="btn">应用</button></div></details></form>';
  }
  function itemRows() {
    return '<div class="table-wrap pc-table"><table><thead><tr><th><input type="checkbox" data-pc-select-all aria-label="全选本页"></th><th>零件 / 规格</th><th>类别</th><th>数量</th><th>提交人 / 日期</th><th>状态</th></tr></thead><tbody>'+data.items.map(item => '<tr class="'+(state.itemId===item.id?'pc-current':'')+'"><td><input type="checkbox" data-pc-select="'+item.id+'" aria-label="选择 '+esc(item.name)+'"'+(state.selected.has(item.id)?' checked':'')+'></td><td><button class="pc-item-name" data-pc="inspect" data-id="'+item.id+'">'+icon(item.kind==='machining'?'cube':'part')+esc(item.name)+'</button><div class="pc-cell-sub">'+esc(item.spec||item.requestTitle)+'</div><div class="pc-cell-sub">'+(item.fileId?'STEP ':'')+(item.drawingFileId?'DWG':'')+'</div></td><td>'+esc(item.category)+'</td><td class="num">'+item.quantity+' '+esc(item.unit)+'</td><td><b class="pc-person-name">'+esc(item.applicantName)+'</b><div class="pc-cell-sub">'+esc(day(item.createdAt))+'</div></td><td>'+kit.stateBadge(item.state)+'</td></tr>').join('')+'</tbody></table></div>';
  }
  function requestRows() {
    return '<div class="table-wrap pc-table"><table><thead><tr><th>申请批次</th><th>提交人</th><th>提交日期</th><th>明细</th><th>状态</th></tr></thead><tbody>'+data.requests.map(row=>'<tr><td><button class="pc-item-name" data-pc="inspect-request" data-id="'+row.id+'">'+esc(row.title)+'</button><div class="pc-cell-sub">'+esc(row.teamName)+'</div></td><td>'+esc(row.applicantName)+'</td><td>'+esc(day(row.createdAt))+'</td><td>'+row.itemCount+' 项</td><td>'+kit.stateBadge(row.state)+'</td></tr>').join('')+'</tbody></table></div>';
  }
  function selectionBar() {
    return '<div class="pc-selection" id="pc-selection"><span>已选择 <b>'+state.selected.size+'</b> 项</span>'+action('export',icon('file')+'导出所选与 BOM','',false)+action('approve',icon('check')+'批量审核')+action('clear-selection','取消选择')+(data.total>data.items.length&&data.total<=1000?action('select-matching','选择当前筛选全部 '+data.total+' 项'):'')+'</div>';
  }
  async function requestsPage(signal) {
    const url = new URLSearchParams(location.hash.split('?')[1]||'');
    if(url.size){for(const key of ['q','state','date','applicant','category','from','to'])state[key]=url.get(key)||'';state.mine=url.get('mine')==='1';state.mode=url.get('mode')==='requests'?'requests':'items';}
    const p=parameters();p.set('limit','100');p.set('offset',state.offset);
    data=await api('/workbench?'+p,{signal});if(signal.aborted)return;
    for(const item of data.items)state.cache.set(item.id,item);
    view.innerHTML='<div class="heading pc-heading"><div><div class="pc-eyebrow">团队工作区 / 采购与发加工</div><h1>采购工作台</h1><p>按日期和提交人找批次，按工艺集中处理零件。</p></div><div class="actions"><a class="btn primary" href="#import">'+icon('upload')+'批量申请 / 导入 BOM</a><a class="btn" href="#cart">'+icon('cart')+'购物车</a>'+action('refresh',icon('refresh')+'刷新')+'</div></div><div class="pc-workbench">'+tree()+'<section class="panel pc-center"><div class="pc-center-heading"><div><strong>'+esc(state.date||'全部日期')+'</strong><span class="muted"> / '+data.total+' 项零件 · '+data.requests.length+' 个批次</span></div><div class="pc-view-switch">'+action('mode-items','零件明细','aria-pressed="'+(state.mode==='items')+'"')+action('mode-requests','申请批次','aria-pressed="'+(state.mode==='requests')+'"')+'</div></div>'+filters()+'<div class="pc-categories">'+action('category','全部工艺','data-category="" aria-pressed="'+!state.category+'"')+data.categories.map(category=>action('category',esc(category.name)+' <span class="counter">'+category.count+'</span>','data-category="'+esc(category.name)+'" aria-pressed="'+(state.category===category.name)+'"')).join('')+'</div>'+(data.total?(state.mode==='items'?itemRows():requestRows()):'<div class="empty">'+icon('list')+'<h2>当前范围没有申请</h2><p>可清除筛选，或批量导入本次采购与加工清单。</p><a class="btn primary" href="#import">批量导入</a></div>')+(state.mode==='items'?'<div class="pc-pager"><span>'+data.total+' 项 · 本页 '+data.items.length+' 项</span><div class="buttons">'+action('prev','上一页',state.offset?'':'disabled')+action('next','下一页',state.offset+data.limit<data.total?'':'disabled')+'</div></div>'+selectionBar():'')+'</section><aside class="pc-inspector panel" id="pc-inspector"><div class="pc-inspector-empty">'+icon('cube')+'<b>选中零件，直接查看</b><p>模型、规格、申请人和处理操作会显示在这里。</p></div></aside></div>';
    if(state.requestId){try{await inspect(state.requestId,state.itemId,signal);}catch(error){if(error.name!=='AbortError')notify(error.message,true);}}
  }
  async function inlinePreview(item,host) {
    inlineViewer?.dispose();inlineViewer=null;
    if(!item.fileId){host.innerHTML='<div class="pc-preview-message">'+icon('file')+'<span>'+(item.drawingFileId?'已附 DWG 图纸，可下载后查看。':'标准件可通过商品链接核对规格。')+'</span></div>';return;}
    const current=inspectorAbort;
    host.innerHTML='<div class="pc-inline-canvas"></div><div class="pc-preview-loading">正在读取 STEP…</div>';
    try {
      const [response,factory]=await Promise.all([fetchChecked(kit.fileUrl(item.fileId),{signal:current.signal}),kit.viewerFactory()]);
      const bytes=await response.arrayBuffer();if(current!==inspectorAbort||current.signal.aborted)return;
      const viewer=inlineViewer=factory.create(host.querySelector('.pc-inline-canvas'),{});
      await viewer.load(bytes);if(current!==inspectorAbort||current.signal.aborted){viewer.dispose();return;}
      viewer.setAnnotations(item.threads||[]);host.querySelector('.pc-preview-loading')?.remove();
    }catch(error){if(error.name!=='AbortError'&&current===inspectorAbort)host.innerHTML='<div class="pc-preview-message">'+esc(error.message)+'</div>';}
  }
  async function inspect(requestId,itemId,signal) {
    dispose();inspectorAbort=new AbortController();const own=inspectorAbort;
    const result=await api('/requests/'+encodeURIComponent(requestId),{signal:signal?AbortSignal.any([signal,own.signal]):own.signal});
    if(own!==inspectorAbort||own.signal.aborted)return;
    const row=result.request;kit.setRequest(row);state.requestId=row.id;
    const item=row.items.find(item=>item.id===itemId)||row.items[0];state.itemId=item.id;
    const host=document.querySelector('#pc-inspector');if(!host)return;
    host.innerHTML='<div class="pc-inspector-heading"><span>'+icon(item.kind==='machining'?'cube':'part')+' 零件详情</span>'+kit.stateBadge(row.state)+'</div><div class="pc-inspector-body"><h2>'+esc(item.name)+'</h2><div id="pc-inline-preview" class="pc-inline-preview"></div><div class="buttons">'+(item.fileId?action('preview','完整预览 / 螺纹标注')+action('fit','适应窗口'):'')+'</div><dl class="data-pairs"><dt>数量</dt><dd>'+item.quantity+' '+esc(item.unit)+'</dd><dt>工艺</dt><dd>'+esc(categoryOf(item))+'</dd><dt>材料</dt><dd>'+esc(item.material||'—')+'</dd><dt>预算单价</dt><dd>'+money(item.unitPriceCents)+'</dd><dt>提交人</dt><dd>'+esc(row.applicantName)+'</dd><dt>日期</dt><dd>'+esc(time(row.createdAt))+'</dd><dt>所属批次</dt><dd>'+esc(row.title)+'</dd></dl>'+(item.spec?'<p class="pc-spec">'+esc(item.spec)+'</p>':'')+'<div class="buttons">'+(item.fileId?'<a class="btn compact" download href="'+kit.fileUrl(item.fileId)+'">STEP</a>':'')+(item.drawingFileId?'<a class="btn compact" download href="'+kit.fileUrl(item.drawingFileId)+'">DWG</a>':'')+(item.url?'<a class="btn compact" target="_blank" rel="noopener noreferrer" href="'+esc(item.url)+'">商品链接</a>':'')+'</div><a class="btn pc-full-request" href="#request/'+row.id+'">查看完整申请 · '+row.items.length+' 项</a>'+kit.actionForm(kit.actionsFor(row))+'</div>';
    for(const tr of view.querySelectorAll('tr.pc-current'))tr.classList.remove('pc-current');
    view.querySelector('[data-pc-select="'+item.id+'"]')?.closest('tr').classList.add('pc-current');
    await inlinePreview(item,document.querySelector('#pc-inline-preview'));
  }
  function stageIssues(item) {
    if(!item.name.trim())return '请输入名称';
    if(!Number.isInteger(Number(item.quantity))||Number(item.quantity)<1)return '数量须为正整数';
    if(item.kind==='machining'&&!item.fileId&&!item.drawingFileId)return '缺少 STEP / DWG';
    return '';
  }
  function stagingRows() {
    return stage.items.map((item,index)=>'<tr><td><input type="checkbox" data-pc-stage-select="'+index+'" aria-label="选择第 '+(index+1)+' 行"'+(stage.selected.has(index)?' checked':'')+'></td><td><button class="pc-row-index" data-pc="stage-preview" data-index="'+index+'" title="查看此零件">'+(index+1)+'</button></td><td><input data-pc-stage-field="name" data-index="'+index+'" aria-label="第 '+(index+1)+' 行名称" value="'+esc(item.name)+'"><div class="pc-cell-sub '+(stageIssues(item)?'pc-issue':'')+'">'+esc(stageIssues(item)||[item._stepName,item._drawingName].filter(Boolean).join(' + ')||'标准件')+'</div></td><td><select data-pc-stage-field="process" data-index="'+index+'" aria-label="第 '+(index+1)+' 行类别">'+choices(categoryOptions,categoryOf(item))+'</select></td><td><input type="number" min="1" max="1000000" step="1" data-pc-stage-field="quantity" data-index="'+index+'" aria-label="第 '+(index+1)+' 行数量" value="'+item.quantity+'"></td><td><input data-pc-stage-field="spec" data-index="'+index+'" aria-label="第 '+(index+1)+' 行规格" value="'+esc(item.spec)+'"></td><td><input data-pc-stage-field="material" data-index="'+index+'" aria-label="第 '+(index+1)+' 行材料" value="'+esc(item.material)+'"></td><td><input type="number" min="0" step="0.01" data-pc-stage-field="unitPriceCents" data-index="'+index+'" aria-label="第 '+(index+1)+' 行预算单价" value="'+(item.unitPriceCents?item.unitPriceCents/100:'')+'" placeholder="待核价"></td><td><input data-pc-stage-field="url" data-index="'+index+'" aria-label="第 '+(index+1)+' 行购买链接" placeholder="商品链接" value="'+esc(item.url)+'"></td><td>'+action('stage-remove','×','data-index="'+index+'" aria-label="移除第 '+(index+1)+' 行"')+'</td></tr>').join('');
  }
  function stageTable() {
    if (!document.querySelector('#pc-stage-rows')) return;
    document.querySelector('#pc-stage-count').textContent=stage.items.length+' 项';
    document.querySelector('#pc-stage-rows').innerHTML=stagingRows();
    document.querySelector('#pc-stage-empty').hidden=Boolean(stage.items.length);
    document.querySelector('#pc-stage-table').hidden=!stage.items.length;
    document.querySelector('#pc-stage-selected').textContent='已选 '+stage.selected.size+' 项';
    document.querySelector('#pc-stage-issues').textContent=stage.items.some(stageIssues)?'带红色提示的条目需补充文件或修改后提交。':'';
  }
  function importPage() {
    dispose();const teams=kit.applicantTeams();if(!stage.teamId)stage.teamId=teams[0]?.id||'';
    view.innerHTML='<div class="breadcrumb"><a href="#requests">'+icon('back')+' 返回采购工作台</a></div><div class="heading"><div><div class="pc-eyebrow">采购与发加工 / 新建批次</div><h1>批量申请</h1><p>整包导入、整表粘贴，检查清单后一次提交。</p></div><div class="actions">'+action('template','下载 BOM 模板')+'<a class="btn" href="#machining">单个 STEP / 螺纹标注</a></div></div><div class="pc-import-layout"><div class="stack"><section class="panel pc-drop" id="pc-drop"><div>'+icon('upload')+'<b>拖入 BOM.zip、表格或一批 STEP / DWG</b><p>支持 .xlsx / CSV；同目录同名 STEP + DWG 自动配对，可一次选择整个文件夹。</p><div class="buttons">'+action('choose-import','选择文件','',true)+action('choose-folder','选择文件夹')+action('paste-toggle','从 Excel 粘贴')+'</div><input id="pc-import-files" type="file" multiple hidden accept=".zip,.xlsx,.csv,.tsv,.step,.stp,.dwg"><input id="pc-import-folder" type="file" multiple webkitdirectory hidden><p id="pc-import-progress" role="status"></p></div></section><section class="panel pc-padding" id="pc-paste" hidden><label for="pc-paste-text"><b>粘贴含表头的表格区域</b></label><textarea id="pc-paste-text" rows="6" placeholder="名称&#9;规格&#9;数量&#9;购买链接"></textarea><div class="buttons">'+action('parse-paste','解析为明细','',true)+'</div></section><section class="panel"><div class="panel-head"><h2>'+icon('list')+'待提交清单 <span class="counter" id="pc-stage-count"></span></h2><span class="muted">可直接编辑单元格</span></div><div class="pc-stage-tools"><label class="check-row"><input type="checkbox" id="pc-stage-all">全选</label><span id="pc-stage-selected"></span><select id="pc-bulk-category" aria-label="批量工艺">'+choices(categoryOptions,'cnc')+'</select>'+action('stage-apply-category','应用工艺')+'<input id="pc-bulk-quantity" type="number" min="1" value="1" aria-label="批量数量">'+action('stage-apply-quantity','应用数量')+action('stage-remove-selected','移除所选')+'</div><p class="inline-error pc-padding" id="pc-stage-issues"></p><div id="pc-stage-empty" class="empty"><h2>把整批零件放进来</h2><p>一次最多 1000 项，支持标准件与加工件混合提交。</p></div><div class="table-wrap pc-stage-table" id="pc-stage-table"><table><thead><tr><th></th><th>#</th><th>名称 / 交付文件</th><th>类别</th><th>数量</th><th>规格</th><th>材料</th><th>预算单价</th><th>购买链接</th><th></th></tr></thead><tbody id="pc-stage-rows"></tbody></table></div></section></div><aside class="stack pc-import-side"><section class="panel"><div class="panel-head"><h2>'+icon('file')+'本次申请</h2></div><form id="pc-batch-form" class="panel-body stack"><label class="field"><span>日期批次标题</span><input name="title" maxlength="200" required value="'+esc(stage.title)+'"></label><label class="field"><span>所属小组</span><select name="teamId" required>'+teams.map(team=>'<option value="'+esc(team.id)+'"'+(String(team.id)===stage.teamId?' selected':'')+'>'+esc(team.name)+'</option>').join('')+'</select></label><label class="field"><span>用途 / 交付说明</span><textarea name="notes" rows="3" maxlength="4000">'+esc(stage.notes)+'</textarea></label><p class="muted">提交人为当前飞书账号，申请会自动归档到今天的日期下。</p><button class="btn primary" name="intent" value="submit">'+icon('check')+'整批提交组长审核</button><button class="btn" name="intent" value="save">保存整批草稿</button>'+action('stage-to-cart',icon('cart')+'加入购物车')+'</form></section><section class="panel"><div class="panel-head"><h2>零件快速查看</h2></div><div id="pc-stage-preview" class="pc-inline-preview"><div class="pc-preview-message">点击清单行号预览 STEP</div></div></section><p class="muted">导入只生成待提交清单；确认后才创建申请。</p></aside></div>';
    stageTable();
  }
  function merge(items) { if(stage.items.length+items.length>1000)throw new Error('每批最多 1000 项，请先提交当前批次。');stage.items.push(...items.map(item=>({...item,_key:kit.toKey()}))); }
  async function importFiles(files) {
    if(importBusy)return;importBusy=true;document.querySelector('#pc-stage-table').inert=true;const progress=document.querySelector('#pc-import-progress');
    try {
      const all=[...files],archives=all.filter(file=>/\.(zip|xlsx|csv|tsv)$/i.test(file.name)),cad=all.filter(file=>/\.(step|stp|dwg)$/i.test(file.name));
      if(!archives.length&&!cad.length)throw new Error('没有找到 BOM、Excel、CSV 或 STEP/DWG 文件。');
      for(const file of archives){progress.textContent='正在解析 '+file.name+'…';const response=await fetchChecked('/api/procurement/imports?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});const parsed=await response.json();merge(parsed.items);stage.warnings.push(...parsed.warnings);stage.sourceName=file.name;stageTable();}
      const pairs=new Map();
      for(const file of cad){if(!file.size||file.size>64*1024*1024)throw new Error('每个交付文件须为 1 字节～64 MiB。');const relative=(file.webkitRelativePath||file.name).replaceAll('\\','/'),key=relative.replace(/\.[^.]+$/,'').toLowerCase();let pair=pairs.get(key);if(!pair){pair={name:file.name.replace(/\.[^.]+$/,''),process:relative.split('/').slice(0,-1).reverse().find(x=>categoryOptions.includes(x))||'其他'};pairs.set(key,pair);}const type=/\.dwg$/i.test(file.name)?'drawing':'model';if(pair[type])throw new Error('同一目录有重名交付文件：'+file.name);pair[type]=file;}
      const unpairedCount=[...pairs.values()].filter(pair=>!stage.items.some(item=>!item.fileId&&!item.drawingFileId&&(item.name.toLowerCase()===pair.name.toLowerCase()||item._importNames?.includes(pair.name.toLowerCase())))).length;
      if(stage.items.length+unpairedCount>1000)throw new Error('每批最多 1000 项，请分批导入。');
      const queue=[...pairs.values()];let next=0,done=0;
      const worker=async()=>{while(next<queue.length){const pair=queue[next++],saved={};for(const type of ['model','drawing'])if(pair[type]){progress.textContent='上传交付文件 '+(done+1)+' / '+queue.length+' · '+pair.name;const response=await fetchChecked('/api/procurement/files?name='+encodeURIComponent(pair[type].name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:pair[type]});saved[type]=(await response.json()).file.id;}const matches=stage.items.filter(item=>!item.fileId&&!item.drawingFileId&&(item.name.toLowerCase()===pair.name.toLowerCase()||item._importNames?.includes(pair.name.toLowerCase())));const item=matches.length===1?matches[0]:null;const added={kind:pair.process==='标准件'?'standard':'machining',name:pair.name,quantity:1,unit:'件',unitPriceCents:0,spec:'',url:'',material:'',process:pair.process,threads:[],fileId:saved.model||null,drawingFileId:saved.drawing||null,_stepName:pair.model?.name||'',_drawingName:pair.drawing?.name||''};if(item){Object.assign(item,{kind:item.kind,fileId:added.fileId,drawingFileId:added.drawingFileId,_stepName:added._stepName,_drawingName:added._drawingName});}else merge([added]);done++;if(done%6===0||done===queue.length)stageTable();}};
      const results=await Promise.allSettled(Array.from({length:Math.min(3,queue.length)},worker));const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;
      progress.textContent='已导入 '+stage.items.length+' 项，可修改数量、类别与规格。';notify(progress.textContent);
      if(stage.warnings.some(message=>!message.includes('尚未配对')))notify(stage.warnings.filter(message=>!message.includes('尚未配对')).join('；'),true);
    }catch(error){if(progress)progress.textContent=error.message;notify(error.message,true);}finally{importBusy=false;const table=document.querySelector('#pc-stage-table');if(table)table.inert=false;stageTable();}
  }
  function payload(form) {
    if(importBusy)throw new Error('交付文件仍在上传，请等待完成。');if(!stage.items.length)throw new Error('请先导入采购明细。');
    const issue=stage.items.find(stageIssues);if(issue)throw new Error(issue.name+'：'+stageIssues(issue));
    const values=Object.fromEntries(new FormData(form));
    return {title:values.title.trim(),teamId:values.teamId,notes:values.notes,items:stage.items.map(kit.sendLine)};
  }
  async function submitBatch(form,submit,button) {
    const data=payload(form);button.disabled=true;form.inert=true;
    try{
      const result=await api('/requests',{method:'POST',data});const id=result.request.id;stage=blank();
      if(submit){try{await api('/requests/'+id+'/actions',{method:'POST',data:{action:'submit'}});}catch(error){notify('整批草稿已保存，提交审核失败：'+error.message,true);kit.go('#request/'+id);return;}}
      resetSelection();Object.assign(state,{date:today(),applicant:String(kit.meta().user.id),category:'',requestId:id,itemId:'',q:'',state:'',mine:false,from:'',to:''});notify(submit?'整批申请已提交组长审核。':'整批草稿已保存。');kit.go('#requests');
    }finally{form.inert=false;if(button.isConnected)button.disabled=false;}
  }
  async function handle(event) {
    const target=event.target.closest('[data-pc]');if(!target)return;
    const command=target.dataset.pc;
    if(command==='choose-import')return document.querySelector('#pc-import-files').click();
    if(command==='choose-folder')return document.querySelector('#pc-import-folder').click();
    if(command==='paste-toggle'){document.querySelector('#pc-paste').hidden=false;document.querySelector('#pc-paste-text').focus();return;}
    if(command==='parse-paste'){const parsed=await api('/imports?format=paste',{method:'POST',data:{text:document.querySelector('#pc-paste-text').value}});merge(parsed.items);stageTable();notify('已解析 '+parsed.items.length+' 行。');return;}
    if(command==='template'){exportBlob(new Blob(['\uFEFF名称,类别,规格,数量,单位,单价,材料,购买链接\r\n内六角螺钉,标准件,M3×8,20,件,0.5,,https://example.com/product\r\n安装板,cnc,80×40×5,2,件,0,6061铝合金,\r\n'],{type:'text/csv;charset=utf-8'}),'gitpolar-BOM-template.csv');return;}
    if(command==='stage-remove'){stage.items.splice(Number(target.dataset.index),1);stage.selected.clear();stageTable();return;}
    if(command==='stage-remove-selected'){stage.items=stage.items.filter((_,index)=>!stage.selected.has(index));stage.selected.clear();stageTable();return;}
    if(command==='stage-apply-category'||command==='stage-apply-quantity'){if(!stage.selected.size)throw new Error('请先勾选要批量修改的行。');const category=document.querySelector('#pc-bulk-category').value,quantity=Number(document.querySelector('#pc-bulk-quantity').value);if(command==='stage-apply-quantity'&&(!Number.isInteger(quantity)||quantity<1))throw new Error('数量须为正整数。');for(const index of stage.selected){const item=stage.items[index];if(command==='stage-apply-quantity')item.quantity=quantity;else{item.kind=category==='标准件'?'standard':'machining';item.process=category==='标准件'?'':category;}}stageTable();return;}
    if(command==='stage-preview'){dispose();inspectorAbort=new AbortController();return inlinePreview(stage.items[Number(target.dataset.index)],document.querySelector('#pc-stage-preview'));}
    if(command==='stage-to-cart'){const form=document.querySelector('#pc-batch-form'),value=payload(form),draft=kit.cart();if(draft.items.length+stage.items.length>1000)throw new Error('购物车最多 1000 项。');draft.items.push(...stage.items);if(!draft.title)draft.title=value.title;if(!draft.notes)draft.notes=value.notes;if(!draft.teamId)draft.teamId=value.teamId;stage=blank();kit.remember();kit.go('#cart');return;}
    if(command==='inspect') {const item=state.cache.get(target.dataset.id);return inspect(item.requestId,item.id);}
    if(command==='inspect-request')return inspect(target.dataset.id,'');
    if(command==='preview'){const row=kit.request();return kit.openPreview(row.items.find(item=>item.id===state.itemId));}
    if(command==='fit')return inlineViewer?.fit();
    if(command==='date'){Object.assign(state,{date:target.dataset.date||'',applicant:target.dataset.person||'',from:'',to:'',requestId:'',itemId:''});resetSelection();}
    else if(command==='category'){state.category=target.dataset.category;resetSelection();}
    else if(command==='mode-items'||command==='mode-requests')state.mode=command==='mode-items'?'items':'requests';
    else if(command==='next')state.offset+=100;
    else if(command==='prev')state.offset=Math.max(0,state.offset-100);
    else if(command==='reset'){Object.assign(state,{q:'',state:'',date:'',applicant:'',category:'',mine:false,from:'',to:'',requestId:'',itemId:''});resetSelection();}
    else if(command==='clear-selection'){state.selected.clear();return kit.render();}
    else if(command==='select-matching'){const p=parameters();p.set('limit','500');for(let offset=0;offset<data.total;offset+=500){p.set('offset',offset);const page=await api('/workbench?'+p);for(const item of page.items){state.selected.add(item.id);state.cache.set(item.id,item);}}return kit.render();}
    else if(command==='export'){if(!state.selected.size)throw new Error('请先勾选要导出的零件。');target.disabled=true;try{const response=await fetchChecked('/api/procurement/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({itemIds:[...state.selected]})});exportBlob(await response.blob(),'gitpolar-procurement-'+today()+'.zip');}finally{target.disabled=false;}return;}
    else if(command==='approve'){const ids=[...new Set([...state.selected].map(id=>state.cache.get(id)?.requestId).filter(Boolean))],requests=data.requests.filter(row=>ids.includes(row.id));if(!requests.length)throw new Error('请先勾选要审核的零件。');if(requests.some(row=>!kit.actionsFor(row).includes('approve')))throw new Error('所选批次包含无权审核或不在待审核状态的申请。');const dialog=document.querySelector('#pc-bulk-dialog');dialog.querySelector('p').textContent='所选 '+state.selected.size+' 项明细属于 '+requests.length+' 张申请。审核以整张申请为单位，将通过这些申请内的全部明细。';dialog.dataset.ids=JSON.stringify(ids);dialog.showModal();return;}
    else if(command==='confirm-approve'){const dialog=document.querySelector('#pc-bulk-dialog'),ids=JSON.parse(dialog.dataset.ids);target.disabled=true;try{let done=0;for(const id of ids){await api('/requests/'+id+'/actions',{method:'POST',data:{action:'approve'}});done++;target.textContent='正在审核 '+done+' / '+ids.length;}notify('已审核通过 '+done+' 张申请。');state.selected.clear();}catch(error){notify('部分申请未完成：'+error.message,true);}finally{dialog.close();target.disabled=false;target.textContent='确认通过这些申请';await kit.render();}return;}
    else if(command==='close-bulk'){document.querySelector('#pc-bulk-dialog').close();return;}
    else if(command!=='refresh')return;
    rememberView();await kit.render();
  }
  view.addEventListener('click',event=>{handle(event).catch(error=>notify(error.message,true));});
  document.addEventListener('click',event=>{if(event.target.closest('#pc-bulk-dialog'))handle(event).catch(error=>notify(error.message,true));});
  view.addEventListener('input',event=>{
    const el=event.target;
    if(el.dataset.pcStageField){const item=stage.items[Number(el.dataset.index)],field=el.dataset.pcStageField;if(field==='process'){item.kind=el.value==='标准件'?'standard':'machining';item.process=el.value==='标准件'?'':el.value;}else item[field]=field==='quantity'?Number(el.value):field==='unitPriceCents'?Math.round(Number(el.value)*100):el.value;const hint=el.closest('tr')?.querySelector('.pc-cell-sub');if(hint){hint.textContent=stageIssues(item)||[item._stepName,item._drawingName].filter(Boolean).join(' + ')||'标准件';hint.classList.toggle('pc-issue',Boolean(stageIssues(item)));}document.querySelector('#pc-stage-issues').textContent=stage.items.some(stageIssues)?'带红色提示的条目需补充文件或修改后提交。':'';}
    if(el.form?.id==='pc-batch-form'&&['title','teamId','notes'].includes(el.name))stage[el.name]=el.value;
  });
  view.addEventListener('change',event=>{const el=event.target;if(el.id==='pc-import-files'||el.id==='pc-import-folder'){importFiles(el.files);el.value='';}if(el.id==='pc-stage-all'){stage.selected=new Set(el.checked?stage.items.map((_,i)=>i):[]);stageTable();}if(el.dataset.pcStageSelect!==undefined){const index=Number(el.dataset.pcStageSelect);if(el.checked)stage.selected.add(index);else stage.selected.delete(index);document.querySelector('#pc-stage-selected').textContent='已选 '+stage.selected.size+' 项';}if(el.dataset.pcSelect){if(el.checked)state.selected.add(el.dataset.pcSelect);else state.selected.delete(el.dataset.pcSelect);document.querySelector('#pc-selection').outerHTML=selectionBar();}if(el.hasAttribute('data-pc-select-all')){for(const item of data.items){if(el.checked)state.selected.add(item.id);else state.selected.delete(item.id);}for(const box of view.querySelectorAll('[data-pc-select]'))box.checked=el.checked;document.querySelector('#pc-selection').outerHTML=selectionBar();}});
  view.addEventListener('submit',event=>{const form=event.target;if(form.id==='pc-filter'){event.preventDefault();const input=Object.fromEntries(new FormData(form));Object.assign(state,{q:input.q.trim(),state:input.state,applicant:input.applicant,mine:Boolean(input.mine),from:input.from,to:input.to,requestId:'',itemId:''});if(state.from||state.to)state.date='';resetSelection();rememberView();kit.render();}else if(form.id==='pc-batch-form'){event.preventDefault();submitBatch(form,event.submitter?.value==='submit',event.submitter).catch(error=>notify(error.message,true));}});
  view.addEventListener('dragover',event=>{if(event.target.closest('#pc-drop')){event.preventDefault();document.querySelector('#pc-drop').classList.add('dragging');}});
  view.addEventListener('dragleave',event=>{if(event.target.closest('#pc-drop'))document.querySelector('#pc-drop').classList.remove('dragging');});
  view.addEventListener('drop',event=>{if(event.target.closest('#pc-drop')){event.preventDefault();document.querySelector('#pc-drop').classList.remove('dragging');importFiles(event.dataTransfer.files);}});
  return {requestsPage,importPage,dispose};
}
