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

  it('keeps the dashboard-first summary', () => {
    expect(data.summary).toBe("Built and shipped the unified planning dashboard (React and FastAPI) that brings eight scattered data sources into one app, including Ask SDP, a tool-calling LLM copilot whose answers **can't contain invented numbers**, and Forecast Lab, with Chronos-2 forecasts **32% better than baseline** on backtest.");
  });

  it('is still the current role, listed and first', () => {
    expect(data.current).toBe(true);
    expect(data.listed).toBe(true);
    expect(data.order).toBe(1);
  });
});
