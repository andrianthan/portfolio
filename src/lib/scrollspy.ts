/** The section the reader is in: the last one whose top has reached `offset`. `tops` is in document order. */
export function activeSection(tops: { id: string; top: number }[], offset: number): string {
  let active = tops[0]?.id ?? '';
  for (const s of tops) if (s.top <= offset) active = s.id;
  return active;
}
