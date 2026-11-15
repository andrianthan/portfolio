import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import data from '../../data/gym-checkins.json';
import { toSet, weekGrid } from './calendar';
import { WALL_COLS, WALL_ROWS, WALL_LABEL, WALL_GAP_Y, wallHeight } from './wall';

const set = toSet(data.dates);

// The CSS reserves the canvas height from these, before any script runs, so the block
// below the wall does not move when the island hydrates. They are the same numbers the
// drawing uses, so the reserved height and the drawn height agree exactly.
const wallVars = {
  '--wall-years': '1',
  '--wall-cols': String(WALL_COLS),
  '--wall-rows': String(WALL_ROWS),
  '--wall-label': `${WALL_LABEL}px`,
  '--wall-gap-y': `${WALL_GAP_Y}px`,
} as CSSProperties;

/** Decorative wall for one year: weeks as columns, drawn on a canvas (redrawn on year, resize or theme change). */
export default function YearWall({ year }: { year: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const grid = useMemo(() => weekGrid(year, set), [year]);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let lastWidth = -1;
    const draw = () => {
      const width = canvas.getBoundingClientRect().width;
      if (!width) return;
      const cell = (width - WALL_LABEL) / WALL_COLS;
      const height = wallHeight(width, 1);
      // size the canvas from the measured width so the drawing never clips or leaves a gap
      canvas.style.height = `${height}px`;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      lastWidth = width;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      // a star field: every day is a faint dot, a check-in is a bright star with a soft violet glow
      const style = getComputedStyle(canvas);
      const star = style.getPropertyValue('--gym-star').trim() || '#f4f3fb';
      const glow = style.getPropertyValue('--gym-glow').trim() || '#a78bfa';
      const dim = style.getPropertyValue('--gym-dim').trim() || 'rgba(255, 255, 255, .22)';
      const half = cell / 2;
      ctx.fillStyle = dim;
      for (const c of grid.cells) {
        if (c.went) continue;
        ctx.beginPath();
        ctx.arc(WALL_LABEL + c.col * cell + half, c.row * cell + half, Math.max(0.6, cell * 0.09), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowColor = glow;
      ctx.shadowBlur = Math.max(3, cell * 0.7);
      for (const c of grid.cells) {
        if (!c.went) continue;
        // a small, stable variation in brightness so the field reads as stars, not a grid
        const v = ((c.col * 7 + c.row * 13) % 5) / 5;
        ctx.fillStyle = v > 0.5 ? star : glow;
        ctx.globalAlpha = 0.8 + v * 0.2;
        ctx.beginPath();
        ctx.arc(WALL_LABEL + c.col * cell + half, c.row * cell + half, Math.max(1.3, cell * (0.2 + v * 0.06)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };
    draw();
    // the height change from draw() must not re-trigger a redraw loop: only redraw when the width changes
    const ro = new ResizeObserver(() => {
      if (Math.abs(canvas.getBoundingClientRect().width - lastWidth) > 0.5) draw();
    });
    ro.observe(canvas);
    return () => { ro.disconnect(); };
  }, [grid]);
  return (
    <div className="gym-wall-wrap" style={wallVars}>
      <canvas ref={ref} className="gym-wall" aria-hidden="true" />
    </div>
  );
}
