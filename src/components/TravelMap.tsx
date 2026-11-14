import world from '../data/world-dots.json';
import { countries } from '../data/outside';

const visited = new Set(countries.map((c) => c.code));

export function dotClass(code: string, selected: string | null): string {
  if (!code || !visited.has(code)) return 'dot-land';
  return code === selected ? 'dot-selected' : 'dot-visited';
}

const groups: Record<string, [number, number][]> = {};
for (const [x, y, code] of world.dots as [number, number, string][]) {
  (groups[visited.has(code) ? code : ''] ??= []).push([x, y]);
}

export default function TravelMap({ selected }: { selected: string | null }) {
  return (
    <svg className="travel-map" viewBox={`0 0 ${world.cols} ${world.rows}`} aria-hidden="true" focusable="false">
      {Object.entries(groups).map(([code, dots]) => (
        <g key={code || 'land'} className={`${dotClass(code, selected)}${code ? ` dot-${code}` : ''}`}>
          {dots.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} />
          ))}
        </g>
      ))}
    </svg>
  );
}
