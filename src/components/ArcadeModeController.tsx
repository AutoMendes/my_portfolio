import { useState } from 'react';
import { ArcadeMap, type ArcadeProject } from './ArcadeMap';
import { KonamiListener } from './KonamiListener';

interface ArcadeModeControllerProps {
  projects: ArcadeProject[];
}

export function ArcadeModeController({ projects }: ArcadeModeControllerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <KonamiListener onComplete={() => setOpen(true)} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Arcade mode"
        className="rounded-full border px-2.5 py-1 text-lg transition hover:scale-110"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-chrome)' }}
      >
        🕹️
      </button>
      {open && <ArcadeMap projects={projects} onClose={() => setOpen(false)} />}
    </>
  );
}
