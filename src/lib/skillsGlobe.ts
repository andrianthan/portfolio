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
