/** The section the reader is in: the last one whose top has reached `offset`. `tops` is in document order. */
export function activeSection(tops: { id: string; top: number }[], offset: number, atBottom = false): string {
  let active = tops[0]?.id ?? '';
  for (const s of tops) if (s.top <= offset) active = s.id;
  if (atBottom && tops.length) {
    // The final section can be too short to ever reach the offset line: the page
    // ends first. At the bottom of the page it is what the reader is looking at.
    active = tops[tops.length - 1].id;
  }
  return active;
}
