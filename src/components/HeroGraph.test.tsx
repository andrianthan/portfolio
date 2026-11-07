import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HeroGraph from './HeroGraph';
import {
  CHECK_MARK_HALF_WIDTH, GRAPH_CENTER, GRAPH_EDGES, GRAPH_NODES, GRAPH_VIEWBOX, controlPoint,
  edgeMidpoint, edgeShapes, labelY,
} from '../lib/heroGraph';

const html = renderToStaticMarkup(<HeroGraph nodes={GRAPH_NODES} edges={GRAPH_EDGES} />);
const count = (needle: string) => html.split(needle).length - 1;

const byId = (id: string) => GRAPH_NODES.find((n) => n.id === id)!;
const [, , VIEW_W, VIEW_H] = GRAPH_VIEWBOX.split(' ').map(Number);
const CHECK_BOW = 0.45;

const checkEdges = GRAPH_EDGES.filter((e) => e.check);

/** The ✓ marks as they are rendered, in the order the check edges are declared. */
const renderedChecks = (markup: string): { x: number; y: number }[] =>
  [...markup.matchAll(/<text class="hg-check" x="([-\d.]+)" y="([-\d.]+)"/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));

/** The node labels as they are rendered, in document order. */
const renderedLabels = (markup: string): { x: number; y: number; label: string }[] =>
  [...markup.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*>([^<]+)<\/text>/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
    label: m[3],
  }));

/** A point on the quadratic that carries an edge. */
const curvePoint = (
  p0: { x: number; y: number },
  c: { x: number; y: number },
  p1: { x: number; y: number },
  t: number,
) => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * t * u * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * t * u * c.y + t * t * p1.y,
  };
};

/** The distance from a node centre to the glyph's ink: a band at the baseline, astride the anchor. */
const inkDistance = (node: { x: number; y: number; r: number }, p: { x: number; y: number }) => {
  const lo = p.x - CHECK_MARK_HALF_WIDTH;
  const hi = p.x + CHECK_MARK_HALF_WIDTH;
  const dx = node.x < lo ? lo - node.x : node.x > hi ? node.x - hi : 0;
  return Math.hypot(dx, node.y - p.y);
};

describe('HeroGraph', () => {
  it('renders an accessible svg with a title and a description', () => {
    expect(html).toContain('viewBox="0 0 320 240"');
    // a group, not an image: role="img" makes the subtree presentational and hides the node links
    expect(html).toContain('role="group"');
    expect(html).not.toContain('role="img"');
    expect(html).toContain('aria-labelledby="hg-title hg-desc"');
    expect(html).toContain('<title id="hg-title">');
    expect(html).toContain('<desc id="hg-desc">');
  });

  it('makes every node a real link', () => {
    expect(count('<a ')).toBe(7);
    for (const href of ['/terminal', '#experience', '#projects', '/resume.pdf', '#about', '#contact']) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it('labels every node visibly', () => {
    for (const n of GRAPH_NODES) expect(html).toContain(n.label);
  });

  it('marks the verifier edges with a check', () => {
    expect(count('✓')).toBe(5);
  });

  it('never renders an undefined or NaN coordinate', () => {
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });
});

describe('HeroGraph layering', () => {
  it('draws the edges group before the nodes group', () => {
    const edges = html.indexOf('hg-edges');
    const nodes = html.indexOf('hg-nodes');
    expect(edges).toBeGreaterThan(-1);
    expect(nodes).toBeGreaterThan(-1);
    expect(edges).toBeLessThan(nodes);
  });

  it('puts every edge path in the edges group and every node in the nodes group', () => {
    const edgesEnd = html.indexOf('hg-nodes');
    expect(count('<path')).toBe(GRAPH_EDGES.length);
    expect(html.indexOf('<path')).toBeLessThan(edgesEnd);
    expect(html.indexOf('<circle')).toBeGreaterThan(edgesEnd);
  });
});

describe('HeroGraph check marks', () => {
  it('keeps every check mark clear of every node by more than the glyph', () => {
    const marks = renderedChecks(html);
    expect(marks).toHaveLength(checkEdges.length);
    for (const p of marks) {
      for (const n of GRAPH_NODES) {
        expect(Math.hypot(p.x - n.x, p.y - n.y)).toBeGreaterThan(n.r + CHECK_MARK_HALF_WIDTH);
      }
    }
  });

  it('keeps the ink of every check mark out of every disc', () => {
    for (const p of renderedChecks(html)) {
      for (const n of GRAPH_NODES) {
        expect(inkDistance(n, p)).toBeGreaterThan(n.r);
      }
    }
  });

  it('keeps every check mark inside the view box', () => {
    for (const p of renderedChecks(html)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(VIEW_W);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(VIEW_H);
    }
  });

  it('puts each check mark on the edge it belongs to', () => {
    const marks = renderedChecks(html);
    for (let i = 0; i < checkEdges.length; i++) {
      const from = byId(checkEdges[i].from);
      const to = byId(checkEdges[i].to);
      const c = controlPoint(from, to, GRAPH_CENTER, CHECK_BOW);
      const onEdge = Array.from({ length: 13 }, (_, k) => (4 + k) / 20).some((t) => {
        const p = curvePoint(from, c, to, t);
        return Math.abs(p.x - marks[i].x) < 1e-9 && Math.abs(p.y - marks[i].y) < 1e-9;
      });
      expect(onEdge).toBe(true);
    }
  });

  it('centres the check mark on its anchor', () => {
    expect(count('text-anchor="middle"')).toBe(GRAPH_NODES.length + checkEdges.length);
  });

  it('sets the size of the check mark glyph', () => {
    expect(count('font-size="6"')).toBe(checkEdges.length);
  });

  it('moves the skills check off the midpoint that lands on the verifier', () => {
    const mid = edgeMidpoint(byId('skills'), byId('verify'), GRAPH_CENTER, CHECK_BOW);
    expect(Math.hypot(mid.x - byId('verify').x, mid.y - byId('verify').y)).toBeLessThan(byId('verify').r);
    const p = edgeShapes(GRAPH_NODES, GRAPH_EDGES).find((s) => s.key === 'skills-verify')!.check!;
    expect(p).not.toEqual(mid);
    expect(inkDistance(byId('verify'), p)).toBeGreaterThan(byId('verify').r);
  });
});

describe('HeroGraph edges', () => {
  it('draws every edge from the positions the nodes have now', () => {
    const moved = GRAPH_NODES.map((n) => (n.id === 'skills' ? { ...n, x: n.x + 12, y: n.y - 6 } : n));
    const markup = renderToStaticMarkup(<HeroGraph nodes={moved} edges={GRAPH_EDGES} />);
    const paths = [...markup.matchAll(/<path class="hg-edge" d="([^"]+)"/g)].map((m) => m[1]);
    const shape = edgeShapes(moved, GRAPH_EDGES).find((s) => s.key === 'skills-verify')!;
    expect(paths).toContain(shape.d);
    // the base layout would have drawn the same edge somewhere else
    const base = edgeShapes(GRAPH_NODES, GRAPH_EDGES).find((s) => s.key === 'skills-verify')!;
    expect(shape.d).not.toBe(base.d);
  });

  it('anchors every edge to the node it belongs to', () => {
    const paths = [...html.matchAll(/<path class="hg-edge" d="M ([-\d.]+) ([-\d.]+) Q [-\d.]+,[-\d.]+ ([-\d.]+),([-\d.]+)"/g)]
      .map((m) => ({ from: { x: Number(m[1]), y: Number(m[2]) }, to: { x: Number(m[3]), y: Number(m[4]) } }));
    const circles = [...html.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)"/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    expect(paths).toHaveLength(GRAPH_EDGES.length);
    // an edge that does not stretch with its node would tear away from the circle
    for (const p of paths) {
      expect(circles).toContainEqual(p.from);
      expect(circles).toContainEqual(p.to);
    }
  });
});

describe('HeroGraph labels', () => {
  it('draws every label below its node', () => {
    const labels = renderedLabels(html);
    expect(labels).toHaveLength(GRAPH_NODES.length);
    for (const label of labels) {
      const node = GRAPH_NODES.find((n) => n.label === label.label)!;
      expect(label.x).toBe(node.x);
      expect(label.y).toBe(node.y + node.r + 13);
    }
  });

  it('flips the label above a node pushed to the bottom of the box', () => {
    const pushed = GRAPH_NODES.map((n) => (n.id === 'verify' ? { ...n, y: 230 } : n));
    const markup = renderToStaticMarkup(<HeroGraph nodes={pushed} edges={GRAPH_EDGES} />);
    const label = renderedLabels(markup).find((l) => l.label === 'verify')!;
    expect(label.y).toBe(230 - 17 - 6);
    expect(label.y).toBeLessThan(230);
  });

  it('keeps a flipped label inside the view box', () => {
    for (const n of GRAPH_NODES) {
      const y = labelY({ ...n, y: VIEW_H - n.r });
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(VIEW_H);
    }
  });
});
