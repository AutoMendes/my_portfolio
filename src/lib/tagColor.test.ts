import { describe, expect, it } from 'vitest';
import { getTagCategory, getTagColor } from './tagColor';

describe('getTagCategory', () => {
  it('groups programming languages together, matching the CV skills grouping', () => {
    expect(getTagCategory('Python')).toBe('language');
    expect(getTagCategory('Kotlin')).toBe('language');
  });

  it('groups DevOps & IaC tools together, matching the CV skills grouping', () => {
    expect(getTagCategory('Terraform')).toBe('devops');
    expect(getTagCategory('Kubernetes')).toBe('devops');
  });

  it('groups cloud platforms separately from DevOps & IaC, matching the CV skills grouping', () => {
    expect(getTagCategory('Azure')).toBe('cloud');
    expect(getTagCategory('Firebase')).toBe('cloud');
  });

  it('falls back to "tools" (the CV\'s Tools & Methodologies catch-all) for tags outside the CV skill list', () => {
    expect(getTagCategory('SomeBrandNewTech')).toBe('tools');
    expect(getTagCategory('Search Algorithms')).toBe('tools');
  });
});

describe('getTagColor', () => {
  it('gives every tag in the same category the same color', () => {
    expect(getTagColor('Python')).toBe(getTagColor('Kotlin'));
  });

  it('gives tags in different categories different colors', () => {
    expect(getTagColor('Python')).not.toBe(getTagColor('Terraform'));
  });

  it('returns a hex color string', () => {
    expect(getTagColor('React')).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
