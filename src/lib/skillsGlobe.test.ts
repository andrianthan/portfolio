import { describe, it, expect } from 'vitest';
import { HOLD_EASE_MS, PITCH_MAX, PITCH_MIN, RELEASE_EASE_MS, SKILL_COUNT, clampPitch, depthOpacity, dragToAngle, fibonacciSphere, project, rotate, spinEase } from './skillsGlobe';

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe('fibonacciSphere', () => {
  it(`returns ${SKILL_COUNT} distinct unit points`, () => {
    const pts = fibonacciSphere(SKILL_COUNT);
    expect(pts).toHaveLength(SKILL_COUNT);
    for (const p of pts) expect(close(Math.hypot(p.x, p.y, p.z), 1)).toBe(true);
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(close(pts[i].x, pts[j].x, 1e-6) && close(pts[i].y, pts[j].y, 1e-6) && close(pts[i].z, pts[j].z, 1e-6)).toBe(false);
  });
  it('evenly covers the sphere (min pairwise separation > 0.2 rad at N=30)', () => {
    const pts = fibonacciSphere(30);
    let minSep = Infinity;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        minSep = Math.min(minSep, Math.acos(Math.max(-1, Math.min(1, pts[i].x * pts[j].x + pts[i].y * pts[j].y + pts[i].z * pts[j].z))));
    expect(minSep).toBeGreaterThan(0.2); // ~11.5°
  });
});

describe('rotate', () => {
  it('positive angleY maps +x toward −z (camera on −z, front = +z)', () => {
    const r = rotate({ x: 1, y: 0, z: 0 }, Math.PI / 2, 0);
    expect(close(r.x, 0)).toBe(true);
    expect(close(r.y, 0)).toBe(true);
    expect(close(r.z, -1)).toBe(true);
  });
  it('angleX tilts y into z', () => {
    const r = rotate({ x: 0, y: 1, z: 0 }, 0, Math.PI / 2);
    expect(close(r.y, 0)).toBe(true);
    expect(close(r.z, 1)).toBe(true);
  });
});

describe('project', () => {
  const opts = { radius: 100, fov: 220, cx: 300, cy: 300 };
  it('front points (z>0) project larger than back points', () => {
    const front = project({ x: 0, y: 0, z: 1 }, opts);
    const back = project({ x: 0, y: 0, z: -1 }, opts);
    expect(front.scale).toBeGreaterThan(back.scale);
    expect(front.x).toBeCloseTo(300);
    expect(back.scale).toBeLessThan(1);
    expect(front.scale).toBeGreaterThan(1);
  });
  it('depthOpacity is monotonic with the pinned endpoints', () => {
    expect(depthOpacity(1)).toBeCloseTo(1);
    expect(depthOpacity(-1)).toBeCloseTo(0.22);
    expect(depthOpacity(0.5)).toBeGreaterThan(depthOpacity(-0.5));
  });
});

describe('globe drag', () => {
  it('clamps pitch to the designed band', () => {
    expect(clampPitch(-1)).toBe(PITCH_MIN);
    expect(clampPitch(2)).toBe(PITCH_MAX);
    expect(clampPitch(0.5)).toBe(0.5);
  });
  it('maps drag pixels to radians by radius', () => {
    expect(dragToAngle(100, 50, 300)).toEqual({ dRy: 100 / 300, dRx: 50 / 300 });
  });
  it('eases the auto-spin out while held and back in after release', () => {
    expect(spinEase(0, null)).toBe(1);
    expect(spinEase(HOLD_EASE_MS, null)).toBe(0);
    expect(spinEase(Math.floor(HOLD_EASE_MS / 2), null)).toBeCloseTo(0.5);
    expect(spinEase(0, 0)).toBe(0);
    expect(spinEase(RELEASE_EASE_MS, RELEASE_EASE_MS)).toBe(1);
    expect(spinEase(Math.floor(RELEASE_EASE_MS / 2), Math.floor(RELEASE_EASE_MS / 2))).toBeCloseTo(0.5);
  });
});
