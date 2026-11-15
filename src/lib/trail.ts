export interface TrailPoint { x: number; y: number; t: number }

export const TRAIL_MAX_AGE_MS = 450;
export const TRAIL_MAX_POINTS = 24;
export const TRAIL_HEAD_WIDTH = 3;
export const TRAIL_HEAD_ALPHA = 0.9;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function pushPoint(points: TrailPoint[], p: TrailPoint, maxAgeMs: number, maxPoints: number): TrailPoint[] {
  const fresh = points.filter((q) => p.t - q.t <= maxAgeMs);
  fresh.push(p);
  return fresh.length > maxPoints ? fresh.slice(fresh.length - maxPoints) : fresh;
}

/** index 0 = head (newest). Width tapers to 0 at the tail; alpha fades with age. */
export function segmentStyle(index: number, count: number, ageMs: number, maxAgeMs: number): { width: number; alpha: number } {
  const along = count > 1 ? clamp01(index / (count - 1)) : 0;
  const width = Math.max(0, TRAIL_HEAD_WIDTH * (1 - along));
  const alpha = Math.max(0, TRAIL_HEAD_ALPHA * (1 - clamp01(ageMs / maxAgeMs)));
  return { width, alpha };
}

type Stop = [number, number, number, number];
const WHITE: Stop = [255, 255, 255, 1];
const VIOLET: Stop = [167, 139, 250, 0.7];
const PINK: Stop = [244, 114, 182, 0.25];

const mix = (a: Stop, b: Stop, k: number): Stop => [0, 1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * k) as Stop;

/** progress 0 = head (white), 1 = tail (faint pink), violet between. */
export function trailColor(progress: number): string {
  const p = clamp01(progress);
  const [r, g, b, a] = p < 0.5 ? mix(WHITE, VIOLET, p * 2) : mix(VIOLET, PINK, (p - 0.5) * 2);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(a * 100) / 100})`;
}

export function isAlive(points: TrailPoint[], now: number, maxAgeMs: number): boolean {
  return points.some((q) => now - q.t <= maxAgeMs);
}
