import { describe, it, expect } from 'vitest';
import { normalize } from './pointer';

describe('normalize', () => {
  it('maps the viewport centre to 0,0 and the corners to -1 and 1', () => {
    expect(normalize(500, 400, 1000, 800)).toEqual({ nx: 0, ny: 0 });
    expect(normalize(0, 0, 1000, 800)).toEqual({ nx: -1, ny: -1 });
    expect(normalize(1000, 800, 1000, 800)).toEqual({ nx: 1, ny: 1 });
  });
  it('clamps positions outside the viewport', () => {
    expect(normalize(-50, 9999, 1000, 800)).toEqual({ nx: -1, ny: 1 });
  });
  it('returns 0,0 for a zero-size viewport', () => {
    expect(normalize(10, 10, 0, 0)).toEqual({ nx: 0, ny: 0 });
  });
});
