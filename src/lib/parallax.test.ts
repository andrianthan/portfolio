import { describe, it, expect } from 'vitest';
import { MAX_SHIFT_PX, ease, normalizePointer, settled, shiftPx } from './parallax';

describe('parallax', () => {
  it('normalizes the pointer to -1..1 and clamps', () => {
    expect(normalizePointer(0, 0, 100, 200)).toEqual({ x: -1, y: -1 });
    expect(normalizePointer(100, 200, 100, 200)).toEqual({ x: 1, y: 1 });
    expect(normalizePointer(50, 100, 100, 200)).toEqual({ x: 0, y: 0 });
    expect(normalizePointer(500, -500, 100, 200)).toEqual({ x: 1, y: -1 });
  });

  it('returns the origin for a zero-sized viewport', () => {
    expect(normalizePointer(10, 10, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('eases toward the target and eventually settles', () => {
    let p = { x: 0, y: 0 };
    const target = { x: 1, y: -1 };
    p = ease(p, target, 0.5);
    expect(p).toEqual({ x: 0.5, y: -0.5 });
    for (let i = 0; i < 80; i++) p = ease(p, target);
    expect(settled(p, target)).toBe(true);
  });

  it('maps the pointer to a pixel shift capped at the maximum', () => {
    expect(shiftPx({ x: 1, y: -1 })).toEqual({ x: MAX_SHIFT_PX, y: -MAX_SHIFT_PX });
    expect(shiftPx({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(MAX_SHIFT_PX).toBe(14);
  });
});
