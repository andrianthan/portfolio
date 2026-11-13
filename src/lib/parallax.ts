export interface Pointer { x: number; y: number }

export const MAX_SHIFT_PX = 14;

const clamp1 = (n: number) => Math.max(-1, Math.min(1, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export function normalizePointer(clientX: number, clientY: number, width: number, height: number): Pointer {
  if (!width || !height) return { x: 0, y: 0 };
  return { x: clamp1((clientX / width) * 2 - 1), y: clamp1((clientY / height) * 2 - 1) };
}

export function ease(current: Pointer, target: Pointer, k = 0.08): Pointer {
  return { x: current.x + (target.x - current.x) * k, y: current.y + (target.y - current.y) * k };
}

export function settled(a: Pointer, b: Pointer, eps = 0.001): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}

export function shiftPx(p: Pointer): { x: number; y: number } {
  return { x: round2(p.x * MAX_SHIFT_PX), y: round2(p.y * MAX_SHIFT_PX) };
}
