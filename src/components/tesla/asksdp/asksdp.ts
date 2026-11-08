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
const NUMBER = /\d[\d,]*(?:\.\d+)?%?/g;

const nums = (s: string): string[] => s.match(NUMBER) ?? [];
const fmt = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const partName = (id: string): string => MOCK_PARTS.find((p) => p.id === id)?.name ?? id;

/** Number tokens in `text` that appear in none of the tool results. */
export function ungrounded(text: string, toolResults: readonly string[]): string[] {
  const known = new Set(toolResults.flatMap(nums));
  return nums(text).filter((n) => !known.has(n));
}

type Draft = Omit<Answer, 'question' | 'refused'>;

function consumption(): Draft {
  const id = 'P-1001';
  const weeks = series(3, 6, 1400, 120);
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const pct = Math.round(((last - first) / first) * 100);
  const dir = pct > 0 ? 'rose' : pct < 0 ? 'fell' : 'held flat';
  const verdict: Verdict = Math.abs(pct) < 5 ? 'no-action' : pct > 0 ? 'firm' : 'hold';
  const change = pct === 0 ? '' : ` ${Math.abs(pct)}%`;
  const tools = [
    { tool: 'get_consumption', result: `${id}: ${weeks.length} weeks, ${weeks.map(fmt).join(', ')} units` },
    { tool: 'trend_change', result: `${id}: ${pct > 0 ? '+' : ''}${pct}% from ${fmt(first)} to ${fmt(last)}` },
  ];
  const text = `${partName(id)} consumption ${dir}${change} over ${weeks.length} weeks, from ${fmt(first)} to ${fmt(last)} units a week.`;
  return { text, verdict, tools };
}

function failureRate(): Draft {
  const id = 'P-1005';
  const failures = 18, installed = 12000, limit = 0.5;
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

function firmOrHold(): Draft {
  const id = 'P-1004';
  const onHand = 2400, inbound = 1200, demand = 310, lead = 6;
  const cover = Math.floor((onHand + inbound) / demand);
  const firm = cover < lead + 2;
  const tools = [
    { tool: 'get_inventory', result: `${id}: ${fmt(onHand)} on hand, ${fmt(inbound)} inbound` },
    { tool: 'get_demand', result: `${id}: ${fmt(demand)} units a week, lead time ${lead} weeks` },
    { tool: 'cover_weeks', result: `${id}: ${cover} weeks of cover` },
  ];
  const text = `${firm ? 'Firm' : 'Hold'} the ${partName(id).toLowerCase()} order. ${cover} weeks of cover against a ${lead} week lead time.`;
  return { text, verdict: firm ? 'firm' : 'hold', tools };
}

/** Routes by keyword; with no matching tool it refuses. Never returns an ungrounded number. */
export function ask(question: string): Answer {
  const q = question.toLowerCase();
  let draft: Draft | null = null;
  if (/\b(firm|hold|order)\b/.test(q)) draft = firmOrHold();
  else if (/fail|defect|return/.test(q)) draft = failureRate();
  else if (/consum|trend|demand|usage/.test(q)) draft = consumption();
  if (draft && ungrounded(draft.text, draft.tools.map((t) => t.result)).length === 0) {
    return { question, ...draft, refused: false };
  }
  return { question, text: REFUSAL, verdict: null, tools: [], refused: true };
}
