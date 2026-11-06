/** Scroll a home-page section into view, keep the hash in sync and move keyboard focus to it. */
export function scrollToSection(href: string): void {
  if (typeof document === 'undefined' || !href.startsWith('#')) return;
  const section = document.querySelector<HTMLElement>(href);
  if (!section) return;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  try {
    history.replaceState(null, '', href);
  } catch {
    /* some embedded browsers refuse history changes */
  }
  const target = section.querySelector<HTMLElement>('h2') ?? section;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}
