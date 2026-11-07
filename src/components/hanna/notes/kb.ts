import type { Clause } from '../../guide/rulebook';

// Fictional documentation standards written for this demo. They are modeled on the kinds of
// rules a behavioral-health payer publishes, but they are not any payer's text and name none.
export const KB_LABEL = 'the sample standards';

export const KB: Clause[] = [
  { id: '1', title: 'Purpose of a progress note', text: 'A progress note shows why a session was medically necessary. It links the diagnosis or concern, how symptoms affect daily life, the skilled intervention used, and the plan, so a reviewer can follow the reasoning.' },
  { id: '2', title: 'Diagnostic section', text: 'The diagnostic section states the diagnosis or the presenting concern and the symptoms seen this session. A diagnosis name is enough. A presenting concern alone passes, and a provisional diagnosis is suggested when one is available.' },
  { id: '3', title: 'Functional impairment', text: 'Functional impairment describes how symptoms affect daily functioning. Examples include missing work or school, withdrawing from friends, poor sleep affecting routines, difficulty with self-care, and outbursts or poor emotional regulation. Short phrases such as missing work are acceptable.' },
  { id: '4', title: 'Intervention section', text: 'The intervention section names the skilled technique or modality used, such as CBT, person-centered techniques, motivational interviewing or grounding, and what it targeted. A section that only says listened, validated or discussed describes conversation, not treatment.' },
  { id: '5', title: 'Plan section', text: 'The plan shows clinical direction: which modality will continue, homework assigned, referrals or coordination. A plan that says only build rapport or gather information is pre-treatment language and does not show direction.' },
  { id: '6', title: 'Client response', text: 'Record how the client responded to the intervention, even briefly, for example receptive, engaged, resistant or practiced the skill in session. A soft or short response lowers the rating but does not fail the note.' },
  { id: '7', title: 'Risk documentation', text: 'When suicidal or homicidal thoughts or self-harm are disclosed, document the assessment, the result and the follow-up. A history of suicidal thoughts without current thoughts needs a short denial of current risk. Fear of dying from a medical condition is health anxiety, not a risk disclosure.' },
  { id: '8', title: 'Service types', text: 'Document the service that happened. Individual psychotherapy, initial assessment, collateral contact, case management and family therapy each have different expectations. Collateral contact must not be written up as individual psychotherapy.' },
  { id: '9', title: 'ICD-10 codes', text: 'An ICD-10 code is optional. A diagnosis name is sufficient, and a missing code never makes a note fail. When a code is included it should match the diagnosis named in the note.' },
  { id: '10', title: 'Telehealth reminder', text: 'For video or phone sessions in a state with telehealth rules, include the required consent and location elements somewhere in the record. These are administrative reminders and do not change the clinical rating.' },
  { id: '11', title: 'Session language', text: 'Write the note in English. If the session was conducted in another language, state the language in the note, for example session conducted in the client’s preferred language.' },
  { id: '12', title: 'What the note does not need', text: 'Date, duration and credentials belong to the record system, not the note text, and are never rated. Do not add clinical details the clinician did not provide: gaps are flagged, not filled in.' },
];
