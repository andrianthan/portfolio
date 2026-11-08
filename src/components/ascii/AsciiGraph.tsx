import { useEffect, useRef, useState } from 'react';
import { buildGraph, pointerFocus, renderFrame, toText } from './graph';

const COLS = 72;
const ROWS = 30;
const graph = buildGraph();
const staticText = toText(renderFrame(graph, { t: 0, yaw: 0.5, pitch: 0.2, cols: COLS, rows: ROWS }), COLS, ROWS);

/** The agent network, drawn in characters. Decorative: the text is for no-JS and screen-off cases. */
export default function AsciiGraph() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const root = document.documentElement;
    const scene = canvas.closest('.hero-scene');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let color = getComputedStyle(root).getPropertyValue('--color-num').trim() || '#a78bfa';
    let cellW = 8, cellH = 14;
    let focus: { col: number; row: number } | null = null;
    let visible = true;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cellW = rect.width / COLS;
      cellH = rect.height / ROWS;
      ctx.font = `${Math.max(8, cellH * 0.9)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    };

    const draw = (now: number) => {
      const t = reduce.matches ? 0 : (now - t0) / 1000;
      const nx = parseFloat(root.style.getPropertyValue('--nx')) || 0;
      const ny = parseFloat(root.style.getPropertyValue('--ny')) || 0;
      const yaw = reduce.matches ? 0.5 : 0.5 + t * 0.12 + nx * 0.5;
      const pitch = reduce.matches ? 0.2 : 0.2 - ny * 0.25;
      const cells = renderFrame(graph, { t, yaw, pitch, cols: COLS, rows: ROWS, focus: reduce.matches ? null : focus });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      for (const c of cells) {
        ctx.globalAlpha = 0.15 + 0.85 * c.level;
        ctx.fillText(c.ch, c.col * cellW + cellW / 2, c.row * cellH + cellH / 2);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || reduce.matches) return;
      if (now - last >= 33) { last = now; draw(now); }
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && visible && !document.hidden && !reduce.matches) raf = requestAnimationFrame(loop); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const setPaused = () => scene?.classList.toggle('is-paused', !visible || document.hidden);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      // an off-screen graph is not drawn, so it does no layout work per mouse move
      if (!visible) return;
      const r = canvas.getBoundingClientRect();
      focus = pointerFocus(visible, { x: e.clientX, y: e.clientY }, r, COLS, ROWS);
    };
    const onLeave = () => { focus = null; };
    const onVisibility = () => { setPaused(); if (document.hidden) stop(); else start(); };
    const onMotion = () => { if (reduce.matches) { stop(); draw(performance.now()); } else start(); };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      setPaused();
      if (visible) start(); else stop();
    });
    const themeWatch = new MutationObserver(() => {
      color = getComputedStyle(root).getPropertyValue('--color-num').trim() || color;
      if (reduce.matches) draw(performance.now());
    });
    const ro = new ResizeObserver(() => { resize(); draw(performance.now()); });

    resize();
    draw(performance.now());
    // the first frame is on the canvas: now the text fallback can step aside
    setDrawn(true);
    io.observe(canvas);
    ro.observe(canvas);
    themeWatch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    reduce.addEventListener('change', onMotion);
    setPaused();
    start();

    return () => {
      stop();
      scene?.classList.remove('is-paused');
      io.disconnect(); ro.disconnect(); themeWatch.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener('change', onMotion);
    };
  }, []);

  return (
    <div className={`ascii${drawn ? ' is-drawn' : ''}`} aria-hidden="true">
      <pre className="ascii-fallback">{staticText}</pre>
      <canvas ref={ref} className="ascii-canvas" />
    </div>
  );
}
