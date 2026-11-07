import { TYPES, nullifyInvalid } from './picklists';

export interface FormData {
  occurredAt: string; type: string; subType: string; severity: string; staff: string;
  narrative: string; resolution: string; flags: string[]; youth: string[];
}
export type Step = 1 | 2 | 3 | 4 | 5;
export interface Form { step: Step | 6; data: FormData }

export interface Payload {
  incident: { status: 'Draft'; type: string; subType: string; severity: string; occurredAt: string; staff: string; narrative: string; resolution: string; flags: string[] };
  youthRecords: { youth: string }[];
}

export const initForm = (): Form => ({
  step: 1,
  data: { occurredAt: '', type: '', subType: '', severity: '', staff: '', narrative: '', resolution: '', flags: [], youth: [] },
});

export function setField(f: Form, patch: Partial<FormData>): Form {
  const data = { ...f.data, ...patch };
  data.subType = nullifyInvalid(data.type, data.subType);
  return { ...f, data };
}

export function validateStep(step: Step, d: FormData): string[] {
  const e: string[] = [];
  if (step === 1) {
    if (!d.occurredAt) e.push('When it happened is required.');
    if (d.youth.length === 0) e.push('Select at least one youth.');
  } else if (step === 2) {
    if (!d.type) e.push('Choose an incident type.');
    else if (!d.subType || !(TYPES[d.type] ?? []).includes(d.subType)) e.push(`Choose a sub-type for ${d.type}.`);
    if (!d.severity) e.push('Choose a severity.');
  } else if (step === 3) {
    if (!d.staff) e.push('Choose the staff member.');
    if (!d.narrative.trim()) e.push('Describe what happened (narrative).');
  } else if (step === 4) {
    if (!d.resolution.trim()) e.push('Describe how it was resolved.');
  }
  return e;
}

export function next(f: Form): Form {
  if (f.step === 6) return f;
  if (validateStep(f.step, f.data).length > 0) return f;
  return { ...f, step: f.step === 5 ? 6 : ((f.step + 1) as Step) };
}

// Going back never discards what was typed.
export function back(f: Form): Form {
  if (f.step === 1) return f;
  return { ...f, step: f.step === 6 ? 5 : ((f.step - 1) as Step) };
}

export const edit = (f: Form, step: Step): Form => ({ ...f, step });

export function buildPayload(d: FormData): Payload {
  return {
    incident: {
      status: 'Draft', type: d.type, subType: nullifyInvalid(d.type, d.subType), severity: d.severity,
      occurredAt: d.occurredAt, staff: d.staff, narrative: d.narrative, resolution: d.resolution, flags: d.flags,
    },
    youthRecords: d.youth.map((youth) => ({ youth })),
  };
}
