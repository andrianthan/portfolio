import { describe, it, expect } from 'vitest';
import { buildGraph, rotate, project, renderFrame, toText, canReveal, pointerFocus, RAMP } from './graph';

const COLS = 72, ROWS = 30;
const base = { t: 0, yaw: 0.4, pitch: 0.2, cols: COLS, rows: ROWS };

describe('buildGraph', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    expect(buildGraph(7)).toEqual(buildGraph(7));
    expect(buildGraph(7).nodes).not.toEqual(buildGraph(8).nodes);
  });
  it('has a hub at the origin and valid, unique edges', () => {
    const g = buildGraph();
    expect(g.nodes[g.hub]).toEqual({ x: 0, y: 0, z: 0 });
    expect(g.nodes.length).toBeGreaterThanOrEqual(15);
    const seen = new Set<string>();
    for (const [a, b] of g.edges) {
      expect(a).not.toBe(b);
      expect(a).toBeGreaterThanOrEqual(0); expect(b).toBeLessThan(g.nodes.length);
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
  it('connects every node to the hub through some path', () => {
    const g = buildGraph();
    const reach = new Set([g.hub]);
    for (let i = 0; i < g.nodes.length; i++)
      for (const [a, b] of g.edges) { if (reach.has(a)) reach.add(b); if (reach.has(b)) reach.add(a); }
    expect(reach.size).toBe(g.nodes.length);
  });
});

describe('rotate and project', () => {
  it('leaves the origin at the centre of the grid', () => {
    const p = project(rotate({ x: 0, y: 0, z: 0 }, 1.1, 0.6), COLS, ROWS);
    expect(p.col).toBeCloseTo(COLS / 2, 5);
    expect(p.row).toBeCloseTo(ROWS / 2, 5);
  });
  it('makes nearer points larger: the same x lands farther from centre when z is bigger', () => {
    const far = project({ x: 0.5, y: 0, z: -0.8 }, COLS, ROWS);
    const near = project({ x: 0.5, y: 0, z: 0.8 }, COLS, ROWS);
    expect(near.col - COLS / 2).toBeGreaterThan(far.col - COLS / 2);
    expect(near.depth).toBeGreaterThan(far.depth);
  });
});

describe('renderFrame', () => {
  const g = buildGraph();
  it('returns only in-bounds cells with ramp characters and levels in 0..1', () => {
    const cells = renderFrame(g, base);
    expect(cells.length).toBeGreaterThan(40);
    for (const c of cells) {
      expect(c.col).toBeGreaterThanOrEqual(0); expect(c.col).toBeLessThan(COLS);
      expect(c.row).toBeGreaterThanOrEqual(0); expect(c.row).toBeLessThan(ROWS);
      expect(RAMP.includes(c.ch)).toBe(true);
      expect(c.level).toBeGreaterThanOrEqual(0); expect(c.level).toBeLessThanOrEqual(1);
    }
  });
  it('has one cell per grid position', () => {
    const cells = renderFrame(g, base);
    const keys = new Set(cells.map((c) => `${c.col},${c.row}`));
    expect(keys.size).toBe(cells.length);
  });
  it('is stable for identical input (the reduced-motion frame)', () => {
    expect(renderFrame(g, base)).toEqual(renderFrame(g, base));
  });
  it('changes when the graph is turned', () => {
    expect(renderFrame(g, { ...base, yaw: 1.4 })).not.toEqual(renderFrame(g, base));
  });
  it('moves the pulses with time', () => {
    const stars = (t: number) => renderFrame(g, { ...base, t }).filter((c) => c.ch === '*').map((c) => `${c.col},${c.row}`).join('|');
    expect(stars(0).length).toBeGreaterThan(0);
    expect(stars(0.4)).not.toBe(stars(0));
  });
  it('brightens cells near the focus point', () => {
    const plain = renderFrame(g, base);
    const hot = plain.find((c) => c.level < 0.7)!;
    const focused = renderFrame(g, { ...base, focus: { col: hot.col, row: hot.row } });
    const same = focused.find((c) => c.col === hot.col && c.row === hot.row)!;
    expect(same.level).toBeGreaterThan(hot.level);
  });
});

describe('toText', () => {
  it('produces rows lines of cols characters', () => {
    const text = toText(renderFrame(buildGraph(), base), COLS, ROWS);
    const lines = text.split('\n');
    expect(lines.length).toBe(ROWS);
    for (const l of lines) expect(l.length).toBe(COLS);
    expect(text).toContain('@'); // the hub
  });
});

describe('canReveal', () => {
  it('refuses a canvas that has no box: sizing it from that would leave one pixel', () => {
    // a canvas that is still `display: none` measures 0 x 0
    expect(canReveal(0, 0)).toBe(false);
    expect(canReveal(0, 452)).toBe(false);
    expect(canReveal(620, 0)).toBe(false);
    expect(canReveal(-1, 452)).toBe(false);
  });
  it('accepts a canvas that has been measured to a real box', () => {
    expect(canReveal(620, 452)).toBe(true);
    expect(canReveal(1, 1)).toBe(true);
    expect(canReveal(320.5, 233.2)).toBe(true);
  });
});

describe('pointerFocus', () => {
  const rect = { left: 100, top: 50, width: 400, height: 300 };
  it('maps the pointer onto the character grid', () => {
    const c = pointerFocus(true, { x: 300, y: 200 }, rect, COLS, ROWS)!;
    expect(c.col).toBeCloseTo(COLS / 2, 5);
    expect(c.row).toBeCloseTo(ROWS / 2, 5);
  });
  it('does nothing while the graph is off-screen', () => {
    expect(pointerFocus(false, { x: 300, y: 200 }, rect, COLS, ROWS)).toBeNull();
  });
  it('does nothing when the graph has no size', () => {
    expect(pointerFocus(true, { x: 300, y: 200 }, { ...rect, width: 0 }, COLS, ROWS)).toBeNull();
    expect(pointerFocus(true, { x: 300, y: 200 }, { ...rect, height: 0 }, COLS, ROWS)).toBeNull();
  });
});
