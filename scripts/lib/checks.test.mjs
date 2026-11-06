import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listHtml, findMarkers, findBrokenLinks, findMissingAlt, findLeaks, bodyNeedle } from './checks.mjs';

let dir;
const write = (rel, content) => {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-')); });

describe('listHtml', () => {
  it('finds nested html files only', () => {
    write('index.html', '<p>a</p>'); write('a/b/index.html', '<p>b</p>'); write('x.css', '');
    expect(listHtml(dir).map((f) => path.relative(dir, f)).sort()).toEqual(['a/b/index.html', 'index.html']);
  });
});

describe('findMarkers', () => {
  it('flags files containing [to confirm]', () => {
    write('index.html', '<p>ok</p>'); write('p/index.html', '<p>[to confirm]</p>');
    const problems = findMarkers(listHtml(dir));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('p/index.html');
  });
  it('returns nothing when clean', () => { write('index.html', '<p>ok</p>'); expect(findMarkers(listHtml(dir))).toEqual([]); });
});

describe('findBrokenLinks', () => {
  it('flags internal links with no target', () => {
    write('index.html', '<a href="/work/tesla">t</a><img src="/logos/x.png" alt="x"><a href="https://e.com">e</a>');
    expect(findBrokenLinks(dir, listHtml(dir))).toHaveLength(2);
  });
  it('accepts directory index and asset targets, ignores anchors and hashes', () => {
    write('work/tesla/index.html', '<p>t</p>'); write('logos/x.png', 'x');
    write('index.html', '<a href="/work/tesla/">t</a><a href="/work/tesla#a">t</a><img src="/logos/x.png" alt="x"><a href="/#projects">p</a>');
    expect(findBrokenLinks(dir, listHtml(dir))).toEqual([]);
  });
  it('accepts a slash-less href when the directory index exists, ignores protocol-relative', () => {
    write('work/tesla/index.html', '<p>t</p>');
    write('index.html', '<a href="/work/tesla">t</a><a href="//cdn.example.com/x.js">c</a>');
    expect(findBrokenLinks(dir, listHtml(dir))).toEqual([]);
  });
});

describe('findMissingAlt', () => {
  it('flags img without alt, allows empty alt', () => {
    write('a.html', '<img src="/a.png">'); write('b.html', '<img src="/b.png" alt="">');
    const problems = findMissingAlt(listHtml(dir));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('a.html');
  });
});

describe('bodyNeedle', () => {
  const long = 'A long enough prose line that is well over forty characters in total length.';
  it('skips short lines and [to confirm]; null when nothing usable', () => {
    expect(bodyNeedle('## Heading\n\n[to confirm]\n\nshort line')).toBeNull();
    expect(bodyNeedle('')).toBeNull();
  });
  it('strips ## and - markers', () => {
    expect(bodyNeedle(`## ${long}`)).toBe(long.slice(0, 60));
    expect(bodyNeedle(`- ${long}`)).toBe(long.slice(0, 60));
  });
  it('skips lines starting with <', () => {
    expect(bodyNeedle(`<div>${long}</div>\n${long}`)).toBe(long.slice(0, 60));
    expect(bodyNeedle(`<div>${long}</div>`)).toBeNull();
  });
  it('returns at most 60 characters', () => {
    expect(bodyNeedle('x'.repeat(200))).toHaveLength(60);
  });
  it('cuts at HTML-escaped characters and drops short remainders', () => {
    const a = 'Plain prefix that is long enough to keep around ok';
    expect(bodyNeedle(`${a} & more words after the ampersand here`)).toBe(`${a} `);
    expect(bodyNeedle('Short prefix & more words after the ampersand here ok')).toBeNull();
  });
});

describe('findLeaks', () => {
  const body = 'This is a confidential architecture description that must never be published anywhere.';
  const entries = [{ collection: 'work', id: 'tesla', cleared: false, body }];
  it('flags a built route, a link to it, or body text', () => {
    write('work/tesla/index.html', '<p>x</p>');
    write('index.html', `<a href="/work/tesla">t</a><p>${body}</p>`);
    expect(findLeaks(dir, listHtml(dir), entries).length).toBeGreaterThanOrEqual(3);
  });
  it('ignores cleared entries and allows listed titles', () => {
    write('index.html', '<p>Tesla</p>');
    expect(findLeaks(dir, listHtml(dir), entries)).toEqual([]);
    write('work/tesla/index.html', '<p>x</p>');
    expect(findLeaks(dir, listHtml(dir), [{ ...entries[0], cleared: true }])).toEqual([]);
  });
  it('detects body text of a rendered markdown heading-led body', () => {
    write('index.html', `<h2>Head</h2><p>${body}</p>`);
    const e = [{ collection: 'work', id: 'tesla', cleared: false, body: `## Head\n\n${body}\n` }];
    expect(findLeaks(dir, listHtml(dir), e)).toHaveLength(1);
  });
});
