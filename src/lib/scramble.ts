const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789#%&*+=?';
const KEEP = /[\s,.'’]/;

/** One frame of the greeting scramble: the first `progress` share of the text has settled. */
export function scrambleFrame(target: string, progress: number, rand: () => number): string {
  const p = Math.max(0, Math.min(1, progress));
  const settledCount = Math.floor(target.length * p);
  return Array.from(target)
    .map((ch, i) => {
      if (i < settledCount || KEEP.test(ch)) return ch;
      let g = GLYPHS[Math.floor(rand() * GLYPHS.length)];
      if (g === ch.toLowerCase()) g = g === '#' ? '%' : '#';
      return g;
    })
    .join('');
}
