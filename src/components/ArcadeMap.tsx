import { useEffect, useState } from 'react';
import {
  getBuildingPositions,
  getCameraOrigin,
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_START,
  tileTypeAt,
  tryMove,
  type Position,
} from '../lib/overworld';

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

const TILE_PX = 40;
const VIEWPORT_TILES = 7;

const BUILDING_COLORS = ['#e07a5f', '#3d5a80', '#81b29a', '#f2cc8f', '#9b5de5', '#00bbf9', '#f15bb5', '#fee440', '#4ea8de'];

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
  const [position, setPosition] = useState<Position>(PLAYER_START);

  const buildingPositions = getBuildingPositions();
  const buildingAt = (pos: Position) =>
    buildingPositions.findIndex((b) => b.x === pos.x && b.y === pos.y);

  const currentBuildingIndex = buildingAt(position);
  const currentProject = currentBuildingIndex >= 0 ? (projects[currentBuildingIndex] ?? null) : null;

  function move(dx: number, dy: number) {
    setPosition((prev) => tryMove(prev, dx, dy));
  }

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      const delta = KEY_DELTAS[event.key];
      if (delta) {
        event.preventDefault();
        move(delta[0], delta[1]);
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onClose]);

  const camera = getCameraOrigin(position, VIEWPORT_TILES, VIEWPORT_TILES);
  const tiles = Array.from({ length: MAP_WIDTH * MAP_HEIGHT }, (_, i) => ({
    x: i % MAP_WIDTH,
    y: Math.floor(i / MAP_WIDTH),
  }));

  const dpadButtonClass = 'flex h-11 w-11 items-center justify-center rounded bg-white/10 text-xl text-white active:bg-white/25';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-black/90 p-4">
      <button type="button" onClick={onClose} className="absolute right-6 top-6 text-2xl text-white">
        ✕
      </button>

      <div
        className="relative overflow-hidden border-2 border-white/20"
        style={{ width: VIEWPORT_TILES * TILE_PX, height: VIEWPORT_TILES * TILE_PX }}
      >
        <div
          className="absolute"
          style={{
            width: MAP_WIDTH * TILE_PX,
            height: MAP_HEIGHT * TILE_PX,
            transform: `translate(${-camera.x * TILE_PX}px, ${-camera.y * TILE_PX}px)`,
          }}
        >
          {tiles.map(({ x, y }) => {
            const type = tileTypeAt({ x, y });
            const buildingIndex = type === 'building' ? buildingAt({ x, y }) : -1;
            const background =
              type === 'tree' ? '#1b4332' : type === 'building' ? BUILDING_COLORS[buildingIndex % BUILDING_COLORS.length] : '#74c69d';
            return (
              <div
                key={`${x}-${y}`}
                className="absolute flex items-center justify-center text-xs"
                style={{ left: x * TILE_PX, top: y * TILE_PX, width: TILE_PX, height: TILE_PX, background }}
              >
                {type === 'tree' && '🌲'}
                {type === 'building' && '🏠'}
              </div>
            );
          })}
        </div>

        <div
          className="absolute flex items-center justify-center text-2xl"
          style={{
            left: (position.x - camera.x) * TILE_PX,
            top: (position.y - camera.y) * TILE_PX,
            width: TILE_PX,
            height: TILE_PX,
          }}
          aria-label="player"
        >
          🧑
        </div>
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

      <div className="grid grid-cols-3 grid-rows-2 gap-1" aria-label="Movement controls">
        <div />
        <button type="button" onClick={() => move(0, -1)} className={dpadButtonClass} aria-label="Up">
          ↑
        </button>
        <div />
        <button type="button" onClick={() => move(-1, 0)} className={dpadButtonClass} aria-label="Left">
          ←
        </button>
        <button type="button" onClick={() => move(0, 1)} className={dpadButtonClass} aria-label="Down">
          ↓
        </button>
        <button type="button" onClick={() => move(1, 0)} className={dpadButtonClass} aria-label="Right">
          →
        </button>
      </div>

      <p className="text-sm text-white/70">Arrow keys / WASD, or the buttons above · Esc to close</p>
    </div>
  );
}
