import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/tesla.md'), 'utf8');
const { data } = matter(raw);

describe('the tesla entry', () => {
  it('is cleared', () => {
    expect(data.cleared).toBe(true);
  });

  it('keeps the summary exactly as it was', () => {
    expect(data.summary).toBe("Built Ask SDP, a tool-calling LLM copilot whose answers **can't contain invented numbers**, and shipped Forecast Lab, with Chronos-2 forecasts **32% better than baseline** on backtest. Built the staging-to-prod pipeline behind 200+ staging deploys a week.");
  });

  it('is still the current role, listed and first', () => {
    expect(data.current).toBe(true);
    expect(data.listed).toBe(true);
    expect(data.order).toBe(1);
  });
});
