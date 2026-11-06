import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runChecks } from './lib/run.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { problems, pages, entries } = runChecks({
  distDir: path.join(root, 'dist'),
  contentDir: path.join(root, 'src', 'content'),
});

if (problems.length) {
  console.error(`check-build: ${problems.length} problem(s)`);
  for (const p of problems) console.error(' - ' + p);
  process.exit(1);
}
console.log(`check-build: ok (${pages} pages, ${entries} entries)`);
