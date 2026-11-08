const clamp = (v: number): number => Math.max(-1, Math.min(1, v));

/** The pointer as -1..1 from the viewport centre. The backdrop multiplies this by a per-layer distance. */
export function normalize(x: number, y: number, w: number, h: number): { nx: number; ny: number } {
  if (w <= 0 || h <= 0) return { nx: 0, ny: 0 };
  return { nx: clamp((x / w) * 2 - 1), ny: clamp((y / h) * 2 - 1) };
}
