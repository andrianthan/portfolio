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

const read = (f) => fs.readFileSync(f, 'utf8');

export const findMarkers = (files) =>
  files.filter((f) => read(f).includes('[to confirm]')).map((f) => `marker "[to confirm]" in ${f}`);

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

export function findLeaks(distDir, files, entries) {
  const problems = [];
  const html = files.map((f) => [f, read(f)]);
  for (const e of entries.filter((x) => !x.cleared)) {
    const route = `/${e.collection}/${e.id}`;
    if (fs.existsSync(path.join(distDir, e.collection, e.id))) problems.push(`non-cleared route built: ${route}`);
    const needle = bodyNeedle(e.body);
    for (const [f, text] of html) {
      if (text.includes(`href="${route}`)) problems.push(`link to non-cleared ${route} in ${f}`);
      if (needle && text.includes(needle)) problems.push(`body of non-cleared ${route} found in ${f}`);
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
      entries.push({ collection, id: name.replace(/\.md$/, ''), cleared: data.cleared === true, body: content });
    }
  }
  return entries;
}
