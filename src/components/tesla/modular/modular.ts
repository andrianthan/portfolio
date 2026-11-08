// Mock of how the app discovers its tab modules at runtime.
//
// Each tab ships as a folder under modules/ with a manifest (tab.json) and an
// entry point (tab.ts). At start-up the shell reads every manifest, imports
// what it can, and mounts the rest. A kill switch can take a tab down without
// touching the others.
//
// This is a mock of the discovery step only. Tabs do not run as separate
// processes: the shell imports them into one bundle.

export interface Manifest {
  id: string;
  title: string;
  entry: string | null;
  owner: string;
}

/** The tab folders shipped in the mock repo, in the order the shell reads them. */
export const MANIFESTS: readonly Manifest[] = [
  { id: 'overview', title: 'Overview', entry: 'modules/overview/tab.ts', owner: 'platform team' },
  { id: 'part-summary', title: 'Part summary', entry: 'modules/part-summary/tab.ts', owner: 'platform team' },
  { id: 'campaigns', title: 'Campaigns', entry: 'modules/campaigns/tab.ts', owner: 'platform team' },
  { id: 'like-part', title: 'Like part', entry: 'modules/like-part/tab.ts', owner: 'a teammate' },
  { id: 'broken-tab', title: 'Broken tab', entry: null, owner: 'platform team' },
];

export interface Discovery {
  mounted: Manifest[];
  skipped: { id: string; reason: string }[];
}

/**
 * Work out which tabs the shell can mount.
 *
 * A manifest is skipped when it is malformed, when its entry cannot be
 * imported, or when the kill switch is on for it. The import failure is the
 * root cause, so it is reported ahead of the kill switch.
 */
export function discover(manifests: readonly Manifest[], killed: readonly string[]): Discovery {
  const mounted: Manifest[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const m of manifests) {
    if (m.id.trim() === '' || m.title.trim() === '') {
      skipped.push({ id: m.id, reason: 'manifest incomplete' });
    } else if (m.entry === null) {
      skipped.push({ id: m.id, reason: 'failed to import' });
    } else if (killed.includes(m.id)) {
      skipped.push({ id: m.id, reason: 'kill switch' });
    } else {
      mounted.push(m);
    }
  }

  return { mounted, skipped };
}

/** Flip the kill switch for one tab id. */
export function toggleKill(killed: readonly string[], id: string): string[] {
  return killed.includes(id) ? killed.filter((k) => k !== id) : [...killed, id];
}

/**
 * One line per manifest, in the order the shell read them: what it did with
 * each tab and, when it skipped one, why.
 */
export function tabsReport(d: Discovery): string[] {
  const lines: string[] = [];
  for (const m of d.mounted) lines.push(`mounted ${m.id}`);
  for (const s of d.skipped) lines.push(`skipped ${s.id} (${s.reason})`);
  return lines;
}
