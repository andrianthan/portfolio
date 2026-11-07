import type { Item } from './review';

// Fictional sample scenes. Drawn shapes are simple SVG, not photos. Some AI labels are
// deliberately wrong so reject / relabel have something to do.
export type Shape = 'stop' | 'cone' | 'lane' | 'crosswalk' | 'limit' | 'pothole' | 'light' | 'rail';
export interface Scene extends Item { shape: Shape; box: [number, number, number, number] }

export const SCENES: Scene[] = [
  { id: 's1', shape: 'stop', label: 'stop sign', confidence: 0.96, box: [118, 38, 84, 96] },
  { id: 's2', shape: 'cone', label: 'mailbox', confidence: 0.41, box: [124, 78, 72, 70] },
  { id: 's3', shape: 'lane', label: 'lane marking', confidence: 0.88, box: [60, 96, 200, 70] },
  { id: 's4', shape: 'crosswalk', label: 'crosswalk', confidence: 0.92, box: [50, 108, 220, 50] },
  { id: 's5', shape: 'limit', label: 'stop sign', confidence: 0.55, box: [124, 30, 72, 84] },
  { id: 's6', shape: 'pothole', label: 'pothole', confidence: 0.58, box: [100, 110, 120, 50] },
  { id: 's7', shape: 'light', label: 'streetlight', confidence: 0.9, box: [140, 14, 40, 132] },
  { id: 's8', shape: 'rail', label: 'fence', confidence: 0.47, box: [30, 80, 260, 40] },
];

interface ArtOpts { night?: boolean; worn?: number; dx?: number; scale?: number }

export function ShapeArt({ shape, night = false, worn = 0, dx = 0, scale = 1 }: { shape: Shape } & ArtOpts) {
  const mark = worn > 0 ? 1 - worn * 0.7 : 1; // worn paint is fainter
  const sky = night ? '#161b2c' : 'var(--qa-sky)';
  const road = night ? '#1b1d24' : 'var(--qa-road)';
  return (
    <>
      <rect width="320" height="110" fill={sky} />
      <rect y="110" width="320" height="70" fill={road} />
      {night && <g fill="#f6f1c8" opacity=".8"><circle cx="40" cy="22" r="1.5" /><circle cx="96" cy="40" r="1.2" /><circle cx="250" cy="28" r="1.6" /><circle cx="290" cy="60" r="1.2" /></g>}
      <g transform={`translate(${dx} 0) translate(160 110) scale(${scale}) translate(-160 -110)`} opacity={night ? 0.85 : 1}>
        {shape === 'stop' && <g><rect x="157" y="84" width="6" height="50" fill="#8a8f99" /><polygon points="140,50 180,50 190,64 190,84 180,98 140,98 130,84 130,64" fill="#d4453d" opacity={mark} /></g>}
        {shape === 'limit' && <g><rect x="157" y="84" width="6" height="50" fill="#8a8f99" /><circle cx="160" cy="62" r="28" fill="#f4f4f1" stroke="#d4453d" strokeWidth="6" opacity={mark} /><text x="160" y="70" textAnchor="middle" fontSize="22" fontWeight="700" fill="#222" opacity={mark}>35</text></g>}
        {shape === 'cone' && <g><polygon points="160,86 184,142 136,142" fill="#f08a24" opacity={mark} /><rect x="128" y="142" width="64" height="8" fill="#c96a10" /><rect x="146" y="112" width="28" height="8" fill="#fff" opacity={mark} /></g>}
        {shape === 'lane' && <g fill="#f4f4f1" opacity={mark}>{[0, 1, 2, 3].map((i) => <rect key={i} x={70 + i * 48} y={134 + i} width="28" height="6" />)}</g>}
        {shape === 'crosswalk' && <g fill="#f4f4f1" opacity={mark}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={56 + i * 32} y="116" width="18" height="40" />)}</g>}
        {shape === 'pothole' && <ellipse cx="160" cy="138" rx="46" ry="14" fill="#0e0f13" />}
        {shape === 'light' && <g><rect x="157" y="30" width="6" height="110" fill="#8a8f99" /><rect x="157" y="26" width="34" height="6" fill="#8a8f99" /><circle cx="190" cy="38" r="7" fill={night ? '#fff6b0' : '#f6d86b'} />{night && <circle cx="190" cy="38" r="16" fill="#fff6b0" opacity=".25" />}</g>}
        {shape === 'rail' && <g fill="none" stroke="#8a8f99" strokeWidth="4" opacity={mark}><line x1="30" y1="92" x2="290" y2="92" /><line x1="30" y1="110" x2="290" y2="110" />{[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1={40 + i * 40} y1="84" x2={40 + i * 40} y2="118" />)}</g>}
      </g>
    </>
  );
}

export function SceneArt({ scene }: { scene: Scene }) {
  const [x, y, w, h] = scene.box;
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label={`Sample road scene: ${scene.shape}`} className="qa-art">
      <ShapeArt shape={scene.shape} />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="var(--qa-box)" strokeWidth="2" strokeDasharray="6 3" />
      <rect x={x} y={y - 16} width={Math.max(60, scene.label.length * 7 + 14)} height="16" fill="var(--qa-box)" />
      <text x={x + 6} y={y - 4} fontSize="11" fontWeight="600" fill="#0a0a0f">{scene.label} {Math.round(scene.confidence * 100)}%</text>
    </svg>
  );
}
