import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/tesla.md'), 'utf8');
const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

describe('the tesla architecture figures', () => {
  it('draws a figure under every Architecture heading, and two under Dashboard', () => {
    expect(body.match(/<figure class="arch">/g) ?? []).toHaveLength(8);
    for (let i = 1; i <= 8; i++) expect(body).toContain(`marker id="at${i}"`);
    const sections = body.split(/^### Architecture$/m).slice(1);
    for (const s of sections) expect(s.trimStart().startsWith('<figure class="arch">')).toBe(true);
  });

  it('gives every figure an accessible label and a caption', () => {
    const svgs = [...body.matchAll(/<svg[^>]*>/g)].map((m) => m[0]);
    expect(svgs).toHaveLength(8);
    for (const svg of svgs) {
      expect(svg).toContain('role="img"');
      expect(svg).toMatch(/aria-label="[^"]{40,}"/);
    }
    expect([...body.matchAll(/<figcaption>/g)]).toHaveLength(8);
  });

  it('lands every arrowhead inside a box of its own figure', () => {
    const figures = [...body.matchAll(/<figure class="arch">[\s\S]*?<\/figure>/g)].map((m) => m[0]);
    expect(figures).toHaveLength(8);
    for (const fig of figures) {
      const rects = [...fig.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" rx="10"\/>/g)]
        .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));
      expect(rects.length).toBeGreaterThan(0);
      const paths = [...fig.matchAll(/<path d="([^"]+)" marker-end="url\(#at\d\)"/g)].map((m) => m[1]);
      expect(paths.length).toBeGreaterThan(0);
      for (const d of paths) {
        const tokens = d.match(/[MHVLC]|-?\d+(?:\.\d+)?/g) ?? [];
        let cx = 0, cy = 0;
        for (let i = 0; i < tokens.length; i++) {
          const t = tokens[i];
          if (t === 'M' || t === 'L') { cx = +tokens[++i]; cy = +tokens[++i]; }
          else if (t === 'H') { cx = +tokens[++i]; }
          else if (t === 'V') { cy = +tokens[++i]; }
          else if (t === 'C') { i += 5; cx = +tokens[i]; cy = +tokens[++i]; }
        }
        const hit = rects.some((r) => cx >= r.x - 8 && cx <= r.x + r.w + 8 && cy >= r.y - 8 && cy <= r.y + r.h + 8);
        expect(hit, `arrow endpoint ${cx},${cy} of "${d}" lands in no box`).toBe(true);
      }
    }
  });

  it('uses each marker id only inside its own figure', () => {
    const figures = [...body.matchAll(/<figure class="arch">[\s\S]*?<\/figure>/g)].map((m) => m[0]);
    const own = figures.map((fig) => fig.match(/marker id="at(\d)"/)?.[1]);
    expect(new Set(own).size).toBe(figures.length);
    figures.forEach((fig, i) => {
      for (let n = 1; n <= 8; n++) {
        if (String(n) !== own[i]) expect(fig).not.toContain(`url(#at${n})`);
      }
    });
  });
});
