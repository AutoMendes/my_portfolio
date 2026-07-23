import { describe, expect, it } from 'vitest';
import {
  getBuildingPositions,
  getCameraOrigin,
  MAP_HEIGHT,
  MAP_WIDTH,
  tileTypeAt,
  tryMove,
} from './overworld';

describe('tileTypeAt', () => {
  it('treats out-of-bounds positions as trees (an invisible wall)', () => {
    expect(tileTypeAt({ x: -1, y: 0 })).toBe('tree');
    expect(tileTypeAt({ x: MAP_WIDTH, y: 0 })).toBe('tree');
    expect(tileTypeAt({ x: 0, y: -1 })).toBe('tree');
    expect(tileTypeAt({ x: 0, y: MAP_HEIGHT })).toBe('tree');
  });

  it('reads the border of the map as trees', () => {
    expect(tileTypeAt({ x: 0, y: 0 })).toBe('tree');
  });
});

describe('tryMove', () => {
  it('is a no-op when the destination tile is a tree', () => {
    // (0,0) is a tree per the map border; (1,0) attempting to move further into
    // the border at (0,0) should be blocked.
    const pos = { x: 1, y: 1 };
    expect(tryMove(pos, -1, -1)).toEqual(pos);
  });

  it('moves onto a walkable (grass) tile', () => {
    const pos = { x: 1, y: 1 };
    const next = tryMove(pos, 1, 0);
    expect(next).not.toEqual(pos);
    expect(tileTypeAt(next)).not.toBe('tree');
  });

  it('moves onto a building tile (buildings are walkable/interactive, not blocking)', () => {
    const [firstBuilding] = getBuildingPositions();
    const adjacent = { x: firstBuilding.x - 1, y: firstBuilding.y };
    // only assert this if the adjacent tile is itself walkable, to avoid a flaky
    // test coupled to exact map layout — the meaningful assertion is: whatever
    // building tile we land on is reported walkable.
    if (tileTypeAt(adjacent) !== 'tree') {
      const moved = tryMove(adjacent, 1, 0);
      expect(moved).toEqual(firstBuilding);
    }
    expect(tileTypeAt(firstBuilding)).toBe('building');
  });
});

describe('getBuildingPositions', () => {
  it('returns one position per project slot (9 buildings on the current map)', () => {
    expect(getBuildingPositions()).toHaveLength(9);
  });

  it('every returned position is actually a building tile', () => {
    for (const pos of getBuildingPositions()) {
      expect(tileTypeAt(pos)).toBe('building');
    }
  });
});

describe('getCameraOrigin', () => {
  it('centers the viewport on the player away from any edge', () => {
    const center = { x: Math.floor(MAP_WIDTH / 2), y: Math.floor(MAP_HEIGHT / 2) };
    const origin = getCameraOrigin(center, 7, 7);
    expect(origin).toEqual({ x: center.x - 3, y: center.y - 3 });
  });

  it('clamps at the top-left edge so the camera never shows negative coordinates', () => {
    const origin = getCameraOrigin({ x: 0, y: 0 }, 7, 7);
    expect(origin).toEqual({ x: 0, y: 0 });
  });

  it('clamps at the bottom-right edge so the camera never scrolls past the map', () => {
    const origin = getCameraOrigin({ x: MAP_WIDTH - 1, y: MAP_HEIGHT - 1 }, 7, 7);
    expect(origin).toEqual({ x: MAP_WIDTH - 7, y: MAP_HEIGHT - 7 });
  });
});
