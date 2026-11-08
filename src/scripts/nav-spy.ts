import { activeSection } from '../lib/scrollspy';

const links = [...document.querySelectorAll<HTMLAnchorElement>('.vnav a[data-spy]')];
const targets = links.map((a) => document.getElementById(a.dataset.spy ?? ''));

if (links.length && targets.every((t): t is HTMLElement => t !== null)) {
  let raf = 0;
  const update = () => {
    raf = 0;
    const id = activeSection(targets.map((el) => ({ id: el.id, top: el.getBoundingClientRect().top })), 120);
    for (const a of links) {
      if (a.dataset.spy === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  const request = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}
