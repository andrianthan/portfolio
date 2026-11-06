import type { Chunk, Snapshot } from './types';

export interface Ranked {
  chunk: Chunk;
  score: number;
}

export const BM25_K1 = 1.2;
export const BM25_B = 0.75;
export const MIN_SEARCH_SCORE = 1;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'at', 'by', 'with', 'from', 'as',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'have', 'has', 'had',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must', 'i', 'me', 'my',
  'we', 'us', 'our', 'you', 'your', 'yours', 'it', 'its', 'that', 'this', 'these', 'those',
  'there', 'then', 'than', 'also', 'some', 'any', 'all', 'more', 'most', 'much', 'many', 'tell',
  'show', 'know', 'about', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'not',
  'no', 'so', 'if', 'but', 'get', 'got', 'give', 'use', 'used', 'using', 'make', 'made', 'just',
  'very', 'really', 'please', 'hi', 'hello', 'hey', 'up', 'out', 'over', 'into',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

export function bm25(chunks: Chunk[], query: string): Ranked[] {
  if (chunks.length === 0) return [];
  const docs = chunks.map((chunk) => tokenize(`${chunk.title} ${chunk.text}`));
  const total = docs.length;
  const averageLength = docs.reduce((sum, doc) => sum + doc.length, 0) / total;
  const frequencies = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(doc)) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  }
  const queryTerms = [...new Set(tokenize(query))];
  const scored: Ranked[] = chunks.map((chunk, index) => {
    const doc = docs[index];
    let score = 0;
    for (const term of queryTerms) {
      const count = doc.filter((token) => token === term).length;
      if (!count) continue;
      const documentFrequency = frequencies.get(term) ?? 0;
      const idf = Math.log(1 + (total - documentFrequency + 0.5) / (documentFrequency + 0.5));
      const denominator = count + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / averageLength));
      score += idf * ((count * (BM25_K1 + 1)) / denominator);
    }
    return { chunk, score };
  });
  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (a.chunk.id < b.chunk.id ? -1 : a.chunk.id > b.chunk.id ? 1 : 0));
}

function pick(chunks: Chunk[], args: string[]): Ranked[] {
  if (!args.length) return chunks.map((chunk) => ({ chunk, score: 1 }));
  const needle = args.join(' ').toLowerCase();
  const matched = chunks.filter((chunk) => `${chunk.title} ${chunk.text}`.toLowerCase().includes(needle));
  const use = matched.length ? matched : chunks;
  return use.map((chunk) => ({ chunk, score: 1 }));
}

const ofKind = (snapshot: Snapshot, kind: Chunk['kind']) => snapshot.chunks.filter((chunk) => chunk.kind === kind);

export function experience(snapshot: Snapshot, args: string[]): Ranked[] {
  return pick(ofKind(snapshot, 'role'), args);
}

export function projects(snapshot: Snapshot, args: string[]): Ranked[] {
  return pick(ofKind(snapshot, 'project'), args);
}

export function resume(snapshot: Snapshot, args: string[]): Ranked[] {
  return pick(snapshot.chunks.filter((chunk) => chunk.kind === 'role' || chunk.kind === 'project'), args);
}

export function skills(snapshot: Snapshot, args: string[]): Ranked[] {
  return pick(ofKind(snapshot, 'skill'), args);
}

export function contact(snapshot: Snapshot, args: string[]): Ranked[] {
  return pick(ofKind(snapshot, 'contact'), args);
}

export function about(snapshot: Snapshot, args: string[]): Ranked[] {
  return pick(ofKind(snapshot, 'about'), args);
}

export function search(snapshot: Snapshot, query: string): Ranked[] {
  return bm25(snapshot.chunks, query)
    .filter((entry) => entry.score >= MIN_SEARCH_SCORE)
    .slice(0, 3);
}
