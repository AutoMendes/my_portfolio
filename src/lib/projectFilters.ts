import type { Locale } from '../i18n/ui';

interface LocalizedEntry {
  id: string;
  data: { featured: boolean };
}

export function filterFeaturedForLocale<T extends LocalizedEntry>(entries: T[], locale: Locale): T[] {
  return entries.filter((entry) => entry.id.startsWith(`${locale}/`) && entry.data.featured);
}

export function filterAllForLocale<T extends LocalizedEntry>(entries: T[], locale: Locale): T[] {
  return entries.filter((entry) => entry.id.startsWith(`${locale}/`));
}
