import type { IntakeEmail } from '../fixtures';

export const STAGES = ['classify', 'knowledge', 'attachments', 'drive', 'schedule'] as const;

export type Stage = (typeof STAGES)[number];

export interface IntakeState {
  emailId: string;
  stage: Stage;
  completed: Stage[];
  flagged: boolean;
  answer: string | null;
  invalid: string | null;
  folder: string | null;
  slots: string[];
}

export const KNOWLEDGE_BASE: Record<string, string> = {
  'What are the interview requirements?':
    'Each candidate has a 30-minute interview and a short discussion with two members.',
  'Does the organization cover the membership fee?':
    'The organization covers the membership fee for each member in good standing.',
  'How long is the interview?':
    'The interview is 30 minutes, followed by a short discussion with two members.',
  'When does the fall membership intake open?':
    'Fall intake opens in September, before the first meeting of the term.',
};

export function initialState(emailId: string): IntakeState {
  return {
    emailId,
    stage: 'classify',
    completed: [],
    flagged: false,
    answer: null,
    invalid: null,
    folder: null,
    slots: [],
  };
}

/** The knowledge-base answer for an email, or null when the question is not in it. */
export function answerFor(email: IntakeEmail): string | null {
  const answer = KNOWLEDGE_BASE[email.question];
  return answer === undefined ? null : answer;
}

export function folderFor(email: IntakeEmail): string {
  return `Membership intake/${email.id}`;
}

export function stageTitle(stage: Stage): string {
  switch (stage) {
    case 'classify':
      return 'Classify the email';
    case 'knowledge':
      return 'Answer from the knowledge base';
    case 'attachments':
      return 'Validate attachments';
    case 'drive':
      return 'File in Drive';
    case 'schedule':
      return 'Propose interview slots';
  }
}

export function isComplete(state: IntakeState): boolean {
  return state.completed.length === STAGES.length;
}

/**
 * Process one stage and return the next state. The state is never mutated.
 * A stage that cannot finish — an unanswered question, a bad attachment —
 * flags the email and leaves it on that stage for a person to look at.
 */
export function advance(state: IntakeState, email: IntakeEmail): IntakeState {
  switch (state.stage) {
    case 'classify':
      return { ...state, completed: [...state.completed, 'classify'], stage: 'knowledge' };

    case 'knowledge': {
      const answer = answerFor(email);
      if (answer === null) return { ...state, flagged: true, answer: null };
      return { ...state, completed: [...state.completed, 'knowledge'], answer, stage: 'attachments' };
    }

    case 'attachments': {
      const bad = email.attachments.find((a) => !a.valid);
      if (bad) return { ...state, flagged: true, invalid: bad.name };
      return { ...state, completed: [...state.completed, 'attachments'], invalid: null, stage: 'drive' };
    }

    case 'drive':
      return { ...state, completed: [...state.completed, 'drive'], folder: folderFor(email), stage: 'schedule' };

    case 'schedule':
      return {
        ...state,
        completed: [...state.completed, 'schedule'],
        slots: parseSlots(email.availability),
      };
  }
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * A time phrase and the hour it maps to. `after N` is read as N o'clock in the
 * afternoon, so 6 becomes six in the evening.
 */
function timeIn(text: string): string | null {
  const lower = text.toLowerCase();
  if (/before\s+noon/.test(lower)) return '09:00';
  if (/\bmorning/.test(lower)) return '09:00';
  if (/\bafternoon/.test(lower)) return '14:00';
  if (/\bevening/.test(lower)) return '18:00';
  const after = lower.match(/\bafter\s+(\d{1,2})\b/);
  if (after) {
    const n = Number(after[1]);
    const hour = n < 12 ? n + 12 : n;
    return `${String(hour).padStart(2, '0')}:00`;
  }
  return null;
}

/** The weekday a fragment names, if any. */
function dayIn(fragment: string): string | null {
  for (const day of DAYS) {
    if (new RegExp(`\\b${day}\\b`, 'i').test(fragment)) return day;
  }
  const trimmed = fragment.trim();
  for (const abbr of DAY_ABBR) {
    if (trimmed.toLowerCase().startsWith(abbr.toLowerCase())) return abbr;
  }
  return null;
}

/**
 * Turn free-form availability into interview slots.
 *
 * The text is split on commas and the word "or". The first time phrase
 * anywhere in the text is the default: it applies to every fragment that does
 * not carry a time of its own, which is why "Monday, Wednesday or Friday
 * mornings" offers three morning slots and not one.
 */
export function parseSlots(text: string): string[] {
  const fragments = text
    .split(/,|\bor\b/i)
    .map((f) => f.trim())
    .filter(Boolean);

  const defaultTime = timeIn(text);

  const slots: string[] = [];
  for (const fragment of fragments) {
    const day = dayIn(fragment);
    const time = timeIn(fragment) ?? defaultTime;
    if (day && time) slots.push(`${day} ${time}`);
    else if (day) slots.push(day);
    else if (time) slots.push(time);
  }
  return [...new Set(slots)];
}
