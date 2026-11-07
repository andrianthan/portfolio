import type { Img } from './catalog';
import { cosine, imageVec, textVec, DISCRETE } from './embed';

export interface Scored { id: string; score: number }
export interface TextSearch { hits: Scored[]; trace: string[]; matched: string[]; ignored: string[] }
export const DUP_THRESHOLD = 0.995;

export function searchText(catalog: Img[], query: string, k = 6): TextSearch {
  const { vec, matched, ignored } = textVec(query);
  const trace: string[] = [];
  if (matched.length === 0) {
    trace.push('no known words in the query, so there is nothing to compare');
    if (ignored.length) trace.push(`ignored: ${ignored.join(', ')}`);
    return { hits: [], trace, matched, ignored };
  }
  trace.push(`mapped the query to: ${matched.join(', ')}`);
  if (ignored.length) trace.push(`ignored words with no match: ${ignored.join(', ')}`);
  const q = vec.slice(0, DISCRETE);
  const hits = catalog
    .map((img) => ({ id: img.id, score: cosine(imageVec(img).slice(0, DISCRETE), q) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1))
    .slice(0, k);
  trace.push(`compared against ${catalog.length} images by cosine similarity, kept the top ${hits.length}`);
  return { hits, trace, matched, ignored };
}

export function neighbors(catalog: Img[], id: string, k = 4): Scored[] {
  const me = catalog.find((c) => c.id === id);
  if (!me) return [];
  const v = imageVec(me);
  return catalog
    .filter((c) => c.id !== id)
    .map((c) => ({ id: c.id, score: cosine(v, imageVec(c)) }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1))
    .slice(0, k);
}

export function findDuplicates(catalog: Img[], threshold = DUP_THRESHOLD): string[][] {
  const vecs = catalog.map(imageVec);
  const parent = catalog.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < catalog.length; i++) {
    for (let j = i + 1; j < catalog.length; j++) {
      if (cosine(vecs[i], vecs[j]) >= threshold) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, string[]>();
  catalog.forEach((c, i) => { const r = find(i); groups.set(r, [...(groups.get(r) ?? []), c.id]); });
  return [...groups.values()].filter((g) => g.length > 1);
}
