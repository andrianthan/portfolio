import { describe, it, expect } from 'vitest';
import { MAX_TURNS, PRESETS, answerFor, ask, initialChat } from './copilot';
import { STEP_ROWS, TOOL_FAIL_RATES, WAFERS } from '../fixtures';

const strip = (s: string): string => s.replace(/(?:W|LOT)-\d+/g, '');
const nums = (s: string): string[] => (strip(s).match(/\d+(?:\.\d+)?/g) ?? []);

const allowed = new Set<string>([
  String(WAFERS.length),
  ...STEP_ROWS.flatMap((r) => [r.reading.toFixed(1), r.limit.toFixed(1)]),
  ...TOOL_FAIL_RATES.flatMap((t) => [String(Math.round(t.failRate * 100)), String(t.wafers)]),
  ...WAFERS.flatMap((w) => [w.score.toFixed(2), ...w.factors.map((f) => f.weight.toFixed(2))]),
]);

describe('copilot', () => {
  it('has exactly three presets in order', () => {
    expect(PRESETS).toEqual([
      'What made wafer W-0412 fail?',
      'Which tool has the highest failure rate this month?',
      'Which wafers should I look at first?',
    ]);
  });

  it('answers each preset and ignores anything else', () => {
    for (const q of PRESETS) {
      const s = ask(initialChat, q);
      expect(s.log).toHaveLength(1);
      expect(s.log[0].tools.length).toBeGreaterThan(0);
      expect(s.log[0].text.length).toBeGreaterThan(0);
    }
    expect(ask(initialChat, 'free text')).toBe(initialChat);
  });

  it('prints only numbers from the tool results and the fixtures', () => {
    for (const q of PRESETS) {
      const a = answerFor(q)!;
      const results = new Set(a.tools.flatMap((t) => nums(t.result)));
      for (const n of nums(a.text)) {
        expect(results.has(n), `${n} in results`).toBe(true);
        expect(allowed.has(n), `${n} in fixtures`).toBe(true);
      }
    }
  });

  it('names an excursion step for W-0412', () => {
    const text = answerFor(PRESETS[0])!.text;
    const bad = STEP_ROWS.filter((r) => r.wafer === 'W-0412' && r.reading > r.limit);
    expect(bad.length).toBeGreaterThan(0);
    expect(bad.some((r) => text.includes(`${r.step} on ${r.tool}`))).toBe(true);
  });

  it('names the tool with the highest failure rate', () => {
    const top = [...TOOL_FAIL_RATES].sort((a, b) => b.failRate - a.failRate)[0];
    expect(answerFor(PRESETS[1])!.text.startsWith(top.tool)).toBe(true);
  });

  it('lists the three highest-score wafers, highest first', () => {
    const text = answerFor(PRESETS[2])!.text;
    const top = [...WAFERS].sort((a, b) => b.score - a.score).slice(0, 3).map((w) => w.id);
    const at = top.map((id) => text.indexOf(id));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('caps the log and keeps counting turns', () => {
    let s = initialChat;
    for (let i = 0; i < MAX_TURNS + 5; i++) s = ask(s, PRESETS[i % 3]);
    expect(s.log).toHaveLength(MAX_TURNS);
    expect(s.log[s.log.length - 1].turn).toBe(MAX_TURNS + 5);
    expect(s.log[0].turn).toBe(6);
  });
});

describe('fixtures', () => {
  it('has 12 unique wafers with weights that sum to the score', () => {
    expect(WAFERS).toHaveLength(12);
    expect(new Set(WAFERS.map((w) => w.id)).size).toBe(12);
    for (const w of WAFERS) {
      const sum = w.factors.reduce((a, f) => a + f.weight, 0);
      expect(Math.abs(sum - w.score)).toBeLessThanOrEqual(0.01);
      const ws = w.factors.map((f) => f.weight);
      expect([...ws].sort((a, b) => b - a)).toEqual(ws);
    }
    const scores = WAFERS.map((w) => w.score);
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(0.15);
    expect(Math.max(...scores)).toBeLessThanOrEqual(0.95);
  });

  it('uses only generic names and shares a tool across wafers', () => {
    for (const w of WAFERS) {
      expect(w.id).toMatch(/^W-04\d\d$/);
      expect(w.lot).toMatch(/^LOT-\d\d$/);
      for (const t of w.path) expect(t).toMatch(/^Tool [A-F]$/);
    }
    expect(TOOL_FAIL_RATES.map((t) => t.tool)).toEqual(['Tool A', 'Tool B', 'Tool C', 'Tool D', 'Tool E', 'Tool F']);
    expect(TOOL_FAIL_RATES.some((t) => t.wafers >= 3)).toBe(true);
  });
});
