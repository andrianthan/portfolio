import { describe, it, expect } from 'vitest';
import { KB, KB_LABEL } from './kb';
import { buildIndex, answer } from '../../guide/retrieve';

const index = buildIndex(KB);
const ask = (q: string) => answer(index, q, 'hybrid', KB_LABEL, 'passage');

describe('sample standards knowledge base', () => {
  it('has a modest set of uniquely numbered passages', () => {
    expect(KB.length).toBeGreaterThanOrEqual(10);
    expect(KB.length).toBeLessThanOrEqual(14);
    expect(new Set(KB.map((c) => c.id)).size).toBe(KB.length);
  });
  it('names no payer or person', () => {
    const text = KB.map((c) => `${c.title} ${c.text}`).join(' ').toLowerCase();
    expect(text).not.toMatch(/carelon|hanna/);
  });
  it('answers an ICD-10 question from the code passage', () => {
    const a = ask('do I need an ICD-10 code');
    expect(a.refused).toBe(false);
    expect(KB.find((c) => c.id === a.citations[0])!.title).toMatch(/ICD/i);
  });
  it('answers an impairment question from the impairment passage', () => {
    const a = ask('what counts as functional impairment');
    expect(KB.find((c) => c.id === a.citations[0])!.title).toMatch(/impairment/i);
  });
  it('answers a risk question from the risk passage', () => {
    const a = ask('client mentioned suicidal thoughts, what do I document');
    expect(KB.find((c) => c.id === a.citations[0])!.title).toMatch(/risk/i);
  });
  it('uses the corpus noun in its answers', () => {
    expect(ask('do I need an ICD-10 code').text).toMatch(/^Passage 9,/);
  });
  it('refuses an unrelated question and names the corpus', () => {
    const a = ask('what is the weather in paris');
    expect(a.refused).toBe(true);
    expect(a.citations).toEqual([]);
    expect(a.text).toContain(KB_LABEL);
  });
});
