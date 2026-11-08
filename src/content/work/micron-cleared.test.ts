import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/micron.md'), 'utf8');
const { data, content } = matter(raw);

describe('the micron entry', () => {
  it('is cleared and listed', () => {
    expect(data.cleared).toBe(true);
    expect(data.listed).toBe(true);
  });

  it('has no placeholder text', () => {
    expect(content).not.toContain('[to confirm]');
  });

  it('carries no digit in the body', () => {
    expect(content).not.toMatch(/\d/);
  });

  it('names no internal tool, system or machine', () => {
    expect(content).not.toMatch(/Tool [A-F]/);
    expect(content).not.toMatch(/W-04/);
    expect(content).not.toMatch(/LOT-/);
  });

  it('makes no accuracy-style claim', () => {
    expect(content).not.toMatch(/\b(estimated|accuracy|precision)\b/i);
  });

  it('has exactly the two project headings', () => {
    const h2 = content.split('\n').filter((l) => /^## /.test(l)).map((l) => l.slice(3).trim());
    expect(h2).toEqual(['Wafer analysis copilot', 'Wafer risk model']);
  });
});
