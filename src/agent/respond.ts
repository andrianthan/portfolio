import { helpText } from './route';
import type { Ranked } from './tools';
import type { Route, Source } from './types';

export interface Answer {
  text: string;
  sources: Source[];
}

export const REFUSAL_TEXT = "I only answer from this portfolio's published content. Try /help.";

export const COFFEE = [
  '      )  (',
  '     (   )',
  '      \\___/',
  '    | ~~~~~ |',
  '    |  cup  |',
].join('\n');

function list(chunks: Ranked[]): Answer {
  return {
    text: chunks.map(({ chunk }) => `${chunk.title}\n${chunk.text}`).join('\n\n'),
    sources: chunks.map(({ chunk }) => ({ title: chunk.title, url: chunk.url })),
  };
}

function easter(route: Route, chunks: Ranked[]): Answer {
  const kind = route.args[0];
  if (kind === 'coffee') return { text: COFFEE, sources: [] };
  if (kind === 'whoami') {
    const chunk = chunks[0]?.chunk;
    if (!chunk) return { text: '', sources: [] };
    const line = chunk.text.split('\n').map((part) => part.trim()).find((part) => part.length > 0) ?? '';
    return { text: line, sources: [{ title: chunk.title, url: chunk.url }] };
  }
  return list(chunks);
}

export function respond(route: Route, chunks: Ranked[]): Answer {
  if (route.intent === 'help') return { text: helpText(), sources: [] };
  if (route.intent === 'easter') return easter(route, chunks);
  return list(chunks);
}
