import { describeRoute, route } from './route';
import { REFUSAL_TEXT, respond, type Answer } from './respond';
import { about, contact, experience, projects, resume, search, skills, type Ranked } from './tools';
import { verify, type VerifyResult } from './verify';
import type { Actor, AgentResult, Chunk, Intent, Route, Snapshot, TraceStep } from './types';

// The intents answered by a tool, and the actor that reports each one in the
// trace. The `about` intent is served by the `search` actor because the
// Actor union has no `about` member. The intents that answer without a tool
// (help, clear, sound), the easter eggs and the refusals are handled on
// their own paths and are not listed here.
type ToolIntent = 'experience' | 'projects' | 'resume' | 'skills' | 'contact' | 'about' | 'search';

const ACTOR_BY_INTENT: Record<ToolIntent, Actor> = {
  experience: 'experience',
  projects: 'projects',
  resume: 'resume',
  skills: 'skills',
  contact: 'contact',
  about: 'search',
  search: 'search',
};

const TOOLS: Partial<Record<Intent, (snapshot: Snapshot, args: string[]) => Ranked[]>> = {
  experience,
  projects,
  resume,
  skills,
  contact,
  about,
};

function chunkLine(chunks: Ranked[]): string {
  if (!chunks.length) return 'no chunk matched';
  return `${chunks.length} chunk${chunks.length === 1 ? '' : 's'} (${chunks.map((entry) => entry.chunk.id).join(', ')})`;
}

function verifierLine(result: VerifyResult): string {
  return `${result.checked} number${result.checked === 1 ? '' : 's'} checked against sources ✓`;
}

// The one refusal the pipeline can return. Every path that refuses builds
// the answer here, so the copy lives in a single place.
function refusal(routed: Route, steps: TraceStep[]): AgentResult {
  return { route: routed, steps, answer: { text: REFUSAL_TEXT, sources: [] }, refused: true };
}

// Every answer leaves through here, so no path can return an answer the
// verifier did not ground. A failed verification is a refusal, not an answer.
function verified(routed: Route, steps: TraceStep[], answer: Answer, chunks: Chunk[]): AgentResult {
  const check = verify(answer, chunks);
  if (!check.ok) {
    steps.push({ actor: 'verifier', text: `ungrounded ${check.offending.join(', ')} ✗`, status: 'fail' });
    return refusal(routed, steps);
  }
  steps.push({ actor: 'verifier', text: verifierLine(check), status: 'ok' });
  return { route: routed, steps, answer, refused: false };
}

export function runAgent(snapshot: Snapshot, query: string): AgentResult {
  const steps: TraceStep[] = [];
  const routed = route(snapshot, query);

  if (routed.intent === 'refuse') {
    steps.push({ actor: 'orchestrator', text: `refused: ${routed.args[0] ?? 'out of scope'}`, status: 'fail' });
    return refusal(routed, steps);
  }

  if (routed.intent === 'clear') {
    steps.push({ actor: 'orchestrator', text: 'routed to clear', status: 'ok' });
    return { route: routed, steps, answer: null, refused: false, effects: { clear: true } };
  }

  if (routed.intent === 'sound') {
    const value = routed.args[0] === 'on' ? 'on' : routed.args[0] === 'off' ? 'off' : 'toggle';
    steps.push({ actor: 'orchestrator', text: `routed to sound (${value})`, status: 'ok' });
    return { route: routed, steps, answer: null, refused: false, effects: { sound: value } };
  }

  steps.push({ actor: 'orchestrator', text: describeRoute(routed), status: 'ok' });

  if (routed.intent === 'help') {
    return verified(routed, steps, respond(routed, []), []);
  }

  let chunks: Ranked[] = [];

  if (routed.intent === 'easter') {
    const kind = routed.args[0];
    if (kind === 'coffee') {
      steps.push({ actor: 'orchestrator', text: 'easter egg, no tools needed', status: 'info' });
      return verified(routed, steps, respond(routed, []), []);
    }
    // The whoami egg answers from the about chunk and the hire egg from the
    // contact chunk, so each reports under the actor of the tool it used.
    const tool = kind === 'whoami' ? 'about' : 'contact';
    chunks = tool === 'about' ? about(snapshot, []) : contact(snapshot, []);
    steps.push({ actor: ACTOR_BY_INTENT[tool], text: chunkLine(chunks), status: chunks.length ? 'ok' : 'fail' });
  } else if (routed.intent === 'search') {
    chunks = search(snapshot, routed.query);
    steps.push({ actor: ACTOR_BY_INTENT.search, text: chunkLine(chunks), status: chunks.length ? 'ok' : 'fail' });
  } else {
    const tool = TOOLS[routed.intent];
    chunks = tool ? tool(snapshot, routed.args) : [];
    steps.push({ actor: ACTOR_BY_INTENT[routed.intent], text: chunkLine(chunks), status: chunks.length ? 'ok' : 'fail' });
  }

  if (!chunks.length) {
    const refusalRoute: Route = { ...routed, intent: 'refuse', args: ['no matching content'] };
    steps.push({ actor: 'orchestrator', text: 'refused: no matching content', status: 'fail' });
    return refusal(refusalRoute, steps);
  }

  return verified(routed, steps, respond(routed, chunks), chunks.map((entry) => entry.chunk));
}
