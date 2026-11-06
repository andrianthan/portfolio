import type { Answer } from './respond';
import type { Chunk } from './types';

export const NUMBER_PATTERN = /\$?\d[\d,]*(?:\.\d+)?(?:[kKmM])?[%+]?/g;

export function extractNumbers(text: string): string[] {
  return text.match(NUMBER_PATTERN) ?? [];
}

export interface VerifyResult {
  ok: boolean;
  checked: number;
  offending: string[];
}

// The published tokens of the retrieved chunks: every number-like token that
// appears in a chunk's title, text or facts. The facts array is the chunk's own
// extracted token set, so this is the set of numbers the site actually
// publishes for these chunks.
function publishedTokens(chunks: Chunk[]): Set<string> {
  const published = new Set<string>();
  for (const chunk of chunks) {
    for (const token of extractNumbers(`${chunk.title} ${chunk.text} ${chunk.facts.join(' ')}`)) {
      published.add(token.toLowerCase());
    }
  }
  return published;
}

// An answer may only carry a number the chunks publish, and it must carry it in
// the published form: "32%" grounds, "32" does not, because "32%" is not
// "32". A number the site never published is not a substring of a published
// one and is refused.
export function verify(answer: Answer, chunks: Chunk[]): VerifyResult {
  const published = publishedTokens(chunks);

  const offending: string[] = [];
  const tokens = extractNumbers(answer.text);
  for (const token of tokens) {
    if (!published.has(token.toLowerCase())) offending.push(token);
  }

  for (const source of answer.sources) {
    if (!chunks.some((chunk) => chunk.url === source.url)) offending.push(`source ${source.url}`);
  }

  return { ok: offending.length === 0, checked: tokens.length, offending };
}
