import { describe, it, expect } from 'vitest';
import fixture from './fixtures/snapshot.json';
import { COFFEE, REFUSAL_TEXT, respond } from './respond';
import { about, contact, experience, skills } from './tools';
import { extractNumbers, verify } from './verify';
import type { Route, Snapshot } from './types';

const snapshot = fixture as unknown as Snapshot;
const route = (intent: Route['intent'], args: string[] = []): Route => ({ intent, args, query: args.join(' ') });

describe('respond', () => {
  it('answers help with the command list and no sources', () => {
    const answer = respond(route('help'), []);
    expect(answer.text).toContain('/experience');
    expect(answer.sources).toEqual([]);
  });

  it('builds a list answer from the retrieved chunks only', () => {
    const chunks = experience(snapshot, ['Tesla']);
    const answer = respond(route('experience'), chunks);
    expect(answer.text).toContain('Tesla');
    expect(answer.text).toContain('32% better than baseline');
    expect(answer.sources).toEqual([{ title: 'Tesla', url: '/#experience' }]);
  });

  it('answers the coffee egg with the fixed cup and no digits', () => {
    const answer = respond(route('easter', ['coffee']), []);
    expect(answer.text).toBe(COFFEE);
    expect(answer.text).not.toMatch(/\d/);
  });

  it('answers whoami with one line from the about chunk', () => {
    const answer = respond(route('easter', ['whoami']), about(snapshot, []));
    expect(answer.text.split('\n')).toHaveLength(1);
    expect(answer.text).toContain('Andrian Than');
    expect(answer.sources[0].url).toBe('/#about');
  });

  it('answers whoami from the about chunk, not from the first chunk', () => {
    const chunks = [...experience(snapshot, []), ...about(snapshot, [])];
    const answer = respond(route('easter', ['whoami']), chunks);
    expect(answer.text).toContain('Andrian Than');
    expect(answer.text.split('\n')).toHaveLength(1);
    expect(answer.sources[0].url).toBe('/#about');
  });

  it('answers whoami with nothing when no about chunk was retrieved', () => {
    const answer = respond(route('easter', ['whoami']), []);
    expect(answer.text).toBe('');
    expect(answer.sources).toEqual([]);
  });

  it('answers a refused route with the honest refusal copy', () => {
    const answer = respond(route('refuse'), []);
    expect(answer.text).toBe(REFUSAL_TEXT);
    expect(answer.sources).toEqual([]);
  });

  it('answers hire with the contact chunk', () => {
    const answer = respond(route('easter', ['hire']), contact(snapshot, []));
    expect(answer.text).toContain('andrian.than.api@gmail.com');
  });

  it('never introduces a number that is not in the chunks', () => {
    const chunks = experience(snapshot, []);
    const answer = respond(route('experience'), chunks);
    const allowed = new Set(chunks.flatMap((entry) => extractNumbers(`${entry.chunk.title} ${entry.chunk.text}`)));
    for (const number of extractNumbers(answer.text)) expect(allowed.has(number)).toBe(true);
  });

  it('has honest refusal copy with no numbers', () => {
    expect(REFUSAL_TEXT).toBe("I only answer from this portfolio's published content. Try /help.");
    expect(REFUSAL_TEXT).not.toMatch(/\d/);
  });
});

describe('number extraction', () => {
  it('reads the formats the site uses', () => {
    expect(extractNumbers('32% better than baseline')).toEqual(['32%']);
    expect(extractNumbers('avoiding $30k+ in cost')).toEqual(['$30k+']);
    expect(extractNumbers('200+ staging deploys a week')).toEqual(['200+']);
    expect(extractNumbers('a 3.7 GPA')).toEqual(['3.7']);
    expect(extractNumbers('1st of 9 teams')).toEqual(['1', '9']);
    expect(extractNumbers('TPM 2.0 backed authentication')).toEqual(['2.0']);
    expect(extractNumbers('graduating Spring 2027')).toEqual(['2027']);
    expect(extractNumbers('no numbers here')).toEqual([]);
  });
});

describe('verify', () => {
  it('passes an answer built from the chunks', () => {
    const chunks = experience(snapshot, ['Tesla']).map((entry) => entry.chunk);
    const answer = respond(route('experience'), experience(snapshot, ['Tesla']));
    const result = verify(answer, chunks);
    expect(result.ok).toBe(true);
    expect(result.checked).toBeGreaterThan(0);
  });

  it('fails when the answer contains a number the sources do not have', () => {
    const chunks = experience(snapshot, ['Tesla']).map((entry) => entry.chunk);
    const answer = { ...respond(route('experience'), experience(snapshot, ['Tesla'])), text: 'Made 99% more money.' };
    const result = verify(answer, chunks);
    expect(result.ok).toBe(false);
    expect(result.offending.length).toBeGreaterThan(0);
    expect(result.offending).toContain('99%');
  });

  it('grounds exactly the tokens the retrieved chunks publish', () => {
    const ranked = experience(snapshot, ['Tesla']);
    const chunks = ranked.map((entry) => entry.chunk);
    const answer = respond(route('experience'), ranked);
    const result = verify(answer, chunks);
    const published = new Set(
      chunks.flatMap((chunk) => extractNumbers(`${chunk.title} ${chunk.text} ${chunk.facts.join(' ')}`)),
    );
    expect([...published].sort()).toEqual(['2', '200+', '32%']);
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(3);
    expect(result.offending).toEqual([]);
  });

  it('refuses a number that is only part of a published one', () => {
    const chunks = experience(snapshot, ['Tesla']).map((entry) => entry.chunk);
    const result = verify({ text: 'Improved by 3.', sources: [] }, chunks);
    expect(result.ok).toBe(false);
    expect(result.offending).toContain('3');
  });

  it('refuses a number whose punctuation differs from the published one', () => {
    const chunks = experience(snapshot, ['Hanna Center']).map((entry) => entry.chunk);
    const result = verify({ text: 'Saved 30% in cost.', sources: [] }, chunks);
    expect(result.ok).toBe(false);
    expect(result.offending).toContain('30%');
  });

  it('treats a version number and a plain number as different tokens', () => {
    const tesla = experience(snapshot, ['Tesla']).map((entry) => entry.chunk);
    const blueDome = experience(snapshot, ['Blue Dome']).map((entry) => entry.chunk);
    expect(verify({ text: 'TPM 2.0', sources: [] }, tesla).ok).toBe(false);
    expect(verify({ text: 'Chronos-2', sources: [] }, blueDome).ok).toBe(false);
  });

  it('passes the answers built from the about, contact and skills chunks', () => {
    const cases: [Route['intent'], ReturnType<typeof about>][] = [
      ['about', about(snapshot, [])],
      ['contact', contact(snapshot, [])],
      ['skills', skills(snapshot, [])],
    ];
    for (const [intent, ranked] of cases) {
      const answer = respond(route(intent), ranked);
      const result = verify(answer, ranked.map((entry) => entry.chunk));
      expect(result.ok, intent).toBe(true);
      expect(result.offending, intent).toEqual([]);
    }
  });

  it('fails when a source url is not a chunk url', () => {
    const chunks = experience(snapshot, ['Tesla']).map((entry) => entry.chunk);
    const answer = { text: 'hello', sources: [{ title: 'x', url: '/nowhere' }] };
    expect(verify(answer, chunks).ok).toBe(false);
  });

  it('passes an answer with no numbers at all', () => {
    expect(verify({ text: 'nothing numeric here', sources: [] }, []).ok).toBe(true);
  });
});
