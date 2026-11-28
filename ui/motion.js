// AndroidLiquidGlass-inspired press feedback and moving selection markers for the GitHub preset.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const strips = [
  ['#top-nav', 'after'],
  ['.gh-profile-tabs-inner', 'after'],
  ['.gh-home-tabs', 'border'],
  ['.masthead #tabs', 'after'],
  ['.co-tabs', 'border'],
  ['.branch-picker-tabs', 'border'],
  ['#views', 'before'],
  ['#section-nav', 'before'],
  ['.gh-settings-layout > aside nav', 'before'],
];
const stripSelector = strips.map(([selector]) => selector).join(',');
const activeSelector = '[aria-current="page"], [aria-selected="true"]';
const pressSelector = 'button, a.button, a.btn, a.secondary, a.card, summary.button, .gp-menu > summary';
const pressProperties = ['--gp-scale-x', '--gp-scale-y', '--gp-drag-x', '--gp-drag-y', '--gp-light-x', '--gp-light-y'];

function installPress(signal) {
  let held = null;
  const releases = new Map();
  const on = (type, listener) => window.addEventListener(type, listener, {capture: true, passive: true, signal});

  function clear(state) {
    const {element, light} = state;
    clearTimeout(releases.get(state));
    releases.delete(state);
    element.removeAttribute('data-gp-press');
    element.removeAttribute('data-gp-relative');
    for (const property of pressProperties) element.style.removeProperty(property);
    light.remove();
  }
  function release(immediate = false) {
    if (!held) return;
    const state = held;
    held = null;
    if (immediate || !state.element.isConnected) return clear(state);
    state.element.dataset.gpPress = 'return';
    releases.set(state, setTimeout(() => clear(state), 320));
  }
  function position({element, rect, startX, startY}, x, y) {
    const percent = (value) => `${Math.max(0, Math.min(100, value * 100))}%`;
    element.style.setProperty('--gp-light-x', percent((x - rect.left) / rect.width));
    element.style.setProperty('--gp-light-y', percent((y - rect.top) / rect.height));
    element.style.setProperty('--gp-drag-x', `${2 * Math.tanh((x - startX) / 16)}px`);
    element.style.setProperty('--gp-drag-y', `${1.5 * Math.tanh((y - startY) / 16)}px`);
  }
  function begin(event, keyboard = false) {
    const element = event.target.closest?.(pressSelector);
    if (!element || element.matches(':disabled, [aria-disabled="true"]') || element.closest('#ai-modes, .branch-picker-tabs')) return;
    release(true);
    for (const state of releases.keys()) if (state.element === element) clear(state);
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const startX = keyboard ? rect.left + rect.width / 2 : event.clientX;
    const startY = keyboard ? rect.top + rect.height / 2 : event.clientY;
    const light = document.createElement('span');
    light.className = 'gp-press-light';
    light.setAttribute('aria-hidden', 'true');
    held = {element, rect, light, startX, startY, pointerId: keyboard ? null : event.pointerId};
    if (getComputedStyle(element).position === 'static') element.dataset.gpRelative = '';
    element.style.setProperty('--gp-scale-x', 1 + Math.min(.028, 1.8 / rect.width));
    element.style.setProperty('--gp-scale-y', 1 + Math.min(.042, 1.5 / rect.height));
    position(held, startX, startY);
    element.dataset.gpPress = 'held';
    element.append(light);
  }
  on('pointerdown', event => { if (event.isPrimary && event.button === 0) begin(event); });
  on('pointermove', event => {
    if (held?.pointerId !== event.pointerId) return;
    if (event.pointerType === 'touch' && Math.hypot(event.clientX - held.startX, event.clientY - held.startY) > 8) release(true);
    else position(held, event.clientX, event.clientY);
  });
  on('pointerup', event => { if (held?.pointerId === event.pointerId) release(); });
  on('pointercancel', event => { if (held?.pointerId === event.pointerId) release(true); });
  on('keydown', event => { if (!event.repeat && ['Enter', ' '].includes(event.key)) begin(event, true); });
  on('keyup', event => { if (held?.pointerId === null && ['Enter', ' '].includes(event.key)) release(); });
  on('blur', event => { if (event.target === window || event.target === held?.element) release(true); });
  signal.addEventListener('abort', () => {
    release(true);
    for (const state of releases.keys()) clear(state);
  });
}

function markerGeometry(item, kind) {
  const rect = item.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  if (kind === 'border') {
    const style = getComputedStyle(item);
    const height = parseFloat(style.borderBottomWidth);
    return height ? {x: rect.left, y: rect.bottom - height, width: rect.width, height, color: style.borderBottomColor} : null;
  }
  const style = getComputedStyle(item, `::${kind}`);
  if (style.display === 'none' || style.content === 'none') return null;
  const width = parseFloat(style.width), height = parseFloat(style.height);
  if (!width || !height) return null;
  const x = rect.left + item.clientLeft + (parseFloat(style.left) || 0);
  const y = rect.top + item.clientTop + (kind === 'before' ? parseFloat(style.top) || 0 : item.clientHeight - (parseFloat(style.bottom) || 0) - height);
  return {x, y, width, height, color: style.backgroundColor};
}

function installNavigation(signal) {
  const previous = new Map();
  const key = item => item.getAttribute('href') || item.dataset.kind;
  let flight, frame = 0, arrival;

  function stop() {
    if (!flight) return;
    flight.item.removeAttribute('data-gp-line');
    flight.strip.removeAttribute('data-gp-track');
    flight.animation.cancel();
    flight.line.remove();
    flight = null;
  }
  function mount(line, strip, item, kind, end) {
    // Keep the marker inside the real scroller or disclosure so it clips and closes with it.
    if (getComputedStyle(strip).position === 'static') strip.dataset.gpTrack = '';
    const bounds = strip.getBoundingClientRect();
    Object.assign(line.style, {
      left: `${end.x - bounds.left - strip.clientLeft + strip.scrollLeft}px`,
      top: `${end.y - bounds.top - strip.clientTop + strip.scrollTop}px`,
      width: `${end.width}px`, height: `${end.height}px`, backgroundColor: end.color,
    });
    if (line.parentElement !== strip) strip.append(line);
    item.dataset.gpLine = kind;
  }
  function move(selector, strip, item, kind, start, end) {
    stop();
    const line = document.createElement('span');
    line.className = 'gp-travel-line';
    line.setAttribute('aria-hidden', 'true');
    mount(line, strip, item, kind, end);
    const vertical = kind === 'before';
    const dx = start.x - end.x, dy = start.y - end.y;
    const stretch = 1 + Math.min(16, Math.abs(vertical ? dy : dx) * .14) / (vertical ? end.height : end.width);
    const transform = (x, y, sx, sy) => `translate(${x}px, ${y}px) scale(${sx}, ${sy})`;
    const animation = line.animate([
      {transform: transform(dx, dy, start.width / end.width, start.height / end.height), easing: 'cubic-bezier(.2,.62,.35,1)'},
      {offset: .53, transform: transform(dx * .12, dy * .12, vertical ? 1 : stretch, vertical ? stretch : 1), easing: 'ease-out'},
      {offset: .83, transform: transform(-dx * .012, -dy * .012, 1, 1)},
      {transform: 'none'},
    ], {duration: 260});
    flight = {selector, strip, item, line, animation, lastRect: start};
    animation.onfinish = () => { if (flight?.animation === animation) stop(); };
  }
  function sync() {
    frame = 0;
    for (const [selector, kind] of strips) {
      const strip = document.querySelector(selector);
      const item = strip?.querySelector(activeSelector);
      if (!item || strip.closest('[hidden], details:not([open])')) {
        previous.delete(selector);
        if (flight?.selector === selector) stop();
        continue;
      }
      const id = key(item), old = previous.get(selector);
      previous.set(selector, id);
      if (!old || !id) continue;
      if (old === id) {
        // A server reply can replace the links while their selection is still travelling.
        if (flight?.selector === selector && flight.item !== item) {
          const end = markerGeometry(item, kind);
          if (!end) { stop(); continue; }
          flight.strip.removeAttribute('data-gp-track');
          flight.item.removeAttribute('data-gp-line');
          mount(flight.line, strip, item, kind, end);
          Object.assign(flight, {strip, item});
        }
        continue;
      }
      const before = [...strip.querySelectorAll('a[href], button[data-kind]')].find(link => key(link) === old);
      const end = markerGeometry(item, kind);
      if (!before || !end) continue;
      const a = before.getBoundingClientRect(), b = item.getBoundingClientRect();
      let start = {
        x: end.x + a.x - b.x, y: end.y + a.y - b.y,
        width: kind === 'before' ? end.width : Math.max(1, end.width + a.width - b.width),
        height: kind === 'before' ? Math.max(1, end.height + a.height - b.height) : end.height,
      };
      if (flight?.selector === selector) start = flight.line.isConnected ? flight.line.getBoundingClientRect() : flight.lastRect;
      move(selector, strip, item, kind, start, end);
    }
  }
  function queue() { if (!frame) frame = requestAnimationFrame(sync); }
  const hosts = `${stripSelector}, #view, #page`;
  const observer = new MutationObserver(records => {
    if (records.some(({target, type}) => target instanceof Element &&
      (type === 'childList' ? target.matches(hosts) : target.closest(stripSelector)))) queue();
  });
  observer.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-current', 'aria-selected']});
  document.addEventListener('toggle', event => { if (event.target.matches('.branch-picker')) queue(); }, {capture: true, signal});
  function rememberPosition() {
    const rect = flight?.line.getBoundingClientRect();
    if (rect?.width && rect.height) flight.lastRect = rect;
  }
  // A click or history traversal can replace every tab before the next paint.
  addEventListener('click', rememberPosition, {capture: true, passive: true, signal});
  addEventListener('hashchange', event => {
    rememberPosition();
    queue();
    const route = url => new URL(url).hash.split('?')[0];
    if (route(event.oldURL) === route(event.newURL)) return;
    const target = document.querySelector('#view, #page, #heading');
    if (target) {
      arrival?.cancel();
      arrival = target.animate([{opacity: .82, translate: '0 3px'}, {opacity: 1, translate: '0 0'}], {duration: 145, easing: 'ease-out'});
    }
  }, {capture: true, signal});
  addEventListener('resize', stop, {passive: true, signal});
  signal.addEventListener('abort', () => { observer.disconnect(); cancelAnimationFrame(frame); arrival?.cancel(); stop(); });
  sync();
}

let controller;
function applyPreference() {
  const enabled = document.documentElement.dataset.preset === 'github' && !reducedMotion.matches;
  if (enabled === Boolean(controller)) return;
  if (!enabled) { controller.abort(); controller = null; return; }
  controller = new AbortController();
  installPress(controller.signal);
  if (typeof Element.prototype.animate === 'function') installNavigation(controller.signal);
}
reducedMotion.addEventListener('change', applyPreference);
addEventListener('gitpolar:appearance', applyPreference);
applyPreference();
