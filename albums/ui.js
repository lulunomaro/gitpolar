export const $ = (id) => document.getElementById(id);
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
const shapes = {
  refresh: 'M20 8a8 8 0 1 0 0 8m0-13v5h-5',
  sidebar: 'M3 4h18v16H3z M9 4v16m-2-12-2 2 2 2',
  inspector: 'M3 4h18v16H3z M15 4v16m2-12 2 2-2 2',
  chevrons: 'm8 9 4-4 4 4m-8 6 4 4 4-4',
  people: 'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M5 20v-2a7 7 0 0 1 14 0v2z',
  search: 'M20.5 20.5l-5-5 M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0',
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  image: 'M3 4h18v16H3z M3 16l5-5 4 4 3-3 6 6 M16.5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0',
  albums: 'M6 3h15v15H6z M3 7v14h14 M7 15l4-4 3 3 2-2 4 4',
  folder: 'M3 7V5h6l2 2h10v12H3z',
  calendar: 'M3 6h18v15H3z M7 3v6m10-6v6M3 11h18',
  star: 'm12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.4l6.2-.9z',
  tag: 'M3 4h8l10 10-7 7L3 10z M7.7 7.6h.1',
  sort: 'M3 5h13M3 10h9M3 15h5m9-4v10m-4-4 4 4 4-4',
  rows: 'M3 5h18v5H3z M3 14h7v5H3z M14 14h7v5h-7z',
  masonry: 'M3 4h7v10H3z M14 4h7v5h-7z M14 13h7v7h-7z M3 18h7v2H3z',
  select: 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5m-14-3 3 3 6-7',
  more: 'M4 12h1m6 0h1m6 0h1',
  left: 'm14 5-7 7 7 7',
  right: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  close: 'm6 6 12 12M18 6 6 18',
  branch: 'M6 8v9m0-9a2.5 2.5 0 1 1 .1 0m-.1 9a2.5 2.5 0 1 0 .1 0m0-3c6 0 11 0 11-6m0 0a2.5 2.5 0 1 1 .1 0',
  pull: 'M6 8v8m0-8a2.5 2.5 0 1 1 .1 0m-.1 8a2.5 2.5 0 1 0 .1 0M18 16V9q0-4-5-4m2-3-3 3 3 3m3 8a2.5 2.5 0 1 0 .1 0',
  upload: 'M12 15V3m-5 5 5-5 5 5M4 15v5h16v-5',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  external: 'M10 4H4v16h16v-6m-7-10h7v7m-1-6-9 9',
  lock: 'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3',
  expand: 'M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5',
  layers: 'm3 8 9-5 9 5-9 5z m0 5 9 5 9-5m-18 5 9 4 9-4',
  plus: 'M12 4v16M4 12h16',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v5m0-9v.1',
  check: 'm3 12 6 6L21 6',
};
export function icon(name) {
  const ns = 'http://www.w3.org/2000/svg',
    svg = document.createElementNS(ns, 'svg'),
    path = document.createElementNS(ns, 'path');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  path.setAttribute('d', shapes[name]);
  svg.append(path);
  return svg;
}
export function initIcons(root = document) {
  for (const node of root.querySelectorAll('[data-icon]')) node.replaceWith(icon(node.dataset.icon));
}
export function button(text, fn, cls = 'secondary', symbol) {
  const node = el('button', cls);
  node.type = 'button';
  if (symbol) node.append(icon(symbol));
  node.append(text);
  node.addEventListener('click', fn);
  return node;
}
export function link(text, href, cls = 'secondary', symbol) {
  const node = el('a', cls);
  node.href = href;
  if (symbol) node.append(icon(symbol));
  node.append(text);
  return node;
}
export function sizeText(value) {
  let i = 0;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${Number(value.toFixed(1))} ${units[i]}`;
}
export function media(url, alt = '', lazy = false) {
  const img = el('img');
  img.alt = alt;
  img.decoding = 'async';
  if (lazy) img.loading = 'lazy';
  if (url) img.src = url;
  img.addEventListener('error', () => img.replaceWith(el('span', 'unavailable', '预览不可用')), { once: true });
  return img;
}
export async function request(url, { method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    mode: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : { Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(data.error || `HTTP ${response.status}`), { status: response.status });
  return data;
}
export function empty(root, symbol, title, subtitle, action) {
  const group = el('div', 'empty');
  group.append(icon(symbol), el('h2', '', title));
  if (subtitle) group.append(el('p', '', subtitle));
  if (action) group.append(action);
  root.replaceChildren(group);
}
export function stored(key, fallback) {
  try {
    return localStorage.getItem('gitpolar:album-' + key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function store(key, value) {
  try {
    localStorage.setItem('gitpolar:album-' + key, value);
  } catch {
    /* Optional preferences. */
  }
}
