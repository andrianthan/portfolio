import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import ListingsDemo from './ListingsDemo';

const html = renderToStaticMarkup(<ListingsDemo />);
/** The feed narrowed to one source. */
const filtered = renderToStaticMarkup(<ListingsDemo initial={{ source: 'referral', roleType: null }} />);

// The demo is a pure state machine: it must not reach the network, a model or
// a timer. The markup cannot show that on its own, so the island's own source
// is scanned as well.
const dir = path.resolve(process.cwd(), 'src/components/akpsi/listings');
const sources = fs
  .readdirSync(dir)
  .filter((f) => /\.(ts|tsx|css)$/.test(f) && !/\.test\./.test(f))
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
  .join('\n');

describe('ListingsDemo', () => {
  it('names the window and labels sample data', () => {
    expect(html).toMatch(/^<div class="qa listings" role="group" aria-label="Sample opportunity listings feed">/);
    expect(html).toContain('Opportunity listings');
    expect(html).toContain('sample data');
  });
  it('states that the data is invented', () => {
    expect(html).toContain('Sample listings. Every company and listing here is made up.');
  });
  it('names all three sources and all three role types', () => {
    expect(html).toContain('career site');
    expect(html).toContain('GitHub list');
    expect(html).toContain('referral');
    expect(html).toContain('internship');
    expect(html).toContain('new grad');
    expect(html).toContain('co-op');
  });
  it('lists all ten listings by id', () => {
    for (let n = 1; n <= 10; n += 1) {
      expect(html).toContain(`L-${String(n).padStart(2, '0')}`);
    }
  });
  it('marks the filter chips as pressed toggles', () => {
    // Six chips, none of them pressed on the first render.
    expect(html.match(/aria-pressed=/g) ?? []).toHaveLength(6);
    expect(html).not.toContain('aria-pressed="true"');
  });
  it('marks the active filter chip as pressed and narrows the feed', () => {
    // The referral chip is the pressed one, and only the two referrals show.
    expect(filtered).toContain('aria-pressed="true"');
    expect(filtered).toMatch(/aria-pressed="true"[^>]*>referral</);
    expect(filtered).toContain('L-05');
    expect(filtered).toContain('L-09');
    expect(filtered).not.toContain('L-01');
    // The other five chips are still there, and still unpressed.
    expect(filtered.match(/aria-pressed=/g) ?? []).toHaveLength(6);
    expect(filtered.match(/aria-pressed="false"/g) ?? []).toHaveLength(5);
  });
  it('has no manual post control, since the bot posts on its own', () => {
    expect(html).not.toContain('Post to channel');
    expect(html).not.toContain('class="listings-post"');
    expect(html.match(/Posted automatically/g) ?? []).toHaveLength(10);
  });
  it('names the channel the bot posts to', () => {
    expect(html).toContain('tech-data-internships');
  });
  it('posts every listing to the channel as the bot message, one card per company', () => {
    expect(html).toContain('class="listings-msgs"');
    expect(html).toContain('Opportunity Bot');
    expect(html).toContain('APP');
    expect(html).toContain('10 new role(s) across 10 companies');
    expect(html).toContain('Cedarworks Systems — 1 new internship');
    expect(html).toContain('Backend Engineer Intern');
    expect(html).toContain('(Remote)');
    expect(html).not.toContain('Nothing to post.');
  });
  it('pings the areas the posted roles belong to', () => {
    expect(html).toContain('Tech / SWE');
    expect(html).toContain('Data / Analytics');
  });
  it('posts only the listings that pass the filter', () => {
    expect(filtered).toContain('2 new role(s) across 2 companies');
    expect(filtered).toContain('Asterline Health — 1 new internship');
    expect(filtered).not.toContain('Cedarworks Systems');
  });
  it('holds no email address', () => {
    // The role pings show an at-sign from the stylesheet, so the markup itself
    // carries none; an address would still be caught here.
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
  it('makes no network call and schedules no timer in the markup', () => {
    expect(html).not.toContain('fetch(');
    expect(html).not.toContain('XMLHttpRequest');
    expect(html).not.toContain('setTimeout');
  });
  it('makes no network call and schedules no timer in the source', () => {
    // The whole point of scanning the source is that the markup alone cannot
    // show it: a call that is never rendered would slip past a markup check.
    expect(sources).not.toMatch(/\bfetch\b/);
    expect(sources).not.toContain('XMLHttpRequest');
    expect(sources).not.toMatch(/\bWebSocket\b/);
    expect(sources).not.toContain('sendBeacon');
    expect(sources).not.toContain('setTimeout');
    expect(sources).not.toContain('setInterval');
    expect(sources).not.toMatch(/requestAnimationFrame/);
    expect(sources).not.toMatch(/Math\.random\(/);
  });
});
