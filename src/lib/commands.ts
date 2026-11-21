import type { ContactLinks } from '../data/profile';

export interface MenuItem {
  id: string; label: string; group: 'Go to' | 'Contact'; href: string; external?: boolean; keywords?: string;
}
export interface MenuRow {
  id: string; label: string; group: 'Go to' | 'Contact' | 'Ask'; href?: string; external?: boolean;
}

export function menuItems(contact: ContactLinks): MenuItem[] {
  return [
    { id: 'home', label: 'Home', group: 'Go to', href: '/' },
    { id: 'experience', label: 'Experience', group: 'Go to', href: '/experience', keywords: 'work jobs' },
    { id: 'terminal', label: 'Terminal', group: 'Go to', href: '/terminal', keywords: 'agent chat' },
    { id: 'email', label: 'Email', group: 'Contact', href: `mailto:${contact.email}`, external: true, keywords: 'contact mail' },
    { id: 'linkedin', label: 'LinkedIn', group: 'Contact', href: contact.linkedin, external: true },
  ];
}

export function filterItems(items: MenuItem[], query: string): MenuItem[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;
  return items.filter((item) => {
    const hay = `${item.label} ${item.keywords ?? ''}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

export function buildRows(items: MenuItem[], query: string): MenuRow[] {
  const rows: MenuRow[] = filterItems(items, query).map(({ id, label, group, href, external }) => ({ id, label, group, href, external }));
  const q = query.trim();
  if (q) rows.push({ id: 'ask', label: `Ask: ${q}`, group: 'Ask' });
  return rows;
}
