import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/scene.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function block(text: string, start: number): string {
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error('unterminated block');
}

describe('scene css', () => {
  it('animates only transform and opacity in every keyframe', () => {
    const re = /@keyframes\s+[\w-]+\s*\{/g;
    let m: RegExpExecArray | null;
    let seen = 0;
    while ((m = re.exec(css))) {
      seen++;
      const body = block(css, m.index);
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]);
      for (const prop of props) expect(['transform', 'opacity'], `${prop} in a keyframe`).toContain(prop);
    }
    expect(seen).toBeGreaterThanOrEqual(5);
  });

  it('switches every animation and the parallax off under reduced motion', () => {
    const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(start).toBeGreaterThan(-1);
    const body = block(css, start);
    expect(body).toContain('animation: none');
    expect(body).toContain('.flyers');
    expect(body).toMatch(/\.layer[^{]*\{[^}]*transform:\s*none/);
  });

  it('shifts layers opposite to the pointer, scaled by depth', () => {
    expect(css).toContain('calc(var(--px) * var(--depth) * -1)');
    expect(css).toContain('calc(var(--py) * var(--depth) * -1)');
  });
});
