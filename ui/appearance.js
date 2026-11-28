/* Shared appearance bootstrap. Both presets use the same business routes and account. */
(() => {
  const key = 'gitpolar:appearance:v1';
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(key));
  } catch {}
  let value = { preset: 'github', colorMode: 'light', ...stored };
  if (!['github', 'workspace'].includes(value.preset)) value.preset = 'github';
  if (!['light', 'dark', 'system'].includes(value.colorMode)) value.colorMode = 'light';
  let revision = 0,
    authenticated = false;
  const system = matchMedia('(prefers-color-scheme: dark)');
  function getTheme() {
    return value.colorMode === 'system' ? (system.matches ? 'dark' : 'light') : value.colorMode;
  }
  function apply(emit = true) {
    const root = document.documentElement;
    root.dataset.preset = value.preset;
    root.dataset.theme = getTheme();
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
    if (emit) dispatchEvent(new CustomEvent('gitpolar:appearance', { detail: { ...value } }));
  }
  async function save(next) {
    const candidate = { ...value, ...next };
    if (
      !['github', 'workspace'].includes(candidate.preset) ||
      !['light', 'dark', 'system'].includes(candidate.colorMode)
    )
      throw Error('请选择有效的界面预设。');
    const current = ++revision;
    const response = await fetch('/api/me/appearance', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate),
    });
    if (!response.ok && response.status !== 401) {
      const error = await response.json();
      throw Error(error.error || '无法保存界面设置。');
    }
    if (current !== revision) return;
    value = candidate;
    apply();
    return { ...value };
  }
  async function sync() {
    const current = revision;
    try {
      const response = await fetch('/api/me/appearance', { cache: 'no-store', credentials: 'same-origin' });
      authenticated = response.ok;
      if (response.ok && current === revision) {
        const next = await response.json();
        if (current === revision && (next.preset !== value.preset || next.colorMode !== value.colorMode)) {
          value = next;
          apply();
        }
      }
    } catch {
      /* The cached preset can open while the NAS reconnects. */
    }
  }
  apply(false);
  system.addEventListener('change', () => {
    if (value.colorMode === 'system') apply();
  });
  addEventListener('storage', (event) => {
    if (event.key !== key || !event.newValue) return;
    try {
      value = JSON.parse(event.newValue);
      apply();
    } catch {}
  });
  window.GitpolarAppearance = {
    get current() {
      return { ...value };
    },
    get authenticated() {
      return authenticated;
    },
    getTheme,
    save,
    sync,
  };
  addEventListener('DOMContentLoaded', sync, { once: true });
})();
