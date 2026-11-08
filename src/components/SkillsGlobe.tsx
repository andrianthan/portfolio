import { useEffect, useRef } from 'react';
import { RELEASE_EASE_MS, clampPitch, depthOpacity, dragToAngle, fibonacciSphere, project, rotate, spinEase } from '../lib/skillsGlobe';
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
      // Theme toggles swap --color-rule on <html>; the wireframe must follow.
      const themeObs = new MutationObserver(() => {
        measure();
        frame(STATIC_ANGLES.ry, STATIC_ANGLES.rx);
      });
      themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => {
        ro.disconnect();
        themeObs.disconnect();
      };
    }

    let ry = 0;
    let rx = TILT;
    let inView = true;
    let raf: number | null = null;
    let last = 0;

    // Grab state. `releaseStart` is null while the globe is held; otherwise it
    // is when the pointer was let go. It starts in the past so the idle spin
    // runs at full speed before the first grab.
    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let holdStart = 0;
    let releaseStart: number | null = -RELEASE_EASE_MS;

    const tick = (now: number) => {
      raf = null;
      if (!last) last = now;
      // The auto-spin eases out while the globe is held and eases back in once
      // it is released.
      const ease = spinEase(now - holdStart, releaseStart === null ? null : now - releaseStart);
      ry += SPIN_PER_MS * (now - last) * ease;
      last = now;
      frame(ry, rx);
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
      // Batches can hold several crossings; the newest entry wins.
      inView = entries[entries.length - 1].isIntersecting;
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
      if (raf === null) frame(ry, rx);
    });
    ro.observe(root);
    const themeObs = new MutationObserver(() => {
      measure();
      frame(ry, rx);
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // The system preference can be turned on while the page is open:
    // freeze to the static frame, or resume the loop if it is turned back off.
    const onMotion = () => {
      if (reduced.matches) {
        stop();
        frame(STATIC_ANGLES.ry, STATIC_ANGLES.rx);
      } else {
        start();
      }
    };
    reduced.addEventListener('change', onMotion);

    // Grab and rotate. The pointer is captured on the root so a drag that
    // leaves the globe still rotates it.
    const onPointerDown = (e: PointerEvent) => {
      if (reduced.matches) return; // reduced motion: the globe stays a still frame
      if (pointerId !== null) return; // one drag at a time
      if (e.pointerType === 'mouse' && e.button !== 0) return; // left button only
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      holdStart = performance.now();
      releaseStart = null; // held: the idle spin eases out
      root.setPointerCapture(e.pointerId);
      if (e.pointerType === 'mouse') e.preventDefault(); // no text selection while rotating
    };
    const onPointerMove = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (reduced.matches) return; // reduced motion: leave the still frame alone
      if (radius <= 0) return;
      const { dRy, dRx } = dragToAngle(dx, dy, radius);
      ry += dRy;
      rx = clampPitch(rx + dRx);
      frame(ry, rx);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      pointerId = null;
      releaseStart = performance.now(); // released: the idle spin eases back in
    };
    // If the capture is lost without a pointerup, end the drag anyway so a
    // later press is not ignored as "already dragging".
    const onLostCapture = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      pointerId = null;
      releaseStart = performance.now();
    };
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerUp);
    root.addEventListener('lostpointercapture', onLostCapture);

    frame(0, rx); // first paint before the loop's first tick
    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      themeObs.disconnect();
      reduced.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVis);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      root.removeEventListener('lostpointercapture', onLostCapture);
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
