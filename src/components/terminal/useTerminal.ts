import { useCallback, useEffect, useRef, useState } from 'react';
import { runAgent } from '../../agent/run';
import { isBareRoute } from '../../agent/navigate';
import type { NavTarget, Snapshot, Source } from '../../agent/types';
import { createBlip, readSound, writeSound, type Blip } from './sound';

export const COMMANDS = [
  '/help', '/experience', '/projects', '/resume', '/about', '/skills',
  '/contact', '/clear', '/sound', '/hire', '/coffee', '/whoami',
];

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const REVEAL_MS = 120;

export interface LogLine {
  id: number;
  kind: 'input' | 'trace' | 'answer';
  text: string;
  status?: 'ok' | 'fail' | 'info';
  sources?: Source[];
  refused?: boolean;
}

export function completeCommand(input: string, commands: string[] = COMMANDS): string {
  const value = input.trim();
  if (!value.startsWith('/')) return input;
  const matches = commands.filter((command) => command.startsWith(value));
  if (matches.length === 0) return input;
  if (matches.length === 1) return matches[0];
  const common = matches.reduce((carry, command) => {
    let index = 0;
    while (index < carry.length && index < command.length && carry[index] === command[index]) index += 1;
    return carry.slice(0, index);
  }, matches[0]);
  return common.length > value.length ? common : input;
}

export function recall(history: string[], index: number, direction: 1 | -1): { value: string; index: number } {
  if (!history.length) return { value: '', index: -1 };
  // history[0] is the newest command: ArrowUp (-1) walks toward older entries,
  // ArrowDown (1) walks back toward the empty draft.
  if (direction === -1) {
    const next = Math.min(index + 1, history.length - 1);
    return { value: history[next], index: next };
  }
  const next = index - 1;
  if (next < 0) return { value: '', index: -1 };
  return { value: history[next], index: next };
}

let snapshotCache: Snapshot | null = null;

export function getSnapshot(): Promise<Snapshot> {
  if (!snapshotCache) {
    snapshotCache = fetch('/agent-data.json')
      .then((response) => {
        if (!response.ok) throw new Error('agent data unavailable');
        return response.json() as Promise<Snapshot>;
      })
      .catch((error) => {
        snapshotCache = null;
        throw error;
      });
  }
  return snapshotCache;
}

export interface TerminalOptions {
  /** Run /help on mount. The embedded home-page panel leaves the log empty instead. */
  autoHelp?: boolean;
  /** Called for a bare route (a slash command or one word) that has a place on the page. */
  onNavigate?: (target: NavTarget) => void;
}

export function useTerminal({ autoHelp = true, onNavigate }: TerminalOptions = {}) {
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;
  const [lines, setLines] = useState<LogLine[]>([]);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [spinner, setSpinner] = useState(SPINNER_FRAMES[0]);
  const [soundOn, setSoundOn] = useState(false);

  const history = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const nextId = useRef(0);
  const pending = useRef<LogLine[]>([]);
  const timer = useRef<number | null>(null);
  const blip = useRef<Blip | null>(null);
  const reduced = useRef(false);
  const soundRef = useRef(false);
  const spinnerTimer = useRef<number | null>(null);

  const ensureBlip = useCallback((): Blip | null => {
    if (!blip.current) blip.current = createBlip();
    return blip.current;
  }, []);

  const play = useCallback(() => {
    if (!soundRef.current) return;
    try {
      ensureBlip()?.play();
    } catch {
      /* a failed blip must never break the reveal */
    }
  }, [ensureBlip]);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!pending.current.length) return;
    const items = pending.current;
    pending.current = [];
    setLines((previous) => [...previous, ...items]);
  }, []);

  const enqueue = useCallback((items: LogLine[]) => {
    if (reduced.current) {
      setLines((previous) => [...previous, ...items]);
      return;
    }
    pending.current.push(...items);
    if (timer.current !== null) return; // a reveal is already running; it drains the queue
    const step = () => {
      const next = pending.current.shift();
      if (!next) {
        timer.current = null;
        return;
      }
      setLines((previous) => [...previous, next]);
      play();
      timer.current = setTimeout(step, REVEAL_MS) as unknown as number;
    };
    timer.current = setTimeout(step, REVEAL_MS) as unknown as number;
  }, [play]);

  const applySound = useCallback((next: 'on' | 'off' | 'toggle') => {
    const current = readSound();
    const state = next === 'toggle' ? (current === 'on' ? 'off' : 'on') : next;
    writeSound(state);
    soundRef.current = state === 'on';
    setSoundOn(state === 'on');
    if (state === 'on') ensureBlip();
  }, [ensureBlip]);

  const submit = useCallback(async (raw?: string) => {
    const query = (raw ?? value).trim();
    if (!query) return;
    setValue('');
    history.current.unshift(query);
    historyIndex.current = -1;
    setLines((previous) => [...previous, { id: nextId.current++, kind: 'input', text: query }]);
    setBusy(true);
    try {
      const snapshot = await getSnapshot();
      const result = runAgent(snapshot, query);
      if (result.effects?.clear) {
        flush();
        pending.current = [];
        setLines([]);
        return;
      }
      if (result.effects?.sound) applySound(result.effects.sound);
      const target = result.effects?.navigate;
      if (target && navigateRef.current && isBareRoute(query)) {
        navigateRef.current(target);
        enqueue([{ id: nextId.current++, kind: 'trace', text: `→ ${target.label}`, status: 'ok' }]);
        return;
      }
      const items: LogLine[] = result.steps.map((step) => ({
        id: nextId.current++,
        kind: 'trace' as const,
        text: `${step.actor}: ${step.text}`,
        status: step.status,
      }));
      if (result.answer) {
        items.push({
          id: nextId.current++,
          kind: 'answer' as const,
          text: result.answer.text,
          sources: target && navigateRef.current
            ? [...result.answer.sources, { title: `open ${target.label}`, url: target.href }]
            : result.answer.sources,
          refused: result.refused,
        });
      }
      enqueue(items);
    } catch {
      enqueue([{ id: nextId.current++, kind: 'answer', text: 'The agent could not load its snapshot.', refused: true }]);
    } finally {
      setBusy(false);
    }
  }, [value, applySound, enqueue, flush]);

  const runCommand = useCallback((query: string) => {
    void submit(query);
  }, [submit]);

  const change = useCallback((next: string) => {
    setValue(next);
  }, []);

  const clear = useCallback(() => {
    flush();
    pending.current = [];
    setLines([]);
  }, [flush]);

  const keyDown = useCallback((event: { key: string; ctrlKey: boolean; preventDefault(): void }) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void submit();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const next = completeCommand(value);
      if (next !== value) setValue(next);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const recalled = recall(history.current, historyIndex.current, -1);
      historyIndex.current = recalled.index;
      setValue(recalled.value);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const recalled = recall(history.current, historyIndex.current, 1);
      historyIndex.current = recalled.index;
      setValue(recalled.value);
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clear();
    }
  }, [value, submit, clear]);

  const toggleSound = useCallback(() => {
    applySound('toggle');
  }, [applySound]);

  useEffect(() => {
    reduced.current = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    soundRef.current = readSound() === 'on';
    setSoundOn(soundRef.current);
    if (autoHelp) void submit('/help');
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      if (spinnerTimer.current !== null) clearInterval(spinnerTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reduced.current) {
      setSpinner('·');
      return;
    }
    if (!busy) return;
    let frame = 0;
    spinnerTimer.current = setInterval(() => {
      frame = (frame + 1) % SPINNER_FRAMES.length;
      setSpinner(SPINNER_FRAMES[frame]);
    }, REVEAL_MS) as unknown as number;
    return () => {
      if (spinnerTimer.current !== null) {
        clearInterval(spinnerTimer.current);
        spinnerTimer.current = null;
      }
    };
  }, [busy]);

  return { lines, value, busy, spinner, soundOn, change, submit, runCommand, keyDown, clear, flush, toggleSound };
}
