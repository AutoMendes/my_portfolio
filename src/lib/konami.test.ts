import { describe, expect, it } from 'vitest';
import { createKonamiDetector, KONAMI_SEQUENCE } from './konami';

describe('createKonamiDetector', () => {
  it('returns true once the full sequence is pressed in order', () => {
    const detector = createKonamiDetector();
    const results = KONAMI_SEQUENCE.map((key) => detector.press(key));

    expect(results.slice(0, -1).every((r) => r === false)).toBe(true);
    expect(results.at(-1)).toBe(true);
  });

  it('resets progress when a wrong key is pressed mid-sequence', () => {
    const detector = createKonamiDetector();
    detector.press('ArrowUp');
    detector.press('ArrowUp');
    expect(detector.press('x')).toBe(false);

    // Now replaying the full sequence from scratch should still succeed —
    // proving the wrong key actually reset progress rather than just failing silently.
    const results = KONAMI_SEQUENCE.slice(0, -1).map((key) => detector.press(key));
    expect(results.every((r) => r === false)).toBe(true);
    expect(detector.press(KONAMI_SEQUENCE.at(-1)!)).toBe(true);
  });

  it('is order-sensitive: the same keys in the wrong order do not complete it', () => {
    const detector = createKonamiDetector();
    const reversed = [...KONAMI_SEQUENCE].reverse();

    const results = reversed.map((key) => detector.press(key));
    expect(results.every((r) => r === false)).toBe(true);
  });

  it('handles a partial-correct-prefix followed by a correct continuation', () => {
    const detector = createKonamiDetector();
    // Press the first three correct keys, then restart from the beginning correctly.
    detector.press('ArrowUp');
    detector.press('ArrowUp');
    detector.press('ArrowDown');

    // 4th key should be ArrowDown per the sequence, so this is still on track —
    // completing the rest should still succeed.
    const rest = KONAMI_SEQUENCE.slice(3);
    const results = rest.map((key) => detector.press(key));
    expect(results.at(-1)).toBe(true);
  });
});
