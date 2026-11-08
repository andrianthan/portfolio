export const NAV: readonly { id: string; label: string; target: string | null }[] = [
  { id: 'overview', label: 'Overview', target: null },
  { id: 'part-summary', label: 'Part Summary', target: 'part-summary' },
  { id: 'ask-sdp', label: 'Ask SDP', target: 'ask-sdp' },
  { id: 'forecast-lab', label: 'Forecast Lab', target: 'forecast-lab' },
  { id: 'campaigns', label: 'Campaigns', target: 'campaigns' },
  { id: 'slideshow-generation', label: 'Slides', target: 'slideshow-generation' },
  { id: 'modular-architecture', label: 'Tabs', target: 'modular-architecture' },
  { id: 'admin', label: 'Admin', target: 'admin' },
  { id: 'worklog', label: 'Work log', target: null },
];
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
