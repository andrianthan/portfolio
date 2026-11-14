import type { Wafer } from '../fixtures';

export const DEFAULT_QUEUE = 4;

export function rank(ws: readonly Wafer[]): Wafer[] {
  return [...ws].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function queue(ws: readonly Wafer[], size: number): Wafer[] {
  const n = Math.max(0, Math.min(ws.length, Math.floor(size)));
  return rank(ws).slice(0, n);
}

export function topFactors(w: Wafer, n = 3): { label: string; weight: number }[] {
  return [...w.factors].sort((a, b) => b.weight - a.weight).slice(0, n);
}

export function queueLabel(size: number, total: number): string {
  return `${size} of ${total} wafers in the review queue`;
}
