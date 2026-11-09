import { describe, it, expect } from 'vitest';
import fixture from './fixtures/snapshot.json';
import { about, bm25, contact, experience, MIN_SEARCH_SCORE, search, skills, tokenize } from './tools';
import type { Chunk, Snapshot } from './types';

const snapshot = fixture as unknown as Snapshot;
const ids = (ranked: { chunk: { id: string } }[]) => ranked.map((r) => r.chunk.id);

const marker = '[' + 'to confirm';

function chunk(overrides: Partial<Chunk> & Pick<Chunk, 'id'>): Chunk {
  return {
    kind: 'project',
    title: 'Example',
    text: 'Built a thing.',
    url: '/#projects',
    facts: [],
    ...overrides,
  };
}

// A chunk is publishable when its text carries no to-confirm marker and its
// url points at a public page: the home anchor ("/#about") or a detail page
// ("/work/acme"). A url that points into a fragment of a detail page
// ("/work/acme#problem") would point at an unpublished body section.
function isPublishable(candidate: Chunk): boolean {
  if (candidate.text.toLowerCase().includes(marker)) return false;
  const [path, ...fragments] = candidate.url.split('#');
  if (fragments.length > 1) return false;
  if (fragments.length === 0) return true;
  if (fragments[0] === '' || fragments[0].includes('/')) return false;
  return path === '' || path === '/';
}

describe('tokenizer', () => {
  it('lowercases and splits on punctuation', () => {
    expect(tokenize('Ask SDP, an LLM copilot!')).toEqual(['ask', 'sdp', 'llm', 'copilot']);
  });

  it('drops single characters and stop words', () => {
    expect(tokenize('a the of python')).toEqual(['python']);
  });
});

describe('bm25', () => {
  it('ranks the matching chunk first', () => {
    const ranked = bm25(snapshot.chunks, 'tesla forecast baseline');
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].chunk.id).toBe('role:tesla');
  });

  it('scores nothing for a query with no matching term', () => {
    expect(bm25(snapshot.chunks, 'zzzz qqqq')).toEqual([]);
  });

  it('breaks ties by id ascending', () => {
    // Two documents with identical token content score identically, so only the
    // id tie-break can order them. They are handed over in reverse id order
    // to prove the comparator decides, not the input order.
    const twin = (id: string): Chunk => chunk({ id, title: 'Twin', text: 'Built a thing with python.' });
    const ranked = bm25([twin('project:zulu'), twin('project:alpha')], 'python');
    expect(ranked).toHaveLength(2);
    expect(ranked[0].score).toBe(ranked[1].score);
    expect(ids(ranked)).toEqual(['project:alpha', 'project:zulu']);
    const reversed = bm25([twin('project:alpha'), twin('project:zulu')], 'python');
    expect(ids(reversed)).toEqual(['project:alpha', 'project:zulu']);
  });
});

describe('tools', () => {
  it('returns only role chunks for experience', () => {
    const out = ids(experience(snapshot, []));
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((id) => id.startsWith('role:'))).toBe(true);
  });

  it('returns skill chunks for skills', () => {
    const out = ids(skills(snapshot, []));
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((id) => id.startsWith('skill:'))).toBe(true);
  });

  it('returns the contact chunk for contact', () => {
    expect(ids(contact(snapshot, []))).toContain('contact:links');
  });

  it('returns the about chunk for about', () => {
    expect(ids(about(snapshot, []))).toContain('about:bio');
  });

  it('filters by an argument when it matches', () => {
    const out = ids(experience(snapshot, ['Tesla']));
    expect(out).toContain('role:tesla');
    expect(out).not.toContain('role:hanna');
  });

  it('falls back to everything when the argument matches nothing', () => {
    expect(ids(experience(snapshot, ['zzz']))).toEqual(ids(experience(snapshot, [])));
  });

  it('returns nothing when the query matches no term', () => {
    expect(search(snapshot, 'zzzz qqqq')).toEqual([]);
    expect(search(snapshot, '')).toEqual([]);
    expect(search(snapshot, 'the')).toEqual([]);
  });

  it('drops a positive match that scores below the minimum', () => {
    // A long document matches the query but scores below the threshold; a
    // short one matches twice and clears it. bm25 keeps both, search keeps
    // only the one above the minimum.
    const strong = chunk({ id: 'project:strong', title: 'Strong', text: 'python baseline work' });
    const weak = chunk({ id: 'project:weak', title: 'Weak', text: `python ${'filler '.repeat(80)}` });
    const other = chunk({ id: 'project:other', title: 'Other', text: 'something unrelated entirely' });
    const local: Snapshot = { version: 1, chunks: [strong, weak, other] };

    const ranked = bm25(local.chunks, 'python baseline');
    const weakScore = ranked.find((entry) => entry.chunk.id === 'project:weak')?.score ?? 0;
    const strongScore = ranked.find((entry) => entry.chunk.id === 'project:strong')?.score ?? 0;
    expect(weakScore).toBeGreaterThan(0);
    expect(weakScore).toBeLessThan(MIN_SEARCH_SCORE);
    expect(strongScore).toBeGreaterThanOrEqual(MIN_SEARCH_SCORE);
    expect(ids(ranked)).toContain('project:weak');
    expect(ids(search(local, 'python baseline'))).toEqual(['project:strong']);
  });

  it('never returns an uncleared body', () => {
    const returned = [
      ...experience(snapshot, []),
      ...skills(snapshot, []),
      ...contact(snapshot, []),
      ...about(snapshot, []),
      ...search(snapshot, 'tesla baseline'),
      ...search(snapshot, 'duckdb'),
    ].map((entry) => entry.chunk);
    expect(returned.length).toBeGreaterThan(0);
    for (const candidate of returned) {
      expect(isPublishable(candidate), candidate.id).toBe(true);
    }
  });

  it('never returns a chunk that still carries the marker', () => {
    expect(snapshot.chunks.length).toBeGreaterThan(0);
    for (const candidate of snapshot.chunks) {
      expect(candidate.text.toLowerCase()).not.toContain(marker);
    }
  });

  it('flags a chunk that still carries the marker', () => {
    const dirty = chunk({ id: 'role:acme#problem', kind: 'role', title: 'Acme', text: `The problem ${marker} later.`, url: '/work/acme' });
    expect(isPublishable(dirty)).toBe(false);
  });

  it('flags a chunk that points into a body fragment', () => {
    const fragment = chunk({ id: 'role:acme#problem', kind: 'role', title: 'Acme', text: 'Shipped a thing.', url: '/work/acme#problem' });
    expect(isPublishable(fragment)).toBe(false);
  });

  it('would fail if a marker-bearing chunk reached the tools', () => {
    // The tools pass chunks through untouched, so the guarantee rests on the
    // snapshot carrying no uncleared body. If one ever did, the check above
    // would report it instead of passing silently.
    const dirty = chunk({ id: 'role:acme#problem', kind: 'role', title: 'Acme', text: `The problem ${marker} later.`, url: '/work/acme' });
    const local: Snapshot = { version: 1, chunks: [dirty] };
    const returned = experience(local, []).map((entry) => entry.chunk);
    expect(returned).toHaveLength(1);
    expect(returned.filter((candidate) => isPublishable(candidate))).toHaveLength(0);
  });
});
