import { describe, it, expect } from 'vitest';
import { lifts, liftTotal, percentileLine, hoursLabel, calendarCaption } from './lifting';
import { formatHours } from '../components/gym/calendar';

describe('lifting facts', () => {
  it('lists bench, squat and deadlift as approximate pounds', () => {
    expect(lifts).toEqual([
      { name: 'Bench', pounds: '~245 lb' },
      { name: 'Squat', pounds: '~385 lb' },
      { name: 'Deadlift', pounds: '~475 lb' },
    ]);
  });
  it('the total is the sum of the three lifts', () => {
    expect(245 + 385 + 475).toBe(1105);
    expect(liftTotal).toBe('~1,105 lb');
  });
  it('uses the confirmed percentile line, hours label and caption', () => {
    expect(percentileLine).toBe('90th percentile (per Strength Level, 145 lb)');
    expect(hoursLabel).toBe('~1.6k hours');
    expect(calendarCaption).toBe('Gym check-ins');
  });
  it('the hours label matches 861 check-ins at 1.9 hours each', () => {
    expect(formatHours(861, 1.9)).toBe('1.6k');
    expect(hoursLabel).toBe(`~${formatHours(861, 1.9)} hours`);
  });
  it('marks the hours as an estimate, like the lifts and the total', () => {
    // every derived figure on the page carries the marker, so a reader knows which
    // numbers were measured and which were assumed
    expect(hoursLabel.startsWith('~')).toBe(true);
    for (const l of lifts) expect(l.pounds.startsWith('~')).toBe(true);
    expect(liftTotal.startsWith('~')).toBe(true);
  });
});
