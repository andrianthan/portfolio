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

export function SceneArt({ scene }: { scene: Scene }) {
  const [x, y, w, h] = scene.box;
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label={`Sample road scene: ${scene.shape}`} className="qa-art">
      <rect width="320" height="110" fill="var(--qa-sky)" />
      <rect y="110" width="320" height="70" fill="var(--qa-road)" />
      {scene.shape === 'stop' && <g><rect x="157" y="84" width="6" height="50" fill="#8a8f99" /><polygon points="140,50 180,50 190,64 190,84 180,98 140,98 130,84 130,64" fill="#d4453d" /></g>}
      {scene.shape === 'limit' && <g><rect x="157" y="84" width="6" height="50" fill="#8a8f99" /><circle cx="160" cy="62" r="28" fill="#f4f4f1" stroke="#d4453d" strokeWidth="6" /><text x="160" y="70" textAnchor="middle" fontSize="22" fontWeight="700" fill="#222">35</text></g>}
      {scene.shape === 'cone' && <g><polygon points="160,86 184,142 136,142" fill="#f08a24" /><rect x="128" y="142" width="64" height="8" fill="#c96a10" /><rect x="146" y="112" width="28" height="8" fill="#fff" /></g>}
      {scene.shape === 'lane' && <g fill="#f4f4f1">{[0, 1, 2, 3].map((i) => <rect key={i} x={70 + i * 48} y={134 + i} width="28" height="6" />)}</g>}
      {scene.shape === 'crosswalk' && <g fill="#f4f4f1">{[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={56 + i * 32} y="116" width="18" height="40" />)}</g>}
      {scene.shape === 'pothole' && <ellipse cx="160" cy="138" rx="46" ry="14" fill="#1b1d22" />}
      {scene.shape === 'light' && <g><rect x="157" y="30" width="6" height="110" fill="#8a8f99" /><rect x="157" y="26" width="34" height="6" fill="#8a8f99" /><circle cx="190" cy="38" r="7" fill="#f6d86b" /></g>}
      {scene.shape === 'rail' && <g fill="none" stroke="#8a8f99" strokeWidth="4"><line x1="30" y1="92" x2="290" y2="92" /><line x1="30" y1="110" x2="290" y2="110" />{[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1={40 + i * 40} y1="84" x2={40 + i * 40} y2="118" />)}</g>}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="var(--qa-box)" strokeWidth="2" strokeDasharray="6 3" />
      <rect x={x} y={y - 16} width={Math.max(60, scene.label.length * 7 + 14)} height="16" fill="var(--qa-box)" />
      <text x={x + 6} y={y - 4} fontSize="11" fontWeight="600" fill="#0a0a0f">{scene.label} {Math.round(scene.confidence * 100)}%</text>
    </svg>
  );
}
