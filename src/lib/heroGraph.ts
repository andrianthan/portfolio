export type GraphNodeKind = 'orchestrator' | 'tool' | 'verify';

export interface GraphNode {
  id: string;
  label: string;
  href: string;
  x: number;
  y: number;
  r: number;
  kind: GraphNodeKind;
}

export interface GraphEdge {
  from: string;
  to: string;
  check?: boolean;
}

export interface PullOptions {
  radius: number;
  maxShift: number;
  reduced?: boolean;
}

export const GRAPH_VIEWBOX = '0 0 320 240';
export const GRAPH_CENTER = { x: 160, y: 116 };

const VIEW = GRAPH_VIEWBOX.split(' ').map(Number);
const VIEW_W = VIEW[2];
const VIEW_H = VIEW[3];

// How hard a node is drawn toward the pointer. The pull peaks at radius/2, where a node moves
// PULL * radius / 4 units: about 7 units at radius 70, enough to read as a reaction.
const PULL = 0.4;

// A check edge bows outwards around the tool ring.
const CHECK_BOW = 0.45;

// The label sits 13 units under its node, or 6 units above it when there is no room below.
const LABEL_OFFSET = 13;
const LABEL_ABOVE_OFFSET = 6;

/**
 * The check mark's glyph, in view-box units. The island sets this font size itself, so the
 * clearance rule below cannot drift away from what is drawn: a tick is about 0.6 em wide, so at
 * 6 units it reaches 1.8 units to either side of its anchor.
 */
export const CHECK_MARK_FONT_SIZE = 6;
export const CHECK_MARK_HALF_WIDTH = 1.8;

export const GRAPH_NODES: GraphNode[] = [
  { id: 'orchestrator', label: 'agent', href: '/terminal', x: 160, y: 116, r: 26, kind: 'orchestrator' },
  { id: 'experience', label: 'experience', href: '#experience', x: 160, y: 32, r: 19, kind: 'tool' },
  { id: 'projects', label: 'projects', href: '#projects', x: 239.9, y: 90, r: 19, kind: 'tool' },
  { id: 'skills', label: 'skills', href: '#about', x: 209.4, y: 184, r: 19, kind: 'tool' },
  { id: 'contact', label: 'contact', href: '#contact', x: 110.6, y: 184, r: 19, kind: 'tool' },
  { id: 'resume', label: 'resume', href: '/resume.pdf', x: 80.1, y: 90, r: 19, kind: 'tool' },
  { id: 'verify', label: 'verify', href: '/terminal', x: 243, y: 200, r: 17, kind: 'verify' },
];

export const GRAPH_EDGES: GraphEdge[] = [
  { from: 'orchestrator', to: 'experience' },
  { from: 'orchestrator', to: 'projects' },
  { from: 'orchestrator', to: 'resume' },
  { from: 'orchestrator', to: 'skills' },
  { from: 'orchestrator', to: 'contact' },
  { from: 'experience', to: 'verify', check: true },
  { from: 'projects', to: 'verify', check: true },
  { from: 'resume', to: 'verify', check: true },
  { from: 'skills', to: 'verify', check: true },
  { from: 'contact', to: 'verify', check: true },
];

export const GRAPH_LINKS = ['#experience', '#projects', '/resume.pdf', '#about', '#contact', '/terminal'];

/**
 * The control point of the quadratic that carries an edge. `bow` pushes it radially away from
 * `center`, so check edges arc outwards around the tool ring; a bow of 0 draws the straight chord.
 */
export function controlPoint(from: GraphNode, to: GraphNode, center: { x: number; y: number } = GRAPH_CENTER, bow = 0): { x: number; y: number } {
  if (bow === 0) return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  return { x: from.x + (from.x - center.x) * bow, y: from.y + (from.y - center.y) * bow };
}

export function edgePath(from: GraphNode, to: GraphNode, center: { x: number; y: number } = GRAPH_CENTER, bow = 0): string {
  const c = controlPoint(from, to, center, bow);
  return `M ${from.x} ${from.y} Q ${c.x},${c.y} ${to.x},${to.y}`;
}

export function edgeMidpoint(from: GraphNode, to: GraphNode, center: { x: number; y: number } = GRAPH_CENTER, bow = 0): { x: number; y: number } {
  const c = controlPoint(from, to, center, bow);
  return { x: 0.25 * from.x + 0.5 * c.x + 0.25 * to.x, y: 0.25 * from.y + 0.5 * c.y + 0.25 * to.y };
}

export function pullNodes(nodes: GraphNode[], pointer: { x: number; y: number } | null, opts: PullOptions): GraphNode[] {
  if (!pointer || opts.reduced) return nodes.map((n) => ({ ...n }));
  return nodes.map((n) => {
    const dx = pointer.x - n.x;
    const dy = pointer.y - n.y;
    const d = Math.hypot(dx, dy);
    if (d === 0 || d > opts.radius) return { ...n };
    const k = PULL * (1 - d / opts.radius);
    let x = n.x + dx * k;
    let y = n.y + dy * k;
    const shift = Math.hypot(x - n.x, y - n.y);
    if (shift > opts.maxShift) {
      const s = opts.maxShift / shift;
      x = n.x + (x - n.x) * s;
      y = n.y + (y - n.y) * s;
    }
    // a pulled node keeps its whole disc inside the view box
    x = Math.min(Math.max(x, n.r), VIEW_W - n.r);
    y = Math.min(Math.max(y, n.r), VIEW_H - n.r);
    return { ...n, x, y };
  });
}

/**
 * Blends `a` toward `b` by id, so the two sets may be in any order. An id missing from `b` keeps
 * its position in `a`.
 */
export function lerpNodes(a: GraphNode[], b: GraphNode[], t: number): GraphNode[] {
  const lookup = new Map(b.map((n) => [n.id, n]));
  return a.map((n) => {
    const m = lookup.get(n.id);
    if (!m) return { ...n };
    return { ...n, x: n.x + (m.x - n.x) * t, y: n.y + (m.y - n.y) * t };
  });
}

/**
 * Maps a point in client space onto the view box. The graph is drawn with
 * `preserveAspectRatio="xMidYMid meet"`, which fits the view box with one uniform scale and
 * centres it, so the drawing sits inside the element's box with letterbox bars on two sides.
 * The mapping has to undo the bars as well as the scale, or the pointer lands in the wrong place.
 * A box with no area cannot hold a drawing, so it maps to nothing.
 */
export function clientToViewBox(
  client: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const scale = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
  const offsetX = (rect.width - VIEW_W * scale) / 2;
  const offsetY = (rect.height - VIEW_H * scale) / 2;
  return {
    x: (client.x - rect.left - offsetX) / scale,
    y: (client.y - rect.top - offsetY) / scale,
  };
}

/** A point on the quadratic that carries an edge, at parameter t. */
function curvePoint(
  p0: { x: number; y: number },
  c: { x: number; y: number },
  p1: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * t * u * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * t * u * c.y + t * t * p1.y,
  };
}

/** How much room a point has: the distance to the closest node, measured from that node's rim. */
function room(p: { x: number; y: number }, nodes: GraphNode[]): number {
  return nodes.reduce((min, n) => Math.min(min, Math.hypot(p.x - n.x, p.y - n.y) - n.r), Infinity);
}

/**
 * Where the check mark of an edge sits. The mark is a glyph, so it has to clear every node by
 * more than its own half width, not just touch the rim: the edge is scanned for a point with
 * room for the glyph, and the mark rides the middle of the edge wherever it can. When no point
 * on the edge has room, the plain midpoint is used.
 */
export function checkMarkPoint(
  from: GraphNode,
  to: GraphNode,
  nodes: GraphNode[],
  center: { x: number; y: number } = GRAPH_CENTER,
  bow = CHECK_BOW,
): { x: number; y: number } {
  const control = controlPoint(from, to, center, bow);
  const candidates: { x: number; y: number; t: number; room: number }[] = [];
  for (let step = 4; step <= 16; step++) {
    const t = step / 20; // 0.2 to 0.8 in steps of 0.05
    const point = curvePoint(from, control, to, t);
    candidates.push({ ...point, t, room: room(point, nodes) });
  }
  const clear = candidates.filter((c) => c.room > CHECK_MARK_HALF_WIDTH);
  const pool = clear.length ? clear : candidates;
  const chosen = pool.reduce((a, b) => {
    const da = Math.abs(a.t - 0.5);
    const db = Math.abs(b.t - 0.5);
    if (da !== db) return da < db ? a : b;
    return b.room > a.room ? b : a;
  });
  return { x: chosen.x, y: chosen.y };
}

/**
 * Where a node's label sits. The label goes under the node, and flips above it when the slot
 * would fall outside the view box. The pointer pull is small enough that the flip is a safety
 * net rather than the rule that keeps the labels inside.
 */
export function labelY(node: GraphNode): number {
  const below = node.y + node.r + LABEL_OFFSET;
  return below <= VIEW_H ? below : node.y - node.r - LABEL_ABOVE_OFFSET;
}

export interface GraphEdgeShape {
  key: string;
  d: string;
  check?: { x: number; y: number };
}

/**
 * The drawn shape of every edge, taken from the positions the nodes have right now. The pointer
 * pull moves the nodes and the edges stretch with them, so an edge that was drawn from the base
 * layout would tear away from the node it belongs to.
 */
export function edgeShapes(nodes: GraphNode[], edges: GraphEdge[]): GraphEdgeShape[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const shapes: GraphEdgeShape[] = [];
  for (const edge of edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const bow = edge.check ? CHECK_BOW : 0;
    shapes.push({
      key: `${edge.from}-${edge.to}`,
      d: edgePath(from, to, GRAPH_CENTER, bow),
      check: edge.check ? checkMarkPoint(from, to, nodes) : undefined,
    });
  }
  return shapes;
}
