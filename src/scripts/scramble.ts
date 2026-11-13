import { scrambleFrame } from '../lib/scramble';

const DURATION = 600;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
  const target = el.dataset.scramble ?? el.textContent ?? '';
  if (reduced || !target) return;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION);
    el.textContent = scrambleFrame(target, t, Math.random);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
});
