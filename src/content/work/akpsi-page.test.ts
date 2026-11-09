import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const page = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/work/[slug].astro'), 'utf8');

describe('the akpsi page in the template', () => {
  it('is a multi-project page', () => {
    expect(page).toMatch(/const MULTI = new Set\(\[[^\]]*'akpsi'/);
  });

  it('has a demo for both of its projects', () => {
    expect(page).toMatch(/type Demo = [^;]*'intake'/);
    expect(page).toMatch(/type Demo = [^;]*'listings'/);
  });

  it('routes each project heading to its own demo island, visible-hydrated', () => {
    expect(page).toContain("id.startsWith('membership-intake')");
    expect(page).toContain("id.startsWith('opportunity-bot')");
    expect(page).toMatch(/<IntakeDemo client:visible \/>/);
    expect(page).toMatch(/<ListingsDemo client:visible \/>/);
  });
});
