import { MOCK_USERS, series } from '../fixtures';

// The admin surface, mocked: per-user usage computed from the request log,
// per-tab access grants and an audit log.
//
// Everything here is fake. The usage numbers come from a made-up request log,
// never from sign-ins, and the default-deny gate is built but off in production.

export interface Req {
  userId: string;
  tab: string;
  /** Minutes since an epoch. */
  ts: number;
  ask?: boolean;
  llmCost?: number;
}

export interface Usage {
  userId: string;
  activeDays: number;
  visits7: number;
  visits30: number;
  topTab: string;
  askCount: number;
  llmSpend: number;
}

/** A visit breaks when the gap between requests reaches this many minutes. */
export const VISIT_GAP_MIN = 30;

const MIN_PER_DAY = 1440;

/** The window the usage figures cover: active days and 30-day visits. */
export const USAGE_WINDOW_DAYS = 30;

/** The shorter window the 7-day visits cover. */
export const VISIT_WINDOW_DAYS = 7;

/** The mock clock: a 40-day epoch, so "now" is the end of a 30-day mock span. */
export const MOCK_NOW = 40 * MIN_PER_DAY;

/**
 * Usage for one user, read from the request log.
 *
 * `activeDays` counts the distinct days the user was active inside the last
 * 30 days; a visit is a burst of requests less than `VISIT_GAP_MIN` apart.
 */
export function usageFor(userId: string, reqs: readonly Req[], now: number): Usage {
  const mine = reqs
    .filter((r) => r.userId === userId)
    .slice()
    .sort((a, b) => a.ts - b.ts);

  const dayStart = now - USAGE_WINDOW_DAYS * MIN_PER_DAY;
  const days = new Set<number>();
  for (const r of mine) {
    if (r.ts > dayStart && r.ts <= now) days.add(Math.floor(r.ts / MIN_PER_DAY));
  }

  // A visit starts at the first request, and again whenever the gap from the
  // previous request reaches the visit gap.
  const visits = burstStarts(mine);

  const within = (days: number) => (ts: number) => ts > now - days * MIN_PER_DAY && ts <= now;
  const in7 = within(VISIT_WINDOW_DAYS);
  const in30 = within(USAGE_WINDOW_DAYS);

  const counts = new Map<string, number>();
  for (const r of mine) counts.set(r.tab, (counts.get(r.tab) ?? 0) + 1);
  let topTab = '—';
  let best = 0;
  for (const [tab, n] of counts) {
    // Ties break alphabetically, so the result never depends on log order.
    if (n > best || (n === best && (topTab === '—' || tab < topTab))) {
      best = n;
      topTab = tab;
    }
  }

  const askCount = mine.filter((r) => r.ask).length;
  const llmSpend = Math.round(mine.reduce((sum, r) => sum + (r.llmCost ?? 0), 0) * 100) / 100;

  return {
    userId,
    activeDays: days.size,
    visits7: visits.filter(in7).length,
    visits30: visits.filter(in30).length,
    topTab,
    askCount,
    llmSpend,
  };
}

/** The first request of each visit burst, in time order. */
function burstStarts(reqs: readonly Req[]): number[] {
  const starts: number[] = [];
  let last = null;
  for (const r of reqs) {
    if (last === null || r.ts - last >= VISIT_GAP_MIN) starts.push(r.ts);
    last = r.ts;
  }
  return starts;
}

/** The tabs the request log names, and the tabs an admin can grant. */
export const MOCK_TABS: readonly string[] = ['overview', 'part-summary', 'ask', 'forecast', 'campaigns', 'slides', 'admin'];

/**
 * A deterministic mock request log: roughly 30 requests across the mock users
 * over the 30 days that end at `MOCK_NOW`.
 */
export function mockRequests(): Req[] {
  // Each series is a deterministic spread: days back from now, which tab was
  // opened, and the cost of the ask that produced the request.
  const daysBack = series(7, 30, 15, 15);
  const tabPick = series(11, 30, 3, 3);
  const costPick = series(13, 30, 12, 12);
  const minutePick = series(17, 30, 300, 290);

  const out: Req[] = [];
  for (let i = 0; i < 30; i++) {
    const user = MOCK_USERS[i % MOCK_USERS.length];
    const day = Math.abs(daysBack[i]) % USAGE_WINDOW_DAYS;
    const ts = MOCK_NOW - day * MIN_PER_DAY - (Math.abs(minutePick[i]) % 600);
    const tab = MOCK_TABS[Math.abs(tabPick[i]) % MOCK_TABS.length];
    const ask = tab === 'ask';
    out.push({
      userId: user.id,
      tab,
      ts,
      ask,
      llmCost: ask ? Math.round(Math.abs(costPick[i])) / 100 : undefined,
    });
  }
  return out;
}

export interface Grants {
  [userId: string]: string[];
}

/**
 * Whether a user may open a tab.
 *
 * With the gate off, a user with no entry falls back to the legacy rules and
 * may open anything. With the gate on, no entry means denied, and an entry
 * allows exactly the tabs it lists.
 */
export function canOpen(userId: string, tab: string, grants: Grants, defaultDeny: boolean): boolean {
  const entry = grants[userId];
  if (!entry) return !defaultDeny;
  return entry.includes(tab);
}

export type AuditEntry = { who: string; action: string; target: string };

/** Grant a tab to a user and record it. Neither input is mutated. */
export function grant(
  grants: Grants,
  userId: string,
  tab: string,
  log: AuditEntry[],
): { grants: Grants; log: AuditEntry[] } {
  const entry = grants[userId] ?? [];
  return {
    grants: { ...grants, [userId]: entry.includes(tab) ? entry : [...entry, tab] },
    log: [...log, { who: 'Admin', action: 'grant', target: `${userId}:${tab}` }],
  };
}

/** Revoke a tab from a user and record it. Neither input is mutated. */
export function revoke(
  grants: Grants,
  userId: string,
  tab: string,
  log: AuditEntry[],
): { grants: Grants; log: AuditEntry[] } {
  const entry = grants[userId];
  return {
    grants: entry ? { ...grants, [userId]: entry.filter((t) => t !== tab) } : grants,
    log: [...log, { who: 'Admin', action: 'revoke', target: `${userId}:${tab}` }],
  };
}
