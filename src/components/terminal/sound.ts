export type SoundState = 'on' | 'off';

export const SOUND_KEY = 'term-sound';

export function readSound(): SoundState {
  try {
    return localStorage.getItem(SOUND_KEY) === 'on' ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

export function writeSound(state: SoundState): void {
  try { localStorage.setItem(SOUND_KEY, state); } catch { /* storage unavailable */ }
}

export interface Blip {
  play(): void;
  close(): void;
}

/**
 * Attach a no-op rejection handler so a failed resume/close never surfaces as an
 * unhandled promise rejection. Older or stubbed contexts may return a value that
 * is not a promise, so the guard is required rather than decorative.
 */
function silence(result: unknown): void {
  if (result && typeof (result as { catch?: unknown }).catch === 'function') {
    (result as Promise<unknown>).catch(() => {});
  }
}

export function createBlip(): Blip | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext };
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!Ctor) return null;
  let context: AudioContext | null = null;
  return {
    play() {
      try {
        if (!context) context = new Ctor();
        if (context.state === 'suspended') silence(context.resume());
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'square';
        oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.02);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.02);
      } catch {
        /* audio unavailable — a failed blip must never break the caller */
      }
    },
    close() {
      try {
        silence(context?.close());
      } catch {
        /* the context is already gone */
      }
      context = null;
    },
  };
}
