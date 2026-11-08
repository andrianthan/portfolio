export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Projected {
  x: number;
  y: number;
  scale: number;
  z: number;
}

export const SKILL_COUNT = 30;

const GOLDEN_ANGLE = 2.39996322972865332;

/** Evenly distributed points on the unit sphere (golden-angle / Fibonacci layout). */
export function fibonacciSphere(count: number): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = i * GOLDEN_ANGLE;
    points.push({
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.cos(phi),
      z: Math.sin(phi) * Math.sin(theta),
    });
  }
  return points;
}

/** Rotate around the Y axis first, then the X axis. The camera looks down −z, so front = +z. */
export function rotate(p: Vec3, angleY: number, angleX: number): Vec3 {
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const x1 = p.x * cosY + p.z * sinY;
  const z1 = -p.x * sinY + p.z * cosY;
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;
  return { x: x1, y: y2, z: z2 };
}

/** Perspective-project a rotated unit-sphere point into screen space. */
export function project(p: Vec3, opts: { radius: number; fov: number; cx: number; cy: number }): Projected {
  const scale = opts.fov / (opts.fov - p.z * opts.radius);
  return {
    x: opts.cx + p.x * opts.radius * scale,
    y: opts.cy + p.y * opts.radius * scale,
    scale,
    z: p.z,
  };
}

/** Depth-based opacity for a rotated z in [−1, 1]: front (1) → 1, back (−1) → 0.22. */
export function depthOpacity(z: number): number {
  return 0.22 + (0.78 * (z + 1)) / 2;
}

/* ---- grab-and-go rotation ---- */

export const PITCH_MIN = -0.2;
export const PITCH_MAX = 0.9;
export const HOLD_EASE_MS = 250;
export const RELEASE_EASE_MS = 1000;

/** Clamp the pitch (the x-axis tilt) into the designed band. */
export function clampPitch(rx: number): number {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, rx));
}

/**
 * Map a pointer drag in pixels to yaw/pitch deltas in radians. A drag across
 * the full radius of the globe is a quarter turn of the sphere.
 */
export function dragToAngle(dxPx: number, dyPx: number, radiusPx: number): { dRy: number; dRx: number } {
  return { dRy: dxPx / radiusPx, dRx: dyPx / radiusPx };
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * Multiplier for the idle auto-spin.
 * While the globe is held (`releasedForMs === null`) the spin eases out, 1 → 0
 * over HOLD_EASE_MS. After the release it eases back in, 0 → 1 over
 * RELEASE_EASE_MS. The time held is only read while holding.
 */
export function spinEase(msHeld: number, releasedForMs: number | null): number {
  if (releasedForMs === null) {
    return 1 - smoothstep(clamp01(msHeld / HOLD_EASE_MS));
  }
  return smoothstep(clamp01(releasedForMs / RELEASE_EASE_MS));
}
