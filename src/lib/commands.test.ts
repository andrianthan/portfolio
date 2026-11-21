import { describe, it, expect } from 'vitest';
import { buildRows, filterItems, menuItems } from './commands';

const contact = { email: 'a@b.co', linkedin: 'https://l/in' };
const items = menuItems(contact);

describe('menuItems', () => {
  it('lists the pages and the contact links', () => {
    expect(items.map((i) => i.id)).toEqual(['home', 'experience', 'terminal', 'email', 'linkedin']);
    expect(items.find((i) => i.id === 'email')?.href).toBe('mailto:a@b.co');
    expect(items.find((i) => i.id === 'terminal')?.href).toBe('/terminal');
    expect(items.find((i) => i.id === 'linkedin')?.external).toBe(true);
  });
});

describe('filterItems', () => {
  it('returns everything for an empty query', () => {
    expect(filterItems(items, '  ')).toHaveLength(items.length);
  });

  it('matches case-insensitively on label and keywords, all tokens required', () => {
    expect(filterItems(items, 'EXP').map((i) => i.id)).toEqual(['experience']);
    expect(filterItems(items, 'agent').map((i) => i.id)).toEqual(['terminal']);
    expect(filterItems(items, 'git zzz')).toEqual([]);
  });
});

describe('buildRows', () => {
  it('has no ask row for an empty query', () => {
    expect(buildRows(items, '').some((r) => r.group === 'Ask')).toBe(false);
  });

  it('puts the ask row last, labelled with the trimmed query', () => {
    const rows = buildRows(items, ' what did you do at tesla ');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'ask', group: 'Ask', label: 'Ask: what did you do at tesla' });
  });

  it('keeps matching items before the ask row', () => {
    const rows = buildRows(items, 'exp');
    expect(rows.map((r) => r.id)).toEqual(['experience', 'ask']);
  });
});
