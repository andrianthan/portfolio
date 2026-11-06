import { useCallback } from 'react';

export default function ThemeToggle() {
  const toggle = useCallback(() => {
    const root = document.documentElement;
    const explicit = root.getAttribute('data-theme');
    const dark = explicit === 'dark' || (!explicit && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch {}
  }, []);

  return (
    <button id="theme-toggle" type="button" aria-label="Toggle light and dark theme" onClick={toggle}>
      light / dark
    </button>
  );
}
