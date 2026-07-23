import { useEffect, useState } from 'react';
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === 'light'}
      title="Toggle theme"
      className="rounded border border-[var(--border-default)] px-2 py-1 text-sm"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
