import { describe, it, expect } from 'vitest';
import { NAV, initialReply, initialWarm, isView, replyLine, resetReply, restart, sendRequest, warmStep, request, stepDelayMs, SCOPES, scopeBars, scopeKpis } from './dashboard';

describe('dashboard frame logic', () => {
  it('lists every project once, in page order, plus overview and work log', () => {
    expect(NAV.map((n) => n.id)).toEqual(['overview', 'part-summary', 'ask-sdp', 'forecast-lab', 'campaigns', 'slideshow-generation', 'modular-architecture', 'admin', 'worklog']);
    expect(NAV.find((n) => n.id === 'campaigns')!.target).toBe('campaigns');
    expect(NAV.find((n) => n.id === 'overview')!.target).toBeNull();
  });
  it('knows which nav entries are panes of this demo', () => {
    // The view type is derived from these, so a nav entry with no target is
    // a pane and everything else scrolls to a section of the page.
    expect(isView('overview')).toBe(true);
    expect(isView('worklog')).toBe(true);
    expect(isView('campaigns')).toBe(false);
  });
  it('starts warm and answers 200', () => {
    expect(request(initialWarm()).status).toBe(200);
  });
  it('answers 503 warming up right after a restart, never building on the request', () => {
    const s = restart(initialWarm());
    expect(s.status).toBe('cold');
    const r = request(s);
    expect(r.status).toBe(503);
    expect(r.body).toBe('warming up');
  });
  it('warms hot parts one step at a time and stops at the memory ceiling', () => {
    let s = restart(initialWarm());
    for (let i = 0; i < 40; i++) s = warmStep(s);
    expect(s.status).toBe('warm');
    expect(s.rssMb).toBeLessThanOrEqual(s.ceilingMb);
    expect(s.hot).toBeLessThan(s.total);
    expect(s.hot).toBeGreaterThan(0);
  });
  it('serves the last good payload while warming', () => {
    let s = restart(initialWarm());
    s = warmStep(s);
    expect(s.status).toBe('warming');
    expect(request(s).status).toBe(200);
  });
  it('waits longer before the first step out of cold', () => {
    expect(stepDelayMs('cold')).toBe(2500);
  });
  it('uses the short delay for later steps', () => {
    expect(stepDelayMs('warming')).toBe(600);
  });
  it('announces a repeated request, so the live region is not silent', () => {
    const first = replyLine(request(initialWarm()), 1);
    const second = replyLine(request(initialWarm()), 2);
    // The visible line is the same both times...
    expect(first.visible).toBe(second.visible);
    // ...so the announcement has to carry what changed.
    expect(first.announced).not.toBe(second.announced);
    expect(second.announced).toContain('2');
  });
  it('says no request has been sent yet, and announces nothing', () => {
    const none = replyLine(null, 0);
    expect(none.visible).toBe('No request sent yet.');
    expect(none.announced).toBe('');
  });
  it('counts the requests it has sent', () => {
    const one = sendRequest(initialReply, initialWarm());
    expect(one.count).toBe(1);
    expect(one.reply).toEqual({ status: 200, body: 'last good payload' });
    const two = sendRequest(one, initialWarm());
    expect(two.count).toBe(2);
  });
  it('starts the request count again after a restart', () => {
    // The count reads as scoped to the current server run, so a restart puts
    // it back to the start rather than leaving it where it was.
    let s = sendRequest(initialReply, initialWarm());
    s = sendRequest(s, initialWarm());
    expect(s.count).toBe(2);
    const after = resetReply();
    expect(after.count).toBe(0);
    expect(after.reply).toBeNull();
    expect(replyLine(after.reply, after.count).announced).toBe('');
    // The next request after a restart is the first of the new run.
    expect(sendRequest(after, initialWarm()).count).toBe(1);
  });
});

describe('the overview scope filter', () => {
  it('offers the whole catalog first, then each system in it', () => {
    expect(SCOPES[0].label).toBe('All parts');
    expect(SCOPES.map((s) => s.id)).toEqual(['all', 'Closures', 'Exterior', 'Climate', 'Chassis']);
  });

  it('counts the KPI tiles from the mock catalog, so the numbers follow the scope', () => {
    // The tiles are computed from the same mock parts and campaigns the rest
    // of the demos use, so a scope cannot show a number nothing backs.
    expect(scopeKpis('all').map((k) => k.value)).toEqual(['5', '6', '12,600', '91%']);
    expect(scopeKpis('Closures').map((k) => k.value)).toEqual(['2', '3', '6,300', '91%']);
    expect(scopeKpis('Climate').map((k) => k.value)).toEqual(['1', '1', '600', '91%']);
  });

  it('names the tiles it shows', () => {
    expect(scopeKpis('all').map((k) => k.label)).toEqual([
      'Parts tracked', 'Open campaigns', 'Service units left', 'Forecast accuracy',
    ]);
  });

  it('draws a different demand series for every scope', () => {
    const all = scopeBars('all');
    expect(all).toHaveLength(12);
    expect(scopeBars('Closures')).not.toEqual(all);
    expect(scopeBars('Exterior')).not.toEqual(scopeBars('Closures'));
  });

  it('scales the scoped demand down, so a narrower scope shows a smaller chart', () => {
    const sum = (bars: number[]) => bars.reduce((a, b) => a + b, 0);
    expect(sum(scopeBars('Closures'))).toBeLessThan(sum(scopeBars('all')));
  });
});
