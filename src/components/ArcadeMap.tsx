import { useEffect, useState } from 'react';
import { clampMove, GRID_HEIGHT, GRID_WIDTH, tileToSlug, type Position } from '../lib/arcadeMap';

export interface ArcadeProject {
  slug: string;
  title: string;
  description: string;
  href: string;
}

interface ArcadeMapProps {
  projects: ArcadeProject[];
  onClose: () => void;
}

const TILE_COLORS = ['#e07a5f', '#3d5a80', '#81b29a', '#f2cc8f', '#9b5de5', '#00bbf9', '#f15bb5', '#fee440', '#4ea8de'];

const KEY_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

export function ArcadeMap({ projects, onClose }: ArcadeMapProps) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  const slugs = projects.map((p) => p.slug);
  const currentSlug = tileToSlug(position, slugs);
  const currentProject = projects.find((p) => p.slug === currentSlug) ?? null;

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      const delta = KEY_DELTAS[event.key];
      if (delta) {
        setPosition((prev) => clampMove(prev, delta[0], delta[1]));
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onClose]);

  const tiles = Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-6">
      <button type="button" onClick={onClose} className="absolute right-6 top-6 text-2xl text-white">
        ✕
      </button>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${GRID_WIDTH}, 3rem)`, gridTemplateRows: `repeat(${GRID_HEIGHT}, 3rem)` }}
      >
        {tiles.map((i) => {
          const x = i % GRID_WIDTH;
          const y = Math.floor(i / GRID_WIDTH);
          const slug = tileToSlug({ x, y }, slugs);
          const isPlayer = position.x === x && position.y === y;
          return (
            <div
              key={i}
              className="relative flex items-center justify-center text-xl"
              style={{ background: slug ? TILE_COLORS[i % TILE_COLORS.length] : '#222' }}
            >
              {isPlayer && <span aria-label="player">🧑</span>}
            </div>
          );
        })}
      </div>

      {currentProject && (
        <div className="max-w-md rounded bg-white p-4 text-center text-black">
          <h3 className="font-semibold">{currentProject.title}</h3>
          <p className="mt-1 text-sm">{currentProject.description}</p>
          <a href={currentProject.href} className="mt-2 inline-block underline">
            Open project →
          </a>
        </div>
      )}

      <p className="text-sm text-white/70">Arrow keys / WASD to move · Esc to close</p>
    </div>
  );
}
