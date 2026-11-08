import { describe, it, expect } from 'vitest';
import { MANIFESTS, discover, tabsReport, toggleKill } from './modular';

describe('modular tab discovery', () => {
  it('mounts valid tabs and skips the broken one, reporting why', () => {
    const d = discover(MANIFESTS, []);
    expect(d.mounted.map((m) => m.id)).toEqual(['overview', 'part-summary', 'campaigns', 'like-part']);
    expect(d.skipped).toEqual([{ id: 'broken-tab', reason: 'failed to import' }]);
  });
  it('skips a tab behind the kill switch without touching the others', () => {
    const d = discover(MANIFESTS, ['campaigns']);
    expect(d.mounted.map((m) => m.id)).not.toContain('campaigns');
    expect(d.mounted).toHaveLength(3);
    expect(d.skipped.find((s) => s.id === 'campaigns')?.reason).toBe('kill switch');
  });
  it('toggles the kill switch on and off', () => {
    const on = toggleKill([], 'overview');
    expect(on).toEqual(['overview']);
    expect(toggleKill(on, 'overview')).toEqual([]);
  });
  it('reports every tab', () => {
    const lines = tabsReport(discover(MANIFESTS, []));
    expect(lines).toContain('mounted overview');
    expect(lines).toContain('skipped broken-tab (failed to import)');
    expect(lines).toHaveLength(MANIFESTS.length);
  });
  it('credits the like-part tab to a teammate with no name', () => {
    expect(MANIFESTS.find((m) => m.id === 'like-part')!.owner).toBe('a teammate');
  });
});
