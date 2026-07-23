export type TileType = 'grass' | 'tree' | 'building';

export interface Position {
  x: number;
  y: number;
}

// T = tree (blocking), B = building (a project), . = grass (walkable).
// Hand-authored small "town" layout — 9 buildings for the 9 projects.
const MAP_ROWS = [
  'TTTTTTTTTTTTTTTT',
  'T..............T',
  'T.B....B....B..T',
  'T..............T',
  'T....B....B....T',
  'T..............T',
  'T.B....B....B..T',
  'T..............T',
  'T....B.........T',
  'T..............T',
  'TTTTTTTTTTTTTTTT',
];

export const MAP_WIDTH = MAP_ROWS[0].length;
export const MAP_HEIGHT = MAP_ROWS.length;

export const PLAYER_START: Position = { x: 8, y: 5 };

function charToTile(ch: string): TileType {
  if (ch === 'T') return 'tree';
  if (ch === 'B') return 'building';
  return 'grass';
}

export function tileTypeAt(pos: Position): TileType {
  if (pos.y < 0 || pos.y >= MAP_HEIGHT || pos.x < 0 || pos.x >= MAP_WIDTH) return 'tree';
  return charToTile(MAP_ROWS[pos.y][pos.x]);
}

export function isWalkable(tileType: TileType): boolean {
  return tileType !== 'tree';
}

export function tryMove(pos: Position, dx: number, dy: number): Position {
  const next = { x: pos.x + dx, y: pos.y + dy };
  return isWalkable(tileTypeAt(next)) ? next : pos;
}

export function getBuildingPositions(): Position[] {
  const positions: Position[] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (tileTypeAt({ x, y }) === 'building') positions.push({ x, y });
    }
  }
  return positions;
}

export function getCameraOrigin(player: Position, viewportWidth: number, viewportHeight: number): Position {
  const halfW = Math.floor(viewportWidth / 2);
  const halfH = Math.floor(viewportHeight / 2);
  const x = Math.min(Math.max(player.x - halfW, 0), MAP_WIDTH - viewportWidth);
  const y = Math.min(Math.max(player.y - halfH, 0), MAP_HEIGHT - viewportHeight);
  return { x, y };
}
