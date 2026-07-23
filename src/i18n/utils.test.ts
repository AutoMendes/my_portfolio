import { describe, expect, it } from 'vitest';
import { getLangFromUrl, useTranslations } from './utils';

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
