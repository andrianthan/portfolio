// Builds src/data/world-dots.json: a land-only dot grid (~3 degree spacing),
// each dot tagged with the ISO alpha-3 of the listed country it falls in ("" otherwise).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoContains, geoCentroid } from 'd3-geo';

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-110m.json'), 'utf8'));
const land = feature(topo, topo.objects.countries).features;

const STEP = 3;
const LON0 = -180, LAT_TOP = 84, LAT_BOTTOM = -57;
const cols = Math.round(360 / STEP);
const rows = Math.floor((LAT_TOP - LAT_BOTTOM) / STEP) + 1;

const ids = { '410': 'KOR', '392': 'JPN', '704': 'VNM', '158': 'TWN', '764': 'THA', '484': 'MEX', '458': 'MYS', '360': 'IDN' };
const listed = Object.fromEntries(land.filter((f) => ids[f.id]).map((f) => [ids[f.id], f]));
// Singapore is too small for the 110m dataset; pin it by coordinates.
const pins = { SGP: [103.8, 1.35] };

const cell = (lon, lat) => [Math.floor((lon - LON0) / STEP), Math.round((LAT_TOP - lat) / STEP)];
const dots = new Map();
for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    const p = [LON0 + x * STEP + STEP / 2, LAT_TOP - y * STEP];
    const hit = land.find((f) => geoContains(f, p));
    if (hit) dots.set(`${x},${y}`, ids[hit.id] ?? '');
  }
}
// Make sure every listed country shows at least once (Indonesia may stay absent).
const have = () => new Set(dots.values());
for (const [code, f] of Object.entries(listed)) {
  if (have().has(code)) continue;
  const [x, y] = cell(...geoCentroid(f));
  if (y >= 0 && y < rows && x >= 0 && x < cols) dots.set(`${x},${y}`, code);
}
for (const [code, ll] of Object.entries(pins)) {
  const [x, y] = cell(...ll);
  dots.set(`${x},${y}`, code);
}

const out = { cols, rows, dots: [...dots].map(([k, c]) => [...k.split(',').map(Number), c]) };
writeFileSync(new URL('../src/data/world-dots.json', import.meta.url), JSON.stringify(out));
console.log(`${out.dots.length} dots, ${cols}x${rows}`, [...have()].join(' '));
