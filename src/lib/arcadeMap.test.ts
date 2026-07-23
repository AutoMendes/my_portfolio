import { describe, expect, it } from 'vitest';
import { clampMove, GRID_HEIGHT, GRID_WIDTH, tileToSlug } from './arcadeMap';

describe('clampMove', () => {
  it('does not move past the left/top edge', () => {
    expect(clampMove({ x: 0, y: 0 }, -1, 0)).toEqual({ x: 0, y: 0 });
    expect(clampMove({ x: 0, y: 0 }, 0, -1)).toEqual({ x: 0, y: 0 });
  });

  it('does not move past the right/bottom edge', () => {
    const bottomRight = { x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 };
    expect(clampMove(bottomRight, 1, 0)).toEqual(bottomRight);
    expect(clampMove(bottomRight, 0, 1)).toEqual(bottomRight);
  });

  it('moves normally within bounds', () => {
    expect(clampMove({ x: 0, y: 0 }, 1, 0)).toEqual({ x: 1, y: 0 });
    expect(clampMove({ x: 1, y: 1 }, 0, 1)).toEqual({ x: 1, y: 2 });
  });
});

describe('tileToSlug', () => {
  const slugs = Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, (_, i) => `project-${i}`);

  it('maps every grid position to the corresponding slug when the grid is full', () => {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        expect(tileToSlug({ x, y }, slugs)).toBe(`project-${y * GRID_WIDTH + x}`);
      }
    }
  });

  it('returns null (a no-op tile) for a position beyond the number of projects', () => {
    const fewerSlugs = slugs.slice(0, GRID_WIDTH * GRID_HEIGHT - 2);
    const lastPosition = { x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 };
    expect(tileToSlug(lastPosition, fewerSlugs)).toBeNull();
  });
});
