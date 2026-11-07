import type { Shape } from '../qa/scenes';

// Fictional sample catalog. Each entry is a drawn scene plus the attributes the demo's
// stand-in "embedding" reads. Not real images or real labels.
export interface Img {
  id: string; shape: Shape; time: 'day' | 'night'; worn: number; // 0 clear .. 1 badly worn
  x: number; scale: number;                                       // layout jitter
}

const SHAPES: Shape[] = ['stop', 'cone', 'lane', 'crosswalk', 'limit', 'pothole', 'light', 'rail'];

// Small deterministic PRNG so the catalog never changes between builds.
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = rng(1207);
const base: Img[] = [];
for (const shape of SHAPES) {
  const variants: Pick<Img, 'time' | 'worn'>[] = [
    { time: 'day', worn: 0 }, { time: 'night', worn: 0 }, { time: 'day', worn: 0.7 },
  ];
  for (const v of variants) {
    base.push({ id: '', shape, ...v, x: 0.3 + r() * 0.4, scale: 0.8 + r() * 0.4 });
  }
}

// Three planted near-duplicates: same scene, tiny shift in position and size.
const dupOf = (src: Img, dx: number, ds: number): Img => ({ ...src, id: '', x: src.x + dx, scale: src.scale + ds });
const stopDay = base.find((i) => i.shape === 'stop' && i.time === 'day' && i.worn === 0)!;
const laneDay = base.find((i) => i.shape === 'lane' && i.time === 'day' && i.worn === 0)!;
const coneNight = base.find((i) => i.shape === 'cone' && i.time === 'night')!;

export const CATALOG: Img[] = [...base, dupOf(stopDay, 0.01, 0.01), dupOf(laneDay, -0.012, 0.008), dupOf(coneNight, 0.008, -0.01)]
  .map((img, i) => ({ ...img, id: `img-${String(i + 1).padStart(2, '0')}` }));
