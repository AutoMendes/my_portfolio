import { defaultLang, ui, type Locale, type UiKey } from './ui';

export function getLangFromUrl(url: URL): Locale {
  const [, maybeLocale] = url.pathname.split('/');
  if (maybeLocale in ui) return maybeLocale as Locale;
  return defaultLang;
}

export function useTranslations(locale: Locale) {
  return function t(key: UiKey): string {
    return ui[locale][key] ?? ui[defaultLang][key];
  };
}

export function getLocalizedPath(pathname: string, targetLocale: Locale): string {
  const withoutPtPrefix = pathname === '/pt' || pathname.startsWith('/pt/') ? pathname.slice(3) || '/' : pathname;

  if (targetLocale === 'en') return withoutPtPrefix;
  return withoutPtPrefix === '/' ? '/pt/' : `/pt${withoutPtPrefix}`;
}
