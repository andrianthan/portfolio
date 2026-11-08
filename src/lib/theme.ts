export type Theme = 'vapor' | 'light';

/** A stored theme value, or null when it is missing or unknown. The old `dark` value means vapor. */
export function parseStored(value: string | null): Theme | null {
  if (value === 'light') return 'light';
  if (value === 'vapor' || value === 'dark') return 'vapor';
  return null;
}

/** The theme in effect: the saved choice, else the OS preference, else vapor. */
export function currentTheme(stored: string | null, prefersLight: boolean): Theme {
  return parseStored(stored) ?? (prefersLight ? 'light' : 'vapor');
}

export function nextTheme(stored: string | null, prefersLight: boolean): Theme {
  return currentTheme(stored, prefersLight) === 'light' ? 'vapor' : 'light';
}
