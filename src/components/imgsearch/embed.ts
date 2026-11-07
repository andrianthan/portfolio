import { tokenize } from '../../agent/tools';
import type { Img } from './catalog';

// Stand-in for a joint image/text embedding (CLIP-style). Images and text are mapped into
// ONE hand-built attribute space, so a text query can be compared with an image directly.
export const DIM_NAMES = [
  'stop', 'cone', 'lane', 'crosswalk', 'limit', 'pothole', 'light', 'rail',
  'day', 'night', 'clear', 'worn',
  'x', 'scale', 'wear-amount',
];
export const DISCRETE = 12; // first 12 dims are meaningful for text; the rest are layout detail
const IDX = Object.fromEntries(DIM_NAMES.map((n, i) => [n, i])) as Record<string, number>;
const CONT_WEIGHT = 0.18;
const OBJECTS = 8;
const OBJECT_WEIGHT = 1.8; // what is in the scene matters more than lighting or wear

export const VOCAB: Record<string, string[]> = {
  stop: ['stop', 'octagon'],
  cone: ['cone', 'cones', 'pylon', 'construction'],
  lane: ['lane', 'lanes', 'marking', 'markings', 'dashed', 'line'],
  crosswalk: ['crosswalk', 'zebra', 'crossing'],
  limit: ['speed', 'limit', 'sign'],
  pothole: ['pothole', 'potholes', 'hole', 'crater'],
  light: ['streetlight', 'lamp', 'lamppost'],
  rail: ['rail', 'guardrail', 'fence', 'barrier'],
  day: ['day', 'daytime', 'sunny', 'bright'],
  night: ['night', 'nighttime', 'dark', 'dusk', 'evening'],
  clear: ['clear', 'new', 'fresh', 'crisp', 'sharp'],
  worn: ['faded', 'worn', 'old', 'scratched', 'weathered', 'washed'],
};
const WORD_TO_DIM = new Map<string, string>();
for (const [dim, words] of Object.entries(VOCAB)) for (const w of words) WORD_TO_DIM.set(w, dim);

export function imageVec(img: Img): number[] {
  const v = new Array(DIM_NAMES.length).fill(0);
  v[IDX[img.shape]] = OBJECT_WEIGHT;
  v[IDX[img.time]] = 1;
  v[IDX[img.worn > 0 ? 'worn' : 'clear']] = 1;
  v[IDX.x] = img.x * CONT_WEIGHT;
  v[IDX.scale] = img.scale * CONT_WEIGHT;
  v[IDX['wear-amount']] = img.worn * CONT_WEIGHT;
  return v;
}

export function textVec(query: string): { vec: number[]; matched: string[]; ignored: string[] } {
  const vec = new Array(DIM_NAMES.length).fill(0);
  const matched: string[] = [];
  const ignored: string[] = [];
  for (const tok of [...new Set(tokenize(query))]) {
    const dim = WORD_TO_DIM.get(tok);
    if (dim) { vec[IDX[dim]] += IDX[dim] < OBJECTS ? OBJECT_WEIGHT : 1; if (!matched.includes(dim)) matched.push(dim); }
    else ignored.push(tok);
  }
  return { vec, matched, ignored };
}

export function cosine(a: number[], b: number[]): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na === 0 || nb === 0 ? 0 : d / Math.sqrt(na * nb);
}
