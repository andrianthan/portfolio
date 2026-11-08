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
