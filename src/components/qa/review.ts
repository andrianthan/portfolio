export const LOW_CONFIDENCE = 0.6;

export interface Item { id: string; label: string; confidence: number }
export type Verdict = { kind: 'accept' } | { kind: 'reject' } | { kind: 'relabel'; label: string };
export interface State { items: Item[]; verdicts: Record<string, Verdict>; history: string[] }
export type Action =
  | { type: 'accept' }
  | { type: 'reject' }
  | { type: 'relabel'; label: string }
  | { type: 'undo' }
  | { type: 'reset' };

export function init(items: Item[]): State {
  return { items, verdicts: {}, history: [] };
}

export function current(s: State): Item | null {
  return s.items.find((i) => !s.verdicts[i.id]) ?? null;
}

function decide(s: State, v: Verdict): State {
  const it = current(s);
  if (!it) return s;
  return { ...s, verdicts: { ...s.verdicts, [it.id]: v }, history: [...s.history, it.id] };
}

export function reduce(s: State, a: Action): State {
  switch (a.type) {
    case 'accept': return decide(s, { kind: 'accept' });
    case 'reject': return decide(s, { kind: 'reject' });
    case 'relabel': {
      const label = a.label.trim();
      return label ? decide(s, { kind: 'relabel', label }) : s;
    }
    case 'undo': {
      const last = s.history[s.history.length - 1];
      if (!last) return s;
      const { [last]: _gone, ...rest } = s.verdicts;
      return { ...s, verdicts: rest, history: s.history.slice(0, -1) };
    }
    case 'reset': return init(s.items);
  }
}

export function stats(s: State) {
  const reviewed = s.history.length;
  const accepted = s.items.filter((i) => s.verdicts[i.id]?.kind === 'accept');
  return {
    reviewed,
    total: s.items.length,
    agreement: reviewed === 0 ? null : Math.round((accepted.length / reviewed) * 100),
    secondLook: accepted.filter((i) => i.confidence < LOW_CONFIDENCE).length,
    done: reviewed === s.items.length,
  };
}
