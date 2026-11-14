export interface MockPart { id: string; name: string; system: string }
export const MOCK_PARTS: readonly MockPart[] = [
  { id: 'P-1001', name: 'Rear door latch', system: 'Closures' },
  { id: 'P-1002', name: 'Window regulator', system: 'Closures' },
  { id: 'P-1003', name: 'Front fascia clip', system: 'Exterior' },
  { id: 'P-1004', name: 'Cabin air filter', system: 'Climate' },
  { id: 'P-1005', name: 'Wheel hub bearing', system: 'Chassis' },
];
export const MOCK_PLANNERS: readonly string[] = ['Planner A', 'Planner B', 'Planner C', 'Planner D', 'Planner E', 'Planner F'];
export interface MockCampaign { id: string; name: string; partId: string; remainingUnits: number; weeklyPace: number; weeklyService: number }
export const MOCK_CAMPAIGNS: readonly MockCampaign[] = [
  { id: 'C-01', name: 'Latch inspection', partId: 'P-1001', remainingUnits: 4200, weeklyPace: 300, weeklyService: 1500 },
  { id: 'C-02', name: 'Regulator update', partId: 'P-1002', remainingUnits: 900, weeklyPace: 40, weeklyService: 1200 },
  { id: 'C-03', name: 'Clip replacement', partId: 'P-1003', remainingUnits: 2600, weeklyPace: 210, weeklyService: 1300 },
  { id: 'C-04', name: 'Filter swap', partId: 'P-1004', remainingUnits: 600, weeklyPace: 20, weeklyService: 2000 },
  { id: 'C-05', name: 'Bearing recheck', partId: 'P-1005', remainingUnits: 3100, weeklyPace: 150, weeklyService: 1100 },
  { id: 'C-06', name: 'Latch follow-up', partId: 'P-1001', remainingUnits: 1200, weeklyPace: 90, weeklyService: 1500 },
];
export const MOCK_USERS: readonly { id: string; name: string; group: string }[] = [
  { id: 'u1', name: 'User 1', group: 'Planners' }, { id: 'u2', name: 'User 2', group: 'Planners' },
  { id: 'u3', name: 'User 3', group: 'Planners' }, { id: 'u4', name: 'User 4', group: 'Analysts' },
  { id: 'u5', name: 'User 5', group: 'Analysts' }, { id: 'u6', name: 'User 6', group: 'Admins' },
];
// Deterministic pseudo-series: a linear congruential step per index.
export function series(seed: number, n: number, base: number, spread: number): number[] {
  let s = (seed * 9301 + 49297) % 233280;
  return Array.from({ length: n }, () => {
    s = (s * 9301 + 49297) % 233280;
    return Math.round(base + (s / 233280 - 0.5) * 2 * spread);
  });
}
