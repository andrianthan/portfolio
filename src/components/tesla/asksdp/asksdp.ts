import { MOCK_PARTS, series } from '../fixtures';

export type Verdict = 'firm' | 'hold' | 'no-action';
export interface ToolCall { tool: string; result: string }
export interface Answer { question: string; text: string; verdict: Verdict | null; tools: ToolCall[]; refused: boolean }

export const PRESETS: readonly string[] = [
  'How is consumption trending for the rear door latch?',
  'What is the failure rate on the wheel hub bearing?',
  'Should we firm or hold the cabin air filter order?',
];

export const REFUSAL = "I can't answer that from the data I can reach.";
const NUMBER = /\d+(?:,\d{3})*(?:\.\d+)?%?/g;

/** The log keeps the most recent turns only, so a long session stays bounded. */
export const MAX_TURNS = 20;

const nums = (s: string): string[] => s.match(NUMBER) ?? [];
const fmt = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const partName = (id: string): string => MOCK_PARTS.find((p) => p.id === id)?.name ?? id;
const idNum = (id: string): number => parseInt(id.replace(/\D/g, ''), 10) || 0;

/**
 * Part named in the question by name or id (case-insensitive), else the default.
 *
 * When the question names more than one part, the one it names first wins, so
 * the routing follows the reader's own order rather than the part list's.
 */
function resolvePart(q: string, fallback: string): string {
  const named = MOCK_PARTS
    .map((p) => {
      const at = [p.name.toLowerCase(), p.id.toLowerCase()]
        .map((n) => q.indexOf(n))
        .filter((i) => i !== -1)
        .sort((a, b) => a - b)[0];
      return { id: p.id, at: at ?? Infinity };
    })
    .filter((h) => h.at !== Infinity)
    .sort((a, b) => a.at - b.at);
  return named.length > 0 ? named[0].id : fallback;
}

/** Number tokens in `text` that appear in none of the tool results. */
export function ungrounded(text: string, toolResults: readonly string[]): string[] {
  const known = new Set(toolResults.flatMap(nums));
  return nums(text).filter((n) => !known.has(n));
}

type Draft = Omit<Answer, 'question' | 'refused'>;

function consumption(id: string): Draft {
  const n = idNum(id);
  const weeks = series(n, 6, 1000 + (n % 10) * 100, 120);
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const pct = Math.round(((last - first) / first) * 100);
  const dir = pct > 0 ? 'rose' : pct < 0 ? 'fell' : 'held flat';
  const threshold = 5;
  const verdict: Verdict = Math.abs(pct) < threshold ? 'no-action' : pct > 0 ? 'firm' : 'hold';
  const change = pct === 0 ? '' : ` ${Math.abs(pct)}%`;
  const tools = [
    { tool: 'get_consumption', result: `${id}: ${weeks.length} weeks, ${weeks.map(fmt).join(', ')} units` },
    { tool: 'trend_change', result: `${id}: ${pct > 0 ? '+' : ''}${pct}% from ${fmt(first)} to ${fmt(last)}` },
    { tool: 'get_threshold', result: `${id}: act when the ${weeks.length}-week change is ${threshold}% or more` },
  ];
  const text = `${partName(id)} consumption ${dir}${change} over ${weeks.length} weeks, from ${fmt(first)} to ${fmt(last)} units a week.`;
  return { text, verdict, tools };
}

function failureRate(id: string): Draft {
  const n = idNum(id);
  const failures = 10 + ((n * 7) % 40), installed = 6000 + (n % 9) * 1500, limit = 0.5;
  const rate = (failures / installed) * 100;
  const rateStr = `${rate.toFixed(2)}%`;
  const over = rate > limit;
  const tools = [
    { tool: 'get_failures', result: `${id}: ${failures} failures in ${fmt(installed)} installed` },
    { tool: 'failure_rate', result: `${id}: ${rateStr}` },
    { tool: 'get_threshold', result: `${id}: review above ${limit.toFixed(2)}%` },
  ];
  const text = `${partName(id)} failure rate is ${rateStr}, ${over ? 'above' : 'under'} the ${limit.toFixed(2)}% review line. ${failures} failures across ${fmt(installed)} installed.`;
  return { text, verdict: over ? 'hold' : 'no-action', tools };
}

function firmOrHold(id: string): Draft {
  const n = idNum(id);
  const onHand = 1500 + (n % 8) * 300, inbound = 600 + (n % 5) * 200, demand = 250 + (n % 6) * 30, lead = 6;
  const cover = Math.floor((onHand + inbound) / demand);
  const firm = cover < lead + 2;
  const tools = [
    { tool: 'get_inventory', result: `${id}: ${fmt(onHand)} on hand, ${fmt(inbound)} inbound` },
    { tool: 'get_demand', result: `${id}: ${fmt(demand)} units a week, lead time ${lead} weeks` },
    { tool: 'cover_weeks', result: `${id}: ${cover} weeks of cover` },
    { tool: 'get_threshold', result: `${id}: firm when cover is under ${lead + 2} weeks against a ${lead} week lead time` },
  ];
  const text = `${firm ? 'Firm' : 'Hold'} the ${partName(id).toLowerCase()} order. ${cover} weeks of cover against a ${lead} week lead time.`;
  return { text, verdict: firm ? 'firm' : 'hold', tools };
}

/** Routes by keyword; with no matching tool it refuses. Never returns an ungrounded number. */
export function ask(question: string): Answer {
  const q = question.toLowerCase();
  let draft: Draft | null = null;
  if (/\b(firm|hold)\b/.test(q)) draft = firmOrHold(resolvePart(q, 'P-1004'));
  else if (/fail|defect/.test(q)) draft = failureRate(resolvePart(q, 'P-1005'));
  else if (/consum|trend|demand|usage/.test(q)) draft = consumption(resolvePart(q, 'P-1001'));
  if (draft) {
    const results = draft.tools.map((t) => t.result);
    // Every number in the question and in the answer has to come from a tool
    // result; a figure nobody returned is a refusal, not an answer.
    if (ungrounded(draft.text, results).length === 0 && ungrounded(question, results).length === 0) {
      return { question, ...draft, refused: false };
    }
  }
  return { question, text: REFUSAL, verdict: null, tools: [], refused: true };
}

export interface AskState { log: Answer[]; draft: string }

export const initialAsk: AskState = { log: [], draft: '' };

/** The answer for a question, or null when there is nothing to ask. */
export function askTurn(question: string): Answer | null {
  const text = question.trim();
  if (!text) return null;
  return ask(text);
}

/** Append an answer to the log, keeping only the most recent turns. */
export function appendTurn(log: readonly Answer[], answer: Answer): Answer[] {
  return [...log, answer].slice(-MAX_TURNS);
}

/**
 * Send a question: log the answer, clear the input, keep the log bounded.
 *
 * A preset click and the send button both come through here, so a preset
 * always leaves the demo in the same state a typed question would.
 */
export function sendQuestion(s: AskState, question: string): AskState {
  const answer = askTurn(question);
  if (!answer) return s;
  return { log: appendTurn(s.log, answer), draft: '' };
}

/** Scroll a log region so the newest answer is visible, even a tall one. */
export function scrollToBottom(el: { scrollTop: number; scrollHeight: number; clientHeight: number } | null): void {
  if (!el) return;
  el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
}
