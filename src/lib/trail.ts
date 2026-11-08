/* Pure maths for the cursor aura: no DOM, so the tests can run without one. */

export type Pt = { x: number; y: number; t: number };
export type Dust = { x: number; y: number; vx: number; vy: number; t: number; life: number; size: number };

/** Append a point and keep only the newest `max`. Returns a new array. */
export function addPoint(pts: readonly Pt[], p: Pt, max = 40): Pt[] {
  const next = [...pts, p];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Points younger than `life` ms. */
export function alive(pts: readonly Pt[], now: number, life = 600): Pt[] {
  return pts.filter((p) => now - p.t < life);
}

/** 1 when new, 0 when `life` ms old, clamped. */
export function fade(t: number, now: number, life: number): number {
  if (life <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - (now - t) / life));
}

/** A speck that drifts off the cursor. `rand` is injected so tests are deterministic. */
export function spawnDust(x: number, y: number, now: number, rand: () => number): Dust {
  const angle = rand() * Math.PI * 2;
  const speed = 0.01 + rand() * 0.03; // px per ms, max 0.04
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    t: now,
    life: 700 + rand() * 400,
    size: 1 + rand() * 1.2,
  };
}

/** Where a speck is at `now`, and how visible it is. */
export function stepDust(d: Dust, now: number): { x: number; y: number; a: number } {
  const age = Math.max(0, now - d.t);
  return { x: d.x + d.vx * age, y: d.y + d.vy * age, a: fade(d.t, now, d.life) };
}

/** Ease the glow scale toward 1.6 over interactive elements and 1 elsewhere. Never overshoots. */
export function growFor(overInteractive: boolean, current: number, dt: number): number {
  const target = overInteractive ? 1.6 : 1;
  const k = 1 - Math.exp(-Math.max(0, dt) / 90);
  return current + (target - current) * k;
}
