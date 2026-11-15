import { describe, it, expect } from 'vitest';
import { isAlive, pushPoint, segmentStyle, trailColor, type TrailPoint } from './trail';

const p = (x: number, t: number): TrailPoint => ({ x, y: 0, t });

describe('trail', () => {
  it('appends the new point last and returns a new array', () => {
    const a = [p(1, 0)];
    const b = pushPoint(a, p(2, 10), 450, 24);
    expect(b).not.toBe(a);
    expect(a).toHaveLength(1);
    expect(b.map((q) => q.x)).toEqual([1, 2]);
  });

  it('caps the number of points, keeping the newest', () => {
    let pts: TrailPoint[] = [];
    for (let i = 0; i < 40; i++) pts = pushPoint(pts, p(i, i), 450, 24);
    expect(pts).toHaveLength(24);
    expect(pts[0].x).toBe(16);
    expect(pts[23].x).toBe(39);
  });

  it('drops points older than the max age', () => {
    let pts: TrailPoint[] = [];
    pts = pushPoint(pts, p(0, 0), 450, 24);
    pts = pushPoint(pts, p(1, 200), 450, 24);
    pts = pushPoint(pts, p(2, 600), 450, 24);
    expect(pts.map((q) => q.x)).toEqual([1, 2]);
  });

  it('tapers width monotonically from head to tail and reaches 0', () => {
    const n = 10;
    const widths = Array.from({ length: n }, (_, i) => segmentStyle(i, n, 0, 450).width);
    for (let i = 1; i < n; i++) expect(widths[i]).toBeLessThanOrEqual(widths[i - 1]);
    expect(widths[0]).toBeCloseTo(3, 1);
    expect(widths[n - 1]).toBe(0);
  });

  it('fades alpha with age and clamps to >= 0', () => {
    const a0 = segmentStyle(0, 10, 0, 450).alpha;
    const a1 = segmentStyle(0, 10, 200, 450).alpha;
    const a2 = segmentStyle(0, 10, 900, 450).alpha;
    expect(a0).toBeCloseTo(0.9, 2);
    expect(a1).toBeLessThan(a0);
    expect(a2).toBe(0);
    expect(segmentStyle(5, 10, 100, 450).width).toBeGreaterThanOrEqual(0);
  });

  it('colors white at the head and faint pink at the tail via violet', () => {
    expect(trailColor(0)).toBe('rgba(255, 255, 255, 1)');
    const tail = trailColor(1);
    expect(tail).toMatch(/^rgba\(244, 114, 182, 0\.\d+\)$/);
    const mid = trailColor(0.5).match(/\d+/g)!.map(Number);
    expect(mid[0]).toBeLessThan(255);
    expect(mid[2]).toBeGreaterThan(200);
    expect(trailColor(-1)).toBe(trailColor(0));
    expect(trailColor(5)).toBe(trailColor(1));
  });

  it('isAlive is false when empty or all old, true when recent', () => {
    expect(isAlive([], 1000, 450)).toBe(false);
    expect(isAlive([p(0, 0)], 1000, 450)).toBe(false);
    expect(isAlive([p(0, 0), p(1, 800)], 1000, 450)).toBe(true);
  });
});
