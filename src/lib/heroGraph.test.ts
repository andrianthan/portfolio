import { describe, it, expect } from 'vitest';
import type { GraphNode } from './heroGraph';
import {
  CHECK_MARK_HALF_WIDTH, GRAPH_CENTER, GRAPH_EDGES, GRAPH_LINKS, GRAPH_NODES, GRAPH_VIEWBOX,
  checkMarkPoint, clientToViewBox, controlPoint, edgeMidpoint, edgePath, edgeShapes, labelY,
  lerpNodes, pullNodes,
} from './heroGraph';

const byId = (id: string) => GRAPH_NODES.find((n) => n.id === id)!;

const [, , VIEW_W, VIEW_H] = GRAPH_VIEWBOX.split(' ').map(Number);
const LABEL_OFFSET = 13; // the label is drawn at node.y + node.r + 13
const LABEL_HEIGHT = 8; // room for the text itself below that slot
const BOW = 0.45;

const quadratic = (p0: { x: number; y: number }, c: { x: number; y: number }, p1: { x: number; y: number }, t: number) => ({
  x: (1 - t) ** 2 * p0.x + 2 * t * (1 - t) * c.x + t * t * p1.x,
  y: (1 - t) ** 2 * p0.y + 2 * t * (1 - t) * c.y + t * t * p1.y,
});

const curvePoints = (from: GraphNode, to: GraphNode, bow = BOW, n = 400) => {
  const c = controlPoint(from, to, GRAPH_CENTER, bow);
  return Array.from({ length: n + 1 }, (_, i) => quadratic(from, c, to, i / n));
};

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
      expect(n.x + n.r).toBeLessThanOrEqual(VIEW_W);
      expect(n.y - n.r).toBeGreaterThanOrEqual(0);
      expect(n.y + n.r).toBeLessThanOrEqual(VIEW_H);
    }
  });

  it('leaves room for the label drawn below every node', () => {
    for (const n of GRAPH_NODES) {
      const slot = n.y + n.r + LABEL_OFFSET;
      expect(slot + LABEL_HEIGHT).toBeLessThanOrEqual(VIEW_H);
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(VIEW_W);
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

  it('keeps every check edge at least 20 units clear of the orchestrator', () => {
    const checks = GRAPH_EDGES.filter((e) => e.check);
    expect(checks).toHaveLength(5);
    for (const e of checks) {
      const from = byId(e.from);
      const to = byId(e.to);
      let min = Infinity;
      for (const p of curvePoints(from, to)) {
        min = Math.min(min, Math.hypot(p.x - GRAPH_CENTER.x, p.y - GRAPH_CENTER.y));
      }
      expect(min).toBeGreaterThanOrEqual(20);
    }
  });

  it('never runs a check edge along an orchestrator spoke', () => {
    const verify = byId('verify');
    const vx = verify.x - GRAPH_CENTER.x;
    const vy = verify.y - GRAPH_CENTER.y;
    const len = Math.hypot(vx, vy);
    for (const e of GRAPH_EDGES.filter((e) => e.check)) {
      const from = byId(e.from);
      // the tool must sit off the centre -> verifier line, or the edge would lie on its own spoke
      const off = Math.abs((from.x - GRAPH_CENTER.x) * vy - (from.y - GRAPH_CENTER.y) * vx) / len;
      expect(off).toBeGreaterThan(10);
    }
  });

  it('keeps the plain midpoint of a check edge on the edge itself', () => {
    const m = edgeMidpoint(byId('skills'), byId('verify'), GRAPH_CENTER, 0.45);
    expect(Number.isFinite(m.x)).toBe(true);
    expect(Number.isFinite(m.y)).toBe(true);
    // the mark rides the edge itself
    const onEdge = curvePoints(byId('skills'), byId('verify')).some((p) => Math.hypot(p.x - m.x, p.y - m.y) < 0.01);
    expect(onEdge).toBe(true);
    // and it stays clear of the hub and inside the box
    expect(Math.hypot(m.x - GRAPH_CENTER.x, m.y - GRAPH_CENTER.y)).toBeGreaterThan(byId('orchestrator').r);
    expect(m.x).toBeGreaterThanOrEqual(0);
    expect(m.x).toBeLessThanOrEqual(VIEW_W);
    expect(m.y).toBeGreaterThanOrEqual(0);
    expect(m.y).toBeLessThanOrEqual(VIEW_H);
  });
});

describe('pointer mapping', () => {
  const rect = (width: number, height: number, left = 0, top = 0) => ({ left, top, width, height });

  it('maps a box that has the view box ratio straight across', () => {
    const p = clientToViewBox({ x: 100, y: 50 }, rect(320, 240))!;
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(50);
  });

  it('undoes the letterbox of a wider box', () => {
    // 400 x 240 keeps the scale at 1 and leaves 40 units of bar on each side
    expect(clientToViewBox({ x: 40, y: 0 }, rect(400, 240))!.x).toBeCloseTo(0);
    expect(clientToViewBox({ x: 200, y: 120 }, rect(400, 240))!.x).toBeCloseTo(160);
    expect(clientToViewBox({ x: 360, y: 240 }, rect(400, 240))!.x).toBeCloseTo(320);
    expect(clientToViewBox({ x: 200, y: 120 }, rect(400, 240))!.y).toBeCloseTo(120);
  });

  it('undoes the letterbox of a taller box', () => {
    // 320 x 400 keeps the scale at 1 and leaves 80 units of bar above and below
    expect(clientToViewBox({ x: 160, y: 80 }, rect(320, 400))!.y).toBeCloseTo(0);
    expect(clientToViewBox({ x: 160, y: 200 }, rect(320, 400))!.y).toBeCloseTo(120);
    expect(clientToViewBox({ x: 160, y: 320 }, rect(320, 400))!.y).toBeCloseTo(240);
  });

  it('undoes the letterbox of a square box', () => {
    // 300 x 300 scales the drawing to 300 x 225 and leaves 37.5 units of bar above and below
    const p = clientToViewBox({ x: 150, y: 150 }, rect(300, 300))!;
    expect(p.x).toBeCloseTo(160);
    expect(p.y).toBeCloseTo(120);
    expect(clientToViewBox({ x: 150, y: 37.5 }, rect(300, 300))!.y).toBeCloseTo(0);
    expect(clientToViewBox({ x: 150, y: 262.5 }, rect(300, 300))!.y).toBeCloseTo(240);
  });

  it('maps the corners of the drawing onto the corners of the view box', () => {
    for (const [w, h] of [[360, 260], [360, 300], [300, 300], [480, 240], [320, 240]]) {
      const r = rect(w, h);
      const scale = Math.min(w / VIEW_W, h / VIEW_H);
      const ox = (w - VIEW_W * scale) / 2;
      const oy = (h - VIEW_H * scale) / 2;
      const topLeft = clientToViewBox({ x: ox, y: oy }, r)!;
      const bottomRight = clientToViewBox({ x: ox + VIEW_W * scale, y: oy + VIEW_H * scale }, r)!;
      expect(topLeft.x).toBeCloseTo(0);
      expect(topLeft.y).toBeCloseTo(0);
      expect(bottomRight.x).toBeCloseTo(VIEW_W);
      expect(bottomRight.y).toBeCloseTo(VIEW_H);
    }
  });

  it('takes the offset of the element on the page into account', () => {
    const p = clientToViewBox({ x: 120, y: 70 }, rect(320, 240, 20, 20))!;
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(50);
  });

  it('maps a box with no area to nothing', () => {
    expect(clientToViewBox({ x: 10, y: 10 }, rect(0, 240))).toBeNull();
    expect(clientToViewBox({ x: 10, y: 10 }, rect(320, 0))).toBeNull();
  });
});

describe('check mark', () => {
  const checks = GRAPH_EDGES.filter((e) => e.check);

  /** The distance from a node centre to the glyph's ink: a band at the baseline, astride the anchor. */
  const inkDistance = (node: GraphNode, p: { x: number; y: number }) => {
    const lo = p.x - CHECK_MARK_HALF_WIDTH;
    const hi = p.x + CHECK_MARK_HALF_WIDTH;
    const dx = node.x < lo ? lo - node.x : node.x > hi ? node.x - hi : 0;
    return Math.hypot(dx, node.y - p.y);
  };

  /** Whether a point is on the quadratic of an edge, at one of the scanned parameters. */
  const onEdge = (from: GraphNode, to: GraphNode, p: { x: number; y: number }) => {
    const c = controlPoint(from, to, GRAPH_CENTER, 0.45);
    return Array.from({ length: 13 }, (_, k) => (4 + k) / 20).some((t) => {
      const u = 1 - t;
      const q = {
        x: u * u * from.x + 2 * t * u * c.x + t * t * to.x,
        y: u * u * from.y + 2 * t * u * c.y + t * t * to.y,
      };
      return Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9;
    });
  };

  it('keeps every check mark clear of every node by more than the glyph', () => {
    expect(checks).toHaveLength(5);
    for (const e of checks) {
      const p = checkMarkPoint(byId(e.from), byId(e.to), GRAPH_NODES);
      for (const n of GRAPH_NODES) {
        expect(Math.hypot(p.x - n.x, p.y - n.y)).toBeGreaterThan(n.r + CHECK_MARK_HALF_WIDTH);
      }
    }
  });

  it('keeps the ink of every check mark out of every disc', () => {
    for (const e of checks) {
      const p = checkMarkPoint(byId(e.from), byId(e.to), GRAPH_NODES);
      for (const n of GRAPH_NODES) {
        expect(inkDistance(n, p)).toBeGreaterThan(n.r);
      }
    }
  });

  it('keeps every check mark on the edge it belongs to', () => {
    for (const e of checks) {
      const p = checkMarkPoint(byId(e.from), byId(e.to), GRAPH_NODES);
      expect(onEdge(byId(e.from), byId(e.to), p)).toBe(true);
    }
  });

  it('rides the middle of an edge that has room for the glyph', () => {
    const mid = edgeMidpoint(byId('projects'), byId('verify'), GRAPH_CENTER, 0.45);
    const p = checkMarkPoint(byId('projects'), byId('verify'), GRAPH_NODES);
    expect(p.x).toBeCloseTo(mid.x);
    expect(p.y).toBeCloseTo(mid.y);
  });

  it('moves the skills check off the midpoint that lands on the verifier', () => {
    const mid = edgeMidpoint(byId('skills'), byId('verify'), GRAPH_CENTER, 0.45);
    expect(Math.hypot(mid.x - byId('verify').x, mid.y - byId('verify').y)).toBeLessThan(byId('verify').r);
    const p = checkMarkPoint(byId('skills'), byId('verify'), GRAPH_NODES);
    expect(p).not.toEqual(mid);
    expect(inkDistance(byId('verify'), p)).toBeGreaterThan(byId('verify').r);
    expect(inkDistance(byId('skills'), p)).toBeGreaterThan(byId('skills').r);
  });

  it('falls back to the plain midpoint when nothing is measured', () => {
    const mid = edgeMidpoint(byId('skills'), byId('verify'), GRAPH_CENTER, 0.45);
    expect(checkMarkPoint(byId('skills'), byId('verify'), [])).toEqual(mid);
  });

  it('keeps the mark inside the view box', () => {
    for (const e of checks) {
      const p = checkMarkPoint(byId(e.from), byId(e.to), GRAPH_NODES);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(VIEW_W);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(VIEW_H);
    }
  });
});

describe('labels', () => {
  it('puts the label under the node', () => {
    for (const n of GRAPH_NODES) expect(labelY(n)).toBe(n.y + n.r + 13);
  });

  it('flips the label above a node whose slot would leave the view box', () => {
    const pushed = { ...byId('verify'), y: VIEW_H - byId('verify').r };
    expect(labelY(pushed)).toBe(pushed.y - pushed.r - 6);
  });

  it('keeps the label inside the view box', () => {
    for (const n of GRAPH_NODES) {
      const y = labelY({ ...n, y: VIEW_H - n.r });
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(VIEW_H);
    }
  });
});

describe('edge shapes', () => {
  const moved = GRAPH_NODES.map((n) => (n.id === 'skills' ? { ...n, x: n.x + 12, y: n.y - 6 } : n));
  const movedById = (id: string) => moved.find((n) => n.id === id)!;

  it('draws every edge from the positions the nodes have now', () => {
    const shapes = edgeShapes(moved, GRAPH_EDGES);
    expect(shapes).toHaveLength(GRAPH_EDGES.length);
    const shape = shapes.find((s) => s.key === 'skills-verify')!;
    expect(shape.d).toBe(edgePath(movedById('skills'), movedById('verify'), GRAPH_CENTER, 0.45));
    expect(shape.d).not.toBe(edgePath(byId('skills'), byId('verify'), GRAPH_CENTER, 0.45));
  });

  it('puts the check mark of a moved edge on that edge', () => {
    const shape = edgeShapes(moved, GRAPH_EDGES).find((s) => s.key === 'skills-verify')!;
    const c = controlPoint(movedById('skills'), movedById('verify'), GRAPH_CENTER, 0.45);
    const onCurve = Array.from({ length: 13 }, (_, k) => (4 + k) / 20).some((t) => {
      const u = 1 - t;
      const q = {
        x: u * u * movedById('skills').x + 2 * t * u * c.x + t * t * movedById('verify').x,
        y: u * u * movedById('skills').y + 2 * t * u * c.y + t * t * movedById('verify').y,
      };
      return Math.abs(q.x - shape.check!.x) < 1e-9 && Math.abs(q.y - shape.check!.y) < 1e-9;
    });
    expect(onCurve).toBe(true);
  });

  it('gives a check mark to the check edges only', () => {
    const shapes = edgeShapes(GRAPH_NODES, GRAPH_EDGES);
    expect(shapes.filter((s) => s.check)).toHaveLength(5);
  });

  it('skips an edge whose endpoint is missing', () => {
    const shapes = edgeShapes(GRAPH_NODES, [{ from: 'skills', to: 'nowhere' }]);
    expect(shapes).toHaveLength(0);
  });
});

describe('pointer reaction', () => {
  const opts = { radius: 70, maxShift: 12 };

  it('does not move anything without a pointer', () => {
    const base = GRAPH_NODES.map((n) => [n.x, n.y]);
    expect(pullNodes(GRAPH_NODES, null, opts).map((n) => [n.x, n.y])).toEqual(base);
  });

  it('does not move anything under reduced motion', () => {
    const base = GRAPH_NODES.map((n) => [n.x, n.y]);
    const p = { x: GRAPH_CENTER.x, y: GRAPH_CENTER.y };
    expect(pullNodes(GRAPH_NODES, p, { ...opts, reduced: true }).map((n) => [n.x, n.y])).toEqual(base);
  });

  it('leaves nodes outside the radius alone', () => {
    const base = GRAPH_NODES.map((n) => [n.x, n.y]);
    const p = { x: -500, y: -500 };
    expect(pullNodes(GRAPH_NODES, p, opts).map((n) => [n.x, n.y])).toEqual(base);
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

  it('moves a node a visible distance when the pointer is at half the radius', () => {
    for (const n of GRAPH_NODES) {
      const p = { x: n.x + opts.radius / 2, y: n.y };
      const moved = pullNodes(GRAPH_NODES, p, opts).find((m) => m.id === n.id)!;
      expect(Math.hypot(moved.x - n.x, moved.y - n.y)).toBeGreaterThanOrEqual(4);
    }
  });

  it('caps the shift at maxShift when the cap bites', () => {
    const target = byId('projects');
    const p = { x: target.x + 30, y: target.y + 30 };
    const moved = pullNodes(GRAPH_NODES, p, { radius: 70, maxShift: 1 }).find((n) => n.id === 'projects')!;
    expect(Math.hypot(moved.x - target.x, moved.y - target.y)).toBeCloseTo(1, 6);
  });

  it('never pushes a node outside the view box', () => {
    const pointers = [
      { x: 0, y: 0 },
      { x: VIEW_W, y: 0 },
      { x: 0, y: VIEW_H },
      { x: VIEW_W, y: VIEW_H },
      { x: 160, y: -100 },
      { x: -500, y: -500 },
    ];
    for (const p of pointers) {
      for (const o of [{ radius: 70, maxShift: 12 }, { radius: 400, maxShift: 400 }]) {
        for (const n of pullNodes(GRAPH_NODES, p, o)) {
          expect(n.x - n.r).toBeGreaterThanOrEqual(0);
          expect(n.x + n.r).toBeLessThanOrEqual(VIEW_W);
          expect(n.y - n.r).toBeGreaterThanOrEqual(0);
          expect(n.y + n.r).toBeLessThanOrEqual(VIEW_H);
        }
      }
    }
  });

  it('does not mutate the nodes it is given', () => {
    const base = GRAPH_NODES.map((n) => [n.x, n.y]);
    const moved = pullNodes(GRAPH_NODES, { x: 200, y: 100 }, opts);
    expect(GRAPH_NODES.map((n) => [n.x, n.y])).toEqual(base);
    expect(moved).not.toBe(GRAPH_NODES);
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

  it('matches the second array by id, not by position', () => {
    const a = GRAPH_NODES.map((n) => ({ ...n }));
    const b = GRAPH_NODES.map((n) => ({ ...n, x: n.x + 10, y: n.y + 10 }));
    const shuffled = [...b].reverse();
    expect(lerpNodes(a, shuffled, 0.5).map((n) => [n.x, n.y])).toEqual(lerpNodes(a, b, 0.5).map((n) => [n.x, n.y]));
  });

  it('keeps the first position when an id is missing from the second array', () => {
    const a = GRAPH_NODES.map((n) => ({ ...n }));
    const b = GRAPH_NODES.filter((n) => n.id !== 'skills').map((n) => ({ ...n, x: n.x + 10, y: n.y + 10 }));
    const mid = lerpNodes(a, b, 0.5);
    const skills = mid.find((n) => n.id === 'skills')!;
    expect(skills.x).toBe(byId('skills').x);
    expect(skills.y).toBe(byId('skills').y);
  });
});
