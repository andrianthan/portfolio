import { describe, it, expect } from 'vitest';
import { createElement, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { COMMANDS, completeCommand, recall, useTerminal } from './useTerminal';

describe('tab completion', () => {
  it('completes a unique command', () => {
    expect(completeCommand('/who')).toBe('/whoami');
    expect(completeCommand('/hel')).toBe('/help');
  });

  it('leaves an ambiguous command alone', () => {
    expect(completeCommand('/s')).toBe('/s');
  });

  it('leaves an unknown command alone', () => {
    expect(completeCommand('/zzz')).toBe('/zzz');
  });

  it('leaves plain text alone', () => {
    expect(completeCommand('tell me about tesla')).toBe('tell me about tesla');
  });

  it('lists every slash command the agent answers', () => {
    for (const command of ['/help', '/experience', '/resume', '/about', '/skills', '/contact', '/clear', '/sound', '/hire', '/coffee', '/whoami']) {
      expect(COMMANDS).toContain(command);
    }
  });
});

describe('history recall', () => {
  it('returns nothing for an empty history', () => {
    expect(recall([], -1, -1)).toEqual({ value: '', index: -1 });
  });

  it('walks up to the newest command first', () => {
    expect(recall(['newest', 'older'], -1, -1)).toEqual({ value: 'newest', index: 0 });
  });

  it('keeps walking up', () => {
    expect(recall(['newest', 'older'], 0, -1)).toEqual({ value: 'older', index: 1 });
  });

  it('walks back down to an empty draft', () => {
    expect(recall(['newest', 'older'], 0, 1)).toEqual({ value: '', index: -1 });
  });
});

interface KeyPress {
  prevented: number;
  value: string;
}

/**
 * Press a key in the chat input without a DOM: the hook is rendered on the
 * server, the draft is set during the first pass, and the key is pressed
 * during the second one. The event is a plain object that counts how often
 * the handler swallowed the key.
 */
function pressKey(input: string, key: string): KeyPress {
  const press: KeyPress = { prevented: 0, value: '' };
  const event = {
    key,
    ctrlKey: false,
    preventDefault() {
      press.prevented += 1;
    },
  };

  function Harness() {
    const terminal = useTerminal({ autoHelp: false });
    const pass = useRef(0);
    if (pass.current === 0) {
      pass.current = 1;
      terminal.change(input);
    } else if (pass.current === 1) {
      pass.current = 2;
      terminal.keyDown(event);
    }
    press.value = terminal.value;
    return null;
  }

  renderToStaticMarkup(createElement(Harness));
  return press;
}

describe('the tab key', () => {
  it('gives the key back when there is nothing to complete', () => {
    const press = pressKey('hello', 'Tab');
    expect(press.prevented).toBe(0);
    expect(press.value).toBe('hello');
  });

  it('gives the key back when the completion is ambiguous', () => {
    const press = pressKey('/s', 'Tab');
    expect(press.prevented).toBe(0);
    expect(press.value).toBe('/s');
  });

  it('takes the key and completes a unique command', () => {
    const press = pressKey('/who', 'Tab');
    expect(press.prevented).toBe(1);
    expect(press.value).toBe('/whoami');
  });
});
