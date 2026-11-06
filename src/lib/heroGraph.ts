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

export const GRAPH_NODES: GraphNode[] = [
  { id: 'orchestrator', label: 'agent', href: '/terminal', x: 160, y: 116, r: 26, kind: 'orchestrator' },
  { id: 'experience', label: 'experience', href: '#experience', x: 160, y: 32, r: 19, kind: 'tool' },
  { id: 'projects', label: 'projects', href: '#projects', x: 239.9, y: 90, r: 19, kind: 'tool' },
  { id: 'skills', label: 'skills', href: '#about', x: 209.4, y: 184, r: 19, kind: 'tool' },
  { id: 'contact', label: 'contact', href: '#contact', x: 110.6, y: 184, r: 19, kind: 'tool' },
  { id: 'resume', label: 'resume', href: '/resume.pdf', x: 80.1, y: 90, r: 19, kind: 'tool' },
  { id: 'verify', label: 'verify', href: '/terminal', x: 160, y: 218, r: 17, kind: 'verify' },
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

export function edgePath(from: GraphNode, to: GraphNode, center: { x: number; y: number } = GRAPH_CENTER, bow = 0): string {
  const cx = bow === 0 ? (from.x + to.x) / 2 : from.x + (from.x - center.x) * bow;
  const cy = bow === 0 ? (from.y + to.y) / 2 : from.y + (from.y - center.y) * bow;
  return `M ${from.x} ${from.y} Q ${cx},${cy} ${to.x},${to.y}`;
}

export function edgeMidpoint(from: GraphNode, to: GraphNode, center: { x: number; y: number } = GRAPH_CENTER, bow = 0): { x: number; y: number } {
  const path = edgePath(from, to, center, bow);
  const [control, end] = path.split(' Q ')[1].split(' ');
  const [cx, cy] = control.split(',').map(Number);
  const [ex, ey] = end.split(',').map(Number);
  return { x: 0.25 * from.x + 0.5 * cx + 0.25 * ex, y: 0.25 * from.y + 0.5 * cy + 0.25 * ey };
}

export function pullNodes(nodes: GraphNode[], pointer: { x: number; y: number } | null, opts: PullOptions): GraphNode[] {
  if (!pointer || opts.reduced) return nodes.map((n) => ({ ...n }));
  return nodes.map((n) => {
    const dx = pointer.x - n.x;
    const dy = pointer.y - n.y;
    const d = Math.hypot(dx, dy);
    if (d === 0 || d > opts.radius) return { ...n };
    const k = 0.18 * (1 - d / opts.radius);
    let x = n.x + dx * k;
    let y = n.y + dy * k;
    const shift = Math.hypot(x - n.x, y - n.y);
    if (shift > opts.maxShift) {
      const s = opts.maxShift / shift;
      x = n.x + (x - n.x) * s;
      y = n.y + (y - n.y) * s;
    }
    return { ...n, x, y };
  });
}

export function lerpNodes(a: GraphNode[], b: GraphNode[], t: number): GraphNode[] {
  return a.map((n, i) => {
    const m = b[i];
    if (!m) return { ...n };
    return { ...n, x: n.x + (m.x - n.x) * t, y: n.y + (m.y - n.y) * t };
  });
}
