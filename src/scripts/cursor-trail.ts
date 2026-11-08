import { addPoint, alive, fade, spawnDust, stepDust, growFor, type Pt, type Dust } from '../lib/trail';

// A soft glow follows the mouse, with a short fading tail and a few specks of stardust.
// The animation loop runs only while a point or a speck is still alive, so a page with a
// still mouse does no work at all. Touch pointers, hidden tabs and prefers-reduced-motion
// get nothing: under reduced motion the script creates no canvas and attaches no handlers.
// The canvas is fixed and ignores pointer events, so layout and clicks are untouched.

const TRAIL_LIFE = 600;
const INTERACTIVE = 'a,button,[role=button],input,textarea,select,summary,label';
const root = document.documentElement;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const lightQuery = matchMedia('(prefers-color-scheme: light)');

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let sprite: HTMLCanvasElement | null = null;
let dpr = 1;
let pts: Pt[] = [];
let dust: Dust[] = [];
let lastDust = 0;
let lastMove = 0;
let hx = 0;
let hy = 0;
let scale = 1;
let over = false;
let running = 0;
let lastFrame = 0;
let resizeFrame = 0;
let attached = false;
let light = false;
let rgb = '185,164,255';
let observer: MutationObserver | null = null;

function isLight(): boolean {
  const t = root.getAttribute('data-theme');
  return t === 'light' || (t === null && lightQuery.matches);
}

function hexToRgb(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function buildSprite(): void {
  light = isLight();
  const token = getComputedStyle(root).getPropertyValue(light ? '--color-num' : '--color-accent');
  rgb = hexToRgb(token) ?? (light ? '109,61,240' : '185,164,255');
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const c = s.getContext('2d');
  if (!c) return;
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.35, `rgba(${rgb},0.35)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  sprite = s;
  if (canvas) canvas.style.mixBlendMode = light ? 'normal' : 'screen';
}

function size(): void {
  resizeFrame = 0;
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

function onResize(): void {
  if (!resizeFrame) resizeFrame = requestAnimationFrame(size);
}

function draw(now: number): void {
  if (!ctx || !canvas || !sprite) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const peak = light ? 0.4 : 0.55;

  for (const p of pts) {
    const f = fade(p.t, now, TRAIL_LIFE);
    const d = 10 + 34 * f;
    ctx.globalAlpha = f * f * peak * 0.7;
    ctx.drawImage(sprite, p.x - d / 2, p.y - d / 2, d, d);
  }

  const head = fade(lastMove, now, TRAIL_LIFE);
  if (head > 0) {
    const d = 96 * scale;
    ctx.globalAlpha = head * peak;
    ctx.drawImage(sprite, hx - d / 2, hy - d / 2, d, d);
  }

  ctx.fillStyle = `rgb(${rgb})`;
  for (const k of dust) {
    const s = stepDust(k, now);
    if (s.a <= 0) continue;
    ctx.globalAlpha = s.a * (light ? 0.7 : 0.9);
    ctx.beginPath();
    ctx.arc(s.x, s.y, k.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function tick(now: number): void {
  const dt = lastFrame ? now - lastFrame : 16;
  lastFrame = now;
  pts = alive(pts, now, TRAIL_LIFE);
  dust = dust.filter((k) => now - k.t < k.life);
  scale = growFor(over, scale, dt);
  draw(now);
  if (pts.length || dust.length || fade(lastMove, now, TRAIL_LIFE) > 0) {
    running = requestAnimationFrame(tick);
  } else {
    running = 0;
    lastFrame = 0;
    ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function onMove(e: PointerEvent): void {
  if (e.pointerType === 'touch') return;
  const now = performance.now();
  hx = e.clientX;
  hy = e.clientY;
  lastMove = now;
  over = e.target instanceof Element && e.target.closest(INTERACTIVE) !== null;
  pts = addPoint(pts, { x: hx, y: hy, t: now });
  if (now - lastDust > 40 && dust.length < 30) {
    dust.push(spawnDust(hx, hy, now, Math.random));
    lastDust = now;
  }
  if (!running) running = requestAnimationFrame(tick);
}

function stop(): void {
  if (running) cancelAnimationFrame(running);
  running = 0;
  lastFrame = 0;
  pts = [];
  dust = [];
  lastMove = 0;
  ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function onVisibility(): void {
  if (document.hidden) stop();
}

function attach(): void {
  if (attached) return;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (!g) return;
  canvas = c;
  ctx = g;
  c.className = 'aura';
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;';
  document.body.appendChild(c);
  attached = true;
  size();
  buildSprite();
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  observer = new MutationObserver(buildSprite);
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  lightQuery.addEventListener('change', buildSprite);
}

function detach(): void {
  if (!attached) return;
  attached = false;
  stop();
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('resize', onResize);
  document.removeEventListener('visibilitychange', onVisibility);
  lightQuery.removeEventListener('change', buildSprite);
  observer?.disconnect();
  observer = null;
  canvas?.remove();
  canvas = null;
  ctx = null;
}

motion.addEventListener('change', () => (motion.matches ? detach() : attach()));
if (!motion.matches) attach();
