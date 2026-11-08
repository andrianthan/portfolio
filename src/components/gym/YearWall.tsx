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
    const root = document.documentElement;
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
      const style = getComputedStyle(root);
      const on = style.getPropertyValue('--gym-go').trim() || '#5ee38a';
      const off = style.getPropertyValue('--color-rule').trim() || '#2a2552';
      const gap = Math.max(1, cell * 0.18);
      for (const c of grid.cells) {
        ctx.fillStyle = c.went ? on : off;
        ctx.globalAlpha = c.went ? 1 : 0.55;
        ctx.fillRect(WALL_LABEL + c.col * cell, c.row * cell, cell - gap, cell - gap);
      }
      ctx.globalAlpha = 1;
    };
    draw();
    // the height change from draw() must not re-trigger a redraw loop: only redraw when the width changes
    const ro = new ResizeObserver(() => {
      if (Math.abs(canvas.getBoundingClientRect().width - lastWidth) > 0.5) draw();
    });
    ro.observe(canvas);
    const mo = new MutationObserver(draw);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [grid]);
  return (
    <div className="gym-wall-wrap" style={wallVars}>
      <canvas ref={ref} className="gym-wall" aria-hidden="true" />
    </div>
  );
}
