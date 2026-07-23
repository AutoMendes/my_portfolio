import { describe, expect, it } from 'vitest';
import { filterAllForLocale, filterFeaturedForLocale } from './projectFilters';

interface MockEntry {
  id: string;
  data: { featured: boolean };
}

const entries: MockEntry[] = [
  { id: 'en/aiops', data: { featured: true } },
  { id: 'en/food4u', data: { featured: false } },
  { id: 'pt/aiops', data: { featured: true } },
  { id: 'pt/food4u', data: { featured: false } },
];

describe('filterFeaturedForLocale', () => {
  it('returns only featured entries for the given locale', () => {
    const result = filterFeaturedForLocale(entries, 'en');
    expect(result.map((e) => e.id)).toEqual(['en/aiops']);
  });

  it('does not leak entries from a different locale', () => {
    const result = filterFeaturedForLocale(entries, 'pt');
    expect(result.every((e) => e.id.startsWith('pt/'))).toBe(true);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterFeaturedForLocale([], 'en')).toEqual([]);
  });
});

describe('filterAllForLocale', () => {
  it('returns every entry for the given locale, featured or not', () => {
    const result = filterAllForLocale(entries, 'en');
    expect(result.map((e) => e.id)).toEqual(['en/aiops', 'en/food4u']);
  });

  it('returns an empty array for a locale with no entries', () => {
    expect(filterAllForLocale(entries, 'fr' as 'en')).toEqual([]);
  });
});
