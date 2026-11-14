import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/akpsi.md'), 'utf8');
const { data, content } = matter(raw);

// Everything before the first `##` heading: the page intro.
const intro = content.split(/^## /m)[0].trim();
const introParagraphs = intro.split(/\n\n+/).filter((p) => p.trim().length > 0);

describe('the akpsi entry', () => {
  it('is cleared, listed and current', () => {
    expect(data.cleared).toBe(true);
    expect(data.listed).toBe(true);
    expect(data.current).toBe(true);
  });

  it('is the last role on the page', () => {
    expect(data.order).toBe(5);
  });

  it('is a role that is still running', () => {
    expect(data.dates).toBe('Dec 2025 – Present');
    expect(data.start).toBe('2025-12');
  });

  it('names only the three confirmed tools', () => {
    expect(data.stack).toEqual(['Gmail', 'Google Drive', 'Discord']);
  });

  it('has no placeholder text', () => {
    expect(content).not.toContain('[to confirm]');
  });

  it('makes no accuracy-style claim', () => {
    expect(content).not.toMatch(/\b(estimated|accuracy|precision)\b/i);
  });

  it('carries only the four confirmed figures', () => {
    expect(data.summary.match(/\d[\d,]*\+?/g)).toEqual(['21+', '50+']);
    expect(content.match(/\d[\d,]*\+?/g)).toEqual(['5+', '21+', '80', '50+']);
  });

  it('has exactly the two project headings', () => {
    const h2 = content.split('\n').filter((l) => /^## /.test(l)).map((l) => l.slice(3).trim());
    expect(h2).toEqual(['Membership intake automation', 'Opportunity bot']);
  });

  it('names no individual', () => {
    expect(content).not.toContain('@');
    expect(content).not.toMatch(/\b[A-Z][a-z]+\.[A-Z][a-z]+\b/);
    expect(content).not.toMatch(/\b(?:applicant|member|candidate)\s+[A-Z][a-z]+\b/i);
  });

  it('has a three paragraph page intro', () => {
    expect(introParagraphs).toHaveLength(3);
  });
});
