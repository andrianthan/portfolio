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

export function verify(answer: Answer, chunks: Chunk[]): VerifyResult {
  const grounding = chunks
    .map((chunk) => `${chunk.title} ${chunk.text} ${chunk.facts.join(' ')}`)
    .join(' ')
    .toLowerCase();

  const offending: string[] = [];
  for (const number of extractNumbers(answer.text)) {
    const token = number.toLowerCase();
    if (grounding.includes(token)) continue;
    const core = token.replace(/[^0-9,.]/g, '');
    if (core && grounding.includes(core)) continue;
    offending.push(number);
  }

  for (const source of answer.sources) {
    if (!chunks.some((chunk) => chunk.url === source.url)) offending.push(`source ${source.url}`);
  }

  return { ok: offending.length === 0, checked: extractNumbers(answer.text).length, offending };
}
