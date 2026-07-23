export const GRID_WIDTH = 3;
export const GRID_HEIGHT = 3;

export interface Position {
  x: number;
  y: number;
}

export function clampMove(pos: Position, dx: number, dy: number): Position {
  return {
    x: Math.min(GRID_WIDTH - 1, Math.max(0, pos.x + dx)),
    y: Math.min(GRID_HEIGHT - 1, Math.max(0, pos.y + dy)),
  };
}

export function tileToSlug(pos: Position, slugs: string[]): string | null {
  const index = pos.y * GRID_WIDTH + pos.x;
  return slugs[index] ?? null;
}
