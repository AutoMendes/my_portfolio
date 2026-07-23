import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { Locale } from '../i18n/ui';
import { filterAllForLocale, filterFeaturedForLocale } from './projectFilters';

export async function getFeaturedProjects(locale: Locale): Promise<CollectionEntry<'projects'>[]> {
  const entries = await getCollection('projects');
  return filterFeaturedForLocale(entries, locale);
}

export async function getAllProjects(locale: Locale): Promise<CollectionEntry<'projects'>[]> {
  const entries = await getCollection('projects');
  return filterAllForLocale(entries, locale);
}
