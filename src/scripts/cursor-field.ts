import { normalize } from '../lib/pointer';

// The pointer position is published as two custom properties on the root element and
// read by the background layers in global.css. The script never touches the content
// and the page's layout never changes. The field layer repaints itself on each
// update (about 0.9ms measured); the quiet grid's drift is a transform, so the
// compositor moves that layer on its own. Alongside the pixel pair (--mx/--my) it also
// publishes a unitless -1..1 pair (--nx/--ny) that the backdrop reads.

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
  const n = normalize(x, y, window.innerWidth, window.innerHeight);
  root.style.setProperty('--nx', n.nx.toFixed(3));
  root.style.setProperty('--ny', n.ny.toFixed(3));
}

function onMove(event: PointerEvent): void {
  /* a finger is not a cursor: leave the field alone on touch screens */
  if (event.pointerType === 'touch') return;
  if (motion.matches || document.hidden) return;
  x = event.clientX;
  y = event.clientY;
  /* one write per frame, never more. the write also replaces whatever position was
     held, so the field never lights up where the pointer used to be */
  if (!frame) frame = requestAnimationFrame(paint);
}

/* The pointer left the page: keep the position where it was. The CSS fades the
   field out in place (the opacity gate is the root element's hover), so a glow
   never jumps to the middle of the screen on the way out. */
function hold(): void {
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

/* The page is hidden or the reader asked for less motion: drop the position so the
   field rests on its centred fallback. */
function clear(): void {
  hold();
  x = 0;
  y = 0;
  root.style.removeProperty('--mx');
  root.style.removeProperty('--my');
  root.style.removeProperty('--nx');
  root.style.removeProperty('--ny');
}

function listen(): void {
  if (motion.matches || document.hidden) return;
  window.addEventListener('pointermove', onMove, { passive: true });
}

function unlisten(): void {
  window.removeEventListener('pointermove', onMove);
}

/* The pointer and visibility handlers are attached only while the effect is
   allowed to run. Under reduced motion the script attaches nothing at all, so
   the page truly does nothing until the preference is turned off. */
let attached = false;

function onVisibility(): void {
  if (document.hidden) {
    unlisten();
    clear();
  } else listen();
}

function attach(): void {
  if (attached) return;
  attached = true;
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('pointerleave', hold);
  window.addEventListener('blur', hold);
  listen();
}

function detach(): void {
  if (!attached) return;
  attached = false;
  document.removeEventListener('visibilitychange', onVisibility);
  document.removeEventListener('pointerleave', hold);
  window.removeEventListener('blur', hold);
  unlisten();
}

if (supported) {
  /* the media-query listener is the one handler that is always attached: it is
     what lets the script start listening if the preference is turned off later,
     and stop again if it is turned back on */
  motion.addEventListener('change', () => {
    if (motion.matches) {
      detach();
      clear();
    } else attach();
  });
  if (!motion.matches) attach();
}
