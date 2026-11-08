import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BANNED_TERMS } from './tesla-facts';

const root = path.resolve(process.cwd(), 'src/components/tesla');
const folders = ['dashboard', 'partsummary', 'asksdp', 'forecastlab', 'campaigns', 'slides', 'modular', 'admin'];
const files = (dir: string) => fs.readdirSync(dir).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));

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
  }
});
