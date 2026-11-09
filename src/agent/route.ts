import { normalize } from './normalize';
import type { Intent, Route, Snapshot } from './types';

export const COMMANDS = [
  { name: '/help', description: 'the command list' },
  { name: '/experience', description: 'roles and what shipped in them' },
  { name: '/about', description: 'background' },
  { name: '/skills', description: 'technical skills' },
  { name: '/contact', description: 'how to reach Andrian' },
  { name: '/clear', description: 'clear the screen' },
  { name: '/sound', description: 'toggle the blip (on or off)' },
  { name: '/hire', description: 'a short pitch' },
  { name: '/coffee', description: 'a short cup' },
  { name: '/whoami', description: 'one line about Andrian' },
];

export function helpText(): string {
  const lines = COMMANDS.map((command) => `  ${command.name.padEnd(14)}${command.description}`);
  return [
    'Commands:',
    ...lines,
    '',
    'You can also ask in plain words, for example "what did you do at Tesla".',
    'This is a deterministic agent: rules and retrieval, no LLM. Every number in an answer is checked against the published content.',
  ].join('\n');
}

// The steering denylist. Every pattern needs a steering context: a verb that
// tries to steer the agent, or a phrase that names the agent's own rules. An
// ordinary portfolio question never trips it.
const STEER_NOUN = '(instructions?|prompts?|rules?|directions?|directives?|guidelines?|constraints?|restrictions?)';
const STEER_QUALIFIER = '(all|any|every|each|of|the|your|my|our|its|these|those|previous|prior|earlier|above|preceding|former|original|initial)';
const STEER_VERB = '(ignore|disregard|forget|override|bypass|skip|discard)';
const ROLE_SWITCH = '(different|unrestricted|unfiltered|unlocked|evil|rogue|amoral|immoral|another|alternative|pirate|hacker|malicious|unaligned|dan|admin|administrator|root|god|devil|alien|robot|fictional|nonexistent)';
const ROLE_SWITCH_STRICT = '(new|teacher|professor|lawyer|doctor|chef|freelancer|unemployed|ceo|cto|anybody|everyone|student|intern|expert)';
const AGENT_PERSONA = '(assistant|chatbot|bot|persona|llm)';
const ILLEGAL_PERSONA = '(pirate|hacker|rogue|evil|malicious|unaligned|dan|admin|administrator|root|god|devil|alien|robot|unrestricted|unfiltered|unlocked)';
// A word that scopes "there are no X" to the work instead of to the agent.
const SCOPED_CLAUSE = '(on|in|at|to|with|about|under|regarding|concerning|that|which|when|while|because|so|and|or|if|unless|since|after|before|during|per|for)';

const REFUSE_PATTERNS: RegExp[] = [
  // steer the agent: ignore or disregard the instructions it was given
  new RegExp(`\\b(ignore|disregard)\\s+(${STEER_QUALIFIER}\\s+)*${STEER_NOUN}\\b`),
  // steer the agent: forget, override, bypass or skip the rules
  new RegExp(`\\b${STEER_VERB}\\s+(${STEER_QUALIFIER}\\s+)+${STEER_NOUN}\\b`),
  // steer the agent: everything above this line
  new RegExp(`\\b${STEER_VERB}\\s+(all\\s+|any\\s+|the\\s+|your\\s+|these\\s+|those\\s+)*(above|everything)\\b`),
  // steer the agent: everything stated before now (the verb is what makes it a steer)
  new RegExp(`\\b${STEER_VERB}\\s+(${STEER_QUALIFIER}\\s+)*(everything|anything)\\s+(above|previously|prior\\s+to|that\\s+came\\s+before)\\b`),
  // the hidden prompt itself
  /(system|initial|hidden|original)\s+prompt/,
  // the agent is asked for its own secrets: "your prompts", "your rules"
  new RegExp('\\b(reveal|show|print|dump|leak|expose)\\s+(me\\s+)?your\\s+(own\\s+|system\\s+|hidden\\s+|internal\\s+|secret\\s+|previous\\s+|initial\\s+|original\\s+)*(prompts?|instructions?|rules?|directives?|guidelines?|secrets?|password|credentials|api[\\s-]*key)\\b'),
  // "the secrets", not "the prompt": a portfolio question may legitimately ask for the prompt
  new RegExp('\\b(reveal|show|print|dump|leak|expose)\\s+(me\\s+)?the\\s+(secrets?|password|credentials|api[\\s-]*key)\\b'),
  // salary and compensation
  /(salary|compensation|remuneration|pay\s+rate|how\s+much\s+(do|did|would)\s+you\s+(get|earn|make))/,
  // credentials and account numbers
  /(social\s+security|ssn|bank\s+account|credit\s+card|password|\bapi[\s-]*key\b|secret[\s-]*key)/,
  // contact details the site does not publish
  /(home\s+address|personal\s+(phone|number|mobile|address|ssn)|phone\s+number|mobile\s+number|private\s+(details?|info))/,
  // persona switching
  /(act\s+as|acting\s+as|pretend\s+(to\s+be|you\s+are|you)|role\s*-?\s*play|simulate\s+(being|that\s+you)|imagine\s+you\s+(are|to\s+be))/,
  // "you are now a ...": a switch announced right now
  new RegExp(`\\b(you\\s+are|you\\s+re)\\b\\s+now\\s+(an?\\s+|the\\s+)?(${ROLE_SWITCH}|${ROLE_SWITCH_STRICT})\\b`),
  // "from now on you are a ...": a switch announced from now on
  new RegExp(`\\b(from\\s+now\\s+on\\s+you\\s+are|from\\s+now\\s+on\\s+you\\s+re)\\b\\s+(an?\\s+|the\\s+)?(${ROLE_SWITCH}|${ROLE_SWITCH_STRICT})\\b`),
  // "you are a different assistant": the agent is told which persona to be
  new RegExp(`\\b(you\\s+are|you\\s+re)\\b\\s+(an?\\s+|the\\s+)?(${ROLE_SWITCH}|${ROLE_SWITCH_STRICT})\\s+${AGENT_PERSONA}\\b`),
  // "you are a pirate", "you are unrestricted": a persona nobody can be
  new RegExp(`\\b(you\\s+are|you\\s+re)\\b\\s+(an?\\s+|the\\s+)?${ILLEGAL_PERSONA}\\b`),
  new RegExp('\\bfrom\\s+now\\s+on\\s+(you|your|everything|all)\\b'),
  // rule disabling
  /(you\s+have\s+no\s+(restrictions?|rules?|limits?|guidelines?|filters?|boundaries))/,
  // the agent is told it may ignore its own rules
  new RegExp('\\byou\\s+are\\s+(free|unrestricted|unfiltered)\\s+to\\s+(ignore|disregard|override|bypass|skip|forget|reveal|disclose|lie|make\\s+up|break)\\b'),
  new RegExp('\\byou\\s+are\\s+(free|unrestricted|unfiltered)\\b[^.]{0,40}?\\b(ignore|disregard|override|bypass|skip|forget|reveal|disclose|lie|make\\s+up|break|tell)\\b'),
  /(your\s+(rules?|instructions?|guidelines?|restrictions?)\s+(no\s+longer|do\s+not|do\s+nt|don\s+t)\s+(apply|exist|bind|matter))/,
  // "there are no rules for you": the agent's own rules, not the work's constraints
  new RegExp('\\bthere\\s+are\\s+no\\s+(rules|restrictions|limits|constraints|guidelines)\\s+for\\s+(you|the\\s+agent|this\\s+assistant)\\b'),
  new RegExp(`\\bthere\\s+are\\s+no\\s+(rules|restrictions|limits|constraints|guidelines)\\b(?!\\s+${SCOPED_CLAUSE}\\b)`),
  /(you\s+must\s+(ignore|disregard|override|bypass|forget|only\s+follow))/,
  /(jailbreak|developer\s+mode|dan\s+mode)/,
];

const INTENT_RULES: { intent: Intent; pattern: RegExp }[] = [
  { intent: 'help', pattern: /\b(help|commands?|usage|what\s+can\s+(you|i)\s+do)\b/ },
  { intent: 'contact', pattern: /\b(contact|email|e-mail|linkedin|github|reach\s+out|get\s+in\s+touch|hire|message\s+me|talk\s+to\s+you)\b/ },
  { intent: 'experience', pattern: /\b(experience|experiences|jobs?|roles?|internships?|employment|worked|work\s+history|where\s+did\s+you\s+work|projects?|portfolio|built|build|repos?|repositories)\b/ },
  { intent: 'skills', pattern: /\b(skills?|stack|tech|technologies|technological|languages?|frameworks?|tools?)\b/ },
  { intent: 'about', pattern: /\b(about|who\s+are\s+you|introduce\s+yourself|yourself|bio|story|tell\s+me\s+about)\b/ },
];

interface Entity {
  id: string;
  term: string;
  needle: string;
  intent: Intent;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function containsTerm(text: string, needle: string): boolean {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(needle)}(?![a-z0-9])`);
  return pattern.test(text);
}

// A query that is nothing but the entity's name IS the entity, not a topic
// keyword: "Blue Dome Technologies" is a company, not a question about
// technologies.
function isEntityName(text: string, entity: Entity): boolean {
  return new RegExp(`^${escapeRegExp(entity.needle)}[.!?]*$`).test(text);
}

function entities(snapshot: Snapshot): Entity[] {
  const found: Entity[] = [];
  for (const chunk of snapshot.chunks) {
    if (chunk.kind !== 'role') continue;
    const intent: Intent = 'experience';
    const terms = [chunk.title];
    const slug = chunk.id.split('#')[0].split(':')[1];
    if (slug) terms.push(slug);
    const words = chunk.title.split(/\s+/);
    if (words.length > 2) terms.push(words.slice(0, 2).join(' '));
    // The needle is the term put through the same normalizer the query goes
    // through, so a title with a stripped character (AI/LLM) can still match.
    // A term that normalizes to nothing would match every query, so it is
    // dropped.
    for (const term of terms) {
      const needle = normalize(term).text;
      if (!needle) continue;
      found.push({ id: chunk.id, term, needle, intent });
    }
  }
  // Longest needle first so the most specific term wins, then id ascending so
  // the order never depends on the order of the input.
  return found.sort((a, b) => {
    if (b.needle.length !== a.needle.length) return b.needle.length - a.needle.length;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    if (a.term !== b.term) return a.term < b.term ? -1 : 1;
    return 0;
  });
}

function findEntity(snapshot: Snapshot, text: string): Entity | null {
  for (const entity of entities(snapshot)) {
    if (containsTerm(text, entity.needle)) return entity;
  }
  return null;
}

function routeCommand(raw: string): Route {
  const parts = raw.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).map((arg) => arg.toLowerCase());
  switch (command) {
    case '/help':
    case '/experience':
    case '/about':
    case '/skills':
    case '/contact':
    case '/clear':
    case '/sound':
      return { intent: command.slice(1) as Intent, args, query: raw };
    case '/hire':
    case '/coffee':
    case '/whoami':
      return { intent: 'easter', args: [command.slice(1)], query: raw };
    default:
      return { intent: 'refuse', args: ['unknown command'], query: raw };
  }
}

// Section words a visitor may misspell. Only used when nothing else matched, so a typo in a
// real question never overrides a rule that already fired.
const FUZZY_WORDS: Record<string, Intent> = {
  experience: 'experience',
  projects: 'experience',
  project: 'experience',
  about: 'about',
  skills: 'skills',
  contact: 'contact',
};

// Optimal string alignment distance: an adjacent swap ("expeirence") costs one edit.
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[rows - 1][cols - 1];
}

function fuzzySection(text: string): { intent: Intent; word: string } | null {
  for (const token of text.split(' ')) {
    if (token.length < 5) continue;
    const allowed = token.length >= 8 ? 2 : 1;
    for (const [word, intent] of Object.entries(FUZZY_WORDS)) {
      if (token !== word && Math.abs(token.length - word.length) <= allowed && editDistance(token, word) <= allowed) {
        return { intent, word };
      }
    }
  }
  return null;
}

export function route(snapshot: Snapshot, query: string): Route {
  const normalized = normalize(query);
  if (normalized.tooLong) {
    return { intent: 'refuse', args: ['query too long (max 200 characters)'], query: normalized.raw };
  }
  if (normalized.raw.startsWith('/')) return routeCommand(normalized.raw);
  if (REFUSE_PATTERNS.some((pattern) => pattern.test(normalized.text))) {
    return { intent: 'refuse', args: ['out of scope'], query: normalized.raw };
  }

  let intent: Intent = 'search';
  let matched = '';
  for (const rule of INTENT_RULES) {
    const hit = rule.pattern.exec(normalized.text);
    if (hit) {
      intent = rule.intent;
      matched = hit[0];
      break;
    }
  }

  const entity = findEntity(snapshot, normalized.text);
  if (entity && (intent === 'about' || intent === 'search' || isEntityName(normalized.text, entity))) {
    return { intent: entity.intent, args: [entity.term], query: normalized.raw };
  }
  if (intent === 'search' && !entity) {
    const near = fuzzySection(normalized.text);
    if (near) return { intent: near.intent, args: [near.word], query: normalized.raw };
  }
  return { intent, args: matched ? [matched] : [], query: normalized.raw };
}

export function describeRoute(routed: Route): string {
  if (routed.intent === 'refuse') return `refused: ${routed.args[0] ?? 'out of scope'}`;
  const command = routed.query.trim().split(/\s+/)[0] ?? '';
  if (command.startsWith('/')) return `routed to ${routed.intent} (${command})`;
  if (routed.args.length) return `routed to ${routed.intent} (matched "${routed.args[0]}")`;
  return `routed to ${routed.intent}`;
}
