import { describe, it, expect } from 'vitest';
import { addPoint, alive, fade, spawnDust, stepDust, growFor, type Pt } from './trail';

describe('addPoint', () => {
  it('appends and caps at max, keeping the newest', () => {
    let pts: Pt[] = [];
    for (let i = 0; i < 50; i++) pts = addPoint(pts, { x: i, y: 0, t: i }, 40);
    expect(pts).toHaveLength(40);
    expect(pts[0].x).toBe(10);
    expect(pts[39].x).toBe(49);
  });
  it('does not mutate its input', () => {
    const a: Pt[] = [{ x: 0, y: 0, t: 0 }];
    addPoint(a, { x: 1, y: 1, t: 1 });
    expect(a).toHaveLength(1);
  });
});

describe('alive', () => {
  it('drops points at or past their life', () => {
    const pts: Pt[] = [{ x: 0, y: 0, t: 0 }, { x: 1, y: 1, t: 500 }, { x: 2, y: 2, t: 900 }];
    expect(alive(pts, 1000, 600).map((p) => p.x)).toEqual([1, 2]);
    expect(alive(pts, 1000, 400).map((p) => p.x)).toEqual([2]);
    expect(alive(pts, 1000, 1001).map((p) => p.x)).toEqual([0, 1, 2]);
  });
});

describe('fade', () => {
  it('runs 1 to 0 and clamps', () => {
    expect(fade(0, 0, 600)).toBe(1);
    expect(fade(0, 300, 600)).toBeCloseTo(0.5);
    expect(fade(0, 600, 600)).toBe(0);
    expect(fade(0, 9999, 600)).toBe(0);
    expect(fade(500, 0, 600)).toBe(1);
    expect(fade(0, 10, 0)).toBe(0);
  });
});

describe('dust', () => {
  const seq = (vals: number[]) => {
    let i = 0;
    return () => vals[i++ % vals.length];
  };
  it('is deterministic for a fixed rand and stays inside its bounds', () => {
    const a = spawnDust(10, 20, 100, seq([0, 0, 0, 0]));
    const b = spawnDust(10, 20, 100, seq([0, 0, 0, 0]));
    expect(a).toEqual(b);
    const hi = spawnDust(0, 0, 0, seq([0.999, 0.999, 0.999, 0.999]));
    expect(Math.hypot(hi.vx, hi.vy)).toBeLessThanOrEqual(0.04 + 1e-9);
    expect(hi.life).toBeLessThanOrEqual(1100);
    expect(a.life).toBeGreaterThanOrEqual(700);
    expect(hi.size).toBeLessThanOrEqual(2.2);
    expect(a.size).toBeGreaterThanOrEqual(1);
  });
  it('drifts along its velocity and fades out', () => {
    const d = { x: 0, y: 0, vx: 0.02, vy: -0.01, t: 0, life: 1000, size: 1 };
    const s = stepDust(d, 500);
    expect(s.x).toBeCloseTo(10);
    expect(s.y).toBeCloseTo(-5);
    expect(s.a).toBeCloseTo(0.5);
    expect(stepDust(d, 1000).a).toBe(0);
  });
});

describe('growFor', () => {
  it('moves toward the target without overshooting', () => {
    let s = 1;
    for (let i = 0; i < 200; i++) {
      s = growFor(true, s, 16);
      expect(s).toBeLessThanOrEqual(1.6 + 1e-9);
    }
    expect(s).toBeCloseTo(1.6, 2);
    for (let i = 0; i < 200; i++) {
      s = growFor(false, s, 16);
      expect(s).toBeGreaterThanOrEqual(1 - 1e-9);
    }
    expect(s).toBeCloseTo(1, 2);
  });
  it('holds still for a zero or negative step', () => {
    expect(growFor(true, 1, 0)).toBe(1);
    expect(growFor(true, 1, -5)).toBe(1);
  });
});
