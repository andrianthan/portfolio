import { describe, it, expect, afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { SOUND_KEY, createBlip, readSound, writeSound } from './sound';

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

// The globals above are removed for the duration of this file. Put back exactly
// what the runtime had — Node exposes `localStorage` as an accessor, so the
// descriptor is captured rather than the value — so nothing leaks into the
// rest of the suite.
let windowDescriptor: PropertyDescriptor | undefined;
let localStorageDescriptor: PropertyDescriptor | undefined;

beforeAll(() => {
  windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
});

afterAll(() => {
  if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
  else delete (globalThis as { window?: unknown }).window;
  if (localStorageDescriptor) Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
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
    expect(store[SOUND_KEY]).toBe('on');
    expect(readSound()).toBe('on');
    writeSound('off');
    // The raw stored value, not readSound(): only the exact string 'off' counts.
    expect(store[SOUND_KEY]).toBe('off');
  });

  it('reads any stored value that is not exactly "on" as off', () => {
    const store: Record<string, string> = { [SOUND_KEY]: 'ON' };
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem(key: string) { return store[key] ?? null; },
      setItem(key: string, value: string) { store[key] = value; },
    };
    expect(readSound()).toBe('off');
    store[SOUND_KEY] = 'true';
    expect(readSound()).toBe('off');
    store[SOUND_KEY] = '';
    expect(readSound()).toBe('off');
  });
});

describe('blip', () => {
  it('returns null when there is no web audio', () => {
    expect(createBlip()).toBeNull();
  });

  it('plays a short blip through the audio context', () => {
    const started: number[] = [];
    const connections: unknown[] = [];
    const destination = { id: 'destination' };
    const oscillators: FakeOscillator[] = [];
    const gains: FakeGain[] = [];

    class FakeOscillator {
      frequency = { value: 0 };
      type = '';
      connect(target: unknown) { connections.push(target); return target; }
      start() { started.push(1); }
      stop() { /* noop */ }
    }

    class FakeGain {
      gain = { setValueAtTime() { /* noop */ }, exponentialRampToValueAtTime() { /* noop */ } };
      connect(target: unknown) { connections.push(target); return target; }
    }

    class FakeContext {
      state = 'running';
      currentTime = 0;
      destination = destination;
      createOscillator() { const osc = new FakeOscillator(); oscillators.push(osc); return osc; }
      createGain() { const gain = new FakeGain(); gains.push(gain); return gain; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }

    (globalThis as { window?: unknown }).window = { AudioContext: FakeContext };
    const blip = createBlip();
    expect(blip).not.toBeNull();
    blip!.play();

    expect(started).toHaveLength(1);
    expect(oscillators).toHaveLength(1);
    expect(oscillators[0].type).toBe('square');
    expect(oscillators[0].frequency.value).toBe(660);
    // oscillator -> gain -> destination, in that order.
    expect(connections).toHaveLength(2);
    expect(connections[0]).toBe(gains[0]);
    expect(connections[1]).toBe(destination);

    blip!.close();
  });

  it('does not throw when the audio context constructor throws', () => {
    class ThrowingContext {
      constructor() { throw new Error('no audio device'); }
    }
    (globalThis as { window?: unknown }).window = { AudioContext: ThrowingContext };
    const blip = createBlip();
    expect(blip).not.toBeNull();
    expect(() => blip!.play()).not.toThrow();
    expect(() => blip!.close()).not.toThrow();
  });

  it('falls back to webkitAudioContext when AudioContext is absent', () => {
    const started: number[] = [];
    let constructed = 0;

    class FakeOscillator {
      frequency = { value: 0 };
      type = '';
      connect(target: unknown) { return target; }
      start() { started.push(1); }
      stop() { /* noop */ }
    }

    class FakeGain {
      gain = { setValueAtTime() { /* noop */ }, exponentialRampToValueAtTime() { /* noop */ } };
      connect(target: unknown) { return target; }
    }

    class FakeContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      constructor() { constructed += 1; }
      createOscillator() { return new FakeOscillator(); }
      createGain() { return new FakeGain(); }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }

    (globalThis as { window?: unknown }).window = { webkitAudioContext: FakeContext };
    const blip = createBlip();
    expect(blip).not.toBeNull();
    blip!.play();

    expect(constructed).toBe(1);
    expect(started).toHaveLength(1);

    blip!.close();
  });

  it('resumes a suspended context before playing', () => {
    let resumed = 0;

    class FakeOscillator {
      frequency = { value: 0 };
      type = '';
      connect(target: unknown) { return target; }
      start() { /* noop */ }
      stop() { /* noop */ }
    }

    class FakeGain {
      gain = { setValueAtTime() { /* noop */ }, exponentialRampToValueAtTime() { /* noop */ } };
      connect(target: unknown) { return target; }
    }

    class FakeContext {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      createOscillator() { return new FakeOscillator(); }
      createGain() { return new FakeGain(); }
      resume() { resumed += 1; return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }

    (globalThis as { window?: unknown }).window = { AudioContext: FakeContext };
    const blip = createBlip();
    expect(blip).not.toBeNull();
    blip!.play();

    expect(resumed).toBe(1);

    blip!.close();
  });

  it('keeps a rejected resume from becoming an unhandled rejection', () => {
    class FakeOscillator {
      frequency = { value: 0 };
      type = '';
      connect(target: unknown) { return target; }
      start() { /* noop */ }
      stop() { /* noop */ }
    }

    class FakeGain {
      gain = { setValueAtTime() { /* noop */ }, exponentialRampToValueAtTime() { /* noop */ } };
      connect(target: unknown) { return target; }
    }

    class FakeContext {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      createOscillator() { return new FakeOscillator(); }
      createGain() { return new FakeGain(); }
      resume() { return Promise.reject(new Error('resume blocked')); }
      close() { return Promise.reject(new Error('close blocked')); }
    }

    (globalThis as { window?: unknown }).window = { AudioContext: FakeContext };
    const blip = createBlip();
    expect(blip).not.toBeNull();
    expect(() => blip!.play()).not.toThrow();
    expect(() => blip!.close()).not.toThrow();
  });
});
