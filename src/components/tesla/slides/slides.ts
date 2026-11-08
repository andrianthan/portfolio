export type Phase = 'idle' | 'generating' | 'ready';
export interface SlideState { phase: Phase; step: number; template: string }

export const TEMPLATES: readonly string[] = ['Executive weekly', 'Accessories KPI'];
export const STEPS: readonly string[] = ['Read weekly data', 'Draw charts', 'Fill the template', 'Write the deck'];

export const initialState: SlideState = { phase: 'idle', step: 0, template: TEMPLATES[0] };

export function selectTemplate(s: SlideState, t: string): SlideState {
  if (s.phase === 'generating' || !TEMPLATES.includes(t)) return s;
  return { phase: 'idle', step: 0, template: t };
}

export function start(s: SlideState): SlideState {
  if (s.phase === 'generating') return s;
  return { ...s, phase: 'generating', step: 0 };
}

export function tick(s: SlideState): SlideState {
  if (s.phase !== 'generating') return s;
  const step = s.step + 1;
  return step >= STEPS.length ? { ...s, step: STEPS.length, phase: 'ready' } : { ...s, step };
}

export function downloadName(s: SlideState): string | null {
  if (s.phase !== 'ready') return null;
  return `deck-${s.template.toLowerCase().trim().replace(/\s+/g, '-')}.pptx`;
}
