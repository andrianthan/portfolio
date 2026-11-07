import { describe, it, expect } from 'vitest';
import { CLAUSES } from './rulebook';
import { buildIndex, search, answer, REFUSE_BELOW } from './retrieve';

const index = buildIndex(CLAUSES);
const top = (q: string, mode: 'keyword' | 'vector' | 'hybrid' = 'hybrid') => search(index, q, mode).hits[0]?.clause.id;

describe('guide retrieval', () => {
  it('keyword search finds an exact-term clause', () => {
    expect(top('faded lane marking', 'keyword')).toBe('5');
  });

  it('hybrid finds partial occlusion as the top hit when the question is about hiding', () => {
    expect(top('partially hidden sign')).toBe('3');
  });

  it('a mixed question surfaces both clauses it touches (signs and occlusion)', () => {
    const ids = search(index, 'does a partially hidden stop sign still count?', 'hybrid').hits.slice(0, 2).map((h) => h.clause.id).sort();
    expect(ids).toEqual(['3', '6']);
  });

  it('hybrid finds the heavy-occlusion clause', () => {
    expect(top('more than half of the cone is blocked')).toBe('4');
  });

  it('vector search bridges wording the clause also uses (blocked ~ occluded)', () => {
    const ids = search(index, 'blocked by a truck', 'vector').hits.slice(0, 3).map((h) => h.clause.id);
    expect(ids).toContain('3');
  });

  it('every hit carries a score and ranks are descending', () => {
    const { hits } = search(index, 'sign damaged', 'hybrid');
    expect(hits.length).toBeGreaterThan(0);
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
  });

  it('refuses an unrelated question', () => {
    const r = search(index, 'what is the weather in paris', 'hybrid');
    expect(r.refused).toBe(true);
  });

  it('refuses gibberish and empty input', () => {
    expect(search(index, 'zzqx plorb', 'hybrid').refused).toBe(true);
    expect(search(index, '   ', 'hybrid').refused).toBe(true);
  });

  it('trace lists only steps that ran', () => {
    const r = search(index, 'faded lane marking', 'keyword');
    expect(r.trace.some((t) => /keyword/i.test(t))).toBe(true);
    expect(r.trace.some((t) => /vector|fused/i.test(t))).toBe(false);
    const h = search(index, 'faded lane marking', 'hybrid');
    expect(h.trace.some((t) => /fused/i.test(t))).toBe(true);
  });

  it('answer quotes a real clause and its citation exists', () => {
    const a = answer(index, 'is a bent stop sign still a stop sign?');
    expect(a.refused).toBe(false);
    expect(a.citations.length).toBeGreaterThan(0);
    for (const c of a.citations) expect(CLAUSES.some((x) => x.id === c)).toBe(true);
    expect(a.text).toContain('stop sign');
  });

  it('refusal answer cites nothing and offers a guideline-update flag', () => {
    const a = answer(index, 'what is the weather in paris');
    expect(a.refused).toBe(true);
    expect(a.citations).toEqual([]);
    expect(a.text).toMatch(/flag/i);
  });

  it('threshold is a sane positive number', () => {
    expect(REFUSE_BELOW).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    expect(search(index, 'faded marking', 'hybrid')).toEqual(search(index, 'faded marking', 'hybrid'));
  });

  it('exposes 2D coordinates for every clause and the query', () => {
    expect(index.map2d.length).toBe(CLAUSES.length);
    const r = search(index, 'partially hidden sign', 'hybrid');
    expect(r.query2d).toHaveLength(2);
  });
});
