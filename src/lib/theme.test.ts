import { describe, expect, it } from 'vitest';
import { resolveInitialTheme } from './theme';

describe('resolveInitialTheme', () => {
  it('defaults to dark when nothing is stored and there is no system preference for light', () => {
    const theme = resolveInitialTheme({ getStored: () => null, prefersLight: () => false });
    expect(theme).toBe('dark');
  });

  it('respects prefers-color-scheme: light when nothing is stored', () => {
    const theme = resolveInitialTheme({ getStored: () => null, prefersLight: () => true });
    expect(theme).toBe('light');
  });

  it('reads back an explicitly stored theme, overriding a light system preference', () => {
    const theme = resolveInitialTheme({ getStored: () => 'dark', prefersLight: () => true });
    expect(theme).toBe('dark');
  });

  it('reads back an explicitly stored theme, overriding a dark system preference', () => {
    const theme = resolveInitialTheme({ getStored: () => 'light', prefersLight: () => false });
    expect(theme).toBe('light');
  });
});
