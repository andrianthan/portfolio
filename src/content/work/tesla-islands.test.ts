import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BANNED_TERMS } from './tesla-facts';

const root = path.resolve(process.cwd(), 'src/components/tesla');
const folders = ['dashboard', 'partsummary', 'asksdp', 'forecastlab', 'campaigns', 'slides', 'modular', 'admin'];
// The scan covers the islands' own stylesheets as well as their scripts: a
// banned term can hide in a CSS file just as easily as in a component.
const files = (dir: string) => fs.readdirSync(dir).filter((f) => /\.(ts|tsx|css)$/.test(f) && !/\.test\./.test(f));

/** A pull-request or ticket number, which the page may not carry. */
const TICKET = /#\d+/;
/** A commit hash, which the page may not carry. */
const COMMIT = /\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/i;
/** A host or a port, which points at internal infrastructure. */
const HOST_PORT = /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d{1,5})?\b/i;

describe('the tesla demo islands', () => {
  for (const f of folders) {
    it(`${f} carries the sample-data label and no banned term`, () => {
      const dir = path.join(root, f);
      const demo = files(dir).find((n) => n.endsWith('Demo.tsx'))!;
      expect(demo, `${f} has a Demo.tsx`).toBeDefined();
      const src = files(dir).map((n) => fs.readFileSync(path.join(dir, n), 'utf8')).join('\n');
      expect(fs.readFileSync(path.join(dir, demo), 'utf8')).toContain('qa-sample');
      for (const needle of BANNED_TERMS) expect(src.toLowerCase(), needle).not.toContain(needle.toLowerCase());
      expect(src).not.toMatch(/\b\d{6,}-[A-Z0-9]{2}-[A-Z0-9]\b/);
      expect(src).not.toMatch(/Math\.random\(/);
    });

    it(`${f} carries no ticket, commit or host in any of its files`, () => {
      const dir = path.join(root, f);
      for (const name of files(dir)) {
        const src = fs.readFileSync(path.join(dir, name), 'utf8');
        expect(src, `${f}/${name} ticket`).not.toMatch(TICKET);
        expect(src, `${f}/${name} commit`).not.toMatch(COMMIT);
        expect(src, `${f}/${name} host`).not.toMatch(HOST_PORT);
      }
    });
  }
});
