export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'symaptic:theme';

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function resolvedTheme(pref = getThemePref()): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applies data-theme on <html>. The same logic runs inline in index.html before first paint. */
export function applyTheme(pref = getThemePref()) {
  document.documentElement.dataset.theme = resolvedTheme(pref);
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* ignore */
  }
  applyTheme(pref);
  window.dispatchEvent(new Event('symaptic:theme'));
}

if (typeof window !== 'undefined') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());
}
