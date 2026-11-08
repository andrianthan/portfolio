import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export function listHtml(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listHtml(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const TEXT_EXT = new Set(['.html', '.js', '.css', '.xml', '.txt', '.json']);
export function listText(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listText(p));
    else if (TEXT_EXT.has(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

const read = (f) => fs.readFileSync(f, 'utf8');

export const findMarkers = (files) =>
  files.filter((f) => /\[to confirm/i.test(read(f))).map((f) => `marker "[to confirm" in ${f}`);

export function findBrokenLinks(distDir, files) {
  const problems = [];
  const re = /\b(?:href|src)="(\/[^"#?]*)/g;
  for (const f of files) {
    for (const m of read(f).matchAll(re)) {
      const target = decodeURIComponent(m[1]);
      if (target.startsWith('//')) continue;
      const base = path.join(distDir, target);
      const ok = fs.existsSync(base) && (fs.statSync(base).isFile() || fs.existsSync(path.join(base, 'index.html')));
      if (!ok && !fs.existsSync(base + '.html')) problems.push(`broken link ${m[1]} in ${f}`);
    }
  }
  return problems;
}

export const findMissingAlt = (files) =>
  files.filter((f) => /<img(?![^>]*\balt=)[^>]*>/i.test(read(f))).map((f) => `<img> without alt in ${f}`);

/**
 * Links that must be present in the built pages. A route that nobody links to is unreachable,
 * so a link that is required by the site has to be checked against the built html.
 */
export function findRequiredLinks(files, required) {
  const all = files.map((f) => read(f)).join('\n');
  return required
    .filter((href) => !all.includes(`href="${href}"`))
    .map((href) => `required link "${href}" is not present in the built pages`);
}

/**
 * The country list, read out of the data module so the check and the page cannot drift.
 * The module is TypeScript and this is plain node, so the array is parsed as text.
 */
export function readCountries(dataFile) {
  const source = read(dataFile);
  const block = source.match(/export const countries: Country\[\] = \[([\s\S]*?)\n\];/);
  if (!block) return [];
  const countries = [];
  for (const entry of block[1].match(/\{[^}]*\}/g) ?? []) {
    const name = entry.match(/\bname:\s*'([^']+)'/);
    const code = entry.match(/\bcode:\s*'([A-Z]{3})'/);
    if (name && code) countries.push({ name: name[1], code: code[1] });
  }
  return countries;
}

// The markup of the "#outside" section: from its opening tag to the matching close.
function outsideSection(html) {
  const start = html.indexOf('<section class="s" id="outside">');
  if (start === -1) return null;
  let depth = 0;
  const re = /<section\b|<\/section>/g;
  re.lastIndex = start;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[0] === '</section>') {
      depth -= 1;
      if (depth === 0) return html.slice(start, m.index + m[0].length);
    } else depth += 1;
  }
  return html.slice(start);
}

/**
 * The Outside of work section is the home page's second half, so its shape is worth a gate:
 * the block order, the nine countries, and the lazy-loaded images that carry it.
 */
export function findOutsideProblems(distDir, dataFile) {
  const indexFile = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexFile)) return [`the Outside of work section has no built home page at ${indexFile}`];
  const html = read(indexFile);
  const problems = [];
  const section = outsideSection(html);
  if (!section) return [`the Outside of work section (id="outside") is missing from ${indexFile}`];

  const header = section.match(/<header class="sh">([\s\S]*?)<\/header>/);
  if (!header) problems.push(`the Outside of work section has no header in ${indexFile}`);
  else {
    if (!header[1].includes('Get to know me')) problems.push(`the Outside of work section is missing the eyebrow "Get to know me" in ${indexFile}`);
    if (!/<h2>Outside of work<\/h2>/.test(header[1])) problems.push(`the Outside of work section is missing the heading "Outside of work" in ${indexFile}`);
  }

  // The blocks come in a fixed order: achievements first, the lifestyle blocks after.
  const blocks = [
    { eyebrow: 'Strength', heading: 'Lifting' },
    { eyebrow: 'In the pool', heading: 'Swimming' },
    { eyebrow: 'Travel', heading: '9 countries · 6 states' },
    { eyebrow: 'Food', heading: 'Things I ate' },
  ];
  let cursor = 0;
  for (const b of blocks) {
    const at = section.indexOf(`<p class="eyebrow">${b.eyebrow}</p>`, cursor);
    if (at === -1) {
      problems.push(`the Outside of work block "${b.heading}" (eyebrow "${b.eyebrow}") is missing from ${indexFile}`);
      continue;
    }
    const head = section.slice(at, at + 200);
    if (!head.includes(`<h3>${b.heading}</h3>`)) {
      problems.push(`the Outside of work block "${b.eyebrow}" does not have the heading "${b.heading}" in ${indexFile}`);
    }
    cursor = at;
  }

  const countries = readCountries(dataFile);
  const entries = [...section.matchAll(/<details class="country" data-c="([A-Z]{3})">([\s\S]*?)<\/summary>/g)];
  if (countries.length === 0) problems.push(`the country list could not be read from ${dataFile}`);
  if (entries.length !== countries.length) {
    problems.push(`the Outside of work country list has ${entries.length} entries, expected ${countries.length} in ${indexFile}`);
  }
  for (const c of countries) {
    const entry = entries.find((e) => e[1] === c.code);
    if (!entry) {
      problems.push(`the Outside of work country list has no entry for ${c.name} (${c.code}) in ${indexFile}`);
      continue;
    }
    if (!entry[2].includes(`>${c.name}<`)) {
      problems.push(`the Outside of work country "${c.name}" does not name itself in its summary in ${indexFile}`);
    }
  }
  const names = entries.map((e) => e[2].match(/<span>([^<]+)<\/span>/)?.[1] ?? '');
  if (new Set(names).size !== names.length) {
    problems.push(`the Outside of work country list repeats a country name in ${indexFile}`);
  }

  for (const img of section.match(/<img\b[^>]*>/g) ?? []) {
    if (!/\balt="/.test(img)) problems.push(`an <img> in the Outside of work section has no alt in ${indexFile}`);
    if (!/\bwidth="\d+"/.test(img)) problems.push(`an <img> in the Outside of work section has no width in ${indexFile}`);
    if (!/\bheight="\d+"/.test(img)) problems.push(`an <img> in the Outside of work section has no height in ${indexFile}`);
    if (!/\bloading="lazy"/.test(img)) problems.push(`an <img> in the Outside of work section is not lazily loaded in ${indexFile}`);
  }

  return problems;
}

/**
 * Routes that must exist in the built output. A page that was never built is a dead end, even
 * when another page links to it.
 */
export function findMissingRoutes(distDir, routes) {
  return routes
    .filter((route) => !fs.existsSync(path.join(distDir, route.replace(/^\//, ''), 'index.html')))
    .map((route) => `missing route ${route} (expected ${route.replace(/^\//, '')}/index.html in dist)`);
}

// A distinctive prose snippet from a Markdown body that survives rendering to HTML.
export function bodyNeedle(body) {
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[#\-*>\s]+/, '');
    if (line.length < 40 || line.startsWith('<') || line.includes('[to confirm]')) continue;
    let needle = line.slice(0, 60);
    const esc = needle.search(/[&<>"]/);
    if (esc !== -1) {
      needle = needle.slice(0, esc);
      if (needle.length < 20) return null;
    }
    return needle;
  }
  return null;
}

// Several distinctive snippets, cut before anything rendering may rewrite or escape.
export function bodyNeedles(body, max = 5) {
  const out = [];
  for (const raw of body.split(/\r?\n/)) {
    if (out.length >= max) break;
    const line = raw.trim().replace(/^[#\-*>\s]+/, '');
    if (line.length < 40 || line.startsWith('<')) continue;
    let needle = line.slice(0, 60);
    const cut = needle.search(/[&<>"*_`\[\]']|--|\.\.\.|[^\x00-\x7F]/);
    if (cut !== -1) needle = needle.slice(0, cut);
    if (needle.length >= 20) out.push(needle);
  }
  return out;
}

export function findLeaks(distDir, files, entries) {
  const problems = [];
  const html = files.map((f) => [f, read(f)]);
  for (const e of entries.filter((x) => !x.cleared)) {
    const route = `/${e.collection}/${e.id}`;
    if (fs.existsSync(path.join(distDir, e.collection, e.id))) problems.push(`non-cleared route built: ${route}`);
    const needles = bodyNeedles(e.body);
    for (const [f, text] of html) {
      if (text.includes(`href="${route}`)) problems.push(`link to non-cleared ${route} in ${f}`);
      if (needles.some((n) => text.includes(n))) problems.push(`body of non-cleared ${route} found in ${f}`);
    }
  }
  return problems;
}

export function readEntries(contentDir) {
  const entries = [];
  for (const collection of ['work', 'projects']) {
    const dir = path.join(contentDir, collection);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.md'))) {
      const { data, content } = matter(fs.readFileSync(path.join(dir, name), 'utf8'));
      entries.push({
        collection,
        id: name.replace(/\.md$/, '').toLowerCase(),
        listed: data.listed !== false,
        cleared: data.cleared === true,
        body: content,
      });
    }
  }
  return entries;
}

const SNAPSHOT_COLLECTIONS = { role: 'work', project: 'projects' };

export function findSnapshotProblems(distDir, entries) {
  const file = path.join(distDir, 'agent-data.json');
  if (!fs.existsSync(file)) return ['agent-data.json is missing from dist'];
  let data;
  try {
    data = JSON.parse(read(file));
  } catch (error) {
    return [`agent-data.json is not valid JSON: ${error.message}`];
  }
  const chunks = Array.isArray(data?.chunks) ? data.chunks : [];
  const problems = [];
  if (chunks.length === 0) problems.push('agent-data.json has no chunks');
  const byKey = new Map(entries.map((entry) => [`${entry.collection}:${entry.id}`, entry]));
  for (const chunk of chunks) {
    const id = String(chunk?.id ?? '');
    const hash = id.indexOf('#');
    const key = hash === -1 ? id : id.slice(0, hash);
    const [kind, entryId] = key.split(':');
    const collection = SNAPSHOT_COLLECTIONS[kind];
    if (!collection) continue;
    const entry = byKey.get(`${collection}:${entryId}`);
    if (!entry) {
      problems.push(`agent-data.json chunk "${id}" has no content entry`);
      continue;
    }
    if (!entry.listed) problems.push(`agent-data.json chunk "${id}" belongs to a non-listed entry`);
    if (hash !== -1 && !entry.cleared) problems.push(`agent-data.json chunk "${id}" is body text from a non-cleared entry`);
  }
  return problems;
}
