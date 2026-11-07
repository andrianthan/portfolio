import { useEffect, useRef } from 'react';
import { depthOpacity, fibonacciSphere, project, rotate } from '../lib/skillsGlobe';
import { iconForSkill } from '../lib/skillIcons';

export interface GlobeItem {
  label: string;
  group: string;
}

const WIRE_DOTS = 140;
const WIRE_RINGS_LAT = 4;
const WIRE_RINGS_LON = 6;
const TILT = 0.35;
const SPIN_PER_MS = 0.00035;
const STATIC_ANGLES = { ry: -0.6, rx: 0.35 };
const FOV_FACTOR = 2.2;

function IconSvg({ label }: { label: string }) {
  const icon = iconForSkill(label);
  if (!icon) return null;
  if (icon.kind === 'brand' && icon.path) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={icon.path} fill="currentColor" />
      </svg>
    );
  }
  return <span className="globe-glyph" dangerouslySetInnerHTML={{ __html: icon.svg ?? '' }} />;
}

export default function SkillsGlobe({ items }: { items: GlobeItem[] }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const nodesEl = nodesRef.current;
    const canvas = canvasRef.current;
    if (!root || !nodesEl || !canvas) return;
    const nodes = Array.from(nodesEl.children) as HTMLElement[];
    const base = fibonacciSphere(items.length);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');

    let w = 0;
    let h = 0;
    let radius = 0;
    let wireColor = '#888';

    const measure = () => {
      const rect = root.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(w, h) * 0.42;
      wireColor = getComputedStyle(root).getPropertyValue('--color-rule').trim() || '#888';
    };

    const rotated = (p: { x: number; y: number; z: number }, ry: number, rx: number) =>
      project(rotate(p, ry, rx), { radius, fov: radius * FOV_FACTOR, cx: w / 2, cy: h / 2 });

    const drawWire = (ry: number, rx: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = wireColor;
      ctx.strokeStyle = wireColor;
      for (const p of fibonacciSphere(WIRE_DOTS)) {
        const q = rotated(p, ry, rx);
        ctx.globalAlpha = 0.15 * depthOpacity(q.z);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.08;
      const SEGMENTS = 64;
      for (let k = 1; k <= WIRE_RINGS_LAT; k++) {
        const phi = (k * Math.PI) / (WIRE_RINGS_LAT + 1);
        const r = Math.sin(phi);
        const y = Math.cos(phi);
        ctx.beginPath();
        for (let s = 0; s <= SEGMENTS; s++) {
          const a = (s / SEGMENTS) * Math.PI * 2;
          const q = rotated({ x: r * Math.cos(a), y, z: r * Math.sin(a) }, ry, rx);
          if (s === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
      }
      for (let k = 0; k < WIRE_RINGS_LON; k++) {
        const theta = (k * Math.PI) / WIRE_RINGS_LON;
        ctx.beginPath();
        for (let s = 0; s <= SEGMENTS; s++) {
          const t = (s / SEGMENTS) * Math.PI * 2;
          const q = rotated({ x: Math.cos(theta) * Math.sin(t), y: Math.cos(t), z: Math.sin(theta) * Math.sin(t) }, ry, rx);
          if (s === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const place = (ry: number, rx: number) => {
      base.forEach((p, i) => {
        const q = rotated(p, ry, rx);
        const node = nodes[i];
        node.style.transform = `translate(${q.x}px, ${q.y}px) translate(-50%, -50%) scale(${Math.min(1.3, Math.max(0.6, q.scale))})`;
        node.style.opacity = String(depthOpacity(q.z));
        node.style.zIndex = q.z > 0 ? '2' : '1';
      });
    };

    const frame = (ry: number, rx: number) => {
      drawWire(ry, rx);
      place(ry, rx);
    };

    measure();
    if (reduced.matches) {
      // Reduced motion: one static frame, no loop, but still re-render on resize.
      frame(STATIC_ANGLES.ry, STATIC_ANGLES.rx);
      const ro = new ResizeObserver(() => {
        measure();
        frame(STATIC_ANGLES.ry, STATIC_ANGLES.rx);
      });
      ro.observe(root);
      return () => ro.disconnect();
    }

    let ry = 0;
    let inView = true;
    let raf: number | null = null;
    let last = 0;

    const tick = (now: number) => {
      raf = null;
      if (!last) last = now;
      ry += SPIN_PER_MS * (now - last);
      last = now;
      frame(ry, TILT);
      if (inView && !document.hidden) raf = requestAnimationFrame(tick);
      else last = 0;
    };

    const start = () => {
      if (raf === null && inView && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    const io = new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) start();
      else stop();
    });
    io.observe(root);
    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => {
      measure();
      if (raf === null) frame(ry, TILT);
    });
    ro.observe(root);

    frame(0, TILT); // first paint before the loop's first tick
    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [items]);

  return (
    <div className="globe" ref={rootRef}>
      <canvas className="globe-wire" aria-hidden="true" ref={canvasRef} />
      <div className="globe-nodes" aria-hidden="true" ref={nodesRef}>
        {items.map((item) => (
          <div className="globe-node" key={item.label}>
            <IconSvg label={item.label} />
            <span className="globe-label">{item.label}</span>
          </div>
        ))}
      </div>
      <ul className="sr-only">
        {items.map((item) => (
          <li key={item.label}>
            {item.label} ({item.group})
          </li>
        ))}
      </ul>
    </div>
  );
}
