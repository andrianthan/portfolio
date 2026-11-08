import { useEffect, useRef } from 'react';
import data from '../../data/gym-checkins.json';
import { toSet, yearsOf, weekGrid } from './calendar';

const set = toSet(data.dates);
const years = yearsOf(data.dates);
const grids = years.map((y) => weekGrid(y, set));
const COLS = 54;
const LABEL = 34;
const GAP_Y = 10;

/** Decorative overview: one row of weeks per year, drawn once (and again on resize or theme change). */
export default function YearWall() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const root = document.documentElement;
    let lastWidth = -1;
    const draw = () => {
      const width = canvas.getBoundingClientRect().width;
      if (!width) return;
      const cell = (width - LABEL) / COLS;
      const block = 7 * cell + GAP_Y;
      const height = years.length * block;
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
      const muted = style.getPropertyValue('--color-muted').trim() || '#a39fc4';
      const gap = Math.max(1, cell * 0.18);
      ctx.font = `${Math.max(9, cell * 1.6)}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'middle';
      grids.forEach((g, yi) => {
        const top = yi * block;
        ctx.fillStyle = muted;
        ctx.fillText(String(years[yi]).slice(2), 0, top + (7 * cell) / 2);
        for (const c of g.cells) {
          ctx.fillStyle = c.went ? on : off;
          ctx.globalAlpha = c.went ? 1 : 0.55;
          ctx.fillRect(LABEL + c.col * cell, top + c.row * cell, cell - gap, cell - gap);
        }
        ctx.globalAlpha = 1;
      });
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
  }, []);
  return <canvas ref={ref} className="gym-wall" aria-hidden="true" />;
}
