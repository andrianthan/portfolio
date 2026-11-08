/** The home chat shows the question and the answer; the agent's routing trace stays in the full terminal. */
export function visibleLines<T extends { kind: string }>(lines: T[]): T[] {
  return lines.filter((line) => line.kind !== 'trace');
}

/** The first few lines of a long answer, cut at a sentence if there is a sensible one. */
export function clipAnswer(text: string, max = 320): { text: string; clipped: boolean } {
  if (text.length <= max) return { text, clipped: false };
  const head = text.slice(0, max);
  const sentence = [...head.matchAll(/[.!?](?=\s)/g)].pop();
  let cut = head;
  if (sentence && sentence.index !== undefined && sentence.index + 1 >= 120) cut = head.slice(0, sentence.index + 1);
  else {
    const space = head.lastIndexOf(' ');
    if (space > 0) cut = head.slice(0, space);
  }
  return { text: `${cut.trimEnd()}…`, clipped: true };
}

/**
 * The render decision for one answer line: which text to show, and whether the
 * "Show more" / "Show less" toggle appears next to it.
 */
export function renderAnswer(text: string, expanded: boolean): { text: string; showToggle: boolean; expanded: boolean } {
  const clipped = clipAnswer(text);
  if (!clipped.clipped) return { text, showToggle: false, expanded: false };
  return { text: expanded ? text : clipped.text, showToggle: true, expanded };
}
