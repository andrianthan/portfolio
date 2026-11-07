import { describe, it, expect } from 'vitest';
import { parseInput, missing, generate } from './builder';
import { tokenize } from '../../../agent/tools';

const EXAMPLE = `Individual psychotherapy
Dx: F41.1 GAD
Symptoms: racing thoughts, difficulty sleeping, avoidance of work tasks
Impairment: called out sick twice this week, avoiding calls with manager
CBT targeting catastrophic thinking about job performance
Client receptive, practiced thought challenging in session
Continue CBT, assign thought record homework for the week`;

describe('parseInput', () => {
  it('maps labeled and unlabeled lines to fields', () => {
    const i = parseInput(EXAMPLE);
    expect(i.service).toBe('individual');
    expect(i.dx).toBe('F41.1 GAD');
    expect(i.symptoms).toEqual(['racing thoughts', 'difficulty sleeping', 'avoidance of work tasks']);
    expect(i.impairment).toHaveLength(2);
    expect(i.intervention).toEqual(['CBT targeting catastrophic thinking about job performance']);
    expect(i.response).toMatch(/receptive/);
    expect(i.plan).toEqual(['Continue CBT', 'assign thought record homework for the week']);
  });
  it('returns empty fields for empty text', () => {
    const i = parseInput('');
    expect(i.symptoms).toEqual([]);
    expect(i.service).toBeUndefined();
  });
});

describe('missing', () => {
  it('lists every missing required element at once', () => {
    const m = missing(parseInput('Individual psychotherapy\nDx: GAD'));
    expect(m.length).toBeGreaterThanOrEqual(3);
    expect(m.join(' ')).toMatch(/impairment/i);
    expect(m.join(' ')).toMatch(/intervention/i);
    expect(m.join(' ')).toMatch(/plan/i);
  });
  it('is empty for the complete example', () => { expect(missing(parseInput(EXAMPLE))).toEqual([]); });
});

describe('generate', () => {
  it('asks for what is missing instead of inventing it', () => {
    const g = generate(parseInput('Individual psychotherapy\nDx: GAD\nSymptoms: racing thoughts'));
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.missing.join(' ')).toMatch(/impairment/i);
  });
  it('builds a D, I and P note from the example with provenance on every sentence', () => {
    const g = generate(parseInput(EXAMPLE));
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.note.d.length).toBeGreaterThan(20);
    expect(g.note.i).toMatch(/CBT/);
    expect(g.note.p).toMatch(/homework/);
    for (const s of g.provenance) { expect(s.from.length).toBeGreaterThan(0); expect(s.sentence.length).toBeGreaterThan(5); }
    expect(g.verdict.tier).not.toBe(3);
  });
  it('never adds a clinical word that was not in the input (anti-fabrication)', () => {
    const g = generate(parseInput(EXAMPLE));
    if (!g.ok) throw new Error('expected ok');
    const input = new Set(tokenize(EXAMPLE));
    const template = new Set(['client', 'presents', 'symptoms', 'session', 'functional', 'impact', 'intervention', 'response', 'plan', 'risk']);
    for (const w of tokenize(`${g.note.d} ${g.note.i} ${g.note.p}`)) {
      expect(input.has(w) || template.has(w), `unexpected word: ${w}`).toBe(true);
    }
  });
  it('refuses a draft that would be Tier 3 and explains the fix', () => {
    const g = generate(parseInput('Individual psychotherapy\nDx: GAD\nSymptoms: worry\nImpairment: missing work\nListened and discussed the week\nPlan: continue weekly sessions'));
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.missing.join(' ')).toMatch(/modality|technique/i);
  });
});
