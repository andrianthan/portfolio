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
