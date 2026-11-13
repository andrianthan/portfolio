import { describe, it, expect } from 'vitest';
import { mulberry32, starShadows } from './stars';

describe('stars', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    expect(starShadows(20, 7)).toBe(starShadows(20, 7));
    expect(starShadows(20, 7)).not.toBe(starShadows(20, 8));
  });

  it('emits exactly count shadows inside the box', () => {
    const out = starShadows(50, 3, 1000, 600, '#fff');
    const parts = out.split(', ');
    expect(parts).toHaveLength(50);
    for (const part of parts) {
      const [x, y, color] = part.split(' ');
      expect(parseInt(x, 10)).toBeGreaterThanOrEqual(0);
      expect(parseInt(x, 10)).toBeLessThan(1000);
      expect(parseInt(y, 10)).toBeGreaterThanOrEqual(0);
      expect(parseInt(y, 10)).toBeLessThan(600);
      expect(color).toBe('#fff');
    }
  });

  it('mulberry32 yields values in [0, 1)', () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
