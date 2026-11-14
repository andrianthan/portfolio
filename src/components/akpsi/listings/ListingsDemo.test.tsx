import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import ListingsDemo from './ListingsDemo';

const html = renderToStaticMarkup(<ListingsDemo />);
/** A channel that already holds one listing. */
const posted = renderToStaticMarkup(<ListingsDemo posted={['L-03']} />);
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
  it('shows the Post to channel control on every listing', () => {
    expect(html.match(/>Post to channel</g) ?? []).toHaveLength(10);
  });
  it('starts with an empty channel', () => {
    expect(html).toContain('Nothing posted yet.');
    // No message list is rendered while the channel is empty.
    expect(html).not.toContain('class="listings-msgs"');
    expect(html).not.toContain('class="listings-msg"');
  });
  it('names the channel the bot posts to, before and after a post', () => {
    expect(html).toContain('tech-data-internships');
    expect(posted).toContain('tech-data-internships');
  });
  it('shows a posted listing as the bot message with one card per company', () => {
    expect(posted).toContain('class="listings-msgs"');
    expect(posted).toContain('Opportunity Bot');
    expect(posted).toContain('APP');
    expect(posted).toContain('1 new role(s) across 1 company');
    expect(posted).toContain('Cedarworks Systems — 1 new internship');
    expect(posted).toContain('Backend Engineer Intern');
    expect(posted).toContain('(Remote)');
    expect(posted).not.toContain('Nothing posted yet.');
  });
  it('pings the area each posted role belongs to', () => {
    expect(posted).toContain('Tech / SWE');
    expect(posted).not.toContain('Data / Analytics');
    const data = renderToStaticMarkup(<ListingsDemo posted={['L-05']} />);
    expect(data).toContain('Data / Analytics');
  });
  it('counts roles and companies across several posts', () => {
    const several = renderToStaticMarkup(<ListingsDemo posted={['L-01', 'L-03', 'L-05']} />);
    expect(several).toContain('3 new role(s) across 3 companies');
    expect(several).toContain('Northwind Labs — 1 new internship');
    expect(several).toContain('Asterline Health — 1 new internship');
  });
  it('holds no email address', () => {
    // The role pings show an at-sign from the stylesheet, so the markup itself
    // carries none; an address would still be caught here.
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(posted).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
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
