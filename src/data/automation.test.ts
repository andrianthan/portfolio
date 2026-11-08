import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { automation } from './automation';

describe('personal automation copy', () => {
  it('uses Andrian\'s confirmed label, heading and two cards, verbatim', () => {
    expect(automation.eyebrow).toBe('AI outside the day job');
    expect(automation.heading).toBe('Personal automation');
    expect(automation.cards).toEqual([
      { name: 'Budgeting bot', tag: 'Grok', text: 'A Grok-powered bot that automates my personal finance budgeting.' },
      { name: 'Daily AI digest', tag: 'Grok · daily', text: 'A Grok-powered bot that sends me a daily update on AI: the latest GitHub repos and news worth a look.' },
    ]);
  });
  it('claims no numbers, accounts or institutions (only what was confirmed)', () => {
    const all = [automation.eyebrow, automation.heading, ...automation.cards.map((c) => `${c.name} ${c.tag} ${c.text}`)].join(' ');
    expect(all).not.toMatch(/\d/);
    expect(all.toLowerCase()).not.toMatch(/bank|account|plaid|card|balance|\$/);
  });
  it('sits between Projects and Skills on the home page', () => {
    const page = fs.readFileSync(path.join(process.cwd(), 'src/pages/index.astro'), 'utf8');
    const a = page.indexOf('<ProjectCards />');
    const b = page.indexOf('<Automation />');
    const c = page.indexOf('<Skills />');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});
