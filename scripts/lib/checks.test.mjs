import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listHtml, listText, readEntries, findMarkers, findBrokenLinks, findMissingAlt, findLeaks, bodyNeedle, bodyNeedles, findRequiredLinks, findMissingRoutes, findSnapshotProblems, readCountries, findOutsideProblems } from './checks.mjs';
import { runChecks } from './run.mjs';

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
  it('flags the [to confirm: detail] variant', () => {
    write('index.html', '<p>ok</p>'); write('p/index.html', '<p>[to confirm: why]</p>');
    const problems = findMarkers(listHtml(dir));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('p/index.html');
  });
  it('flags [To Confirm] case-insensitively', () => {
    write('index.html', '<p>[To Confirm]</p>');
    expect(findMarkers(listHtml(dir))).toHaveLength(1);
  });
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

describe('bodyNeedles', () => {
  const plain = 'Third line is plain prose that is comfortably over forty characters long.';
  const first = "**Bold** statement that isn't going to match -- rendered HTML at all, no way";
  it('collects later lines when the first has apostrophe and bold markup', () => {
    const n = bodyNeedles(`${first}\n\nsecond short\n${plain}\n`);
    expect(n).toContain(plain.slice(0, 60));
  });
  it('returns at most max needles', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `Line number ${i} is plain prose that is long enough to qualify.`).join('\n');
    expect(bodyNeedles(lines)).toHaveLength(5);
    expect(bodyNeedles(lines, 2)).toHaveLength(2);
  });
  it('returns [] for only headings, short lines and [to confirm]', () => {
    expect(bodyNeedles('## Heading\n\n[to confirm]\n\nshort line\n')).toEqual([]);
  });
  it('cuts at the first special character and drops short remainders', () => {
    const a = 'Plain prefix that is long enough to keep around ok';
    expect(bodyNeedles(`${a} \`code\` and more words after that point`)).toEqual([`${a} `]);
    expect(bodyNeedles(`${a} it's more words after that point here`)).toEqual([`${a} it`]);
    expect(bodyNeedles('Short prefix [link](url) and more words after that point here')).toEqual([]);
  });
});

describe('findLeaks via later lines', () => {
  it('detects a leak through a later line when the first has inline markdown', () => {
    const plain = 'Third line is plain prose that is comfortably over forty characters long.';
    write('index.html', `<p>${plain}</p>`);
    const e = [{ collection: 'projects', id: 'x', cleared: false, body: `**Bold** it's text that never matches rendered html, honestly\n\n${plain}\n` }];
    expect(findLeaks(dir, listHtml(dir), e)).toHaveLength(1);
  });
});

describe('listText', () => {
  it('returns text outputs recursively and ignores other extensions', () => {
    for (const f of ['a.html', 'b/c.js', 'd.css', 'e.xml', 'f.txt', 'g/h.json', 'i.png', 'j.woff2']) write(f, 'x');
    expect(listText(dir).map((f) => path.relative(dir, f)).sort())
      .toEqual(['a.html', 'b/c.js', 'd.css', 'e.xml', 'f.txt', 'g/h.json']);
  });
});

describe('all-text scanning', () => {
  it('findMarkers flags a marker inside a .js file', () => {
    write('index.html', '<p>ok</p>'); write('_astro/app.js', 'const a = "[To Confirm]";');
    const problems = findMarkers(listText(dir));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('app.js');
  });
  it('findLeaks flags a body needle present in an .xml file', () => {
    const body = 'This is a confidential architecture description that must never be published anywhere.';
    write('index.html', '<p>ok</p>'); write('feed.xml', `<x>${body}</x>`);
    const problems = findLeaks(dir, listText(dir), [{ collection: 'work', id: 'tesla', cleared: false, body }]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('feed.xml');
  });
});

describe('readEntries', () => {
  it('lowercases ids so mixed-case filenames cannot hide a built route', () => {
    const content = path.join(dir, 'content');
    fs.mkdirSync(path.join(content, 'work'), { recursive: true });
    fs.writeFileSync(path.join(content, 'work', 'Tesla.md'), '---\ncleared: false\n---\nbody');
    expect(readEntries(content).map((e) => e.id)).toEqual(['tesla']);
  });
});

describe('findRequiredLinks', () => {
  it('passes when the required href is present', () => {
    write('index.html', '<a href="/terminal">terminal</a>');
    expect(findRequiredLinks(listHtml(dir), ['/terminal'])).toEqual([]);
  });
  it('fails when the required href is missing', () => {
    write('index.html', '<a href="/">home</a>');
    expect(findRequiredLinks(listHtml(dir), ['/terminal'])).toHaveLength(1);
  });
});

describe('findMissingRoutes', () => {
  it('passes when the route was built', () => {
    write('terminal/index.html', '<!doctype html>');
    expect(findMissingRoutes(dir, ['/terminal'])).toEqual([]);
  });
  it('fails when the route is missing', () => {
    write('index.html', '<!doctype html>');
    expect(findMissingRoutes(dir, ['/terminal'])).toHaveLength(1);
  });
});

describe('runChecks fail-closed', () => {
  it('reports a problem on an empty dist', () => {
    const content = path.join(dir, 'content');
    fs.mkdirSync(path.join(content, 'work'), { recursive: true });
    fs.writeFileSync(path.join(content, 'work', 'a.md'), '---\ncleared: true\n---\nbody');
    fs.mkdirSync(path.join(dir, 'dist'));
    const { problems } = runChecks({ distDir: path.join(dir, 'dist'), contentDir: content });
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join('\n')).toMatch(/no html/i);
  });
  it('reports a problem when the entries list is empty', () => {
    write('dist/index.html', '<a href="/terminal">terminal</a>');
    write('dist/terminal/index.html', '<!doctype html>');
    fs.mkdirSync(path.join(dir, 'content'));
    const { problems } = runChecks({ distDir: path.join(dir, 'dist'), contentDir: path.join(dir, 'content') });
    expect(problems.join('\n')).toMatch(/no content entries/i);
  });
  it('is clean for a good dist', () => {
    write('dist/index.html', '<a href="/terminal">terminal</a>');
    write('dist/terminal/index.html', '<!doctype html>');
    write('dist/agent-data.json', JSON.stringify({ version: 1, chunks: [{ id: 'role:a' }] }));
    const content = path.join(dir, 'content');
    fs.mkdirSync(path.join(content, 'work'), { recursive: true });
    fs.writeFileSync(path.join(content, 'work', 'a.md'), '---\ncleared: true\n---\nbody');
    expect(runChecks({ distDir: path.join(dir, 'dist'), contentDir: content }).problems).toEqual([]);
  });
  it('reports a terminal link that is missing and a terminal route that was not built', () => {
    write('dist/index.html', '<p>ok</p>');
    const content = path.join(dir, 'content');
    fs.mkdirSync(path.join(content, 'work'), { recursive: true });
    fs.writeFileSync(path.join(content, 'work', 'a.md'), '---\ncleared: true\n---\nbody');
    const { problems } = runChecks({ distDir: path.join(dir, 'dist'), contentDir: content });
    expect(problems.join('\n')).toMatch(/required link "\/terminal"/);
    expect(problems.join('\n')).toMatch(/missing route \/terminal/);
  });
  it('reports a broken Outside of work section when the data file is given', () => {
    write('dist/index.html', '<a href="/terminal">terminal</a>');
    write('dist/terminal/index.html', '<!doctype html>');
    write('dist/agent-data.json', JSON.stringify({ version: 1, chunks: [{ id: 'role:a' }] }));
    write('outside.ts', "export const countries: Country[] = [\n  { name: 'Japan', code: 'JPN', years: [], areas: [] },\n];");
    const content = path.join(dir, 'content');
    fs.mkdirSync(path.join(content, 'work'), { recursive: true });
    fs.writeFileSync(path.join(content, 'work', 'a.md'), '---\ncleared: true\n---\nbody');
    const { problems } = runChecks({
      distDir: path.join(dir, 'dist'),
      contentDir: content,
      dataFile: path.join(dir, 'outside.ts'),
    });
    expect(problems.join('\n')).toMatch(/Outside of work/);
  });
});

describe('findSnapshotProblems', () => {
  const entries = [
    { collection: 'work', id: 'tesla', listed: true, cleared: false, body: '' },
    { collection: 'work', id: 'hanna', listed: false, cleared: false, body: '' },
    { collection: 'projects', id: 'advisorai', listed: true, cleared: true, body: '' },
  ];
  const snapshot = (chunks) => write('agent-data.json', JSON.stringify({ version: 1, chunks }));

  it('passes when the snapshot matches the entries', () => {
    snapshot([{ id: 'role:tesla' }, { id: 'project:advisorai#results' }]);
    expect(findSnapshotProblems(dir, entries)).toEqual([]);
  });

  it('fails when the file is missing', () => {
    expect(findSnapshotProblems(dir, entries)).toHaveLength(1);
  });

  it('fails when there are no chunks', () => {
    snapshot([]);
    expect(findSnapshotProblems(dir, entries).some((p) => p.includes('no chunks'))).toBe(true);
  });

  it('fails for a chunk from a non-listed entry', () => {
    snapshot([{ id: 'role:hanna' }]);
    expect(findSnapshotProblems(dir, entries).some((p) => p.includes('non-listed'))).toBe(true);
  });

  it('fails for body text from a non-cleared entry', () => {
    snapshot([{ id: 'role:tesla#problem' }]);
    expect(findSnapshotProblems(dir, entries).some((p) => p.includes('non-cleared'))).toBe(true);
  });

  it('fails for a chunk with no content entry', () => {
    snapshot([{ id: 'role:ghost' }]);
    expect(findSnapshotProblems(dir, entries).some((p) => p.includes('no content entry'))).toBe(true);
  });

  it('fails when the file is not valid json', () => {
    write('agent-data.json', 'not json at all');
    expect(findSnapshotProblems(dir, entries)).toHaveLength(1);
  });
});

describe('readEntries listed flag', () => {
  it('defaults listed to true and honours an explicit false', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-'));
    fs.mkdirSync(path.join(dir, 'work'));
    fs.writeFileSync(path.join(dir, 'work', 'a.md'), '---\nlisted: false\n---\nbody text here');
    fs.writeFileSync(path.join(dir, 'work', 'b.md'), '---\ncleared: true\n---\nbody text here');
    const entries = readEntries(dir);
    expect(entries.find((e) => e.id === 'a').listed).toBe(false);
    expect(entries.find((e) => e.id === 'b').listed).toBe(true);
  });
});

// The Outside of work gate: the section's own markup, checked against the built page.
const OUTSIDE_COUNTRIES = [
  { name: 'South Korea', code: 'KOR' },
  { name: 'Japan', code: 'JPN' },
  { name: 'Vietnam', code: 'VNM' },
  { name: 'Taiwan', code: 'TWN' },
  { name: 'Thailand', code: 'THA' },
  { name: 'Mexico', code: 'MEX' },
  { name: 'Singapore', code: 'SGP' },
  { name: 'Malaysia', code: 'MYS' },
  { name: 'Indonesia', code: 'IDN' },
];

const countryEntry = (c) =>
  `<details class="country" data-c="${c.code}"><summary><span>${c.name}</span><span class="country-years">2024</span></summary><div class="country-body"></div></details>`;

const outsideSection = (countries = OUTSIDE_COUNTRIES, opts = {}) => {
  const {
    id = 'outside',
    eyebrow = 'Get to know me',
    heading = 'Outside of work',
    blocks = [
      ['Strength', 'Lifting'],
      ['In the pool', 'Swimming'],
      ['Travel', '9 countries · 6 states'],
      ['Food', 'Things I ate'],
    ],
    images = ['<img src="/outside/a.webp" alt="a" width="600" height="800" loading="lazy" decoding="async">'],
  } = opts;
  const bodies = blocks
    .map(([e, h]) => `<div class="block"><header class="lifting-head"><p class="eyebrow">${e}</p><h3>${h}</h3></header>${images[0] ?? ''}</div>`)
    .join('');
  return `<section class="s" id="${id}"><header class="sh"><p class="eyebrow">${eyebrow}</p><h2>${heading}</h2></header>${bodies}<div class="travel-list">${countries.map(countryEntry).join('')}</div></section>`;
};

describe('readCountries', () => {
  it('reads the country list out of the data module', () => {
    const file = path.join(dir, 'outside.ts');
    write('outside.ts', "export const countries: Country[] = [\n  { name: 'Japan', code: 'JPN', years: [2024], areas: [] },\n];");
    expect(readCountries(file)).toEqual([{ name: 'Japan', code: 'JPN' }]);
  });
  it('returns nothing when the array is not there', () => {
    const file = path.join(dir, 'other.ts');
    write('other.ts', 'export const states = [];');
    expect(readCountries(file)).toEqual([]);
  });
});

describe('findOutsideProblems', () => {
  const dataFile = () => {
    const file = path.join(dir, 'outside.ts');
    write('outside.ts', `export const countries: Country[] = [\n${OUTSIDE_COUNTRIES.map((c) => `  { name: '${c.name}', code: '${c.code}', years: [], areas: [] },`).join('\n')}\n];`);
    return file;
  };
  const build = (section) => {
    write('dist/index.html', `<!doctype html><html><body><section class="s" id="about"><header class="sh"><p class="eyebrow">Where I've worked</p><h2>Experience</h2></header></section>${section}</body></html>`);
    return findOutsideProblems(path.join(dir, 'dist'), dataFile());
  };

  it('passes for a well formed section', () => {
    expect(build(outsideSection())).toEqual([]);
  });

  it('flags a missing section', () => {
    expect(build('')).toHaveLength(1);
    expect(build('')[0]).toMatch(/id="outside"/);
  });

  it('flags a wrong eyebrow or heading', () => {
    expect(build(outsideSection(OUTSIDE_COUNTRIES, { eyebrow: 'Other' }))[0]).toMatch(/Get to know me/);
    expect(build(outsideSection(OUTSIDE_COUNTRIES, { heading: 'Elsewhere' }))[0]).toMatch(/Outside of work/);
  });

  it('flags the blocks in the wrong order', () => {
    const swapped = outsideSection(OUTSIDE_COUNTRIES, {
      blocks: [['Strength', 'Lifting'], ['Food', 'Things I ate'], ['In the pool', 'Swimming'], ['Travel', '9 countries · 6 states']],
    });
    expect(build(swapped).some((p) => /Things I ate/.test(p))).toBe(true);
  });

  it('flags a missing block', () => {
    const short = outsideSection(OUTSIDE_COUNTRIES, {
      blocks: [['Strength', 'Lifting'], ['In the pool', 'Swimming']],
    });
    expect(build(short).some((p) => /Travel/.test(p))).toBe(true);
  });

  it('flags a country that is missing from the list', () => {
    const missing = build(outsideSection(OUTSIDE_COUNTRIES.slice(1)));
    expect(missing.some((p) => /South Korea/.test(p))).toBe(true);
    expect(missing.some((p) => /8 entries, expected 9/.test(p))).toBe(true);
  });

  it('flags a summary that does not name its country', () => {
    const renamed = outsideSection().replace('<span>Japan</span>', '<span>Nippon</span>');
    expect(build(renamed).some((p) => /Japan/.test(p))).toBe(true);
  });

  it('flags a repeated country name', () => {
    const repeated = outsideSection().replace('<span>Malaysia</span>', '<span>Indonesia</span>');
    expect(build(repeated).some((p) => /repeats/.test(p))).toBe(true);
  });

  it('flags an image without alt, width, height or lazy loading', () => {
    expect(build(outsideSection(OUTSIDE_COUNTRIES, { images: ['<img src="/outside/a.webp" width="600" height="800" loading="lazy">'] }))[0]).toMatch(/no alt/);
    expect(build(outsideSection(OUTSIDE_COUNTRIES, { images: ['<img src="/outside/a.webp" alt="a" height="800" loading="lazy">'] }))[0]).toMatch(/no width/);
    expect(build(outsideSection(OUTSIDE_COUNTRIES, { images: ['<img src="/outside/a.webp" alt="a" width="600" loading="lazy">'] }))[0]).toMatch(/no height/);
    expect(build(outsideSection(OUTSIDE_COUNTRIES, { images: ['<img src="/outside/a.webp" alt="a" width="600" height="800">'] }))[0]).toMatch(/lazily/);
  });

  it('flags a missing home page', () => {
    expect(findOutsideProblems(path.join(dir, 'nope'), dataFile())).toHaveLength(1);
  });
});
