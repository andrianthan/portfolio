import { describe, it, expect } from 'vitest';
import { TYPES, nullifyInvalid, initForm, setField, validateStep, next, back, edit, buildPayload, createRecord, approve } from './index';

const filled = () => {
  let f = initForm();
  f = setField(f, { occurredAt: '2026-03-02T14:30', type: 'Behavioral', subType: 'Verbal outburst', severity: 'Medium', staff: 'Staff 1', narrative: 'Youth A raised their voice during group time.', resolution: 'Staff 1 de-escalated and the group resumed.', flags: [], youth: ['Youth A'] });
  return f;
};

describe('dependent picklists', () => {
  it('keeps a valid sub-type', () => { expect(nullifyInvalid('Behavioral', 'Verbal outburst')).toBe('Verbal outburst'); });
  it('drops a sub-type that does not belong to the type', () => { expect(nullifyInvalid('Medical', 'Verbal outburst')).toBe(''); });
  it('every type has at least two sub-types', () => { for (const subs of Object.values(TYPES)) expect(subs.length).toBeGreaterThanOrEqual(2); });
  it('changing the type clears an invalid sub-type', () => {
    const f = setField(filled(), { type: 'Medical' });
    expect(f.data.subType).toBe('');
  });
});

describe('form steps', () => {
  it('starts on step 1 with nothing filled', () => { const f = initForm(); expect(f.step).toBe(1); expect(validateStep(1, f.data).length).toBeGreaterThan(0); });
  it('next is blocked until the step validates', () => { const f = next(initForm()); expect(f.step).toBe(1); });
  it('walks the five steps then reaches review', () => {
    let f = filled();
    for (let i = 0; i < 5; i++) f = next(f);
    expect(f.step).toBe(6);
  });
  it('back keeps entered data', () => {
    let f = next(filled()); f = back(f);
    expect(f.step).toBe(1);
    expect(f.data.narrative).toContain('Youth A');
  });
  it('edit jumps to a step from review', () => {
    let f = filled(); for (let i = 0; i < 5; i++) f = next(f);
    expect(edit(f, 3).step).toBe(3);
  });
  it('requires at least one youth and a narrative', () => {
    const f = setField(filled(), { youth: [], narrative: '' });
    expect(validateStep(3, f.data).join(' ')).toMatch(/narrative/i);
    expect(validateStep(1, f.data).join(' ')).toMatch(/youth/i);
  });
  it('step 2 needs a valid sub-type for the chosen type', () => {
    const f = setField(filled(), { subType: '' });
    expect(validateStep(2, f.data).join(' ')).toMatch(/sub-type/i);
  });
});

describe('payload and record', () => {
  it('always builds a Draft incident plus one linked record per youth', () => {
    const d = setField(filled(), { youth: ['Youth A', 'Youth B'] }).data;
    const p = buildPayload(d);
    expect(p.incident.status).toBe('Draft');
    expect(p.youthRecords).toHaveLength(2);
  });
  it('payload drops an invalid sub-type', () => {
    const d = { ...filled().data, type: 'Safety', subType: 'Verbal outburst' };
    expect(buildPayload(d).incident.subType).toBe('');
  });
  it('a supervisor can approve a Draft once', () => {
    const r = createRecord(buildPayload(filled().data), 1);
    expect(r.status).toBe('Draft');
    expect(r.id).toBe('INC-0001');
    const a = approve(r);
    expect(a.status).toBe('Approved');
    expect(approve(a)).toEqual(a);
  });
});
