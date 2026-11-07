import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/tesla.md'), 'utf8');
// The frontmatter is metadata (dates, flags), unchanged by this task; the body
// is what this test governs. Strip it before matching.
const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

// The stated-numbers test governs prose, not diagram geometry: a rect's x
// coordinate is not a metric a recruiter reads. Strip the SVG blocks before
// matching; the figcaptions stay.
const prose = body.replace(/<svg[\s\S]*?<\/svg>/g, '');

describe('the tesla page body', () => {
  it('has the six sections in order', () => {
    const heads = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    expect(heads).toEqual(['Ask SDP', 'Forecast Lab', 'Planning app', 'Evals and CI', 'Data pipelines', 'Work log']);
  });

  it('gives every section its subsections', () => {
    const sections = body.split(/^## /m).slice(1);
    for (const s of sections.slice(0, 5)) {
      expect(s).toMatch(/^### Problem$/m);
      expect(s).toMatch(/^### What it does$/m);
      expect(s).toMatch(/^### Architecture$/m);
      expect(s).toMatch(/^### Key decisions$/m);
      expect(s).toMatch(/^### Impact$/m);
    }
    expect(sections[5]).toMatch(/^### What it is$/m);
    expect(sections[5]).toMatch(/^### About the demo$/m);
  });

  it('carries no to-confirm marker', () => {
    expect(body.toLowerCase()).not.toContain('[to confirm');
  });

  it('carries no raster image', () => {
    expect(body).not.toMatch(/<img/i);
    expect(body).not.toMatch(/!\[[^\]]*\]\(/);
  });

  it('draws one architecture figure per section that has an architecture', () => {
    const figures = body.match(/<figure class="arch">/g) ?? [];
    expect(figures).toHaveLength(5);
    for (const id of ['at1', 'at2', 'at3', 'at4', 'at5']) {
      expect(body).toContain(`marker id="${id}"`);
    }
  });

  it('gives every figure an accessible label and a caption', () => {
    const svgs = [...body.matchAll(/<svg[^>]*>/g)].map((m) => m[0]);
    expect(svgs).toHaveLength(5);
    for (const svg of svgs) {
      expect(svg).toContain('role="img"');
      expect(svg).toMatch(/aria-label="[^"]{40,}"/);
    }
    expect([...body.matchAll(/<figcaption>/g)]).toHaveLength(5);
  });

  it('lands every arrowhead inside a box of its own figure', () => {
    // A marker-end path that ends in empty canvas draws an arrow pointing at
    // nothing; its final coordinate pair must fall inside (or within 8 units
    // of) one of the figure's rect boxes.
    const figures = [...body.matchAll(/<figure class="arch">[\s\S]*?<\/figure>/g)].map((m) => m[0]);
    expect(figures.length).toBeGreaterThan(0);
    for (const fig of figures) {
      const rects = [...fig.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" rx="10"\/>/g)]
        .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));
      expect(rects.length).toBeGreaterThan(0);
      const paths = [...fig.matchAll(/<path d="([^"]+)" marker-end="url\(#at\d\)"/g)].map((m) => m[1]);
      expect(paths.length).toBeGreaterThan(0);
      for (const d of paths) {
        // Walk the path commands to the final point (M/H/V/L/C supported).
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

  it('names no real person and no internal identifier', () => {
    const banned = ['Krutarth', 'Krutharth', 'Ananthan', 'Ragini', 'Sahel', 'Pritish', 'British Adiga', 'Saheel Ramji', 'Miguel', 'Grace Chen', 'sranji', 'krumenta', 'Cybercab', 'North Star', 'RhinoInsight', 'ZipLabs', 'Demand Engine', 'SDP_DEFAULT_DENY', 'sdp-dashboard-unification', '3006'];
    for (const needle of banned) expect(body.toLowerCase()).not.toContain(needle.toLowerCase());
    expect(body).not.toMatch(/#\d+/);
  });

  it('states only numbers that are on the resume', () => {
    // '2' is part of the model name Chronos-2, '1' of micro-F1 — both are on
    // the resume, so they are allowed; the list is still the contract.
    const allowed = ['32%', '0.854', '0.80', '35', '0%', '17', '165', '77', '20+', '200+', '10+', '30+', '$17.0M', '$11.6M', '10', '2', '1'];
    const found = prose.match(/\$?\d[\d,]*(?:\.\d+)?(?:[kKmM])?[%+]?/g) ?? [];
    for (const token of found) expect(allowed).toContain(token);
  });
});
