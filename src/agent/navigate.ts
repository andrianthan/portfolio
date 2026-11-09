import type { AgentResult, Intent, NavTarget } from './types';

// The intents that have a place on the home page. Targets are fixed here on purpose: a
// content entry can never point the page somewhere else. Skills, resume, help, search and
// the easter eggs have no section to scroll to, so they answer in place.
export const NAV_TARGETS: Partial<Record<Intent, NavTarget>> = {
  experience: { href: '#experience', label: 'experience' },
  about: { href: '#about', label: 'about' },
  contact: { href: '#contact', label: 'contact' },
};

export function navTarget(intent: Intent): NavTarget | null {
  return NAV_TARGETS[intent] ?? null;
}

/** A bare route is a slash command or a single word. Anything longer is a question. */
export function isBareRoute(query: string): boolean {
  const value = query.trim();
  return value.startsWith('/') || (value.length > 0 && !/\s/.test(value));
}

/** Attach the navigate effect to an answered (not refused) result that has a place on the page. */
export function withNavigate(result: AgentResult): AgentResult {
  if (result.refused) return result;
  const target = navTarget(result.route.intent);
  if (!target) return result;
  return { ...result, effects: { ...result.effects, navigate: target } };
}
