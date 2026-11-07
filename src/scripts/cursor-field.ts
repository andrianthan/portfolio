// The pointer position is published as two custom properties on the root element and
// read by the background layers in global.css. Nothing else happens here: the page
// itself never moves, and the script never touches the content.

const root = document.documentElement;
const motion = matchMedia('(prefers-reduced-motion: reduce)');

/* the custom properties are the whole interface: if the browser cannot set them
   there is nothing to do and the page keeps its static background */
const supported =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('--mx', '0px');

let frame = 0;
let x = 0;
let y = 0;

function paint(): void {
  frame = 0;
  root.style.setProperty('--mx', `${x}px`);
  root.style.setProperty('--my', `${y}px`);
}

function onMove(event: PointerEvent): void {
  /* a finger is not a cursor: leave the field alone on touch screens */
  if (event.pointerType === 'touch') return;
  if (motion.matches || document.hidden) return;
  x = event.clientX;
  y = event.clientY;
  /* one write per frame, never more */
  if (!frame) frame = requestAnimationFrame(paint);
}

function reset(): void {
  x = 0;
  y = 0;
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  /* back to the centred fallback, so the field rests where it started */
  root.style.removeProperty('--mx');
  root.style.removeProperty('--my');
}

function listen(): void {
  if (motion.matches || document.hidden) return;
  window.addEventListener('pointermove', onMove, { passive: true });
}

function unlisten(): void {
  window.removeEventListener('pointermove', onMove);
}

if (supported) {
  motion.addEventListener('change', () => {
    if (motion.matches) {
      unlisten();
      reset();
    } else listen();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      unlisten();
      reset();
    } else listen();
  });
  document.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  listen();
}
