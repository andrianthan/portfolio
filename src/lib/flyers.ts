export type FlyerKind = 'shooting-star' | 'comet' | 'ship';

export interface Flyer {
  kind: FlyerKind;
  topPct: number;
  durationMs: number;
  fromLeft: boolean;
  scale: number;
}

export const MAX_FLYERS = 3;

export function nextSpawnDelay(rand: () => number): number {
  return 2500 + Math.floor(rand() * 6500);
}

export function makeFlyer(rand: () => number): Flyer {
  const roll = rand();
  const kind: FlyerKind = roll < 0.55 ? 'shooting-star' : roll < 0.8 ? 'comet' : 'ship';
  const durationMs =
    kind === 'shooting-star' ? 900 + Math.floor(rand() * 700)
    : kind === 'comet' ? 14000 + Math.floor(rand() * 8000)
    : 22000 + Math.floor(rand() * 14000);
  return {
    kind,
    topPct: Math.round((4 + rand() * 56) * 10) / 10,
    durationMs,
    fromLeft: rand() < 0.5,
    scale: Math.round((0.7 + rand() * 0.6) * 100) / 100,
  };
}
