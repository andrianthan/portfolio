import { describe, it, expect } from 'vitest';
import { listed, cleared, neighbors, renderBold } from './content';

const mk = (id: string, order: number, l = true, c = false) => ({ id, data: { listed: l, cleared: c, order } });

describe('listed', () => {
  it('keeps only listed entries sorted by order', () => {
    const out = listed([mk('b', 2), mk('a', 1), mk('x', 0, false)]);
    expect(out.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('cleared', () => {
  it('keeps only cleared entries sorted by order', () => {
    const out = cleared([mk('a', 2, true, true), mk('b', 1, true, true), mk('c', 0, true, false)]);
    expect(out.map((e) => e.id)).toEqual(['b', 'a']);
  });
  it('returns empty when nothing is cleared', () => {
    expect(cleared([mk('a', 1)])).toEqual([]);
  });
});

describe('neighbors', () => {
  const xs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('returns prev and next', () => expect(neighbors(xs, 'b')).toEqual({ prev: xs[0], next: xs[2] }));
  it('returns null at the ends', () => {
    expect(neighbors(xs, 'a').prev).toBeNull();
    expect(neighbors(xs, 'c').next).toBeNull();
  });
  it('returns nulls for an unknown id', () => expect(neighbors(xs, 'zzz')).toEqual({ prev: null, next: null }));
});

describe('renderBold', () => {
  it('wraps **x** in <b>', () => expect(renderBold('a **b** c')).toBe('a <b>b</b> c'));
  it('escapes html', () => expect(renderBold('<i>x</i> **y**')).toBe('&lt;i&gt;x&lt;/i&gt; <b>y</b>'));
});
