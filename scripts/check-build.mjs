import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHtml, findMarkers, findBrokenLinks, findMissingAlt, findLeaks, readEntries } from './lib/checks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) { console.error('check-build: dist/ not found; run astro build first'); process.exit(1); }

const files = listHtml(dist);
const entries = readEntries(path.join(root, 'src', 'content'));
const problems = [
  ...findMarkers(files),
  ...findMissingAlt(files),
  ...findBrokenLinks(dist, files),
  ...findLeaks(dist, files, entries),
];

if (problems.length) {
  console.error(`check-build: ${problems.length} problem(s)`);
  for (const p of problems) console.error(' - ' + p);
  process.exit(1);
}
console.log(`check-build: ok (${files.length} pages, ${entries.length} entries)`);
