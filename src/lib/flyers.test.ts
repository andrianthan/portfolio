import { describe, it, expect } from 'vitest';
import { MAX_FLYERS, makeFlyer, nextSpawnDelay } from './flyers';

const fixed = (v: number) => () => v;

describe('flyers', () => {
  it('spawns between 2.5s and 9s apart', () => {
    expect(nextSpawnDelay(fixed(0))).toBe(2500);
    expect(nextSpawnDelay(fixed(0.999999))).toBeLessThan(9000);
    expect(nextSpawnDelay(fixed(0.999999))).toBeGreaterThan(8900);
  });

  it('picks the kind from the roll: mostly shooting stars, then comets, then ships', () => {
    expect(makeFlyer(fixed(0.1)).kind).toBe('shooting-star');
    expect(makeFlyer(fixed(0.7)).kind).toBe('comet');
    expect(makeFlyer(fixed(0.9)).kind).toBe('ship');
  });

  it('keeps every flyer in the upper part of the sky with a sane duration and scale', () => {
    for (const roll of [0, 0.3, 0.6, 0.85, 0.999]) {
      const f = makeFlyer(fixed(roll));
      expect(f.topPct).toBeGreaterThanOrEqual(4);
      expect(f.topPct).toBeLessThanOrEqual(60);
      expect(f.scale).toBeGreaterThanOrEqual(0.7);
      expect(f.scale).toBeLessThanOrEqual(1.3);
      expect(f.durationMs).toBeGreaterThan(0);
    }
  });

  it('shooting stars are fast and ships are slow', () => {
    expect(makeFlyer(fixed(0.1)).durationMs).toBeLessThan(2000);
    expect(makeFlyer(fixed(0.9)).durationMs).toBeGreaterThan(20000);
  });

  it('caps concurrency at 3', () => {
    expect(MAX_FLYERS).toBe(3);
  });
});
