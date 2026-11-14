import { describe, it, expect } from 'vitest';
import { EMAILS, type IntakeEmail } from '../fixtures';
import {
  STAGES,
  KNOWLEDGE_BASE,
  initialState,
  advance,
  answerFor,
  parseSlots,
  folderFor,
  select,
  stageTitle,
  isComplete,
  type IntakeState,
} from './intake';

const A = EMAILS[0];
const B = EMAILS[1];
const C = EMAILS[2];
const D = EMAILS[3];
const E = EMAILS[4];

/** Press the Process button `n` times, starting from the initial state. */
function run(emailId: string, n: number): IntakeState {
  const email = EMAILS.find((e) => e.id === emailId)!;
  let state = initialState(emailId);
  for (let i = 0; i < n; i += 1) state = advance(state, email);
  return state;
}

describe('fixtures', () => {
  it('holds exactly five sample emails, in order A to E', () => {
    expect(EMAILS.map((e) => e.id)).toEqual(['Applicant A', 'Applicant B', 'Applicant C', 'Applicant D', 'Applicant E']);
  });
  it('names every email Applicant A to E', () => {
    EMAILS.forEach((e) => expect(e.id).toMatch(/^Applicant [A-E]$/));
  });
  it('carries no email address in any email or attachment name', () => {
    EMAILS.forEach((e) => {
      expect(e.id).not.toContain('@');
      expect(e.subject).not.toContain('@');
      expect(e.question).not.toContain('@');
      expect(e.availability).not.toContain('@');
      e.attachments.forEach((a) => expect(a.name).not.toContain('@'));
    });
  });
});

describe('parseSlots', () => {
  it('resolves the five sample availabilities to the expected slots', () => {
    expect(parseSlots(A.availability)).toEqual(['Tuesday 14:00', 'Thursday 14:00']);
    expect(parseSlots(B.availability)).toEqual(['Monday 09:00', 'Wednesday 09:00', 'Friday 09:00']);
    expect(parseSlots(C.availability)).toEqual([]);
    expect(parseSlots(D.availability)).toEqual(['Friday 09:00']);
    expect(parseSlots(E.availability)).toEqual([]);
  });
  it('ignores a fragment with no day and no time', () => {
    expect(parseSlots('flexible')).toEqual([]);
    expect(parseSlots('some weeks and some times')).toEqual([]);
  });
  it('reads "after 6" as six in the evening', () => {
    expect(parseSlots('after 6')).toEqual(['18:00']);
    expect(parseSlots('after 6 on Monday')).toEqual(['Monday 18:00']);
  });
  it('reads "after 11" as eleven in the evening and "after 12" as noon', () => {
    expect(parseSlots('after 11')).toEqual(['23:00']);
    expect(parseSlots('after 12')).toEqual(['12:00']);
  });
  it('takes the default from "after N" too, wherever it sits in the text', () => {
    // The default is the first time phrase in the text, and "after 6" counts.
    // Friday is the bare fragment, so it takes that default.
    expect(parseSlots('Tuesday morning, Thursday after 6, Friday')).toEqual([
      'Tuesday 09:00',
      'Thursday 18:00',
      'Friday 09:00',
    ]);
    expect(parseSlots('Tuesday after 6, Thursday morning, Friday')).toEqual([
      'Tuesday 18:00',
      'Thursday 09:00',
      'Friday 18:00',
    ]);
  });
  it('reads the other time phrases', () => {
    expect(parseSlots('before noon')).toEqual(['09:00']);
    expect(parseSlots('evening')).toEqual(['18:00']);
    expect(parseSlots('Monday evening')).toEqual(['Monday 18:00']);
  });
  it('applies the default time to every bare weekday in the text', () => {
    expect(parseSlots('Monday, Wednesday or Friday mornings')).toEqual(['Monday 09:00', 'Wednesday 09:00', 'Friday 09:00']);
  });
  it('takes the default time from the first phrase in the text, not the first kind', () => {
    // The evening comes first, so the bare Wednesday defaults to it even
    // though the morning phrase is a kind the parser knows better. Thursday
    // carries a morning of its own, so it keeps it.
    expect(parseSlots('Tuesday evening, Wednesday or Thursday morning')).toEqual([
      'Tuesday 18:00',
      'Wednesday 18:00',
      'Thursday 09:00',
    ]);
    // The other way round: the morning comes first and is the default, while
    // Thursday carries an evening of its own.
    expect(parseSlots('Tuesday morning, Wednesday or Thursday evening')).toEqual([
      'Tuesday 09:00',
      'Wednesday 09:00',
      'Thursday 18:00',
    ]);
  });
  it('removes duplicates and keeps the first occurrence order', () => {
    expect(parseSlots('Monday morning or Monday morning')).toEqual(['Monday 09:00']);
    expect(parseSlots('Friday morning, Friday morning')).toEqual(['Friday 09:00']);
  });
  it('reads a three-letter day at the start of a fragment', () => {
    expect(parseSlots('Mon morning')).toEqual(['Mon 09:00']);
  });
  it('reads a full day name anywhere in the fragment', () => {
    expect(parseSlots('I am free on Tuesday afternoon')).toEqual(['Tuesday 14:00']);
  });
  it('leaves a bare weekday alone when the text names no time at all', () => {
    expect(parseSlots('Monday')).toEqual(['Monday']);
  });
});

describe('answerFor', () => {
  it('answers A, B, D and E from the knowledge base', () => {
    expect(answerFor(A)).toBe('Each candidate has a 30-minute interview and a short discussion with two members.');
    expect(answerFor(B)).toBe('The organization covers the membership fee for each member in good standing.');
    expect(answerFor(D)).toBe('Each candidate has a 30-minute interview and a short discussion with two members.');
    expect(answerFor(E)).toBe('The interview is 30 minutes, followed by a short discussion with two members.');
  });
  it('returns null for Applicant C, whose question is not in the knowledge base', () => {
    expect(answerFor(C)).toBeNull();
  });
  it('holds exactly the four sample questions in the knowledge base', () => {
    expect(Object.keys(KNOWLEDGE_BASE)).toHaveLength(4);
    expect(Object.keys(KNOWLEDGE_BASE)).toContain('When does the fall membership intake open?');
    expect(Object.keys(KNOWLEDGE_BASE)).not.toContain(C.question);
  });
  it('answers the fall intake question from the knowledge base', () => {
    expect(KNOWLEDGE_BASE['When does the fall membership intake open?'])
      .toBe('Fall intake opens in September, before the first meeting of the term.');
  });
});

describe('advance', () => {
  it('walks Applicant A through the stages to a booked interview', () => {
    // Four presses complete classify, knowledge, attachments and drive: the
    // drive stage is reached, and the pipeline moves on to scheduling.
    const four = run('Applicant A', 4);
    expect(four.completed).toEqual(['classify', 'knowledge', 'attachments', 'drive']);
    expect(four.stage).toBe('schedule');
    expect(four.folder).toBe('Membership intake/Applicant A');

    const five = run('Applicant A', 5);
    expect(five.stage).toBe('schedule');
    expect(five.slots).toEqual(['Tuesday 14:00', 'Thursday 14:00']);
    expect(isComplete(five)).toBe(true);
  });
  it('is not complete until every stage has run', () => {
    expect(isComplete(initialState('Applicant A'))).toBe(false);
    for (let n = 1; n <= 4; n += 1) {
      expect(isComplete(run('Applicant A', n))).toBe(false);
    }
    expect(isComplete(run('Applicant A', 5))).toBe(true);
  });
  it('is a no-op once the pipeline is complete', () => {
    const five = run('Applicant A', 5);
    const six = run('Applicant A', 6);
    expect(six).toEqual(five);
    expect(six.completed).toHaveLength(5);
    expect(isComplete(six)).toBe(true);
  });
  it('flags Applicant C at the knowledge stage and stays there', () => {
    const state = run('Applicant C', 2);
    expect(state.flagged).toBe(true);
    expect(state.stage).toBe('knowledge');
    expect(state.answer).toBeNull();
  });
  it('flags Applicant D at the attachments stage and names the bad file', () => {
    const state = run('Applicant D', 3);
    expect(state.flagged).toBe(true);
    expect(state.stage).toBe('attachments');
    expect(state.invalid).toBe('transcript-d.txt');
  });
  it('invents no slot for Applicant E, who named no time', () => {
    const state = run('Applicant E', 5);
    expect(state.slots).toEqual([]);
  });
  it('never mutates the state it is given', () => {
    // Every path: the plain transitions, the two halting ones, and the last
    // stage, which rebuilds the slots.
    const cases: [string, IntakeEmail][] = [
      ['Applicant A', A],
      ['Applicant C', C],
      ['Applicant D', D],
    ];
    for (const [id, email] of cases) {
      for (let n = 0; n <= 5; n += 1) {
        const before = run(id, n);
        const snapshot = JSON.parse(JSON.stringify(before));
        advance(before, email);
        expect(before, `${id} after ${n} presses`).toEqual(snapshot);
      }
    }
  });
});

describe('helpers', () => {
  it('files each applicant under its own Drive folder', () => {
    expect(folderFor(A)).toBe('Membership intake/Applicant A');
    expect(folderFor(E)).toBe('Membership intake/Applicant E');
  });
  it('names the stages in order', () => {
    expect(STAGES).toEqual(['classify', 'knowledge', 'attachments', 'drive', 'schedule']);
    expect(stageTitle('classify')).toBe('Classify the email');
    expect(stageTitle('knowledge')).toBe('Answer from the knowledge base');
    expect(stageTitle('attachments')).toBe('Validate attachments');
    expect(stageTitle('drive')).toBe('File in Drive');
    expect(stageTitle('schedule')).toBe('Propose interview slots');
  });
  it('keeps the progress when the same applicant is selected again', () => {
    const underWay = run('Applicant A', 3);
    expect(select(underWay, 'Applicant A')).toBe(underWay);
  });
  it('starts over when a different applicant is selected', () => {
    const underWay = run('Applicant A', 3);
    const other = select(underWay, 'Applicant B');
    expect(other.emailId).toBe('Applicant B');
    expect(other.completed).toEqual([]);
    expect(other.stage).toBe('classify');
    expect(other.answer).toBeNull();
    expect(other.slots).toEqual([]);
  });
});
