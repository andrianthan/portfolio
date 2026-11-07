import { describe, it, expect } from 'vitest';
import { profile } from '../data/profile';
import { GLOBE_SKILLS, SKILL_ICONS, iconForSkill } from './skillIcons';

describe('SKILL_ICONS', () => {
  it('covers every skill in profile.skillGroups', () => {
    for (const group of profile.skillGroups)
      for (const item of group.items)
        expect(SKILL_ICONS[item], `missing icon for "${item}"`).toBeDefined();
  });
  it('every entry is a usable 24x24 icon', () => {
    for (const [key, icon] of Object.entries(SKILL_ICONS)) {
      if (icon.kind === 'brand') expect(icon.path?.length ?? 0, key).toBeGreaterThan(20);
      else expect(icon.svg ?? icon.path, key).toBeTruthy();
    }
  });
  it('GLOBE_SKILLS flattens the groups in order with 30 entries', () => {
    expect(GLOBE_SKILLS).toHaveLength(30);
    expect(GLOBE_SKILLS[0]).toEqual({ label: profile.skillGroups[0].items[0], group: profile.skillGroups[0].label });
    expect(iconForSkill('Python')?.kind).toBe('brand');
  });
});
