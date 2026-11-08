import { useCallback } from 'react';
import { nextTheme } from '../lib/theme';

export default function ThemeToggle() {
  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = nextTheme(root.getAttribute('data-theme'), matchMedia('(prefers-color-scheme: light)').matches);
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch {}
  }, []);

  return (
    <button id="theme-toggle" type="button" aria-label="vapor / light theme" onClick={toggle}>
      vapor / light
    </button>
  );
}
