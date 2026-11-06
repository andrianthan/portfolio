import { describe, it, expect } from 'vitest';
import fixture from './fixtures/snapshot.json';
import { about, bm25, contact, experience, MIN_SEARCH_SCORE, projects, resume, search, skills, tokenize } from './tools';
import type { Snapshot } from './types';

const snapshot = fixture as unknown as Snapshot;
const ids = (ranked: { chunk: { id: string } }[]) => ranked.map((r) => r.chunk.id);

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
    const ranked = bm25(snapshot.chunks, 'python');
    const tied = ranked.filter((r) => r.score === ranked[0].score).map((r) => r.chunk.id);
    expect([...tied].sort()).toEqual(tied);
  });
});

describe('tools', () => {
  it('returns only role chunks for experience', () => {
    expect(ids(experience(snapshot, [])).every((id) => id.startsWith('role:'))).toBe(true);
  });

  it('returns only project chunks for projects', () => {
    expect(ids(projects(snapshot, [])).every((id) => id.startsWith('project:'))).toBe(true);
  });

  it('returns roles and projects for resume', () => {
    const out = ids(resume(snapshot, []));
    expect(out.some((id) => id.startsWith('role:'))).toBe(true);
    expect(out.some((id) => id.startsWith('project:'))).toBe(true);
  });

  it('returns skill chunks for skills', () => {
    expect(ids(skills(snapshot, [])).every((id) => id.startsWith('skill:'))).toBe(true);
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

  it('drops search results below the minimum score', () => {
    const ranked = search(snapshot, 'zzzz qqqq');
    expect(ranked).toEqual([]);
    expect(search(snapshot, 'tesla baseline').every((r) => r.score >= MIN_SEARCH_SCORE)).toBe(true);
  });

  it('never returns an uncleared body', () => {
    for (const ranked of search(snapshot, 'problem architecture')) {
      expect(ranked.chunk.id.includes('#')).toBe(false);
    }
  });
});
