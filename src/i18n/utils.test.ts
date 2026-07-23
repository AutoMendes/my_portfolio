import { describe, expect, it } from 'vitest';
import { getLangFromUrl, getLocalizedPath, useTranslations } from './utils';

describe('getLangFromUrl', () => {
  it('returns "pt" for a URL under /pt/', () => {
    expect(getLangFromUrl(new URL('https://example.com/pt/about'))).toBe('pt');
  });

  it('returns "en" (default) for a URL with no locale prefix', () => {
    expect(getLangFromUrl(new URL('https://example.com/about'))).toBe('en');
  });

  it('returns "en" (default) for the root URL', () => {
    expect(getLangFromUrl(new URL('https://example.com/'))).toBe('en');
  });
});

describe('useTranslations', () => {
  it('resolves an English nav label', () => {
    const t = useTranslations('en');
    expect(t('nav.home')).toBe('Home');
  });

  it('resolves the equivalent Portuguese nav label', () => {
    const t = useTranslations('pt');
    expect(t('nav.home')).toBe('Início');
  });
});

describe('getLocalizedPath', () => {
  it('adds the /pt prefix when switching the root path to pt', () => {
    expect(getLocalizedPath('/', 'pt')).toBe('/pt/');
  });

  it('strips the /pt prefix when switching the root path to en', () => {
    expect(getLocalizedPath('/pt/', 'en')).toBe('/');
  });

  it('adds the /pt prefix to a nested path', () => {
    expect(getLocalizedPath('/projects/aiops', 'pt')).toBe('/pt/projects/aiops');
  });

  it('strips the /pt prefix from a nested path', () => {
    expect(getLocalizedPath('/pt/projects/aiops', 'en')).toBe('/projects/aiops');
  });

  it('is a no-op when the path is already in the target locale', () => {
    expect(getLocalizedPath('/about', 'en')).toBe('/about');
    expect(getLocalizedPath('/pt/about', 'pt')).toBe('/pt/about');
  });
});
