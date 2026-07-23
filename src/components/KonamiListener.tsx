import { useEffect, useRef } from 'react';
import { createKonamiDetector } from '../lib/konami';

interface KonamiListenerProps {
  onComplete: () => void;
}

export function KonamiListener({ onComplete }: KonamiListenerProps) {
  const detectorRef = useRef(createKonamiDetector());

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (detectorRef.current.press(event.key)) {
        onComplete();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onComplete]);

  return null;
}
