import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/cursor.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('cursor css', () => {
  it('hides the native cursor only under has-trail', () => {
    expect(css).toMatch(/html\.has-trail\s*,\s*html\.has-trail \*\s*\{\s*cursor:\s*none !important/);
  });
  it('keeps the text cursor on text entry', () => {
    expect(css).toMatch(/html\.has-trail input,[\s\S]*html\.has-trail textarea,[\s\S]*html\.has-trail \[contenteditable\]\s*\{\s*cursor:\s*text !important/);
  });
  it('makes the canvas inert and above the command menu', () => {
    const block = css.match(/\.cursor-canvas\s*\{([^}]*)\}/)![1];
    expect(block).toMatch(/pointer-events:\s*none/);
    expect(block).toMatch(/position:\s*fixed/);
    expect(Number(block.match(/z-index:\s*(\d+)/)![1])).toBeGreaterThan(30);
  });
});
