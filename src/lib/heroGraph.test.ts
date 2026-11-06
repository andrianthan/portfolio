import { describe, it, expect } from 'vitest';
import {
  GRAPH_CENTER, GRAPH_EDGES, GRAPH_LINKS, GRAPH_NODES, GRAPH_VIEWBOX,
  edgeMidpoint, edgePath, lerpNodes, pullNodes,
} from './heroGraph';

const byId = (id: string) => GRAPH_NODES.find((n) => n.id === id)!;

describe('graph geometry', () => {
  it('has seven nodes with unique ids', () => {
    expect(GRAPH_NODES).toHaveLength(7);
    expect(new Set(GRAPH_NODES.map((n) => n.id)).size).toBe(7);
  });

  it('has exactly one orchestrator and one verify node', () => {
    expect(GRAPH_NODES.filter((n) => n.kind === 'orchestrator')).toHaveLength(1);
    expect(GRAPH_NODES.filter((n) => n.kind === 'verify')).toHaveLength(1);
  });

  it('gives every node a label, a radius and a real link', () => {
    for (const n of GRAPH_NODES) {
      expect(n.label.length).toBeGreaterThan(0);
      expect(n.r).toBeGreaterThan(0);
      expect(n.href.length).toBeGreaterThan(0);
    }
  });

  it('links exactly the destinations the design calls for', () => {
    const hrefs = [...new Set(GRAPH_NODES.map((n) => n.href))].sort();
    expect(hrefs).toEqual([...GRAPH_LINKS].sort());
    expect(GRAPH_LINKS).toContain('/terminal');
    expect(GRAPH_LINKS).toContain('#contact');
  });

  it('wires the orchestrator to every tool and every tool to the verifier', () => {
    expect(GRAPH_EDGES).toHaveLength(10);
    const ids = new Set(GRAPH_NODES.map((n) => n.id));
    for (const e of GRAPH_EDGES) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
    const intoVerify = GRAPH_EDGES.filter((e) => e.to === 'verify');
    expect(intoVerify).toHaveLength(5);
    for (const e of intoVerify) expect(e.check).toBe(true);
    const fromOrchestrator = GRAPH_EDGES.filter((e) => e.from === 'orchestrator');
    expect(fromOrchestrator).toHaveLength(5);
    for (const e of fromOrchestrator) expect(e.check).toBeFalsy();
  });

  it('keeps every node inside the view box', () => {
    expect(GRAPH_VIEWBOX).toBe('0 0 320 240');
    for (const n of GRAPH_NODES) {
      expect(n.x - n.r).toBeGreaterThanOrEqual(0);
      expect(n.x + n.r).toBeLessThanOrEqual(320);
      expect(n.y - n.r).toBeGreaterThanOrEqual(0);
      expect(n.y + n.r).toBeLessThanOrEqual(240);
    }
  });

  it('builds a quadratic path through a control point', () => {
    const p = edgePath(byId('orchestrator'), byId('experience'), GRAPH_CENTER, 0);
    expect(p.startsWith('M ')).toBe(true);
    expect(p).toContain(' Q ');
    expect(p).toContain(String(byId('experience').x));
  });

  it('bows the check edges outward so they never cross the orchestrator', () => {
    const path = edgePath(byId('contact'), byId('verify'), GRAPH_CENTER, 0.45);
    const [control] = path.split(' Q ')[1].split(' ');
    const cx = Number(control.split(',')[0]);
    expect(Math.abs(cx - byId('contact').x)).toBeGreaterThan(1);
    // outward means away from the graph centre: the control point sits further out than the straight chord's
    const [straightControl] = edgePath(byId('contact'), byId('verify'), GRAPH_CENTER, 0).split(' Q ')[1].split(' ');
    expect(cx).toBeLessThan(Number(straightControl.split(',')[0]));
  });

  it('places the check mark at the edge midpoint', () => {
    const m = edgeMidpoint(byId('skills'), byId('verify'), GRAPH_CENTER, 0.45);
    expect(Number.isFinite(m.x)).toBe(true);
    expect(Number.isFinite(m.y)).toBe(true);
    // the mark rides the outward-bowed arc: below the tool node, above the verifier
    expect(m.y).toBeGreaterThan(byId('skills').y);
    expect(m.y).toBeLessThan(byId('verify').y);
  });
});

describe('pointer reaction', () => {
  const opts = { radius: 70, maxShift: 12 };

  it('does not move anything without a pointer', () => {
    expect(pullNodes(GRAPH_NODES, null, opts).map((n) => [n.x, n.y])).toEqual(GRAPH_NODES.map((n) => [n.x, n.y]));
  });

  it('does not move anything under reduced motion', () => {
    const p = { x: GRAPH_CENTER.x, y: GRAPH_CENTER.y };
    expect(pullNodes(GRAPH_NODES, p, { ...opts, reduced: true }).map((n) => [n.x, n.y])).toEqual(GRAPH_NODES.map((n) => [n.x, n.y]));
  });

  it('leaves nodes outside the radius alone', () => {
    const p = { x: -500, y: -500 };
    expect(pullNodes(GRAPH_NODES, p, opts).map((n) => [n.x, n.y])).toEqual(GRAPH_NODES.map((n) => [n.x, n.y]));
  });

  it('pulls a node toward the pointer and caps the shift', () => {
    const target = byId('projects');
    const p = { x: target.x + 30, y: target.y + 30 };
    const moved = pullNodes(GRAPH_NODES, p, opts).find((n) => n.id === 'projects')!;
    expect(Math.hypot(moved.x - target.x, moved.y - target.y)).toBeGreaterThan(0);
    expect(Math.hypot(moved.x - target.x, moved.y - target.y)).toBeLessThanOrEqual(opts.maxShift + 0.0001);
    expect(moved.x).toBeGreaterThan(target.x);
    expect(moved.y).toBeGreaterThan(target.y);
  });

  it('is deterministic', () => {
    const p = { x: 100, y: 60 };
    expect(pullNodes(GRAPH_NODES, p, opts)).toEqual(pullNodes(GRAPH_NODES, p, opts));
  });
});

describe('lerp', () => {
  it('returns the endpoints at t of zero and one', () => {
    const a = GRAPH_NODES.map((n) => ({ ...n }));
    const b = GRAPH_NODES.map((n) => ({ ...n, x: n.x + 10, y: n.y + 10 }));
    expect(lerpNodes(a, b, 0).map((n) => [n.x, n.y])).toEqual(a.map((n) => [n.x, n.y]));
    expect(lerpNodes(a, b, 1).map((n) => [n.x, n.y])).toEqual(b.map((n) => [n.x, n.y]));
  });

  it('interpolates in the middle', () => {
    const a = GRAPH_NODES.map((n) => ({ ...n }));
    const b = GRAPH_NODES.map((n) => ({ ...n, x: n.x + 10, y: n.y + 10 }));
    const mid = lerpNodes(a, b, 0.5);
    expect(mid[0].x).toBeCloseTo(a[0].x + 5);
  });
});
