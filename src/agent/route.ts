import { normalize } from './normalize';
import type { Intent, Route, Snapshot } from './types';

export const COMMANDS = [
  { name: '/help', description: 'the command list' },
  { name: '/experience', description: 'roles and what shipped in them' },
  { name: '/projects', description: 'projects and how they were built' },
  { name: '/resume', description: 'the resume, summarized' },
  { name: '/about', description: 'background' },
  { name: '/skills', description: 'technical skills' },
  { name: '/contact', description: 'how to reach Andrian' },
  { name: '/clear', description: 'clear the screen' },
  { name: '/sound on|off', description: 'toggle the blip' },
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

const REFUSE_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|any\s+)?(of\s+)?(the\s+)?(previous|prior|earlier|above)\s+(instructions|prompts?|rules?|directions)/,
  /(system|initial|hidden)\s+prompt/,
  /reveal\s+(your|the)\s+(prompt|instructions|rules)/,
  /(salary|compensation|remuneration|pay\s+rate|how\s+much\s+do\s+you\s+(get|earn))/,
  /(social\s+security|ssn|bank\s+account|credit\s+card|password|api\s*key|secret\s+key)/,
  /(home\s+address|personal\s+(email|phone|number)|phone\s+number|private\s+(details?|info))/,
  /(act\s+as|pretend\s+(to\s+be|you)|roleplay|role-play|from\s+now\s+on\s+you\s+are)/,
  /(jailbreak|developer\s+mode|dan\s+mode)/,
];

const INTENT_RULES: { intent: Intent; pattern: RegExp }[] = [
  { intent: 'help', pattern: /\b(help|commands?|usage|what\s+can\s+(you|i)\s+do)\b/ },
  { intent: 'resume', pattern: /\b(resume|cv|curriculum\s+vitae)\b/ },
  { intent: 'contact', pattern: /\b(contact|email|e-mail|linkedin|github|reach\s+out|get\s+in\s+touch|hire|message\s+me|talk\s+to\s+you)\b/ },
  { intent: 'experience', pattern: /\b(experience|experiences|jobs?|roles?|internships?|employment|worked|work\s+history|where\s+did\s+you\s+work)\b/ },
  { intent: 'projects', pattern: /\b(projects?|portfolio|built|build|repos?|repositories)\b/ },
  { intent: 'skills', pattern: /\b(skills?|stack|tech|technologies|technological|languages?|frameworks?|tools?)\b/ },
  { intent: 'about', pattern: /\b(about|who\s+are\s+you|introduce\s+yourself|yourself|bio|story|tell\s+me\s+about)\b/ },
];

interface Entity {
  term: string;
  intent: Intent;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function containsTerm(text: string, term: string): boolean {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(term.toLowerCase())}(?![a-z0-9])`);
  return pattern.test(text);
}

function entities(snapshot: Snapshot): Entity[] {
  const found: Entity[] = [];
  for (const chunk of snapshot.chunks) {
    if (chunk.kind !== 'role' && chunk.kind !== 'project') continue;
    const intent: Intent = chunk.kind === 'role' ? 'experience' : 'projects';
    const terms = [chunk.title];
    const slug = chunk.id.split('#')[0].split(':')[1];
    if (slug) terms.push(slug);
    const words = chunk.title.split(/\s+/);
    if (words.length > 2) terms.push(words.slice(0, 2).join(' '));
    for (const term of terms) found.push({ term, intent });
  }
  return found.sort((a, b) => b.term.length - a.term.length);
}

function findEntity(snapshot: Snapshot, text: string): Entity | null {
  for (const entity of entities(snapshot)) {
    if (containsTerm(text, entity.term)) return entity;
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
    case '/projects':
    case '/resume':
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
  if (entity && (intent === 'about' || intent === 'search' || intent === 'projects')) {
    return { intent: entity.intent, args: [entity.term], query: normalized.raw };
  }
  return { intent, args: matched ? [matched] : [], query: normalized.raw };
}

export function describeRoute(route: Route): string {
  if (route.intent === 'refuse') return `refused: ${route.args[0] ?? 'out of scope'}`;
  const command = route.query.trim().split(/\s+/)[0] ?? '';
  if (command.startsWith('/')) return `routed to ${route.intent} (${command})`;
  if (route.args.length) return `routed to ${route.intent} (matched "${route.args[0]}")`;
  return `routed to ${route.intent}`;
}
