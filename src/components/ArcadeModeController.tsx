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
      <button type="button" onClick={() => setOpen(true)} title="Arcade mode" className="text-lg">
        🕹️
      </button>
      {open && <ArcadeMap projects={projects} onClose={() => setOpen(false)} />}
    </>
  );
}
