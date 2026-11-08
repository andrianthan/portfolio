import { MOCK_CAMPAIGNS, MOCK_PARTS, series, type MockCampaign, type MockPart } from '../fixtures';

export const NAV = [
  { id: 'overview', label: 'Overview', target: null },
  { id: 'part-summary', label: 'Part Summary', target: 'part-summary' },
  { id: 'ask-sdp', label: 'Ask SDP', target: 'ask-sdp' },
  { id: 'forecast-lab', label: 'Forecast Lab', target: 'forecast-lab' },
  { id: 'campaigns', label: 'Campaigns', target: 'campaigns' },
  { id: 'slideshow-generation', label: 'Slides', target: 'slideshow-generation' },
  { id: 'modular-architecture', label: 'Tabs', target: 'modular-architecture' },
  { id: 'admin', label: 'Admin', target: 'admin' },
  { id: 'worklog', label: 'Work log', target: null },
] as const;

/**
 * The panes this demo can show: the nav entries with no target. The type is
 * derived from the list, so a new pane is a type error here rather than a
 * cast at the call site.
 */
type PaneId<N extends { id: string }> = N extends { target: null } ? N['id'] : never;
export type View = PaneId<(typeof NAV)[number]>;
export type NavId = (typeof NAV)[number]['id'];

/** Whether a nav id names a pane of this demo rather than a page section. */
export function isView(id: NavId): id is View {
  return NAV.some((n) => n.target === null && n.id === id);
}

/**
 * The Overview's scope filter: the whole mock catalog, then each system in
 * it. The scope narrows the same mock parts and campaigns the other demos
 * use, so every number the filter shows is counted from that mock data.
 */
export const SCOPES = [
  { id: 'all', label: 'All parts' },
  { id: 'Closures', label: 'Closures' },
  { id: 'Exterior', label: 'Exterior' },
  { id: 'Climate', label: 'Climate' },
  { id: 'Chassis', label: 'Chassis' },
] as const;

export type Scope = (typeof SCOPES)[number]['id'];

export function partsInScope(scope: Scope): MockPart[] {
  return scope === 'all' ? [...MOCK_PARTS] : MOCK_PARTS.filter((p) => p.system === scope);
}

export function campaignsInScope(scope: Scope): MockCampaign[] {
  const ids = new Set(partsInScope(scope).map((p) => p.id));
  return MOCK_CAMPAIGNS.filter((c) => ids.has(c.partId));
}

export interface Kpi { label: string; value: string }

/**
 * The Overview's tiles for a scope, counted from the mock catalog: the parts
 * in scope, the campaigns on them, the service units those campaigns have
 * left, and the forecast accuracy, which does not depend on the scope.
 */
export function scopeKpis(scope: Scope): Kpi[] {
  const parts = partsInScope(scope);
  const campaigns = campaignsInScope(scope);
  const units = campaigns.reduce((sum, c) => sum + c.remainingUnits, 0);
  return [
    { label: 'Parts tracked', value: String(parts.length) },
    { label: 'Open campaigns', value: String(campaigns.length) },
    { label: 'Service units left', value: units.toLocaleString('en-US') },
    { label: 'Forecast accuracy', value: '91%' },
  ];
}

/**
 * The mock weekly demand for a scope, on a fixed 0 to 100 scale so the
 * scopes can be compared with each other: a narrower scope draws the same
 * shape of week, over a smaller demand.
 */
export function scopeBars(scope: Scope): number[] {
  const index = SCOPES.findIndex((s) => s.id === scope);
  const share = partsInScope(scope).length / MOCK_PARTS.length;
  return series(7 + index, 12, 60, 30).map((v) => Math.round(v * share));
}

export type WarmStatus = 'cold' | 'warming' | 'warm';
export interface WarmState { status: WarmStatus; hot: number; total: number; rssMb: number; ceilingMb: number }
const BASE_MB = 1750;
const STEP_MB = 190; // each hot part adds this much, so 3500 MB stops warming near 9 parts; the ceiling is the point
export const initialWarm = (): WarmState => ({ status: 'warm', hot: 9, total: 25, rssMb: BASE_MB + 9 * STEP_MB, ceilingMb: 3500 });
export const restart = (s: WarmState): WarmState => ({ ...s, status: 'cold', hot: 0, rssMb: BASE_MB });
export function warmStep(s: WarmState): WarmState {
  if (s.status === 'warm') return s;
  const nextRss = s.rssMb + STEP_MB;
  if (s.hot >= s.total || nextRss > s.ceilingMb) return { ...s, status: 'warm' };
  return { ...s, status: 'warming', hot: s.hot + 1, rssMb: nextRss };
}
export function request(s: WarmState): { status: 200 | 503; body: string } {
  return s.status === 'cold' ? { status: 503, body: 'warming up' } : { status: 200, body: 'last good payload' };
}

/**
 * The reply line's two halves: what the reader sees, and what the live
 * region announces.
 *
 * The visible text is the same for two identical requests, so the announced
 * text carries the request count: that is the part that changes, and it is
 * what makes the live region speak again on a repeat.
 */
export function replyLine(
  reply: { status: number; body: string } | null,
  count: number,
): { visible: string; announced: string } {
  if (!reply) return { visible: 'No request sent yet.', announced: '' };
  return { visible: `${reply.status} ${reply.body}`, announced: `Request ${count}.` };
}

export interface ReplyState { reply: { status: number; body: string } | null; count: number }

export const initialReply: ReplyState = { reply: null, count: 0 };

/**
 * Send a request: record the reply and count it.
 *
 * The count belongs to the reply, so the two cannot drift apart.
 */
export function sendRequest(s: ReplyState, warm: WarmState): ReplyState {
  return { reply: request(warm), count: s.count + 1 };
}

/**
 * Start the server over: the reply line and its count go back to the start,
 * so the announced count reads as scoped to the current run.
 */
export function resetReply(): ReplyState {
  return initialReply;
}

export const stepDelayMs = (status: WarmStatus): number => (status === 'cold' ? 2500 : 600);
