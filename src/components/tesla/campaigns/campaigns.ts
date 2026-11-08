import { MOCK_PLANNERS, type MockCampaign } from '../fixtures';

export type View = 'alerts' | 'parts' | 'campaigns' | 'unlisted';
export const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'alerts', label: 'Alerts' },
  { id: 'parts', label: 'All parts' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'unlisted', label: 'Unlisted bulletin demand' },
];

export const WINDOWS = [8, 13, 26] as const;
export const THRESHOLD = 0.1;

export function paceShare(c: MockCampaign): number {
  return c.weeklyPace / c.weeklyService;
}

// Mock decay per window; best (max) share must stay under the threshold.
export function isWindDown(c: MockCampaign, scale: readonly number[] = [1, 0.95, 0.9]): boolean {
  const shares = WINDOWS.map((_, i) => paceShare(c) * (scale[i] ?? 1));
  return Math.max(...shares) < THRESHOLD;
}

export type Pct = 'P10' | 'P50' | 'P90';
export const PCTS: readonly Pct[] = ['P10', 'P50', 'P90'];
const FACTOR: Record<Pct, number> = { P10: 1.25, P50: 1.0, P90: 0.75 };

export function weeksToFinish(c: MockCampaign, p: Pct): number {
  return Math.ceil(c.remainingUnits / (c.weeklyPace * FACTOR[p]));
}

// A wind-down campaign raises an alert only when no other campaign on the
// same part is still on pace (a healthy sibling keeps the part covered).
export function alerts(cs: readonly MockCampaign[]): MockCampaign[] {
  return cs
    .filter((c) => isWindDown(c) && !cs.some((o) => o.id !== c.id && o.partId === c.partId && !isWindDown(o)))
    .sort((a, b) => b.remainingUnits - a.remainingUnits);
}

export function assignPlanner(c: MockCampaign): string {
  const n = parseInt(c.id.replace(/\D/g, ''), 10) || 0;
  return MOCK_PLANNERS[n % MOCK_PLANNERS.length];
}

export function campaignsTouching(partId: string, cs: readonly MockCampaign[]): number {
  return cs.filter((c) => c.partId === partId).length;
}
