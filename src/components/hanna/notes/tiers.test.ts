import { describe, it, expect } from 'vitest';
import { evaluate, HARD_FAILS } from './tiers';

const good = {
  service: 'individual' as const,
  d: 'Client with generalized anxiety presents with racing thoughts and poor sleep. Called out sick twice this week and avoids calls with manager.',
  i: 'Used CBT to challenge catastrophic thinking about job performance. Client practiced thought challenging in session and was receptive.',
  p: 'Continue CBT targeting avoidance. Assign thought record homework this week.',
};
const ids = (v: ReturnType<typeof evaluate>) => v.hardFails.map((f) => f.id);

describe('tier rules', () => {
  it('has eight named hard fails', () => { expect(HARD_FAILS).toHaveLength(8); });
  it('a complete note is Tier 1', () => { const v = evaluate(good); expect(v.tier).toBe(1); expect(v.hardFails).toEqual([]); expect(v.suggestions).toEqual([]); });
  it('1: no diagnosis and no concern is Tier 3', () => {
    const v = evaluate({ ...good, d: 'Client came in. Called out sick twice this week.' });
    expect(v.tier).toBe(3); expect(ids(v)).toContain(1);
  });
  it('2: no functional impairment is Tier 3', () => {
    expect(ids(evaluate({ ...good, d: 'Client with generalized anxiety presents with racing thoughts.' }))).toContain(2);
  });
  it('3: a listening-only intervention is Tier 3, a named modality rescues it', () => {
    expect(ids(evaluate({ ...good, i: 'Listened, validated feelings and discussed the week.' }))).toContain(3);
    expect(ids(evaluate({ ...good, i: 'Used Person-Centered techniques; listened, validated and reflected feelings.' }))).not.toContain(3);
  });
  it('4: collateral contact documented as individual psychotherapy is Tier 3', () => {
    expect(ids(evaluate({ ...good, i: "Spoke by phone with client's teacher about school accommodations using CBT language." }))).toContain(4);
  });
  it('5: a D section identical to the previous note is Tier 3', () => {
    expect(ids(evaluate({ ...good, previousD: good.d }))).toContain(5);
  });
  it('6: risk disclosed without assessment, result and follow-up is Tier 3', () => {
    const risky = good.d + ' Client reported passive suicidal thoughts.';
    expect(ids(evaluate({ ...good, d: risky, risk: true }))).toContain(6);
    const ok = evaluate({ ...good, d: risky, i: good.i + ' Assessed risk, no plan or intent, safety plan reviewed.', p: good.p + ' Follow up on safety plan next session.', risk: true });
    expect(ids(ok)).not.toContain(6);
  });
  it('7: a plan with only pre-treatment language is Tier 3', () => {
    expect(ids(evaluate({ ...good, p: 'Build rapport and gather information.' }))).toContain(7);
  });
  it('8: an intervention that targets nothing in the D section breaks coherence', () => {
    expect(ids(evaluate({ ...good, i: 'Used EMDR to process childhood memories of a car accident.' }))).toContain(8);
  });
  it('a vague plan is only a Tier 2 suggestion', () => {
    const v = evaluate({ ...good, p: 'Continue therapy.' });
    expect(v.tier).toBe(2); expect(v.suggestions.length).toBeGreaterThan(0); expect(v.hardFails).toEqual([]);
  });
  it('a soft or missing client response is a Tier 2 suggestion, not a failure', () => {
    const v = evaluate({ ...good, i: 'Used CBT to challenge catastrophic thinking about job performance.' });
    expect(v.tier).toBe(2); expect(v.hardFails).toEqual([]);
  });
  it('every hard fail carries a concrete fix', () => {
    const v = evaluate({ ...good, d: '', i: '', p: '' });
    expect(v.hardFails.length).toBeGreaterThan(0);
    for (const f of v.hardFails) expect(f.fix.length).toBeGreaterThan(10);
  });
  it('is deterministic', () => { expect(evaluate(good)).toEqual(evaluate(good)); });
});
