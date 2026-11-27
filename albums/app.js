import { ASSET_GRID_GAP_PX as gap, countFittingColumns, distributeMasonryItems, layoutJustifiedRows, aspectRatioForAsset } from './vendor/serpent-layout.js';

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const entryQuery = new URLSearchParams(location.search);
  const repoName = entryQuery.get('repo') || '';
  const requestedRef = entryQuery.get('ref') || 'main';
  const number = new Intl.NumberFormat('zh-CN');
  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
  const dateSources = new Map([['exif', 'EXIF'], ['folder', '目录'], ['filename', '文件名']]);
  const filtersByView = new Map();
  const pageSize = 72;
  const copy = {
    repos: { heading: '仓库列表', search: '搜索仓库或拥有者', unit: '个仓库', empty: '还没有可访问的相册仓库' },
    albums: { heading: '活动相册', search: '搜索活动或目录', unit: '个活动', empty: '这个仓库还没有活动相册' },
    photos: { heading: '照片', search: '搜索名称、路径或标签', unit: '张照片', empty: '这个活动还没有照片' }
  };

  let pendingRequest, model, failure, view;
  let results = [], shown = 0, groupCounts = new Map(), groupLists = new Map();
  let photoIndex = -1, layout = 'justified', saving = false;
  let layoutFrame = 0;
  try { if (localStorage.getItem('gitpolar:album-layout') === 'masonry') layout = 'masonry'; } catch { /* Storage is optional. */ }

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    let preference;
    try { preference = JSON.parse(localStorage.getItem('branchline:theme')); } catch { /* Storage is optional. */ }
    const theme = ['light', 'dark'].includes(preference) ? preference : (systemTheme.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#010409' : '#f6f8fa';
  }
  applyTheme();
  systemTheme.addEventListener('change', applyTheme);
  window.addEventListener('storage', event => {
    if (event.key === 'branchline:theme' || event.key === null) applyTheme();
  });

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function icon(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'al-icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.append(use);
    return svg;
  }
  function link(text, href, className) {
    const anchor = el('a', className, text);
    anchor.href = href;
    return anchor;
  }
  function action(text, callback) {
    const button = el('button', 'button', text);
    button.type = 'button';
    button.addEventListener('click', callback);
    return button;
  }
  function mediaUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, location.href);
      if (url.origin === location.origin && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch { /* Invalid URLs use the same unavailable state as missing images. */ }
    return '';
  }
  function counted(value, unit) {
    return Number.isFinite(value) ? `${number.format(value)} ${unit}` : '';
  }
  function bytes(value) {
    if (!Number.isFinite(value) || value < 0) return '';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
    return `${Number(value.toFixed(1))} ${units[index]}`;
  }
  function ownerText(owner) {
    const name = owner?.name;
    const handle = owner?.username;
    return name || (handle && `@${handle}`) || owner?.id || '未提供';
  }
  function fact(symbol, text, className = 'al-fact') {
    if (!text) return null;
    const node = el('span', className);
    if (symbol) node.append(icon(symbol));
    node.append(el('span', '', text));
    return node;
  }
  function identity(repo) {
    return [fact('user', `拥有者 ${ownerText(repo.owner)}`), fact('lock', 'Internal', 'al-badge')];
  }

  function repositoryFacts(repo) {
    const facts = identity(repo);
    const ref = repo.ref || requestedRef;
    if (ref !== repo.oid) facts.push(fact('', `当前版本 ${ref}`));
    if (repo.oid) {
      const commit = el('span', 'al-fact');
      commit.title = repo.oid;
      commit.setAttribute('aria-label', `提交 ${repo.oid}`);
      commit.append('提交', el('code', '', repo.oid.slice(0, 7)));
      facts.push(commit);
    }
    return facts;
  }
  function galleryHref(name) {
    const query = new URLSearchParams({ repo: name });
    if (entryQuery.get('ref')) query.set('ref', requestedRef);
    return `/albums/?${query}`;
  }

  // ISO calendar fragments sort directly and do not acquire a timezone, month or day.
  function dateKey(value, precision) {
    const match = /^(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/.exec(value || '');
    if (!match || precision === 'unknown') return '';
    if (precision === 'year') return match[1];
    if (precision === 'month') return match[0].slice(0, 7);
    return match[0];
  }
  function dateLabel(date) {
    if (!date) return '日期未知';
    const [year, month, day] = date.split('-');
    return `${year}年${month ? `${Number(month)}月` : ''}${day ? `${Number(day)}日` : ''}`;
  }
  function dateRange(row) {
    return row.end && row.end !== row.date ? `${dateLabel(row.date)} 至 ${dateLabel(row.end)}` : dateLabel(row.date);
  }
  function photoDate(photo) {
    return dateSources.has(photo.dateSource) ? dateKey(photo.date) : '';
  }
  function yearsOf(values) {
    return [...new Set(values.map(String).filter(value => /^\d{4}$/.test(value)))].sort();
  }
  function row(data, title, date, end, years, keywords) {
    return { data, title, date, end, years, search: [title, date, end, ...years, ...keywords].join(' ').toLowerCase() };
  }
  function repoRow(repo) {
    const years = yearsOf(Array.isArray(repo.years) ? repo.years : []);
    return row(repo, repo.title || repo.name, years[0] || '', years.at(-1) || '', years,
      [repo.name, repo.description, ownerText(repo.owner)]);
  }
  function albumRow(album, photos) {
    const start = dateKey(album.date, album.datePrecision);
    const end = dateKey(album.dateEnd);
    const recordedYear = album.datePrecision === 'unknown' ? '' : yearsOf([album.year])[0];
    const date = start || end || recordedYear || '';
    const years = new Set(yearsOf([date.slice(0, 4), end.slice(0, 4), recordedYear]));
    for (const photo of photos) {
      const year = photoDate(photo).slice(0, 4);
      if (year) years.add(year);
    }
    const title = album.title || album.path?.split('/').filter(Boolean).at(-1) || '未命名活动';
    return row(album, title, date, end, [...years].sort(), [album.path]);
  }
  function photoRow(photo) {
    const date = photoDate(photo);
    const title = photo.name || photo.path?.split('/').at(-1) || '未命名照片';
    return row(photo, title, date, '', date ? [date.slice(0, 4)] : [], [photo.path, ...(photo.tags || [])]);
  }
  function readModel(data) {
    if (!repoName && Array.isArray(data?.repos)) return { repos: data.repos.map(repoRow) };
    if (!repoName || !Array.isArray(data?.albums) || !Array.isArray(data.photos)) throw new Error('invalid-manifest');
    const photosByAlbum = new Map();
    for (const photo of data.photos) {
      const key = String(photo.albumId);
      if (!photosByAlbum.has(key)) photosByAlbum.set(key, []);
      photosByAlbum.get(key).push(photo);
    }
    const albums = data.albums.map(album => albumRow(album, photosByAlbum.get(String(album.id)) || []));
    const albumById = new Map(albums.map(entry => [String(entry.data.id), entry]));
    return { repo: data, albums, albumById, photosByAlbum };
  }

  function intro(title, description = '', facts = []) {
    document.title = `${title} · Gitpolar`;
    $('page-title').textContent = title;
    $('description').textContent = description;
    $('description').hidden = !description;
    $('facts').replaceChildren(...facts.filter(Boolean));
    $('facts').hidden = !$('facts').childElementCount;
  }
  function breadcrumbs(activity) {
    const trail = [['相册仓库', '/albums/']];
    if (repoName) trail.push([repoName, '#/']);
    if (activity) trail.push([activity]);
    $('crumbs').replaceChildren(...trail.map(([text, href], index) => {
      const li = el('li');
      const current = index === trail.length - 1;
      const item = current ? el('span', '', text) : link(text, href);
      if (current) item.setAttribute('aria-current', 'page');
      item.title = text;
      li.append(item);
      return li;
    }));
  }
  function notice(symbol, title, message, control) {
    const box = $('notice');
    box.replaceChildren(icon(symbol), el('h2', '', title));
    if (message) box.append(el('p', '', message));
    if (control) box.append(control);
    box.hidden = false;
  }
  function showFailure(status) {
    if (status === 401) {
      const destination = location.pathname + location.search + location.hash;
      notice('lock', '登录后查看相册', '登录 Gitpolar 后会回到当前相册。',
        link('前往登录', `/login/?returnTo=${encodeURIComponent(destination)}`, 'button primary'));
    } else if (status === 403) {
      notice('lock', '没有访问权限', '当前账号没有查看此相册的权限。', link('返回相册仓库', '/albums/', 'button'));
    } else if (status === 404 && repoName) {
      notice('repo', '找不到仓库或相册版本', `请求的版本为 ${requestedRef}。`, link('查看相册仓库', '/albums/', 'button'));
    } else {
      const hint = status ? `服务返回 HTTP ${status}。` : '请检查网络连接或稍后重试。';
      notice('alert', '无法读取相册', hint, action('重新加载', load));
    }
  }
  function activityId() {
    if (!location.hash || location.hash === '#/') return null;
    const prefix = '#/album/';
    if (location.hash.startsWith(prefix)) {
      try { return decodeURIComponent(location.hash.slice(prefix.length)); } catch { /* Broken deep link. */ }
    }
    return '';
  }
  function renderRoute() {
    if ($('viewer').open) $('viewer').close();
    view = null;
    $('collection').hidden = true;
    $('library-nav').hidden = !model?.repo;
    $('notice').hidden = true;
    breadcrumbs();
    if (!model) {
      intro(repoName || '相册仓库');
      if (failure) showFailure(failure.status);
      else notice('albums', '正在读取相册…');
      return;
    }
    if (!repoName) {
      intro('相册仓库');
      openCollection('repos', 'repos', model.repos);
      return;
    }
    const { repo } = model;
    const allPhotos = location.hash === '#/photos';
    $('activities-tab').setAttribute('aria-current',allPhotos ? 'false' : 'page');
    $('photos-tab').setAttribute('aria-current',allPhotos ? 'page' : 'false');
    if (allPhotos) {
      breadcrumbs('全部照片');
      intro(repo.title || repoName, '', repositoryFacts(repo));
      openCollection('photos','all-photos',repo.photos.map(photoRow));
      return;
    }
    const id = activityId();
    if (id === null) {
      intro(repo.title || repoName, repo.description, [...repositoryFacts(repo),
        fact('image', counted(repo.stats?.photos ?? repo.photos.length, '张照片')), fact('', bytes(repo.stats?.bytes))]);
      openCollection('albums', 'albums', model.albums);
      return;
    }
    const album = model.albumById.get(id);
    if (!album) {
      breadcrumbs('未找到活动');
      intro(repo.title || repoName, '', repositoryFacts(repo));
      notice('folder', '未找到这个活动', '活动可能已移动，或链接不完整。', link('返回全部活动', '#/', 'button'));
      return;
    }
    breadcrumbs(album.title);
    intro(album.title, '', [...repositoryFacts(repo), fact('calendar', dateRange(album)), fact('folder', album.data.path)]);
    const photos = model.photosByAlbum.get(id) || [];
    openCollection('photos', `album:${id}`, photos.map(photoRow));
  }
  async function load() {
    pendingRequest?.abort();
    const request = new AbortController();
    pendingRequest = request;
    model = null;
    failure = null;
    renderRoute();
    try {
      if (repoName === '.' || repoName === '..') throw Object.assign(new Error('repository'), { status: 404 });
      const url = repoName ? `/api/repos/${encodeURIComponent(repoName)}/album?${new URLSearchParams({ ref: requestedRef })}` : '/api/albums';
      const response = await fetch(url, { signal: request.signal, credentials: 'same-origin', mode: 'same-origin',
        cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) throw Object.assign(new Error('request'), { status: response.status });
      const data = await response.json();
      if (pendingRequest !== request) return;
      model = readModel(data);
    } catch (error) {
      if (request.signal.aborted || pendingRequest !== request) return;
      failure = error;
    }
    renderRoute();
  }

  function openCollection(kind, key, entries) {
    if (!filtersByView.has(key)) filtersByView.set(key, { query: '', year: '', sort: 'desc' });
    const filters = filtersByView.get(key);
    view = { kind, entries, filters };
    $('photo-tools').hidden = kind !== 'photos';
    if (kind === 'photos') {
      $('justified').setAttribute('aria-pressed',String(layout === 'justified'));
      $('masonry').setAttribute('aria-pressed',String(layout === 'masonry'));
      $('rating-filter').value = filters.rating || '';
      const tags = [...new Set(entries.flatMap(entry => entry.data.tags || []))].sort(collator.compare);
      $('tag-filter').replaceChildren(new Option('全部标签',''), ...tags.map(tag => new Option(tag,tag)));
      $('tag-filter').value = tags.includes(filters.tag) ? filters.tag : '';
      const activity = key.startsWith('album:') && model.albumById.get(key.slice(6));
      $('export-help').hidden = !activity;
      $('export-help').open = false;
      if (activity) {
        $('serpent-download').href = '/api/repos/' + encodeURIComponent(repoName) + '/album/serpent?' + new URLSearchParams({ref:model.repo.oid,activity:activity.data.id});
        $('serpent-download').textContent = '下载活动素材包（' + bytes(entries.reduce((total, item) => total + item.data.size,0)) + '）';
      } else $('serpent-download').removeAttribute('href');
    }
    $('collection-title').textContent = copy[kind].heading;
    $('search-label').textContent = $('search').placeholder = copy[kind].search;
    $('search').value = filters.query;
    const years = new Set();
    for (const entry of entries) for (const year of entry.years) years.add(year);
    const options = [...years].sort().reverse().map(year => new Option(`${year} 年`, year));
    if (entries.some(entry => !entry.years.length)) options.push(new Option('年份未知', 'unknown'));
    $('year').replaceChildren(new Option('全部年份', ''), ...options);
    $('year').value = filters.year;
    const sortLabel = kind === 'repos' ? '年份' : '日期';
    $('sort').options[0].text = `${sortLabel}从新到旧`;
    $('sort').options[1].text = `${sortLabel}从旧到新`;
    $('sort').value = filters.sort;
    $('filters').hidden = entries.length === 0;
    $('collection').hidden = false;
    updateResults();
  }
  function groupFor(entry) {
    if (view.kind === 'repos') return '';
    if (view.kind === 'photos') return entry.date;
    return (view.filters.year && view.filters.year !== 'unknown') ? view.filters.year : entry.date.slice(0, 4);
  }
  function updateResults() {
    const { entries, kind, filters } = view;
    filters.query = $('search').value;
    filters.year = $('year').value;
    filters.sort = $('sort').value;
    filters.rating = kind === 'photos' ? $('rating-filter').value : '';
    filters.tag = kind === 'photos' ? $('tag-filter').value : '';
    const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const descending = filters.sort === 'desc';
    const sortKey = entry => kind === 'repos' && descending ? entry.end : entry.date;
    results = entries.filter(entry => {
      const yearMatches = filters.year === 'unknown' ? !entry.years.length : !filters.year || entry.years.includes(filters.year);
      const rating = entry.data.rating || 0;
      const ratingMatches = filters.rating === '' || (filters.rating === '0' ? rating === 0 : rating >= Number(filters.rating));
      return yearMatches && ratingMatches && (!filters.tag || entry.data.tags?.includes(filters.tag)) && terms.every(term => entry.search.includes(term));
    }).sort((a, b) => {
      const first = sortKey(a), second = sortKey(b);
      if (!first && second) return 1;
      if (first && !second) return -1;
      if (first !== second) return (first < second ? -1 : 1) * (descending ? -1 : 1);
      return collator.compare(a.title, b.title) || collator.compare(a.data.path || '', b.data.path || '');
    });
    const count = number.format(results.length);
    $('result-count').textContent = results.length === entries.length ? count : `${count} / ${number.format(entries.length)}`;
    $('result-count').setAttribute('aria-label', `显示 ${counted(results.length, copy[kind].unit)}，共 ${counted(entries.length, copy[kind].unit)}`);
    groupCounts = new Map();
    for (const entry of results) {
      const group = groupFor(entry);
      groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
    }
    groupLists = new Map();
    shown = 0;
    $('groups').replaceChildren();
    $('notice').hidden = true;
    appendPage();
    if (results.length) return;
    if (!entries.length) notice(kind === 'photos' ? 'image' : 'albums', copy[kind].empty);
    else notice('search', '没有符合条件的结果', '可以更换关键词或年份。', action('清除筛选', () => {
      $('search').value = '';
      $('year').value = '';
      $('rating-filter').value = '';
      $('tag-filter').value = '';
      updateResults();
      $('search').focus();
    }));
  }
  function listFor(group) {
    if (groupLists.has(group)) return groupLists.get(group);
    const { kind } = view;
    const list = el('ul', kind === 'photos' ? 'al-grid al-photo-grid' : 'al-grid');
    if (kind === 'repos') $('groups').append(list);
    else {
      const section = el('section', 'al-group');
      const head = el('div', 'al-group-head');
      head.append(el('h3', '', dateLabel(group)), el('small', '', counted(groupCounts.get(group), copy[kind].unit)));
      section.append(head, list);
      $('groups').append(section);
    }
    groupLists.set(group, list);
    return list;
  }
  function appendPage() {
    const end = Math.min(shown + pageSize, results.length);
    for (; shown < end; shown++) {
      const entry = results[shown];
      const li = el('li');
      li.dataset.index = String(shown);
      li.append(card(entry, shown));
      listFor(groupFor(entry)).append(li);
    }
    if (view.kind === 'photos') scheduleLayout();
    $('more').hidden = shown >= results.length;
    if (!$('more').hidden) $('more').textContent = `显示更多（剩余 ${counted(results.length - shown, copy[view.kind].unit)}）`;
  }

  function scheduleLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      if (view?.kind !== 'photos') return;
      for (const list of groupLists.values()) layoutPhotos(list);
    });
  }
  function layoutPhotos(list) {
    const width = list.clientWidth;
    if (!width) return;
    const items = Array.from(list.children, (node, id) => {
      const photo = results[Number(node.dataset.index)].data;
      return {id, node, aspectRatio:aspectRatioForAsset(photo.width,photo.height)};
    });
    const caption = 34;
    const place = (item,x,y,w,h) => {
      const style = item.node.style;
      style.left = x + 'px'; style.top = y + 'px';
      style.width = w + 'px'; style.height = h + caption + 'px';
    };
    let height = 0;
    if (layout === 'masonry') {
      const count = countFittingColumns(width,width < 600 ? 136 : 200);
      const step = (width + gap) / count;
      const cardHeight = (item,w) => Math.max(1,Math.round(w / Math.max(0.32,item.aspectRatio)));
      const columns = distributeMasonryItems(items,count,item => cardHeight(item,step-gap) + caption);
      columns.forEach((column,index) => {
        const x = Math.round(index * step), w = Math.round((index+1)*step) - gap - x;
        let y = 0;
        for (const item of column.items) {
          const h = cardHeight(item,w);
          place(item,x,y,w,h); y += h + caption + gap;
        }
        height = Math.max(height,y);
      });
    } else {
      const rows = layoutJustifiedRows(items,width,width < 600 ? 130 : 186,gap);
      for (const row of rows) {
        let x = 0;
        for (const slot of row.items) {
          place(items[slot.id],x,height,slot.width,slot.height);
          x += slot.width + gap;
        }
        height += row.height + caption + gap;
      }
    }
    list.style.height = Math.max(0,height - gap) + 'px';
    list.classList.add('al-serpent-layout');
  }
  let lastWidth = -1;
  new ResizeObserver(([entry]) => {
    if (entry.contentRect.width !== lastWidth) {
      lastWidth = entry.contentRect.width;
      scheduleLayout();
    }
  }).observe($('album-main'));
  for (const name of ['justified','masonry']) $(name).addEventListener('click', () => {
    layout = name;
    try { localStorage.setItem('gitpolar:album-layout',name); } catch { /* Storage is optional. */ }
    for (const mode of ['justified','masonry']) $(mode).setAttribute('aria-pressed',String(mode === name));
    scheduleLayout();
  });
  $('tag-filter').addEventListener('change',updateResults);
  $('rating-filter').addEventListener('change',updateResults);
  $('viewer').addEventListener('cancel',event => { if (saving) event.preventDefault(); });
  $('selection-form').addEventListener('submit',async event => {
    event.preventDefault();
    if (saving || !model?.repo?.canEdit || photoIndex < 0) return;
    const photo = results[photoIndex].data;
    const tags = $('tag-input').value.split(/[,，]/u).map(tag => tag.trim()).filter(Boolean);
    saving = true;
    for (const id of ['save-selection','star-input','tag-input','close','previous','next']) $(id).disabled = true;
    $('selection-status').textContent = '正在保存…';
    const route = location.href;
    try {
      const response = await fetch('/api/repos/' + encodeURIComponent(repoName) + '/album/selection?' + new URLSearchParams({ref:requestedRef}), {
        method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:photo.id,expectedHead:model.repo.oid,rating:Number($('star-input').value),tags})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败，请重试。');
      // Re-read the saved branch so all subsequent media and export links use its new commit.
      await load();
      if (location.href === route && view?.kind === 'photos') {
        const index = results.findIndex(entry => entry.data.id === photo.id);
        if (index >= 0) {
          openPhoto(index);
          $('inspector').open = true;
          $('selection-status').textContent = '已保存到 ' + requestedRef;
        }
      }
    } catch (error) {
      $('selection-status').textContent = error.message || '无法保存，请重试。';
    } finally {
      saving = false;
      $('save-selection').disabled = $('close').disabled = false;
      $('tag-input').disabled = $('star-input').disabled = !model?.repo?.canEdit;
      $('previous').disabled = photoIndex <= 0;
      $('next').disabled = photoIndex >= results.length - 1;
    }
  });

  // One image node per request, so a delayed load/error can only update its own frame.
  function media(rawUrl, type, alt = '') {
    const preview = type === '预览图';
    const frame = el('span', 'al-media');
    const placeholder = el('span', 'al-placeholder');
    const url = mediaUrl(rawUrl);
    const message = el('span', '', url ? (preview ? '正在加载预览图…' : '') : `暂无${type}`);
    placeholder.append(icon('image'), message);
    frame.append(placeholder);
    if (!url) return frame;
    const image = el('img');
    image.alt = alt;
    image.loading = preview ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.addEventListener('load', () => placeholder.remove(), { once: true });
    image.addEventListener('error', () => {
      image.remove();
      message.textContent = `${type}加载失败`;
    }, { once: true });
    frame.append(image);
    image.src = url;
    return frame;
  }
  function card(entry, index) {
    const { data, title } = entry;
    const { kind } = view;
    const isPhoto = kind === 'photos';
    let control;
    if (isPhoto) {
      control = el('button', 'al-card');
      control.type = 'button';
      control.setAttribute('aria-haspopup', 'dialog');
      control.addEventListener('click', () => openPhoto(index));
    } else {
      const href = kind === 'repos' ? galleryHref(data.name) : `#/album/${encodeURIComponent(data.id)}`;
      control = link('', href, 'al-card');
    }
    const figure = el('span', 'al-figure');
    figure.append(media(isPhoto ? data.thumbUrl : data.coverUrl, isPhoto ? '缩略图' : '封面'));
    if (isPhoto && data.rating) figure.append(fact('', '★ ' + data.rating,'al-overlay-count'));
    if (!isPhoto) {
      const count = kind === 'repos' ? data.photoCount : data.count;
      const badge = fact('image', counted(count, '张'), 'al-overlay-count');
      if (badge) figure.append(badge);
    }
    const body = el('span', 'al-card-body');
    const name = el('span', 'al-card-title', title);
    name.title = title;
    body.append(name);
    if (!isPhoto) {
      const facts = el('span', 'al-card-facts');
      if (kind === 'repos') {
        const subtitle = data.name !== title ? data.name : data.description;
        if (subtitle) body.append(el('span', 'al-card-note', subtitle));
        facts.append(...identity(data));
        const albums = fact('albums', counted(data.albumCount, '个活动'));
        if (albums) facts.append(albums);
      } else {
        facts.append(fact('calendar', dateRange(entry)));
        if (data.path && data.path !== title) {
          const path = el('span', 'al-card-note', data.path);
          path.title = data.path;
          body.append(path);
        }
      }
      body.append(facts);
    }
    control.append(figure, body);
    return control;
  }

  function showPhoto(index) {
    if (index < 0 || index >= results.length) return;
    photoIndex = index;
    const { data: photo, title, date } = results[index];
    $('viewer-title').textContent = title;
    $('star-input').value = String(photo.rating || 0);
    $('tag-input').value = (photo.tags || []).join('，');
    $('selection-summary').textContent = [photo.rating && '★ ' + photo.rating, ...(photo.tags || [])].filter(Boolean).join(' · ');
    $('star-input').disabled = $('tag-input').disabled = !model.repo.canEdit;
    $('save-selection').hidden = !model.repo.canEdit;
    $('selection-status').textContent = model.repo.canEdit ? '' : '当前版本为只读';
    $('viewer-path').textContent = photo.path || '';
    $('viewer-path').title = photo.path || '';
    $('position').textContent = `${number.format(index + 1)} / ${number.format(results.length)}`;
    $('previous').disabled = index === 0;
    $('next').disabled = index === results.length - 1;
    const dimensions = photo.width > 0 && photo.height > 0 ? `${photo.width} × ${photo.height}` : '';
    const recordedDate = date ? `${dateLabel(date)}（${dateSources.get(photo.dateSource)}）` : dateLabel('');
    $('image-info').textContent = [recordedDate, dimensions, bytes(photo.size)].filter(Boolean).join(' · ');
    $('stage').replaceChildren(media(photo.previewUrl, '预览图', title));
    const original = mediaUrl(photo.originalUrl);
    const download = $('download');
    if (original) {
      download.href = original;
      download.download = photo.name || '';
      download.removeAttribute('aria-disabled');
    } else {
      download.removeAttribute('href');
      download.setAttribute('aria-disabled', 'true');
    }
    $('download-label').textContent = original ? '下载原图' : '原图不可用';
  }
  function openPhoto(index) {
    showPhoto(index);
    $('viewer').showModal();
  }
  $('previous').addEventListener('click', () => showPhoto(photoIndex - 1));
  $('next').addEventListener('click', () => showPhoto(photoIndex + 1));
  $('close').addEventListener('click', () => $('viewer').close());
  document.addEventListener('keydown', event => {
    if (saving || event.target.closest?.('input, select, textarea') || !$('viewer').open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
    // Escape follows the native dialog cancel/close and focus restoration behavior.
  });
  $('viewer').addEventListener('close', () => {
    if ($('viewer').open) return;
    photoIndex = -1;
    $('stage').replaceChildren();
    $('download').removeAttribute('href');
  });
  $('more').addEventListener('click', appendPage);
  $('search').addEventListener('input', updateResults);
  $('year').addEventListener('change', updateResults);
  $('sort').addEventListener('change', updateResults);
  $('skip').addEventListener('click', event => {
    event.preventDefault();
    $('album-main').focus();
  });
  window.addEventListener('hashchange', () => {
    renderRoute();
    $('album-main').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });
  if (repoName) {
    $('repo-link').href = `/#/repos/${encodeURIComponent(repoName)}?${new URLSearchParams({ branch: requestedRef })}`;
    $('repo-link-label').textContent = '返回仓库';
  }
  load();
})();
