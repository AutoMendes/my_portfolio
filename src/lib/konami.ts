export const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

export function createKonamiDetector() {
  let progress = 0;

  return {
    press(key: string): boolean {
      const expected = KONAMI_SEQUENCE[progress];
      const matches = key.toLowerCase() === expected.toLowerCase();

      if (!matches) {
        progress = 0;
        return false;
      }

      progress += 1;

      if (progress === KONAMI_SEQUENCE.length) {
        progress = 0;
        return true;
      }

      return false;
    },
  };
}
