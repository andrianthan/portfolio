import { ease, normalizePointer, settled, shiftPx, type Pointer } from '../lib/parallax';
import { MAX_FLYERS, makeFlyer, nextSpawnDelay } from '../lib/flyers';

const root = document.querySelector<HTMLElement>('.scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

if (root && !reduced.matches) {
  startParallax(root);
  startFlyers(root.querySelector<HTMLElement>('.flyers'));
}

function startParallax(scene: HTMLElement): void {
  let current: Pointer = { x: 0, y: 0 };
  let target: Pointer = { x: 0, y: 0 };
  let frame = 0;

  const tick = () => {
    frame = 0;
    current = ease(current, target);
    const shift = shiftPx(current);
    scene.style.setProperty('--px', `${shift.x}px`);
    scene.style.setProperty('--py', `${shift.y}px`);
    if (!settled(current, target)) frame = requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || document.hidden) return;
    target = normalizePointer(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });
}

function startFlyers(container: HTMLElement | null): void {
  if (!container) return;
  const spawn = () => {
    if (!document.hidden && container.children.length < MAX_FLYERS) addFlyer(container);
    setTimeout(spawn, nextSpawnDelay(Math.random));
  };
  setTimeout(spawn, nextSpawnDelay(Math.random));
}

function addFlyer(container: HTMLElement): void {
  const f = makeFlyer(Math.random);
  const el = document.createElement('span');
  el.className = `flyer ${f.kind}`;
  const x0 = f.fromLeft ? '-15vw' : '110vw';
  const x1 = f.fromLeft ? '110vw' : '-15vw';
  el.style.setProperty('--top', `${f.topPct}%`);
  el.style.setProperty('--dur', `${f.durationMs}ms`);
  el.style.setProperty('--x0', x0);
  el.style.setProperty('--x1', x1);
  el.style.setProperty('--rot', f.fromLeft ? '20deg' : '160deg');
  el.style.setProperty('--s', String(f.scale));
  el.addEventListener('animationend', (event) => {
    if (event.target === el) el.remove();
  });
  container.appendChild(el);
}
