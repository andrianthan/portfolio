import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createBlip, readSound, writeSound } from './sound';

// Node ships a global `localStorage` that throws when it has no backing file,
// so every test starts from a clean slate: no window, no storage.
beforeEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('sound preference', () => {
  it('defaults to off when there is no storage', () => {
    expect(readSound()).toBe('off');
  });

  it('survives a storage that throws', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    };
    expect(readSound()).toBe('off');
    expect(() => writeSound('on')).not.toThrow();
  });

  it('round trips a stored preference', () => {
    const store: Record<string, string> = {};
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem(key: string) { return store[key] ?? null; },
      setItem(key: string, value: string) { store[key] = value; },
    };
    writeSound('on');
    expect(readSound()).toBe('on');
    writeSound('off');
    expect(readSound()).toBe('off');
  });
});

describe('blip', () => {
  it('returns null when there is no web audio', () => {
    expect(createBlip()).toBeNull();
  });

  it('plays a short blip through the audio context', () => {
    const started: number[] = [];
    class FakeOscillator {
      frequency = { value: 0 };
      type = '';
      connect() { return this; }
      start() { started.push(1); }
      stop() { /* noop */ }
    }
    class FakeGain {
      gain = { setValueAtTime() { /* noop */ }, exponentialRampToValueAtTime() { /* noop */ } };
      connect() { return this; }
    }
    class FakeContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() { return new FakeOscillator(); }
      createGain() { return new FakeGain(); }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    (globalThis as { window?: unknown }).window = { AudioContext: FakeContext };
    const blip = createBlip();
    expect(blip).not.toBeNull();
    blip!.play();
    expect(started).toHaveLength(1);
    blip!.close();
  });
});
