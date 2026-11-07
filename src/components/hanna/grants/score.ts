import { FLAGS, ON_MISSION, type Criteria, type FlagId, type Grant } from './catalog';

export interface FlagResult { id: FlagId; label: string; value: number; reason: string }
export interface Scored { grant: Grant; score: number; flags: FlagResult[] }

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

function flagValue(id: FlagId, g: Grant): { value: number; reason: string } {
  switch (id) {
    case 'mission': {
      const hits = g.mission.filter((t) => ON_MISSION.includes(t)).length;
      if (hits >= 2) return { value: 1, reason: `Matches ${hits} focus areas: ${g.mission.join(', ')}.` };
      if (hits === 1) return { value: 0.5, reason: `Matches one focus area: ${g.mission[0]}.` };
      return { value: 0, reason: 'No match with the organization’s focus areas.' };
    }
    case 'geography':
      return g.geography === 'local' ? { value: 1, reason: 'Local funder, serves this area directly.' }
        : g.geography === 'state' ? { value: 0.7, reason: 'State-level funder, area is covered.' }
        : { value: 0.4, reason: 'Federal funder, wider competition.' };
    case 'effort': {
      const perHour = Math.round(g.amount / g.staffHours);
      const value = perHour >= 500 ? 1 : perHour >= 200 ? 0.7 : perHour >= 100 ? 0.4 : 0.15;
      return { value, reason: `${money(g.amount)} for about ${g.staffHours} staff hours, roughly ${money(perHour)} per hour.` };
    }
    case 'reporting':
      return g.reporting === 'light' ? { value: 1, reason: 'Light reporting requirements.' }
        : g.reporting === 'medium' ? { value: 0.6, reason: 'Moderate reporting requirements.' }
        : { value: 0.2, reason: 'Heavy reporting burden.' };
    case 'deadline': {
      const d = g.deadlineDays;
      if (d < 7) return { value: 0.2, reason: `Due in ${d} days, too little time to apply well.` };
      if (d <= 21) return { value: 0.6, reason: `Due in ${d} days, tight but workable.` };
      if (d <= 90) return { value: 1, reason: `Due in ${d} days, a comfortable window.` };
      return { value: 0.7, reason: `Due in ${d} days, far out, easy to forget.` };
    }
    case 'eligibility':
      return g.eligible ? { value: 1, reason: 'Meets the stated eligibility rules.' } : { value: 0, reason: 'Does not meet the eligibility rules.' };
    case 'relationship':
      return g.relationship === 'known' ? { value: 1, reason: 'Existing relationship with this funder.' } : { value: 0.4, reason: 'New funder, no prior relationship.' };
  }
}

export function scoreGrant(g: Grant, c: Criteria): Scored {
  const flags: FlagResult[] = FLAGS.map(({ id, label }) => ({ id, label, ...flagValue(id, g) }));
  const totalWeight = flags.reduce((s, f) => s + c.weights[f.id], 0);
  const raw = totalWeight === 0 ? 0 : (10 * flags.reduce((s, f) => s + c.weights[f.id] * f.value, 0)) / totalWeight;
  return { grant: g, score: Math.round(raw * 10) / 10, flags };
}

export function visibleAt(scored: Scored[], threshold: number): Scored[] {
  return scored.filter((s) => s.score >= threshold).sort((a, b) => b.score - a.score || (a.grant.id < b.grant.id ? -1 : 1));
}
