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
 * Why the shell cannot import this tab, or null when it can.
 *
 * A tab with no id or no title has an incomplete manifest; a tab with no entry
 * cannot be imported. The import failure is the root cause, so it is reported
 * ahead of the kill switch.
 */
function importReason(m: Manifest): 'manifest incomplete' | 'failed to import' | null {
  if (m.id.trim() === '' || m.title.trim() === '') return 'manifest incomplete';
  if (m.entry === null) return 'failed to import';
  return null;
}

/**
 * Whether the shell could mount this tab at all, ignoring the kill switch.
 *
 * A tab that cannot be imported can never mount, so a kill switch for it would
 * be a no-op.
 */
export function mountable(m: Manifest): boolean {
  return importReason(m) === null;
}

/**
 * Work out which tabs the shell can mount.
 *
 * A manifest is skipped when it is malformed, when its entry cannot be
 * imported, or when the kill switch is on for it.
 */
export function discover(manifests: readonly Manifest[], killed: readonly string[]): Discovery {
  const mounted: Manifest[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const m of manifests) {
    const reason = importReason(m);
    if (reason !== null) {
      skipped.push({ id: m.id, reason });
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
 * One line per manifest: what the shell did with each tab and, when it
 * skipped one, why.
 *
 * The mounted tabs come first, then the skipped ones, each group in manifest
 * order.
 */
export function tabsReport(d: Discovery): string[] {
  const lines: string[] = [];
  for (const m of d.mounted) lines.push(`mounted ${m.id}`);
  for (const s of d.skipped) lines.push(`skipped ${s.id} (${s.reason})`);
  return lines;
}
