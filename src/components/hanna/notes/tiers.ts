// Rule-based stand-in for a note-sufficiency rubric. The eight hard-fail conditions mirror the
// real rubric; rules 5 and 8 are keyword heuristics here (the real tool is a language model that
// reads the whole note). Everything is deterministic and runs in the browser.
export type Service = 'individual' | 'assessment' | 'collateral' | 'case-management' | 'family';
export interface NoteInput { service: Service; d: string; i: string; p: string; risk?: boolean; previousD?: string }
export interface HardFail { id: number; label: string; fix: string }
export interface Verdict { tier: 1 | 2 | 3; hardFails: HardFail[]; suggestions: string[] }

export const HARD_FAILS: { id: number; label: string }[] = [
  { id: 1, label: 'No diagnosis and no presenting concern' },
  { id: 2, label: 'No functional impairment' },
  { id: 3, label: 'Intervention section is mostly conversation' },
  { id: 4, label: 'Service type does not match what was documented' },
  { id: 5, label: 'Diagnostic section copied from the previous note' },
  { id: 6, label: 'Risk disclosed without assessment, result and follow-up' },
  { id: 7, label: 'Plan uses only pre-treatment language' },
  { id: 8, label: 'Intervention does not connect to the diagnostic section' },
];

const has = (text: string, re: RegExp) => re.test(text.toLowerCase());
const DX = /\b(anxiety|depress|mdd|gad|ptsd|adjustment|bipolar|adhd|ocd|trauma|disorder|panic|f\d\d(\.\d)?)\b/;
const CONCERN = /\b(presents? with|presenting|concern|struggl\w+|symptom\w*|tearful|worr\w+|irritab\w+|mood|stress\w*|behavioral issues)\b/;
const IMPAIRMENT = /\b(called out|missing work|missed|miss(es|ing)?|avoid\w*|withdr\w+|isolat\w+|grades|sleep|self-care|hygiene|unable|difficulty|conflict|outburst\w*|impuls\w+|can'?t|cannot|struggling to)\b/;
const MODALITY = /\b(cbt|dbt|emdr|mi|motivational interviewing|person-centered|psychoeducation|grounding|cognitive restructuring|reframing|behavioral activation|play therapy|exposure|tf-cbt|thought challenging|thought record)\b/;
const REPORTING = /\b(listened|validated|reflected|held space|checked in|encouraged|normalized|discussed|explored|toured)\b/;
const COLLATERAL = /\b(spoke|talked|called|met)\b[^.]{0,30}\b(with|to)\b[^.]{0,20}\b(teacher|parent|guardian|school|case manager|probation officer)\b/;
const PRE_TREATMENT = /(build(ing)? rapport|gather(ing)? information|safe place|get(ting)? to know)/;
const TREATMENT_PLAN = /\b(continue|assign\w*|homework|cbt|dbt|emdr|target\w*|refer\w*|schedule\w*|monitor\w*|practice|session|therapy|follow)\b/;
const RISK = /\b(suicid\w*|si|hi|self-harm|homicid\w*|harm (self|others|themselves))\b/;
const R_ASSESS = /\b(assess\w*|screen\w*|evaluat\w*|c-ssrs|asked about)\b/;
const R_RESULT = /\b(denied|no plan|no intent|no current|low risk|passive|safety plan)\b/;
const R_FOLLOW = /\b(follow[- ]up|monitor\w*|safety plan|reassess\w*|next session)\b/;
const RESPONSE = /\b(receptive|engaged|responded|practiced|resistant|tearful|processing|insight|agreed|participated|reported)\b/;

const STOP = new Set(['with', 'this', 'that', 'used', 'client', 'about', 'their', 'and', 'the', 'was', 'were', 'for', 'twice', 'week', 'session', 'during']);
const stem = (w: string) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w);
const words = (t: string) => new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w)).map(stem));
// Rule 8 heuristic: the intervention connects to the D section when they share a word or touch
// the same topic. Topics are keyword groups, so "catastrophic thinking about job performance"
// still connects to "racing thoughts" and "avoids calls with manager".
const TOPICS: RegExp[] = [
  /\b(thought\w*|thinking|cognit\w+|catastroph\w+|worr\w+|racing|ruminat\w+)\b/,
  /\b(sleep|insomnia|rest\w*)\b/,
  /\b(avoid\w*|exposure)\b/,
  /\b(mood|depress\w*|sad|tearful|behavioral activation|hopeless\w*)\b/,
  /\b(trauma\w*|ptsd|memor\w+|emdr|accident|flashback\w*)\b/,
  /\b(work|job|manager|calls?|performance|school|grades|teacher)\b/,
  /\b(anger|outburst\w*|irritab\w+|impuls\w+|regulat\w+)\b/,
  /\b(relationship\w*|family|friend\w*|isolat\w+|withdr\w+)\b/,
];
const sameTopic = (a: string, b: string) => TOPICS.some((re) => re.test(a.toLowerCase()) && re.test(b.toLowerCase()));
const norm = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

export function evaluate(n: NoteInput): Verdict {
  const { d, i, p } = n;
  const fails = new Map<number, string>();
  const suggestions: string[] = [];

  if (!has(d, DX) && !has(d, CONCERN)) fails.set(1, 'Add a diagnosis (a name is enough) or what the client presented with today.');
  if (!has(d, IMPAIRMENT)) fails.set(2, 'State how symptoms affect daily life, such as work, school, relationships, sleep or self-care. Even a short phrase works.');
  if (!has(i, MODALITY)) fails.set(3, 'Name the modality or technique you used, for example CBT, Person-Centered techniques or grounding, and what you targeted.');
  if (n.service === 'individual' && has(i, COLLATERAL)) fails.set(4, 'This reads as a contact with someone other than the client. Document it as collateral contact, not individual psychotherapy.');
  if (n.previousD && norm(n.previousD) !== '' && norm(n.previousD) === norm(d)) fails.set(5, 'The diagnostic section matches the previous note. Describe what the client presented with in this session.');
  const all = `${d} ${i} ${p}`;
  if ((n.risk || has(all, RISK)) && has(all, RISK) && !(has(`${i} ${p}`, R_ASSESS) && has(all, R_RESULT) && has(`${i} ${p}`, R_FOLLOW))) {
    fails.set(6, 'When risk is mentioned, document the assessment, the result and the follow-up. Do not leave risk undocumented.');
  }
  if (!p.trim() || (has(p, PRE_TREATMENT) && !has(p, TREATMENT_PLAN))) fails.set(7, 'State the clinical direction, such as the modality you will continue, homework you assigned or a referral.');
  if (d.trim() && i.trim()) {
    const dw = words(d);
    const shared = [...words(i)].some((w) => dw.has(w)) || sameTopic(d, i);
    if (!shared) fails.set(8, 'Connect the intervention to what the diagnostic section describes, for example "CBT targeting catastrophic thinking about work".');
  }

  if (!fails.has(7) && words(p).size < 5) suggestions.push('The plan is vague. Add the clinical direction, such as what you will continue and any homework.');
  if (!fails.has(3) && !has(i, RESPONSE)) suggestions.push('Add how the client responded to the intervention, even briefly.');
  if (!fails.has(3) && has(i, REPORTING) && has(i, MODALITY)) suggestions.push('Rapport language sits next to a named intervention. That passes, but lead with the technique.');
  if (!has(d, DX) && has(d, CONCERN)) suggestions.push('A presenting concern passes. Add a provisional diagnosis if you have one.');

  const hardFails: HardFail[] = HARD_FAILS.filter((h) => fails.has(h.id)).map((h) => ({ ...h, fix: fails.get(h.id)! }));
  return { tier: hardFails.length ? 3 : suggestions.length ? 2 : 1, hardFails, suggestions };
}
