export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'theme';

interface ThemeSources {
  getStored: () => string | null;
  prefersLight: () => boolean;
}

export function resolveInitialTheme({ getStored, prefersLight }: ThemeSources): Theme {
  const stored = getStored();
  if (stored === 'dark' || stored === 'light') return stored;
  return prefersLight() ? 'light' : 'dark';
}

export function getInitialTheme(): Theme {
  return resolveInitialTheme({
    getStored: () => localStorage.getItem(THEME_STORAGE_KEY),
    prefersLight: () => window.matchMedia('(prefers-color-scheme: light)').matches,
  });
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
