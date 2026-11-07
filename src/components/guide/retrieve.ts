import { tokenize } from '../../agent/tools';
import { GUIDE_VERSION, type Clause } from './rulebook';

export type Mode = 'keyword' | 'vector' | 'hybrid';
export interface Hit { clause: Clause; score: number; keyword?: number; vector?: number }
export interface SearchResult { mode: Mode; hits: Hit[]; refused: boolean; trace: string[]; query2d: [number, number] }
export interface Index {
  clauses: Clause[];
  docs: string[][];
  idf: Map<string, number>;
  vocab: string[];
  X: number[][];            // docs x terms, L2-normalised TF-IDF
  U: number[][];            // docs x k, eigenvectors of X Xt
  sigma: number[];          // singular values
  D: number[][];            // docs x k, U * sigma
  map2d: [number, number][];
}

export const K = 5;
export const RRF_K = 60;
export const REFUSE_BELOW = 0.45;
const BM25_K1 = 1.2;
const BM25_B = 0.75;

const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const cosine = (a: number[], b: number[]) => { const d = norm(a) * norm(b); return d === 0 ? 0 : dot(a, b) / d; };

// Cyclic Jacobi eigen-decomposition for a small symmetric matrix.
function jacobi(S: number[][]): { values: number[]; vectors: number[][] } {
  const n = S.length;
  const A = S.map((r) => r.slice());
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-14) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k], aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = A.map((_, i) => i).sort((a, b) => A[b][b] - A[a][a] || a - b);
  return { values: order.map((i) => A[i][i]), vectors: V.map((row) => order.map((i) => row[i])) };
}

function tfidf(tokens: string[], vocab: string[], idf: Map<string, number>): number[] {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  const v = vocab.map((term) => (counts.get(term) ?? 0) * (idf.get(term) ?? 0));
  const n = norm(v);
  return n === 0 ? v : v.map((x) => x / n);
}

export function buildIndex(clauses: Clause[]): Index {
  const docs = clauses.map((c) => tokenize(`${c.title} ${c.text}`));
  const vocab = [...new Set(docs.flat())].sort();
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map<string, number>(vocab.map((t) => [t, Math.log(1 + docs.length / (df.get(t) ?? 1))]));
  const X = docs.map((d) => tfidf(d, vocab, idf));
  const G = X.map((a) => X.map((b) => dot(a, b)));
  const { values, vectors } = jacobi(G);
  const k = Math.min(K, docs.length - 1);
  const sigma = values.slice(0, k).map((l) => Math.sqrt(Math.max(l, 1e-12)));
  const U = vectors.map((row) => row.slice(0, k));
  const D = U.map((row) => row.map((x, j) => x * sigma[j]));
  const map2d = D.map((r) => [r[0], r[1]] as [number, number]);
  return { clauses, docs, idf, vocab, X, U, sigma, D, map2d };
}

function foldIn(index: Index, query: string): number[] {
  const xq = tfidf(tokenize(query), index.vocab, index.idf);
  const w = index.X.map((row) => dot(row, xq));            // X xq
  return index.sigma.map((s, j) => w.reduce((acc, wi, i) => acc + wi * index.U[i][j], 0) / s);
}

function bm25(index: Index, query: string): number[] {
  const terms = [...new Set(tokenize(query))];
  const N = index.docs.length;
  const avg = index.docs.reduce((s, d) => s + d.length, 0) / N;
  return index.docs.map((doc) => {
    let score = 0;
    for (const term of terms) {
      const count = doc.filter((t) => t === term).length;
      if (!count) continue;
      const dfv = index.docs.filter((d) => d.includes(term)).length;
      const idf = Math.log(1 + (N - dfv + 0.5) / (dfv + 0.5));
      score += idf * ((count * (BM25_K1 + 1)) / (count + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / avg))));
    }
    return score;
  });
}

const rank = (scores: number[]) =>
  scores.map((s, i) => ({ s, i })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i);

export function search(index: Index, query: string, mode: Mode = 'hybrid', topK = 3): SearchResult {
  const trace: string[] = [];
  const known = tokenize(query).filter((t) => index.idf.has(t));
  const q = foldIn(index, query);
  const qn = norm(q) === 0 ? q : q.map((x) => x / norm(q));
  const query2d: [number, number] = [q[0] ?? 0, q[1] ?? 0];
  trace.push(`read the question: ${known.length} of its words appear in the guide`);

  const kw = bm25(index, query);
  const kwRank = rank(kw);
  const vec = index.D.map((d) => cosine(q, d));
  const vecRank = rank(vec);

  const useKw = mode !== 'vector';
  const useVec = mode !== 'keyword';
  if (useKw) trace.push(`keyword search over ${index.clauses.length} clauses: ${kwRank.length} matched`);
  if (useVec) trace.push(`vector search (${index.sigma.length}-dim LSA): best similarity ${(vecRank[0]?.s ?? 0).toFixed(2)}`);

  const fused = new Map<number, Hit>();
  const add = (i: number, patch: Partial<Hit>, score: number) => {
    const h = fused.get(i) ?? { clause: index.clauses[i], score: 0 };
    fused.set(i, { ...h, ...patch, score: h.score + score });
  };
  if (mode === 'keyword') kwRank.forEach((r) => add(r.i, { keyword: r.s }, r.s));
  else if (mode === 'vector') vecRank.forEach((r) => add(r.i, { vector: r.s }, r.s));
  else {
    kwRank.slice(0, topK + 2).forEach((r, pos) => add(r.i, { keyword: r.s }, 1 / (RRF_K + pos + 1)));
    vecRank.slice(0, topK + 2).forEach((r, pos) => add(r.i, { vector: r.s }, 1 / (RRF_K + pos + 1)));
    trace.push('fused the two ranked lists with reciprocal rank fusion');
  }

  const hits = [...fused.values()].sort((a, b) => b.score - a.score || (a.clause.id < b.clause.id ? -1 : 1)).slice(0, topK);
  const bestVec = vecRank[0]?.s ?? 0;
  const refused =
    known.length === 0 ||
    (mode === 'keyword' ? kwRank.length === 0 : mode === 'vector' ? bestVec < REFUSE_BELOW : kwRank.length === 0 && bestVec < REFUSE_BELOW);
  trace.push(refused ? `nothing cleared the bar, so no clause is cited` : `top result: clause ${hits[0].clause.id}, ${hits[0].clause.title}`);
  void qn;
  return { mode, hits: refused ? [] : hits, refused, trace, query2d };
}

export interface Answer { text: string; citations: string[]; refused: boolean; result: SearchResult }

export function answer(index: Index, query: string, mode: Mode = 'hybrid'): Answer {
  const result = search(index, query, mode);
  if (result.refused) {
    return {
      text: `No clause in guide ${GUIDE_VERSION} covers this. I won't guess. Flag it for a guideline update?`,
      citations: [], refused: true, result,
    };
  }
  const [first, second] = result.hits;
  const also = second && second.score >= first.score * 0.6 ? ` Also see clause ${second.clause.id} (${second.clause.title}).` : '';
  const citations = [first.clause.id, ...(also ? [second.clause.id] : [])];
  return {
    text: `Clause ${first.clause.id}, ${first.clause.title}: ${first.clause.text}${also}`,
    citations, refused: false, result,
  };
}
