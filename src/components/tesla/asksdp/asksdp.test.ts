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
  it('does not swallow list commas', () => {
    expect(ungrounded('up 1,375 units', ['1,375, 1,420'])).toEqual([]);
  });
  it('answers about the named part, grounded', () => {
    for (const q of ['How is consumption trending for the Front fascia clip?', 'failure rate for p-1003', 'Should we firm or hold the front fascia clip?']) {
      const a = ask(q);
      expect(a.refused).toBe(false);
      expect(a.text.toLowerCase()).toContain('front fascia clip');
      expect(a.tools.every((t) => t.result.startsWith('P-1003'))).toBe(true);
      expect(ungrounded(a.text, a.tools.map((t) => t.result))).toEqual([]);
    }
  });
  it('does not treat "in order to" as a firm or hold question', () => {
    expect(ask('what do I do in order to win').refused).toBe(true);
  });
  it('flags a number the tools never returned', () => {
    expect(ungrounded('Demand is up 42% on 7 parts', ['up 42%'])).toEqual(['7']);
    expect(ungrounded('No figures here', [])).toEqual([]);
  });
});
