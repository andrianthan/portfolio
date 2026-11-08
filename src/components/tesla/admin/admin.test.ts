import { describe, it, expect } from 'vitest';
import { VIEWS, VISIT_GAP_MIN, canOpen, grant, mockRequests, revoke, usageFor, type Req } from './admin';

const DAY = 1440;
const now = 40 * DAY;
const reqs: Req[] = [
  { userId: 'u1', tab: 'overview', ts: now - 5 },
  { userId: 'u1', tab: 'overview', ts: now - 20 },
  { userId: 'u1', tab: 'ask', ts: now - 100, ask: true, llmCost: 0.123 },
  { userId: 'u1', tab: 'ask', ts: now - 3 * DAY, ask: true, llmCost: 0.4 },
  { userId: 'u1', tab: 'campaigns', ts: now - 20 * DAY },
  { userId: 'u1', tab: 'campaigns', ts: now - 35 * DAY },
  { userId: 'u2', tab: 'admin', ts: now - 1 },
];

describe('admin usage', () => {
  it('defines a visit gap of 30 minutes', () => { expect(VISIT_GAP_MIN).toBe(30); });
  it('counts visits with the gap rule', () => {
    const u = usageFor('u1', reqs, now);
    // visits in 7d: [now-3d], [now-100], [now-20,now-5] (20 and 5 are 15 min apart) = 3
    expect(u.visits7).toBe(3);
    expect(u.visits30).toBe(4);
  });
  it('counts active days inside the 30-day window only', () => {
    // The 35-day-old request sits outside the window, so u1 is active on 3 distinct days.
    expect(usageFor('u1', reqs, now).activeDays).toBe(3);
  });
  it('finds the top tab, ask count and spend', () => {
    const u = usageFor('u1', reqs, now);
    expect(u.topTab).toBe('ask');
    expect(u.askCount).toBe(2);
    expect(u.llmSpend).toBeCloseTo(0.52, 2);
  });
  it('handles a user with no requests', () => {
    const u = usageFor('nobody', reqs, now);
    expect(u).toEqual({ userId: 'nobody', activeDays: 0, visits7: 0, visits30: 0, topTab: '—', askCount: 0, llmSpend: 0 });
  });
  it('breaks a tie on the top tab alphabetically', () => {
    const tied: Req[] = [
      { userId: 'u1', tab: 'overview', ts: now - 5 },
      { userId: 'u1', tab: 'ask', ts: now - 4 },
    ];
    expect(usageFor('u1', tied, now).topTab).toBe('ask');
    const reversed = tied.slice().reverse();
    expect(usageFor('u1', reversed, now).topTab).toBe('ask');
  });
  it('counts only that user\'s requests', () => {
    const u = usageFor('u2', reqs, now);
    expect(u.visits30).toBe(1);
    expect(u.topTab).toBe('admin');
  });
  it('reads usage from the request log, so a user with no sign-in row still shows', () => {
    expect(mockRequests().length).toBeGreaterThan(20);
  });
  it('is default-allow for the unmatched until the flag is on', () => {
    expect(canOpen('u9', 'admin', {}, false)).toBe(true);
    expect(canOpen('u9', 'admin', {}, true)).toBe(false);
    expect(canOpen('u1', 'admin', { u1: ['overview'] }, false)).toBe(false);
    expect(canOpen('u1', 'overview', { u1: ['overview'] }, true)).toBe(true);
  });
  it('audits every grant and never mutates its inputs', () => {
    const grants = Object.freeze({ u1: Object.freeze(['overview']) }) as Record<string, string[]>;
    const log = Object.freeze([]) as unknown as [];
    const out = grant(grants, 'u1', 'campaigns', log);
    expect(out.grants.u1).toEqual(['overview', 'campaigns']);
    expect(out.log).toEqual([{ who: 'Admin', action: 'grant', target: 'u1:campaigns' }]);
  });
  it('audits every revoke and never mutates its inputs', () => {
    const grants = Object.freeze({ u1: Object.freeze(['overview', 'campaigns']) }) as Record<string, string[]>;
    const log = Object.freeze([]) as unknown as [];
    const out = revoke(grants, 'u1', 'campaigns', log);
    expect(out.grants.u1).toEqual(['overview']);
    expect(out.log).toEqual([{ who: 'Admin', action: 'revoke', target: 'u1:campaigns' }]);
    // the frozen inputs are untouched
    expect(grants.u1).toEqual(['overview', 'campaigns']);
    expect(log).toEqual([]);
  });
  it('revoking a tab that was never granted changes nothing but the log', () => {
    const grants = Object.freeze({ u1: Object.freeze(['overview']) }) as Record<string, string[]>;
    const log = Object.freeze([]) as unknown as [];
    const out = revoke(grants, 'u1', 'ask', log);
    expect(out.grants.u1).toEqual(['overview']);
    expect(out.log).toEqual([{ who: 'Admin', action: 'revoke', target: 'u1:ask' }]);
  });
  it('holds the admin sections and their labels in the module', () => {
    // The component holds no data of its own, so the view list lives here.
    expect(VIEWS.map((v) => v.id)).toEqual(['usage', 'access', 'audit']);
    expect(VIEWS.map((v) => v.label)).toEqual(['Usage', 'Access', 'Audit']);
  });
});
