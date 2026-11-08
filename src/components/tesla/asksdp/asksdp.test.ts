import { describe, it, expect } from 'vitest';
import { PRESETS, ask, ungrounded } from './asksdp';

describe('ask sdp logic', () => {
  it('offers three preset questions', () => { expect(PRESETS).toHaveLength(3); });
  it('answers every preset with tools, a verdict, and only grounded numbers', () => {
    for (const q of PRESETS) {
      const a = ask(q);
      expect(a.refused).toBe(false);
      expect(a.tools.length).toBeGreaterThan(0);
      expect(a.verdict).not.toBeNull();
      expect(ungrounded(a.text, a.tools.map((t) => t.result))).toEqual([]);
    }
  });
  it('refuses a question no tool can answer', () => {
    const a = ask('what is the meaning of life');
    expect(a.refused).toBe(true);
    expect(a.verdict).toBeNull();
    expect(a.tools).toEqual([]);
  });
  it('flags a number the tools never returned', () => {
    expect(ungrounded('Demand is up 42% on 7 parts', ['up 42%'])).toEqual(['7']);
    expect(ungrounded('No figures here', [])).toEqual([]);
  });
});
