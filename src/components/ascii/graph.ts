export interface Vec3 { x: number; y: number; z: number }
export interface Graph { nodes: Vec3[]; edges: [number, number][]; hub: number }
export interface Cell { col: number; row: number; ch: string; level: number }
export interface FrameOptions { t: number; yaw: number; pitch: number; cols: number; rows: number; focus?: { col: number; row: number } | null }

export const RAMP = ' .:-=+*#%@';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** A hub with three rings of nodes (5, 8, 6), wired outward. Same seed, same graph. */
export function buildGraph(seed = 7): Graph {
  const rand = mulberry32(seed);
  const nodes: Vec3[] = [{ x: 0, y: 0, z: 0 }];
  const ring = (count: number, radius: number, spread: number): number[] => {
    const ids: number[] = [];
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = phase + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.35;
      nodes.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius * 0.8, z: (rand() - 0.5) * spread });
      ids.push(nodes.length - 1);
    }
    return ids;
  };
  const A = ring(5, 0.45, 0.4);
  const B = ring(8, 0.8, 0.8);
  const C = ring(6, 1.0, 1.2);

  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const link = (a: number, b: number) => {
    if (a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([a, b]);
  };
  const nearest = (from: number, among: number[]) =>
    among.reduce((best, id) => (dist(nodes[from], nodes[id]) < dist(nodes[from], nodes[best]) ? id : best), among[0]);

  for (const a of A) link(0, a);
  B.forEach((b, i) => { link(b, nearest(b, A)); link(b, B[(i + 1) % B.length]); });
  for (const c of C) link(c, nearest(c, B));
  return { nodes, edges, hub: 0 };
}

export function rotate(v: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x1 = v.x * cy + v.z * sy;
  const z1 = -v.x * sy + v.z * cy;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return { x: x1, y: v.y * cp - z1 * sp, z: v.y * sp + z1 * cp };
}

/** Perspective onto a character grid. Cells are taller than wide, so rows scale by a different factor. */
export function project(v: Vec3, cols: number, rows: number): { col: number; row: number; depth: number } {
  const d = 3.2;
  const s = d / (d - v.z);
  return {
    col: cols / 2 + v.x * s * cols * 0.3,
    row: rows / 2 + v.y * s * rows * 0.4,
    depth: Math.max(0, Math.min(1, (v.z + 1.2) / 2.4)),
  };
}

const charFor = (level: number) => RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.floor(level * RAMP.length)))];

interface Slot { level: number; ch?: string }

export function renderFrame(graph: Graph, o: FrameOptions): Cell[] {
  const { cols, rows } = o;
  const pts = graph.nodes.map((n) => project(rotate(n, o.yaw, o.pitch), cols, rows));
  const slots = new Map<string, Slot & { col: number; row: number }>();
  const put = (colF: number, rowF: number, level: number, ch?: string) => {
    const col = Math.round(colF), row = Math.round(rowF);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    const key = `${col},${row}`;
    const prev = slots.get(key);
    if (prev && prev.level >= level) return;
    slots.set(key, { col, row, level, ch });
  };

  graph.edges.forEach(([a, b], e) => {
    const p = pts[a], q = pts[b];
    const steps = Math.max(Math.abs(q.col - p.col), Math.abs(q.row - p.row));
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      put(p.col + (q.col - p.col) * f, p.row + (q.row - p.row) * f, 0.2 + 0.3 * (p.depth + (q.depth - p.depth) * f));
    }
    const phase = (o.t * 0.35 + e * 0.137) % 1;
    put(p.col + (q.col - p.col) * phase, p.row + (q.row - p.row) * phase, 0.95, '*');
  });
  graph.nodes.forEach((_, i) => {
    const p = pts[i];
    if (i === graph.hub) put(p.col, p.row, 1, '@');
    else put(p.col, p.row, 0.6 + 0.4 * p.depth, '#');
  });

  const cells: Cell[] = [];
  for (const s of slots.values()) {
    let level = s.level;
    if (o.focus) {
      const d = Math.hypot(s.col - o.focus.col, (s.row - o.focus.row) * 1.8);
      if (d < 7) level = Math.min(1, level + 0.3 * (1 - d / 7));
    }
    cells.push({ col: s.col, row: s.row, ch: s.ch ?? charFor(level), level });
  }
  return cells;
}

export function toText(cells: Cell[], cols: number, rows: number): string {
  const grid = Array.from({ length: rows }, () => Array<string>(cols).fill(' '));
  for (const c of cells) grid[c.row][c.col] = c.ch;
  return grid.map((r) => r.join('')).join('\n');
}
