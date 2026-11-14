export type Phase = 'idle' | 'generating' | 'ready';
export interface SlideState { phase: Phase; step: number; template: string }

export const TEMPLATES: readonly string[] = ['Executive weekly', 'Accessories KPI'];
export const STEPS: readonly string[] = ['Read weekly data', 'Draw charts', 'Fill the template', 'Write the deck'];

/** The note under the controls while the deck is generating. */
export const GENERATING_NOTE = 'Template and Regenerate deck are disabled while the deck is generating.';

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

/**
 * The status line under the step list.
 *
 * The finished count comes from the state and the total from the step list,
 * so the two numbers are separate facts rather than the same one twice.
 */
export function statusText(s: SlideState): string {
  if (s.phase === 'idle') return 'Pick a template, then press Regenerate deck.';
  if (s.phase === 'generating') return `Step ${s.step + 1} of ${STEPS.length}: ${STEPS[s.step]}`;
  return `Deck ready: ${s.step} of ${STEPS.length} steps done.`;
}

/**
 * Whether the reader has asked for reduced motion.
 *
 * Read at the moment it is needed rather than cached at mount, so a change to
 * the setting at runtime takes effect without a reload.
 */
export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Whether the deck advances on its own. */
export function autoAdvance(phase: Phase, prefersReducedMotion: boolean): boolean {
  return phase === 'generating' && !prefersReducedMotion;
}
