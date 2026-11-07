import { evaluate, type Service, type Verdict } from './tiers';

// A rule-based stand-in for note generation. Every sentence is assembled from fields the
// clinician typed plus fixed labels, so nothing can be invented. Gaps are listed, not filled.
export interface BuildInput {
  service?: Service; dx?: string; concern?: string;
  symptoms: string[]; impairment: string[]; intervention: string[];
  response?: string; plan: string[]; risk?: string;
}
export interface Provenance { sentence: string; from: string[] }
export type Generated =
  | { ok: true; note: { d: string; i: string; p: string }; provenance: Provenance[]; verdict: Verdict }
  | { ok: false; reason: string; missing: string[] };

const SERVICES: [RegExp, Service][] = [
  [/individual psychotherapy|individual therapy/i, 'individual'],
  [/initial assessment|assessment/i, 'assessment'],
  [/collateral/i, 'collateral'],
  [/case management/i, 'case-management'],
  [/family therapy|family session/i, 'family'],
];
const MODALITY_START = /^(cbt|dbt|emdr|mi\b|motivational|person-centered|psychoeducation|grounding|cognitive|behavioral activation|play therapy|exposure|tf-cbt)/i;
const PLAN_START = /^(continue|assign|refer|schedule|follow|coordinate|monitor|review)/i;
const RESPONSE_LINE = /\b(receptive|engaged|resistant|practiced|tearful|responded|participated|processing)\b/i;
const split = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);

export function parseInput(text: string): BuildInput {
  const out: BuildInput = { symptoms: [], impairment: [], intervention: [], plan: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const labeled = line.match(/^(dx|diagnosis|concern|presenting concern|symptoms?|impairment|plan|response|risk|intervention)\s*:\s*(.+)$/i);
    if (labeled) {
      const key = labeled[1].toLowerCase();
      const val = labeled[2].trim();
      if (key === 'dx' || key === 'diagnosis') out.dx = val;
      else if (key.includes('concern')) out.concern = val;
      else if (key.startsWith('symptom')) out.symptoms.push(...split(val));
      else if (key === 'impairment') out.impairment.push(...split(val));
      else if (key === 'plan') out.plan.push(...split(val));
      else if (key === 'response') out.response = val;
      else if (key === 'risk') out.risk = val;
      else out.intervention.push(val);
      continue;
    }
    const svc = SERVICES.find(([re]) => re.test(line) && line.split(/\s+/).length <= 4);
    if (svc && !out.service) { out.service = svc[1]; continue; }
    if (MODALITY_START.test(line)) out.intervention.push(line);
    else if (PLAN_START.test(line)) out.plan.push(...split(line));
    else if (RESPONSE_LINE.test(line)) out.response = line.replace(/^client\s+/i, '');
  }
  return out;
}

export function missing(i: BuildInput): string[] {
  const m: string[] = [];
  if (!i.service) m.push('the service type (for example individual psychotherapy or initial assessment)');
  if (!i.dx && !i.concern) m.push('a diagnosis or the presenting concern');
  if (i.symptoms.length === 0 && !i.concern) m.push('the symptoms seen this session');
  if (i.impairment.length === 0) m.push('functional impairment: how symptoms affect daily life');
  if (i.intervention.length === 0) m.push('the intervention: the technique or modality you used');
  if (i.plan.length === 0) m.push('the plan: what happens next clinically');
  return m;
}

export function generate(input: BuildInput): Generated {
  const gaps = missing(input);
  if (gaps.length) return { ok: false, reason: 'Before I write this, I need:', missing: gaps };

  const prov: Provenance[] = [];
  const add = (sentence: string, from: string[]) => { prov.push({ sentence, from }); return sentence; };
  const d: string[] = [];
  if (input.dx) d.push(add(`Client presents with ${input.dx}.`, ['dx']));
  if (input.concern) d.push(add(`Client presents with ${input.concern}.`, ['concern']));
  if (input.symptoms.length) d.push(add(`Symptoms this session: ${input.symptoms.join(', ')}.`, ['symptoms']));
  d.push(add(`Functional impact: ${input.impairment.join(', ')}.`, ['impairment']));
  if (input.risk) d.push(add(`Risk: ${input.risk}.`, ['risk']));
  const i: string[] = [add(`Intervention: ${input.intervention.join('; ')}.`, ['intervention'])];
  if (input.response) i.push(add(`Client response: ${input.response}.`, ['response']));
  const p = [add(`Plan: ${input.plan.join('; ')}.`, ['plan'])];

  const note = { d: d.join(' '), i: i.join(' '), p: p.join(' ') };
  const verdict = evaluate({ service: input.service!, ...note, risk: Boolean(input.risk) });
  if (verdict.tier === 3) {
    return { ok: false, reason: 'As written, this would not pass. I will not add anything you did not tell me, so here is what to add:', missing: verdict.hardFails.map((f) => f.fix) };
  }
  return { ok: true, note, provenance: prov, verdict };
}
