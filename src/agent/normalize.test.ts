import { describe, it, expect } from 'vitest';
import { MAX_QUERY_LENGTH, normalize } from './normalize';

describe('normalize', () => {
  it('trims and collapses whitespace', () => {
    const n = normalize('  what   did   you do  ');
    expect(n.raw).toBe('what did you do');
    expect(n.text).toBe('what did you do');
  });

  it('lowercases for matching', () => {
    expect(normalize('Tesla').text).toBe('tesla');
  });

  it('strips punctuation', () => {
    expect(normalize('What did you do at Tesla, please?').text).toBe('what did you do at tesla please');
  });

  it('keeps hyphens, currency, percent and plus so numbers survive', () => {
    expect(normalize('ai-swing-trader $30k+ 32%').text).toBe('ai-swing-trader $30k+ 32%');
  });

  it('flags a query longer than the cap', () => {
    expect(normalize('a'.repeat(MAX_QUERY_LENGTH)).tooLong).toBe(false);
    expect(normalize('a'.repeat(MAX_QUERY_LENGTH + 1)).tooLong).toBe(true);
  });

  it('handles an empty query without throwing', () => {
    const n = normalize('   ');
    expect(n.raw).toBe('');
    expect(n.text).toBe('');
    expect(n.tooLong).toBe(false);
  });

  it('handles a query of only punctuation', () => {
    expect(normalize('!!! ???').text).toBe('');
  });
});
