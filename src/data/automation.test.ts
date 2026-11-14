import { describe, it, expect } from 'vitest';
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
});
