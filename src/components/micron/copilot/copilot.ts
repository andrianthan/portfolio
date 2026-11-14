import { STEP_ROWS, TOOL_FAIL_RATES, WAFERS } from '../fixtures';

export const PRESETS: readonly string[] = [
  'What made wafer W-0412 fail?',
  'Which tool has the highest failure rate this month?',
  'Which wafers should I look at first?',
];

export interface ToolCall { tool: string; result: string }
export interface Turn { turn: number; question: string; tools: ToolCall[]; text: string }
export interface ChatState { log: Turn[] }

export const initialChat: ChatState = { log: [] };
export const MAX_TURNS = 20;

const pct = (f: number): string => `${Math.round(f * 100)}%`;
const one = (n: number): string => n.toFixed(1);
const two = (n: number): string => n.toFixed(2);

function whyFailed(): { tools: ToolCall[]; text: string } {
  const id = 'W-0412';
  const rows = STEP_ROWS.filter((r) => r.wafer === id);
  const bad = rows.filter((r) => r.reading > r.limit);
  const wafer = WAFERS.find((w) => w.id === id)!;
  const top = wafer.factors[0];
  const tools: ToolCall[] = [
    { tool: 'get_step_history', result: rows.map((r) => `${r.step} on ${r.tool}: ${one(r.reading)} against ${one(r.limit)}`).join('; ') },
    { tool: 'find_excursions', result: bad.map((r) => `${r.step} on ${r.tool}: ${one(r.reading)} over the ${one(r.limit)} limit`).join('; ') },
    { tool: 'get_risk_factors', result: `${id}: ${wafer.factors.map((f) => `${f.label} ${two(f.weight)}`).join(', ')}` },
  ];
  const b = bad[0];
  const text = `${id} went out of limit at ${b.step} on ${b.tool}: ${one(b.reading)} against a limit of ${one(b.limit)}. The largest risk factor was ${top.label.toLowerCase()}, weight ${two(top.weight)}.`;
  return { tools, text };
}

function worstTool(): { tools: ToolCall[]; text: string } {
  const sorted = [...TOOL_FAIL_RATES].sort((a, b) => b.failRate - a.failRate);
  const top = sorted[0];
  const next = sorted[1];
  const tools: ToolCall[] = [
    { tool: 'get_tool_fail_rates', result: sorted.map((t) => `${t.tool} ${pct(t.failRate)} (${t.wafers} wafers)`).join(', ') },
    { tool: 'rank_tools', result: `${top.tool} first at ${pct(top.failRate)}, then ${next.tool} at ${pct(next.failRate)}` },
  ];
  const text = `${top.tool} has the highest failure rate at ${pct(top.failRate)} across ${top.wafers} wafers. The next is ${next.tool} at ${pct(next.failRate)}.`;
  return { tools, text };
}

function lookFirst(): { tools: ToolCall[]; text: string } {
  const top = [...WAFERS].sort((a, b) => b.score - a.score).slice(0, 3);
  const tools: ToolCall[] = [
    { tool: 'get_wafer_scores', result: `${WAFERS.length} wafers scored` },
    { tool: 'rank_wafers', result: top.map((w) => `${w.id} ${two(w.score)}`).join(', ') },
  ];
  const text = `Start with ${top.map((w) => `${w.id} (${two(w.score)})`).join(', then ')}. They have the highest risk scores of the ${WAFERS.length} wafers.`;
  return { tools, text };
}

export function answerFor(question: string): { tools: ToolCall[]; text: string } | null {
  if (question === PRESETS[0]) return whyFailed();
  if (question === PRESETS[1]) return worstTool();
  if (question === PRESETS[2]) return lookFirst();
  return null;
}

export function ask(state: ChatState, question: string): ChatState {
  const a = answerFor(question);
  if (!a) return state;
  const last = state.log[state.log.length - 1];
  const turn = (last?.turn ?? 0) + 1;
  return { log: [...state.log, { turn, question, ...a }].slice(-MAX_TURNS) };
}
