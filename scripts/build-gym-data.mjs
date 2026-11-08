import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input) { console.error('usage: node scripts/build-gym-data.mjs <checkins.csv>'); process.exit(1); }

function parseLine(line) {
  const out = [];
  let cur = '', quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/).filter(Boolean);
const header = parseLine(lines[0]);
const iDate = header.indexOf('date');
const iPhase = header.indexOf('phase');
if (iDate < 0 || iPhase < 0) throw new Error('csv needs date and phase columns');

const rows = lines.slice(1).map(parseLine).map((r) => ({ date: r[iDate], phase: r[iPhase] }));
const dates = [...new Set(rows.map((r) => r.date))].sort();
if (!dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error('bad date in csv');

const phases = [];
for (const r of rows.slice().sort((a, b) => (a.date < b.date ? -1 : 1))) {
  if (!phases.length || phases[phases.length - 1].label !== r.phase) phases.push({ label: r.phase, from: r.date });
}

const out = { asOf: dates[dates.length - 1], dates, phases };
const dest = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'gym-checkins.json');
fs.writeFileSync(dest, JSON.stringify(out) + '\n');
console.log(`wrote ${dates.length} dates, ${phases.length} phases, asOf ${out.asOf}`);
