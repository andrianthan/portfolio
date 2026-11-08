import { describe, it, expect } from 'vitest';
import { NAV, initialWarm, restart, warmStep, request } from './dashboard';

describe('dashboard frame logic', () => {
  it('lists every project once, in page order, plus overview and work log', () => {
    expect(NAV.map((n) => n.id)).toEqual(['overview', 'part-summary', 'ask-sdp', 'forecast-lab', 'campaigns', 'slideshow-generation', 'modular-architecture', 'admin', 'worklog']);
    expect(NAV.find((n) => n.id === 'campaigns')!.target).toBe('campaigns');
    expect(NAV.find((n) => n.id === 'overview')!.target).toBeNull();
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
});
