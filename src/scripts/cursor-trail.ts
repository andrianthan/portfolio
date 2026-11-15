import { TRAIL_MAX_AGE_MS, TRAIL_MAX_POINTS, isAlive, pushPoint, segmentStyle, trailColor, type TrailPoint } from '../lib/trail';

const INTERACTIVE = 'a, button, summary, [role="option"], label, select';
const TEXT_ENTRY = 'input, textarea, [contenteditable]';
const HEAD_RADIUS = 8;
const HEAD_CORE = 1.5;
const HOVER_SCALE = 1.6;

const fine = matchMedia('(pointer: fine)');
const hover = matchMedia('(hover: hover)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let stop: (() => void) | null = null;

const wanted = () => fine.matches && hover.matches && !reduced.matches;

function sync(): void {
  if (wanted() && !stop) {
    try { stop = start(); } catch { stop?.(); stop = null; }
  } else if (!wanted() && stop) {
    stop();
    stop = null;
  }
}

sync();
reduced.addEventListener('change', sync);
fine.addEventListener('change', sync);
hover.addEventListener('change', sync);

function start(): () => void {
  const html = document.documentElement;
  const canvas = document.createElement('canvas');
  canvas.className = 'cursor-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  document.body.appendChild(canvas);

  let points: TrailPoint[] = [];
  let x = 0;
  let y = 0;
  let headVisible = false;
  let scale = 1;
  let scaleTarget = 1;
  let frame = 0;
  let resizeFrame = 0;
  let dpr = 1;

  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();

  const draw = (now: number) => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const n = points.length;
    for (let j = 0; j < n - 1; j++) {
      const a = points[n - 1 - j];
      const b = points[n - 2 - j];
      const { width, alpha } = segmentStyle(j, n - 1, now - a.t, TRAIL_MAX_AGE_MS);
      if (width <= 0.05 || alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = trailColor(n > 2 ? j / (n - 2) : 0);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (headVisible) {
      const r = HEAD_RADIUS * scale;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, 'rgba(185, 164, 255, 0.85)');
      glow.addColorStop(0.45, 'rgba(167, 139, 250, 0.35)');
      glow.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, HEAD_CORE * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  const tick = () => {
    frame = 0;
    if (document.hidden) return;
    const now = performance.now();
    scale += (scaleTarget - scale) * 0.25;
    if (Math.abs(scaleTarget - scale) < 0.01) scale = scaleTarget;
    draw(now);
    if (isAlive(points, now, TRAIL_MAX_AGE_MS) || scale !== scaleTarget) frame = requestAnimationFrame(tick);
  };
  const wake = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || document.hidden) return;
    try {
      if (!html.classList.contains('has-trail')) html.classList.add('has-trail');
      const target = event.target instanceof Element ? event.target : null;
      const overText = !!target?.closest(TEXT_ENTRY);
      x = event.clientX;
      y = event.clientY;
      headVisible = !overText;
      scaleTarget = !overText && target?.closest(INTERACTIVE) ? HOVER_SCALE : 1;
      if (!overText) points = pushPoint(points, { x, y, t: performance.now() }, TRAIL_MAX_AGE_MS, TRAIL_MAX_POINTS);
      wake();
    } catch {
      teardown();
    }
  };

  const onLeave = () => {
    headVisible = false;
    html.classList.remove('has-trail');
    wake();
  };
  const onOut = (event: MouseEvent) => { if (!event.relatedTarget) onLeave(); };

  const onVisibility = () => {
    if (!document.hidden) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    points = [];
    headVisible = false;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };

  const onResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      size();
      draw(performance.now());
    });
  };

  const teardown = () => {
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('mouseout', onOut);
    html.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', onResize);
    if (frame) cancelAnimationFrame(frame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    html.classList.remove('has-trail');
    canvas.remove();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('mouseout', onOut);
  html.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize, { passive: true });
  return teardown;
}
