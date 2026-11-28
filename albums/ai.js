import { $, el, link, button, media, empty, request } from './ui.js';

export const aiRoute = key => key === 'ai' || key === 'people' || /^person-\d+$/.test(key);
const shortName = group => group.name || `人物 ${group.id}`;

function portrait(photo, box) {
  const frame = el('span', 'ai-portrait');
  if (!photo) return frame;
  const image = media(photo.thumbUrl, '', true);
  const w = photo.width, h = photo.height;
  if (box && w > 0 && h > 0) {
    const [x1,y1,x2,y2] = box;
    const size = Math.max(1, Math.min(w,h, Math.max((x2-x1)*w,(y2-y1)*h)*1.7));
    const x = Math.min(w-size, Math.max(0,(x1+x2)*w/2-size/2));
    const y = Math.min(h-size, Math.max(0,(y1+y2)*h/2-size/2));
    Object.assign(image.style, {width:`${w/size*100}%`,height:`${h/size*100}%`,left:`${-x/size*100}%`,top:`${-y/size*100}%`});
  }
  frame.append(image);
  return frame;
}

export function setupAlbumAI({api, getRepo, getPhoto, render}) {
  let key = '', commit = '', generation = 0, timer, queryTimer, requestId = 0;
  let status = null, loading = false, error = '', resultIds = [], groups = [], mode = 'semantic';
  const panel = $('ai-panel'), state = $('ai-progress'), retry = $('ai-index'), modes = $('ai-modes');
  const apiPath = (action, params={}) => `${api}/ai/${action}?${new URLSearchParams({ref:commit,...params})}`;
  const active = () => aiRoute(key);
  const person = () => groups.find(g => key === `person-${g.id}`);
  const query = () => $('search').value.trim();
  const ids = () => key.startsWith('person-') ? person()?.ids || [] : resultIds;

  function controls() {
    panel.hidden = !active();
    if (!active()) return;
    modes.hidden = key !== 'ai';
    for (const b of modes.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed',String(b.dataset.mode === mode));
    if (key === 'ai') $('search').placeholder = mode === 'text' ? '输入照片上出现的文字' : '用中文描述画面，例如「操场上的合影」';
    $('ai-back').hidden = !key.startsWith('person-');
    retry.hidden = !status?.enabled || !status.canManage || !(status.failed || status.missing || status.error);
    let message = '正在读取识别进度…';
    if (status?.enabled) {
      message = `已识别 ${status.ready} / ${status.total} 张`;
      if (status.queued) message += ` · ${status.queued} 张排队中`;
      if (status.failed) message += ` · ${status.failed} 张失败`;
      if (status.missing) message += ` · ${status.missing} 张待建索引`;
      if (status.error) message += ` · ${status.error}`;
    } else if (status) message = 'NAS 尚未启用相册 AI';
    state.textContent = error || message;
    const group = person();
    $('ai-rename').hidden = !group || !status?.canManage;
    if (group) { $('heading').textContent = $('tab-title').textContent = shortName(group); document.title = `${shortName(group)} · ${getRepo().title} · Gitpolar`; }
  }
  async function updateStatus(epoch) {
    clearTimeout(timer);
    try {
      const next = await request(apiPath('status'));
      if (epoch !== generation) return;
      const previous = status;
      status = next;
      const changed = !previous || previous.ready !== next.ready;
      if (next.enabled && (key !== 'ai' || query()) && changed) await fetchResults(Boolean(previous));
      else { controls(); if (!previous) render(); }
    } catch (e) { if (epoch === generation) { error = e.message; controls(); render(); } }
    const waitingForDiscovery = status?.enabled && status.missing && getRepo()?.ref === 'main';
    if (epoch === generation && (status?.queued || !status || waitingForDiscovery))
      timer = setTimeout(() => updateStatus(epoch), 12_000);
  }
  async function fetchResults(background = false) {
    clearTimeout(queryTimer);
    const token = ++requestId, q = query();
    error = '';
    if (!status?.enabled || (key === 'ai' && !q)) { resultIds=[]; loading=false; controls(); render(); return; }
    loading = !background;
    controls();
    if (!background) render();
    try {
      const response = await request(key === 'ai' ? apiPath('search',{q,mode}) : apiPath('people'));
      if (token !== requestId) return;
      if (key === 'ai') resultIds = response.ids;
      else groups = response.people;
    } catch (e) { if (token === requestId) { error = e.message; resultIds = []; } }
    finally {
      if (token === requestId) {
        loading = false;
        const scroll = $('scroll').scrollTop;
        controls(); render();
        if (background) $('scroll').scrollTop = scroll;
      }
    }
  }
  function searchChanged() {
    if (key !== 'ai') { render(); return; }
    ++requestId; clearTimeout(queryTimer);
    resultIds=[]; loading=Boolean(query() && status?.enabled); error=''; render();
    queryTimer = setTimeout(fetchResults, 380);
  }
  modes.onclick = e => {
    const value = e.target.closest('[data-mode]')?.dataset.mode;
    if (value) { mode = value; controls(); fetchResults(); $('search').focus(); }
  };
  $('search').addEventListener('keydown', e => {
    if (key === 'ai' && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); fetchResults(); }
  });
  retry.onclick = async () => {
    const epoch = generation; retry.disabled = true;
    try { await request(apiPath('index'), {method:'POST',body:{}}); if (epoch === generation) { error=''; await updateStatus(epoch); } }
    catch(e) { if (epoch === generation) { error=e.message; controls(); } }
    finally { retry.disabled=false; }
  };
  $('ai-name-form').onsubmit = async e => {
    e.preventDefault();
    const group = person(), epoch = generation;
    if (!group) return;
    const input = $('ai-name'), save = $('ai-save'); save.disabled = true;
    try {
      const result = await request(apiPath(`people/${group.id}`), {method:'PATCH',body:{name:input.value}});
      if (epoch === generation) {
        const current = groups.find(item => item.id === result.id);
        if (current) current.name = result.name;
        $('ai-rename').open = false;
        controls();
      }
    } catch(e) { if (epoch === generation) { error=e.message; controls(); } }
    finally { save.disabled=false; }
  };
  const rename = $('ai-rename');
  rename.querySelector('summary').addEventListener('click', () => {
    if (!rename.open) $('ai-name').value = person()?.name || '';
  });
  rename.ontoggle = () => { if (rename.open) $('ai-name').focus(); };

  function enter(route, oid) {
    ++generation; ++requestId; clearTimeout(timer); clearTimeout(queryTimer);
    key=route; commit=oid; status=null; groups=[]; resultIds=[]; loading=false; error='';
    $('ai-rename').open=false; controls();
    if (active()) updateStatus(generation);
  }
  function hint() {
    if (error) return ['无法读取识别结果',error];
    if (!status) return ['正在读取相册索引',''];
    if (!status.enabled) return ['尚未启用相册 AI','启用 NAS 上的 Immich 机器学习服务后可使用此视图。'];
    if (loading) return ['正在搜索…',''];
    if (!status.ready && status.total) return ['等待识别结果',state.textContent];
    if (key === 'ai' && !query()) return mode === 'text' ? ['搜索照片中的文字','在上方搜索框输入标牌、海报或截图中的文字。'] : ['用中文描述你要找的照片','可以输入「一群人在室内合影」或「桌上的工具」。'];
    return key === 'people' ? ['没有匹配的人物分组',''] : ['没有符合条件的照片',''];
  }
  function showPeople(root) {
    const q=query().toLowerCase();
    const matches=groups.filter(g => shortName(g).toLowerCase().includes(q));
    root.className='ai-people-grid';
    for (const group of matches) {
      const a=link('',`#/people/${group.id}`,'ai-person-card');
      a.append(portrait(getPhoto(group.coverId),group.box),el('strong','',shortName(group)),el('small','',`${group.ids.length} 张照片`));
      root.append(a);
    }
    if (!matches.length) empty(root,'people',...hint());
    return matches.length;
  }
  function photoDetails(photo) {
    const details = el('details','section ai-photo'), summary = el('summary','','AI 识别');
    const content = el('div','ai-photo-body');
    details.append(summary,content);
    const url = `${api}/ai/photo?${new URLSearchParams({ref:getRepo().oid,id:photo.id})}`;
    details.ontoggle = async () => {
      if (!details.open) return;
      content.textContent='正在读取…';
      try {
        const data = await request(url);
        if (data.state !== 'ready') { content.textContent=data.error || (data.state === 'queued' ? '这张照片正在排队识别。' : '这张照片尚未建立索引。'); return; }
        content.replaceChildren(el('h4','','人物'));
        const labels=el('div','tags');
        for (const face of data.faces) labels.append(link(face.name || `人物 ${face.person}`,`#/people/${face.person}`,'chip'));
        if (!data.faces.length) labels.append(el('span','muted','未检测到人脸'));
        content.append(labels,el('h4','','照片中的文字'),el('p','ai-transcript',data.text || '未检测到文字'));
      } catch(e) { content.textContent=e.message; }
    };
    return details;
  }
  return {enter,ids,hint,showPeople,searchChanged,photoDetails};
}
