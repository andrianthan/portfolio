import fs from 'node:fs';
import { listHtml, listText, findMarkers, findBrokenLinks, findMissingAlt, findLeaks, readEntries, findRequiredLinks, findOutsideProblems, findMissingRoutes, findSnapshotProblems } from './checks.mjs';

export function runChecks({ distDir, contentDir, dataFile }) {
  if (!fs.existsSync(distDir)) return { problems: [`dist not found: ${distDir}; run astro build first`], pages: 0, entries: 0 };
  const html = listHtml(distDir);
  const text = listText(distDir);
  const entries = readEntries(contentDir);
  const problems = [];
  if (html.length === 0) problems.push('no html files found in dist (refusing to pass an empty build)');
  if (entries.length === 0) problems.push('no content entries found (refusing to pass with nothing to check against)');
  problems.push(
    ...findMarkers(text),
    ...findMissingAlt(html),
    ...findBrokenLinks(distDir, html),
    ...findLeaks(distDir, text, entries),
    ...findRequiredLinks(html, ['/terminal']),
    ...findMissingRoutes(distDir, ['/terminal']),
    ...findSnapshotProblems(distDir, entries),
  );
  if (dataFile) problems.push(...findOutsideProblems(distDir, dataFile));
  return { problems, pages: html.length, entries: entries.length };
}
