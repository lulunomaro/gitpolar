import { $, el, icon, initIcons, button, link, sizeText, media, request, empty, stored, store } from './ui.js';
import {
  ASSET_GRID_GAP_PX as gap,
  countFittingColumns,
  distributeMasonryItems,
  layoutJustifiedRows,
  aspectRatioForAsset,
} from './vendor/serpent-layout.js';
import {
  buildBrowseSelectionOrder,
  invertSelection,
  isToggleSelectionModifier,
  resolveSelectionPlatform,
  resolveShiftBrowseRange,
} from './vendor/serpent-selection.js';
import { setupPulls } from './pulls.js';

initIcons();
const query = new URLSearchParams(location.search),
  name = query.get('repo') || '',
  ref = query.get('ref') || 'main';
const api = `/api/repos/${encodeURIComponent(name)}/album`;
const cmp = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' }).compare;
const platform = resolveSelectionPlatform(navigator.userAgent);
const narrow = matchMedia('(max-width:680px)'),
  mid = matchMedia('(max-width:900px)');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
function theme() {
  if (window.GitpolarAppearance) { document.documentElement.dataset.theme = window.GitpolarAppearance.getTheme(); return; }
  let pref;
  try {
    pref = JSON.parse(localStorage.getItem('branchline:theme'));
  } catch {
    /* Use system theme. */
  }
  const dark = pref === 'dark' || (pref !== 'light' && systemTheme.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#242528' : '#e5e5e9';
}
addEventListener('gitpolar:appearance', theme);
theme();
systemTheme.addEventListener('change', theme);
addEventListener('storage', theme);
const activityHref = (id) => '#/album/' + encodeURIComponent(id);
const repoHref = (repo) => '/albums/?' + new URLSearchParams({ repo });
const ownerName = (owner) => owner?.name || owner?.username || '—';
const typeName = (p) => p.name.split('.').at(-1).toUpperCase();
const dateText = (p) => (p.date && p.dateSource !== 'unknown' ? p.date : '');
let repo,
  repos = [],
  albumMap = new Map(),
  photoMap = new Map(),
  activities = [],
  pulls = [],
  pullsError = '',
  loaded = false;
let kind = '',
  routeKey = '',
  items = [],
  results = [],
  assetOrder = [],
  selected = new Set(),
  anchor = null,
  focused = '',
  shown = 0,
  viewing = [];
let layout = stored('layout', 'justified') === 'masonry' ? 'masonry' : 'justified';
let cardSize = Math.max(110, Math.min(270, Number(stored('size', 190)) || 190));
let multi = false,
  beforeEdit,
  loadId = 0,
  currentPullLoad = 0,
  frame = 0;
const viewMemory = new Map();
const collab = setupPulls({
  api,
  getRepo: () => repo,
  afterChange: async (merged) => {
    if (merged) await load();
    else await refreshPulls();
  },
  getActivity: () => (kind === 'photos' && albumMap.has(routeKey) ? routeKey : ''),
});
const text = (id, value) => {
  $(id).textContent = value;
};
function setPane(side, open) {
  const shell = $('shell'),
    mobile = side === 'library' ? narrow.matches : mid.matches;
  const name = side === 'library' ? 'library' : 'info';
  if (mobile) {
    shell.classList.toggle('show-' + name, open);
    if (open) shell.classList.remove('show-' + (name === 'info' ? 'library' : 'info'));
  } else {
    shell.classList.toggle('no-' + name, !open);
    store('show-' + name, String(open));
  }
  panes();
}
function panes() {
  const cls = $('shell').classList;
  for (const [side, small] of [
    ['library', narrow.matches],
    ['info', mid.matches],
  ]) {
    const shown = small ? cls.contains('show-' + side) : stored('show-' + side, 'true') === 'true';
    cls.toggle('no-' + side, !small && !shown);
    if (!small) cls.remove('show-' + side);
    $('toggle-' + side).setAttribute('aria-expanded', String(shown));
  }
  $('shade').hidden = !(cls.contains('show-info') || cls.contains('show-library'));
}
for (const side of ['info', 'library'])
  $('toggle-' + side).onclick = () =>
    setPane(side, $('toggle-' + side).getAttribute('aria-expanded') !== 'true');
function closeOverlays() {
  $('shell').classList.remove('show-info', 'show-library');
  panes();
}
$('shade').onclick = closeOverlays;
$('hide-info').onclick = () => setPane('info', false);
mid.addEventListener('change', closeOverlays);
narrow.addEventListener('change', closeOverlays);
panes();
for (const dismiss of document.querySelectorAll('[data-dismiss]'))
  dismiss.onclick = () => dismiss.closest('dialog').requestClose();
function nav(title, href, symbol, count, key) {
  const a = link('', href, 'nav-item', symbol);
  a.append(el('span', '', title));
  a.title = title;
  if (count != null) a.append(el('small', '', count));
  a.dataset.key = key;
  return a;
}
function sidebar() {
  const photos = repo?.photos || [];
  $('views').replaceChildren(
    ...(repo
      ? [
          nav('全部照片', '#/photos', 'grid', photos.length, 'photos'),
          nav('活动相册', '#/activities', 'albums', activities.length, 'activities'),
          nav('我的 Star', '#/stars', 'star', myStarCount(), 'stars'),
          nav('已评分', '#/starred', 'select', photos.filter((p) => p.rating > 0).length, 'starred'),
        ]
      : [nav('相册仓库', '/albums/', 'albums', loaded ? repos.length : null, 'repos')])
  );
  $('folders').hidden = $('collab').hidden = !repo;
  if (!repo) return;
  text('library-name', repo.title || repo.name);
  $('library-name').title = repo.title || repo.name;
  text('ref-label', ref.length === 40 ? ref.slice(0, 9) : ref);
  $('repo-link').title = '打开 Git 仓库';
  $('repo-link').href = `/#/repos/${encodeURIComponent(name)}?${new URLSearchParams({ branch: ref })}`;
  text('activity-count', activities.length);
  const years = Map.groupBy(activities, (a) => a.year || a.date?.slice(0, 4) || '日期未知');
  const oldGroups = new Map([...$('tree').children].map((d) => [d.dataset.year, d.open]));
  $('tree').replaceChildren();
  for (const [year, albums] of [...years].sort(([a], [b]) => cmp(b, a))) {
    const group = el('details', 'tree');
    group.dataset.year = year;
    group.open = oldGroups.get(year) ?? $('tree').childElementCount === 0;
    const head = el('summary');
    head.append(icon('right'), icon('folder'), el('span', '', year), el('small', '', albums.length));
    group.append(head);
    for (const a of albums) group.append(nav(a.title, activityHref(a.id), 'folder', a.count, a.id));
    $('tree').append(group);
  }
  reviewNav();
}
function reviewNav() {
  $('review-nav').replaceChildren(
    nav(
      '相册投稿',
      '#/pulls',
      'pull',
      pullsError ? '!' : pulls.filter((p) => p.state === 'open').length,
      'pulls'
    )
  );
}
function markNav() {
  for (const a of document.querySelectorAll('.nav-item')) {
    if (a.dataset.key === routeKey || (a.dataset.key === 'stars' && routeKey === 'star-activities')) {
      a.setAttribute('aria-current', 'page');
      if (a.closest('.tree')) a.closest('.tree').open = true;
    } else a.removeAttribute('aria-current');
  }
}
let deepPullOpened = false;
async function refreshPulls() {
  const token = ++currentPullLoad;
  try {
    const data = await request(api + '/pulls');
    if (token !== currentPullLoad) return;
    pulls = data.pulls;
    pullsError = '';
  } catch (e) {
    if (token !== currentPullLoad) return;
    pullsError = e.message;
  }
  reviewNav();
  markNav();
  if (kind === 'pulls') {
    renderResults();
    const number = new URLSearchParams(location.search).get('pull');
    if (!deepPullOpened && /^\d+$/.test(number || '') && !pullsError) { deepPullOpened = true; collab.showReview(Number(number)); }
  }
}
async function load() {
  const token = ++loadId;
  try {
    const data = await request(name ? api + '?' + new URLSearchParams({ ref }) : '/api/albums');
    if (token !== loadId) return;
    if (name) {
      repo = data;
      activities = [...repo.albums].sort((a, b) => cmp(b.date, a.date) || cmp(a.title, b.title));
      albumMap = new Map(activities.map((a) => [a.id, a]));
      photoMap = new Map(data.photos.map((p) => [p.id, p]));
    } else repos = data.repos;
    loaded = true;
    sidebar();
    route();
    if (name) await refreshPulls();
  } catch (e) {
    if (token !== loadId) return;
    loaded = false;
    repo = null;
    kind = '';
    sidebar();
    text('tab-title', '相册工作区');
    text('heading', '相册资源库');
    $('gallery').replaceChildren();
    $('filters').hidden = $('layout-tools').hidden = $('upload').hidden = $('more').hidden = true;
    $('notice').hidden = false;
    if (e.status === 401)
      empty(
        $('notice'),
        'lock',
        '登录后查看相册',
        '使用队伍飞书账号登录，即可回到当前相册。',
        link(
          '飞书登录',
          '/login/?returnTo=' + encodeURIComponent(location.pathname + location.search + location.hash),
          'primary'
        )
      );
    else empty($('notice'), 'info', '暂时无法打开相册', e.message, button('重新加载', load));
    $('details').replaceChildren();
  }
}
function options(select, label, entries) {
  select.replaceChildren(new Option(label, ''), ...entries.map((v) => new Option(v, v)));
}
function route() {
  if (!loaded) return;
  if (routeKey)
    viewMemory.set(routeKey, {
      query: $('search').value,
      year: $('year').value,
      rating: $('rating').value,
      tag: $('tag').value,
      sort: $('sort').value,
    });
  const hash = location.hash;
  let id = '';
  if (hash.startsWith('#/album/'))
    try {
      id = decodeURIComponent(hash.slice(8));
    } catch {
      /* Show missing link. */
    }
  routeKey = !repo
    ? 'repos'
    : id ||
      (hash === '#/' || hash === '#/activities'
        ? 'activities'
        : hash === '#/pulls'
          ? 'pulls'
          : hash === '#/starred'
            ? 'starred'
            : !hash || hash === '#/photos'
              ? 'photos'
              : 'missing');
  if (repo && hash === '#/stars') routeKey = 'stars';
  if (repo && hash === '#/stars/activities') routeKey = 'star-activities';
  const album = albumMap.get(routeKey);
  kind = album || ['photos', 'starred', 'stars'].includes(routeKey) ? 'photos' : routeKey;
  if (routeKey === 'star-activities') kind = 'activities';
  if (id && !album) kind = 'missing';
  const title =
    album?.title ||
    {
      photos: '全部照片',
      starred: '已评分',
      stars: '我的 Star',
      'star-activities': '我的 Star',
      activities: '活动相册',
      pulls: '相册投稿',
      repos: '相册仓库',
    }[routeKey] ||
    '未找到活动';
  const symbol = { photos: 'grid', activities: 'albums', pulls: 'pull', repos: 'layers' }[kind] || 'folder';
  text('heading', title);
  text('tab-title', title);
  document.title = `${title} · ${repo?.title || '相册'} · Gitpolar`;
  $('heading-icon').replaceChildren(icon(album ? 'folder' : isStarView() ? 'star' : symbol));
  $('activity-star').hidden = !album;
  $('activity-star').replaceChildren(...(album ? [starButton('activity', album)] : []));
  $('star-tabs').hidden = !isStarView();
  $('stars-photos').setAttribute('aria-current', routeKey === 'stars' ? 'page' : 'false');
  $('stars-activities').setAttribute('aria-current', routeKey === 'star-activities' ? 'page' : 'false');
  $('reload-pulls').hidden = kind !== 'pulls';
  $('filters').hidden = ['missing', 'pulls'].includes(kind);
  $('layout-tools').hidden = kind !== 'photos';
  document.querySelectorAll('.photo-filter').forEach((n) => (n.hidden = kind !== 'photos'));
  $('upload').hidden = !repo || ref !== 'main';
  $('upload').onclick = () => collab.upload();
  $('search').placeholder =
    kind === 'pulls' ? '搜索投稿或投稿人' : kind === 'photos' ? '搜索照片、活动或标签' : '搜索名称或目录';
  items =
    kind === 'photos'
      ? repo.photos.filter(
          (p) => (!album || p.albumId === album.id) && (routeKey !== 'starred' || p.rating > 0)
        )
      : kind === 'activities'
        ? activities
        : kind === 'repos'
          ? repos
          : [];
  const years = [...new Set(items.flatMap((o) => o.years || [o.year || o.date?.slice(0, 4) || '日期未知']))]
    .sort(cmp)
    .reverse();
  options($('year'), '年份', years);
  options($('tag'), '标签', [...new Set(items.flatMap((o) => o.tags || []))].sort(cmp));
  const memo = viewMemory.get(routeKey) || {};
  for (const [id, val] of Object.entries({
    search: memo.query || '',
    year: memo.year || '',
    tag: memo.tag || '',
    rating: memo.rating || '',
    sort: memo.sort || 'desc',
  }))
    $(id).value = val;
  selected = new Set();
  anchor = null;
  focused = '';
  setMulti(false);
  markNav();
  closeOverlays();
  if ($('viewer').open) $('viewer').close();
  renderResults(true);
}
function renderResults(autoSelect = false) {
  const terms = $('search').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const year = $('year').value,
    tag = $('tag').value,
    rating = $('rating').value,
    sort = $('sort').value;
  const changed = Boolean(terms.length || year || tag || rating || sort !== 'desc');
  $('reset').hidden = !changed;
  for (const elem of ['year', 'tag', 'rating', 'sort'])
    $(elem)
      .closest('label')
      .classList.toggle('picked', elem === 'sort' ? sort !== 'desc' : !!$(elem).value);
  $('gallery').replaceChildren();
  $('gallery').style.height = '';
  $('notice').hidden = true;
  $('more').hidden = true;
  $('total').hidden = false;
  $('scroll').scrollTop = 0;
  if (kind === 'pulls') {
    $('gallery').className = '';
    const prs = pulls.filter((p) =>
      terms.every((t) => (p.title + ' ' + p.author + ' #' + p.number).toLowerCase().includes(t))
    );
    text('total', prs.length + ' 条');
    text('status', '负责人审核后合并到 main');
    text('status-extra', '');
    if (pullsError) empty($('gallery'), 'info', '无法读取投稿', pullsError, button('重新加载', refreshPulls));
    else collab.list($('gallery'), prs, terms.length > 0);
    inspector();
    return;
  }
  const title = (o) => o.name || o.title || '';
  results = items
    .filter((o) => {
      if (isStarView() && !o.starred) return false;
      const ys = o.years || [o.year || o.date?.slice(0, 4) || '日期未知'];
      if (year && !ys.includes(year)) return false;
      if (
        kind === 'photos' &&
        ((tag && !o.tags.includes(tag)) ||
          (rating !== '' && (rating === '0' ? o.rating !== 0 : o.rating < Number(rating))))
      )
        return false;
      const hay = [
        o.name,
        o.title,
        o.path,
        o.date,
        albumMap.get(o.albumId)?.title,
        ...(o.tags || []),
        o.owner && ownerName(o.owner),
      ]
        .join(' ')
        .toLowerCase();
      return terms.every((t) => hay.includes(t));
    })
    .sort((a, b) => {
      const da = a.date || a.years?.at(-1) || '',
        db = b.date || b.years?.at(-1) || '';
      if (sort !== 'name' && da !== db) return !da ? 1 : !db ? -1 : (sort === 'desc' ? -1 : 1) * cmp(da, db);
      return cmp(title(a), title(b)) || cmp(a.path || '', b.path || '');
    });
  assetOrder =
    kind === 'photos'
      ? buildBrowseSelectionOrder(
          [],
          results.map((p) => p.id)
        )
      : [];
  const visible = new Set(assetOrder.map((i) => i.id));
  selected = new Set([...selected].filter((id) => visible.has(id)));
  if (!selected.has(focused)) focused = [...selected].at(-1) || '';
  if (anchor && !visible.has(anchor.id)) anchor = null;
  if (autoSelect && kind === 'photos' && results.length) {
    focused = results[0].id;
    selected = new Set([focused]);
    anchor = { kind: 'asset', id: focused };
  }
  text('total', results.length + (kind === 'photos' ? ' 张' : kind === 'activities' ? ' 个活动' : ' 个'));
  $('gallery').className = kind === 'photos' ? 'gallery' : 'collection-grid';
  shown = 0;
  if (!results.length) {
    $('notice').hidden = false;
    empty(
      $('notice'),
      kind === 'missing' ? 'folder' : 'search',
      kind === 'missing'
        ? '未找到这个活动'
        : changed
          ? '没有符合条件的结果'
          : isStarView()
            ? kind === 'photos'
              ? '还没有收藏的照片'
              : '还没有收藏的活动合集'
            : routeKey === 'starred'
              ? '还没有已评分的照片'
              : '这里还没有内容',
      '',
      changed ? button('清除筛选', resetFilters) : kind === 'missing' ? link('返回全部照片', '#/photos') : null
    );
  } else appendPage();
  inspectSelection();
}
function resetFilters() {
  for (const id of ['search', 'tag', 'year', 'rating']) $(id).value = '';
  $('sort').value = 'desc';
  renderResults(true);
}
$('reset').onclick = resetFilters;
for (const id of ['year', 'rating', 'tag', 'sort', 'search'])
  $(id).addEventListener(id === 'search' ? 'input' : 'change', () => {
    if (loaded) renderResults();
  });
const savingStars = new Set();
let starEpoch = 0;
async function refreshStars() {
  const snapshot = repo;
  if (!snapshot || savingStars.size) return;
  const epoch = ++starEpoch;
  try {
    const totals = await request(api + '/stars?' + new URLSearchParams({ ref: snapshot.oid }));
    if (epoch !== starEpoch || repo !== snapshot) return;
    let changed = false;
    for (const [type, records] of [
      ['activity', albumMap],
      ['photo', photoMap],
    ]) {
      const current = new Map(totals[type].map((item) => [item.id, item]));
      for (const [id, item] of records) {
        const summary = current.get(id) || { starred: false, starCount: 0 };
        if (item.starred === summary.starred && item.starCount === summary.starCount) continue;
        item.starred = summary.starred;
        item.starCount = summary.starCount;
        changed = true;
        for (const b of document.querySelectorAll(`[data-star="${type}:${id}"]`))
          updateStarButton(b, type, item);
      }
    }
    if (changed) {
      const total = $('views').querySelector('[data-key="stars"] small');
      if (total) total.textContent = myStarCount();
      if (isStarView()) renderResults();
    }
  } catch {
    /* Keep the displayed snapshot until the next refresh. */
  }
}
function isStarView() {
  return routeKey === 'stars' || routeKey === 'star-activities';
}
function myStarCount() {
  return (repo?.photos.filter((p) => p.starred).length || 0) + activities.filter((a) => a.starred).length;
}
function updateStarButton(control, type, item) {
  const label = item.starred ? '取消收藏' : '收藏';
  const what = type === 'photo' ? '照片' : '活动';
  const count = item.starCount || 0;
  control.title = `${label}${what} · ${count} 人收藏`;
  control.setAttribute('aria-label', `${label}${what} ${item.name || item.title}（${count} 人收藏）`);
  control.setAttribute('aria-pressed', String(Boolean(item.starred)));
  control.disabled = savingStars.has(type + ':' + item.id);
  control.replaceChildren(icon('star'));
  if (!control.classList.contains('star-corner'))
    control.append(el('span', 'star-label', item.starred ? 'Starred' : 'Star'));
  control.append(el('span', 'star-count', count));
}
function starButton(type, item, compact = false) {
  const control = button(
    '',
    () => toggleStar(type, item.id),
    compact ? 'asset-star star-corner' : 'asset-star'
  );
  control.dataset.star = type + ':' + item.id;
  updateStarButton(control, type, item);
  return control;
}
async function toggleStar(type, id) {
  const key = type + ':' + id;
  const records = type === 'photo' ? photoMap : albumMap;
  const item = records.get(id);
  if (!item || savingStars.has(key)) return;
  const controls = () => document.querySelectorAll(`[data-star="${key}"]`);
  starEpoch++;
  savingStars.add(key);
  for (const b of controls()) b.disabled = true;
  try {
    const summary = await request(`${api}/stars/${type}/${id}?${new URLSearchParams({ ref: repo.oid })}`, {
      method: item.starred ? 'DELETE' : 'PUT',
    });
    Object.assign(item, summary);
    const latest = (type === 'photo' ? photoMap : albumMap).get(id);
    if (latest && latest !== item) Object.assign(latest, summary);
    const total = $('views').querySelector('[data-key="stars"] small');
    if (total) total.textContent = myStarCount();
    if (isStarView()) {
      const scrollTop = $('scroll').scrollTop;
      renderResults();
      $('scroll').scrollTop = scrollTop;
    }
  } catch (error) {
    const message = '收藏未保存 · ' + error.message;
    text('status', message);
    if ($('viewer').open) text('viewer-meta', message);
  } finally {
    savingStars.delete(key);
    for (const b of controls()) updateStarButton(b, type, item);
  }
}
function card(p, index) {
  const isPhoto = kind === 'photos',
    isRepo = kind === 'repos',
    title = p.title || p.name;
  const c = isPhoto
    ? button('', (e) => selectPhoto(p.id, e), 'card')
    : link('', isRepo ? repoHref(p.name) : activityHref(p.id), 'card');
  if (isPhoto) {
    c.dataset.id = p.id;
    c.setAttribute('aria-pressed', String(selected.has(p.id)));
    c.addEventListener('dblclick', (e) => {
      if (!multi && !e.ctrlKey && !e.metaKey && !e.shiftKey) openPhoto(index);
    });
  }
  c.title = title;
  const f = el('span', 'frame');
  const src = isPhoto ? p.thumbUrl : p.coverUrl;
  if (src) f.append(media(src, '', index >= 12));
  else f.append(icon('albums'));
  const badge = isPhoto ? albumMap.get(p.albumId)?.title : isRepo ? `${p.albumCount} 个活动` : `${p.count} 张`;
  if (badge) f.append(el('span', 'overlay', badge));
  if (isPhoto && p.rating) f.append(el('span', 'overlay rating', '★ ' + p.rating));
  const caption = el('span', 'card-body');
  caption.append(
    el('strong', '', title),
    el(
      'small',
      '',
      isPhoto
        ? [sizeText(p.size), dateText(p) || '日期未知'].join(' · ')
        : isRepo
          ? [ownerName(p.owner), `${p.photoCount} 张`].join(' · ')
          : [p.date || '日期未知', p.dateEnd && p.dateEnd !== p.date ? p.dateEnd : '']
              .filter(Boolean)
              .join(' – ')
    )
  );
  c.append(f, caption);
  return c;
}
function appendPage() {
  const end = Math.min(shown + 72, results.length),
    fragment = document.createDocumentFragment();
  for (; shown < end; shown++) {
    const c = card(results[shown], shown);
    if (kind === 'photos') {
      const tile = el('div', 'tile');
      tile.append(c, starButton('photo', results[shown], true));
      fragment.append(tile);
    } else if (kind === 'activities') {
      const tile = el('div', 'album-tile');
      tile.append(c, starButton('activity', results[shown], true));
      fragment.append(tile);
    } else fragment.append(c);
  }
  $('gallery').append(fragment);
  if (kind === 'photos') scheduleLayout();
  $('more').hidden = shown >= results.length;
  if (!$('more').hidden) text('more', `显示更多（剩余 ${results.length - shown}）`);
}
function scheduleLayout() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(placePhotos);
}
function placePhotos() {
  const grid = $('gallery'),
    width = grid.clientWidth;
  if (kind !== 'photos' || !width || !grid.children.length) {
    grid.style.height = '';
    return;
  }
  const tiles = [...grid.children],
    assets = tiles.map((_, id) => ({
      id,
      aspectRatio: aspectRatioForAsset(results[id].width, results[id].height),
    }));
  const gutter = narrow.matches ? 9 : gap,
    caption = 47,
    size = narrow.matches ? Math.round(cardSize * 0.63) : cardSize;
  let height = 0;
  function place(id, x, y, w, h) {
    Object.assign(tiles[id].style, {
      left: x + 'px',
      top: y + 'px',
      width: w + 'px',
      height: h + caption + 'px',
    });
  }
  if (layout === 'justified') {
    for (const row of layoutJustifiedRows(assets, width, size, gutter)) {
      let x = 0;
      for (const slot of row.items) {
        place(slot.id, x, height, slot.width, slot.height);
        x += slot.width + gutter;
      }
      height += row.height + caption + gutter;
    }
  } else {
    const count = countFittingColumns(width, size, gutter),
      step = (width + gutter) / count;
    const h = (a, w) => Math.max(1, Math.round(w / Math.max(0.32, a.aspectRatio)));
    distributeMasonryItems(assets, count, (a) => h(a, step - gutter) + caption).forEach((column, i) => {
      let y = 0;
      const x = Math.round(i * step),
        w = Math.round((i + 1) * step) - gutter - x;
      for (const a of column.items) {
        const photoHeight = h(a, w);
        place(a.id, x, y, w, photoHeight);
        y += photoHeight + caption + gutter;
      }
      height = Math.max(height, y);
    });
  }
  grid.style.height = Math.max(0, height - gutter) + 'px';
}
let lastWidth = -1;
new ResizeObserver(([e]) => {
  if (e.contentRect.width !== lastWidth) {
    lastWidth = e.contentRect.width;
    scheduleLayout();
  }
}).observe($('gallery'));
function layoutTools() {
  for (const id of ['justified', 'masonry']) $(id).setAttribute('aria-pressed', String(id === layout));
  $('size').value = String(cardSize);
}
for (const id of ['justified', 'masonry'])
  $(id).onclick = () => {
    layout = id;
    store('layout', id);
    layoutTools();
    scheduleLayout();
  };
$('size').oninput = () => {
  cardSize = Number($('size').value);
  store('size', String(cardSize));
  scheduleLayout();
};
layoutTools();
$('more').onclick = appendPage;
new IntersectionObserver(
  (entries) => {
    if (entries.some((e) => e.isIntersecting) && !$('more').hidden && kind === 'photos') appendPage();
  },
  { root: $('scroll'), rootMargin: '160px' }
).observe($('more'));
function selectPhoto(id, e = {}) {
  const toggle = multi || isToggleSelectionModifier(e, platform),
    target = { kind: 'asset', id };
  const range =
    e.shiftKey &&
    resolveShiftBrowseRange({
      items: assetOrder,
      anchor,
      target,
      additive: toggle,
      currentFolderIds: [],
      currentAssetIds: [...selected],
    });
  if (range) selected = new Set(range.assetIds);
  else if (toggle) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    anchor = target;
  } else {
    selected = new Set([id]);
    anchor = target;
  }
  focused = selected.has(id) ? id : [...selected].at(-1) || '';
  inspectSelection();
}
function setMulti(on) {
  multi = on;
  $('multi').setAttribute('aria-pressed', String(on));
}
$('multi').onclick = () => setMulti(!multi);
function selectMany(ids) {
  selected = new Set(ids);
  focused = ids[0] || '';
  anchor = focused ? { id: focused, kind: 'asset' } : null;
  inspectSelection();
}
function selectAction(which) {
  const ids = assetOrder.map((p) => p.id);
  selectMany(which === 'all' ? ids : which === 'invert' ? invertSelection(ids, [...selected]) : []);
  $('select-pop').hidePopover();
}
for (const [id, mode] of [
  ['select-all', 'all'],
  ['invert', 'invert'],
  ['clear-selection', 'clear'],
])
  $(id).onclick = () => selectAction(mode);
$('selection-menu').onclick = () => {
  const r = $('selection-menu').getBoundingClientRect();
  Object.assign($('select-pop').style, { left: Math.max(6, r.right - 136) + 'px', top: r.bottom + 3 + 'px' });
};
function inspectSelection() {
  for (const c of $('gallery').querySelectorAll('[data-id]'))
    c.setAttribute('aria-pressed', String(selected.has(c.dataset.id)));
  text(
    'status',
    kind === 'photos'
      ? `${results.length} 张照片${selected.size ? ' · 已选 ' + selected.size + ' 张' : ''}`
      : `${results.length} ${kind === 'activities' ? '个活动' : '项'}`
  );
  text('status-extra', kind === 'photos' ? '单击选片 · 双击预览' : '');
  inspector();
}
function section(title) {
  const node = el('section', 'section');
  node.append(el('h3', '', title));
  return node;
}
function properties(pairs) {
  const dl = el('dl', 'details-list');
  for (const [label, value] of pairs) {
    if (value) dl.append(el('dt', '', label), el('dd', '', value));
  }
  return dl;
}
// Sample the thumbnail locally. Color swatches never require another preview request.
const palettes = new Map();
function showColors(img, bar, id) {
  function draw(colors) {
    if (!bar.isConnected) return;
    bar.replaceChildren(
      ...colors.map((color) => {
        const s = el('span');
        s.style.backgroundColor = color;
        s.title = color;
        return s;
      })
    );
    bar.hidden = !colors.length;
  }
  function sample() {
    if (!img.naturalWidth || !bar.isConnected) return;
    try {
      const canvas = el('canvas');
      canvas.width = canvas.height = 32;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(img, 0, 0, 32, 32);
      const { data } = context.getImageData(0, 0, 32, 32),
        bins = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const rgb = [data[i], data[i + 1], data[i + 2]],
          key = rgb.map((v) => v >> 5).join(',');
        const bin = bins.get(key) || [0, 0, 0, 0];
        bin[3]++;
        rgb.forEach((v, k) => (bin[k] += v));
        bins.set(key, bin);
      }
      const colors = [...bins.values()]
        .sort((a, b) => b[3] - a[3])
        .slice(0, 6)
        .map(
          (bin) =>
            '#' +
            bin
              .slice(0, 3)
              .map((v) =>
                Math.round(v / bin[3])
                  .toString(16)
                  .padStart(2, '0')
              )
              .join('')
        );
      palettes.set(id, colors);
      draw(colors);
    } catch {
      /* Metadata remains available when a thumbnail is unavailable. */
    }
  }
  if (palettes.has(id)) draw(palettes.get(id));
  else if (img.complete) sample();
  else img.addEventListener('load', sample, { once: true });
}
function inspector() {
  const box = $('details');
  box.replaceChildren();
  beforeEdit = null;
  const photo = kind === 'photos' && photoMap.get(focused);
  if (!photo) {
    if (!repo) {
      empty(box, 'layers', '相册资源库', '选择一个仓库浏览活动与照片。');
      return;
    }
    if (kind === 'photos') empty(box, 'image', '未选择照片', '单击照片查看属性。');
    else {
      box.append(el('h2', 'inspect-title', repo.title || name), el('p', 'inspect-meta', name));
    }
    const info = section('资源库信息');
    info.append(
      properties([
        ['负责人', ownerName(repo.owner)],
        ['照片', `${repo.photos.length} 张`],
        ['活动', `${activities.length} 个`],
        ['原图容量', sizeText(repo.stats.bytes)],
        ['版本', ref],
        ['提交', repo.oid.slice(0, 9)],
      ])
    );
    box.append(info);
    return;
  }
  const ids = [...selected],
    many = ids.length > 1,
    album = albumMap.get(photo.albumId),
    writable = ref === 'main';
  const a = button('', () => openPhoto(results.findIndex((p) => p.id === focused)), 'inspect-cover');
  a.title = '打开大图';
  a.setAttribute('aria-label', '打开大图');
  const img = media(photo.thumbUrl, photo.name);
  a.append(img, icon('expand'));
  box.append(a);
  box.append(
    el('h2', 'inspect-title', many ? `已选择 ${ids.length} 张照片` : photo.name),
    el(
      'p',
      'inspect-meta',
      many
        ? sizeText(ids.reduce((n, id) => n + photoMap.get(id).size, 0))
        : `${sizeText(photo.size)} · ${photo.width} × ${photo.height} · ${typeName(photo)}`
    )
  );
  if (!many) {
    const actions = el('div', 'inspect-star');
    actions.append(starButton('photo', photo));
    box.append(actions);
  }
  const all = ids.map((id) => photoMap.get(id)),
    commonTags = photo.tags.filter((t) => all.every((p) => p.tags.includes(t)));
  const tags = section(many ? '共同标签' : '标签'),
    chips = el('div', 'tags');
  for (const tag of commonTags) chips.append(el('span', 'chip', tag));
  if (!commonTags.length) chips.append(el('span', 'muted', many ? '没有共同标签' : '未添加标签'));
  tags.append(chips);
  box.append(tags);
  const stars = section('评分'),
    row = el('div', 'stars'),
    commonRating = all.every((p) => p.rating === photo.rating) ? photo.rating : null;
  let newRating = null;
  const starButtons = [];
  function paint(value) {
    starButtons.forEach((b, i) => {
      b.classList.toggle('on', value >= i + 1);
      b.textContent = value >= i + 1 ? '★' : '☆';
      b.setAttribute('aria-pressed', String(value === i + 1));
    });
  }
  for (let n = 1; n <= 5; n++) {
    const b = button(
      '',
      () => {
        newRating = n;
        paint(n);
        updateEdit();
      },
      ''
    );
    b.title = b.ariaLabel = `设为 ${n} 星`;
    b.disabled = !writable;
    starButtons.push(b);
    row.append(b);
  }
  const clear = button(
    '清除',
    () => {
      newRating = 0;
      paint(0);
      updateEdit();
    },
    'clear-stars'
  );
  clear.hidden = !writable;
  row.append(clear);
  paint(commonRating);
  stars.append(row);
  if (commonRating === null) stars.append(el('small', 'muted', '所选照片的星级不同'));
  box.append(stars);
  if (!many) {
    const sw = el('div', 'swatches');
    sw.setAttribute('aria-label', '照片主色');
    sw.hidden = true;
    stars.append(sw);
    showColors(img, sw, photo.id + repo.oid);
  }
  if (writable) {
    const editBox = section('整理照片'),
      add = el('input', 'tag-field'),
      remove = el('input', 'tag-field');
    for (const [input, label] of [
      [add, '添加标签'],
      [remove, '移除标签'],
    ]) {
      input.setAttribute('aria-label', label);
      input.placeholder = label + '，以逗号分隔';
      input.maxLength = 800;
      input.oninput = updateEdit;
    }
    const propose = button(
      '提交整理 PR',
      () => {
        const edits = { ids, rating: newRating, addTags: split(add.value), removeTags: split(remove.value) };
        collab.edit(
          edits,
          [
            `整理 ${ids.length} 张照片`,
            newRating !== null ? `星级 ${newRating}` : '',
            edits.addTags.length ? '添加：' + edits.addTags.join('、') : '',
            edits.removeTags.length ? '移除：' + edits.removeTags.join('、') : '',
          ]
            .filter(Boolean)
            .join(' · ')
        );
      },
      'secondary submit-edit',
      'pull'
    );
    propose.disabled = true;
    editBox.append(add);
    if (all.some((p) => p.tags.length)) editBox.append(remove);
    editBox.append(propose);
    box.append(editBox);
    beforeEdit = { button: propose, add, remove };
  } else box.append(el('p', 'section muted', '此版本只读'));
  function split(value) {
    return [
      ...new Set(
        value
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ];
  }
  function updateEdit() {
    if (beforeEdit)
      beforeEdit.button.disabled =
        newRating === null && !beforeEdit.add.value.trim() && !beforeEdit.remove.value.trim();
  }
  const info = section('文件信息');
  if (!many) {
    const recorded = dateText(photo);
    const sources = { folder: '活动目录', filename: '文件名', exif: 'EXIF' };
    info.append(
      properties([
        ['活动', album?.title],
        [
          '日期',
          recorded
            ? recorded + (sources[photo.dateSource] ? ' · ' + sources[photo.dateSource] : '')
            : '日期未知',
        ],
        ['路径', photo.path],
        ['版本', ref],
      ])
    );
    const actions = el('div', 'inspect-actions');
    const original = link('原图', photo.originalUrl, 'secondary', 'download');
    original.download = photo.name;
    actions.append(original);
    if (album && routeKey !== album.id)
      actions.append(link('打开活动', activityHref(album.id), 'secondary', 'folder'));
    info.append(actions);
  } else
    info.append(
      properties([
        ['活动', `${new Set(all.map((p) => p.albumId)).size} 个`],
        ['版本', ref],
      ])
    );
  if (albumMap.has(routeKey)) {
    const download = link(
      '导出活动到 Serpent',
      api + '/serpent?' + new URLSearchParams({ ref: repo.oid, activity: routeKey }),
      'secondary',
      'download'
    );
    download.download = '';
    info.append(download);
  }
  box.append(info);
}
let viewerIndex = 0;
function openPhoto(index) {
  if (index < 0 || index >= results.length) return;
  viewing = results;
  viewerIndex = index;
  displayPhoto();
  if (!$('viewer').open) $('viewer').showModal();
}
function displayPhoto() {
  const p = viewing[viewerIndex];
  text('viewer-name', p.name);
  $('viewer-star').replaceChildren(starButton('photo', p));
  $('stage').replaceChildren(media(p.previewUrl, p.name));
  text('viewer-meta', [p.width + ' × ' + p.height, sizeText(p.size), dateText(p)].filter(Boolean).join(' · '));
  text('position', `${viewerIndex + 1} / ${viewing.length}`);
  $('prev').disabled = viewerIndex <= 0;
  $('next').disabled = viewerIndex >= viewing.length - 1;
  $('original').href = p.originalUrl;
  $('original').download = p.name;
}
function step(n) {
  if (viewerIndex + n >= 0 && viewerIndex + n < viewing.length) {
    viewerIndex += n;
    displayPhoto();
  }
}
$('prev').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('viewer').addEventListener('close', () => {
  const p = viewing[viewerIndex];
  $('stage').replaceChildren();
  viewing = [];
  if (p && kind === 'photos' && results.some((o) => o.id === p.id) && !selected.has(p.id)) selectPhoto(p.id);
});
function focusCard(id) {
  const index = results.findIndex((p) => p.id === id);
  if (index < 0) return;
  while (shown <= index) appendPage();
  placePhotos();
  const c = $('gallery').querySelector(`[data-id="${id}"]`);
  c?.focus({ preventScroll: true });
  c?.scrollIntoView({ block: 'nearest' });
}
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input,textarea,select,[contenteditable=true]')) return;
  if ($('viewer').open) {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      step(e.key === 'ArrowLeft' ? -1 : 1);
    }
    return;
  }
  if (document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape') {
    closeOverlays();
    return;
  }
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    $('search').focus();
    return;
  }
  if (kind !== 'photos') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    selectAction(e.shiftKey ? 'invert' : 'all');
    return;
  }
  if (e.key === 'Enter' && e.target.closest('.card[data-id]')) {
    e.preventDefault();
    openPhoto(results.findIndex((p) => p.id === e.target.closest('.card').dataset.id));
    return;
  }
  if (['ArrowRight', 'ArrowLeft'].includes(e.key) && e.target.closest('#main')) {
    const index = Math.min(
      results.length - 1,
      Math.max(0, results.findIndex((p) => p.id === focused) + (e.key === 'ArrowRight' ? 1 : -1))
    );
    if (results[index]) {
      e.preventDefault();
      selectPhoto(results[index].id, e);
      focusCard(results[index].id);
    }
  }
});
function isFileDrag(e) {
  return Array.from(e.dataTransfer?.types || []).includes('Files');
}
$('scroll').addEventListener('dragover', (e) => {
  if (isFileDrag(e) && repo && ref === 'main') {
    e.preventDefault();
    $('scroll').classList.add('drag');
  }
});
$('scroll').addEventListener('dragleave', (e) => {
  if (!$('scroll').contains(e.relatedTarget)) $('scroll').classList.remove('drag');
});
$('scroll').addEventListener('drop', (e) => {
  if (!isFileDrag(e)) return;
  e.preventDefault();
  $('scroll').classList.remove('drag');
  if (repo && ref === 'main') collab.upload([...e.dataTransfer.files]);
});
$('reload-pulls').onclick = refreshPulls;
$('review-nav').addEventListener('click', () => {
  if (kind === 'pulls') refreshPulls();
});
document.addEventListener('visibilitychange', () => {
  if (repo && !document.hidden) {
    refreshPulls();
    refreshStars();
  }
});
addEventListener('hashchange', () => {
  route();
  if (kind === 'pulls') refreshPulls();
  if (isStarView()) refreshStars();
});
load();
