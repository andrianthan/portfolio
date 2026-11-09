import { describe, it, expect } from 'vitest';
import { LISTINGS, SOURCES, ROLE_TYPES, type Listing } from '../fixtures';
import { areaOf, channelSummary, filterListings, groupByCompany, postToChannel, toggleRoleType, toggleSource } from './listings';

/** The ids of the listings a filter returns, in order. */
function ids(listings: readonly Listing[]): string[] {
  return listings.map((l) => l.id);
}

const ALL = { source: null, roleType: null };

describe('fixtures', () => {
  it('holds exactly ten listings, L-01 to L-10', () => {
    expect(LISTINGS).toHaveLength(10);
    expect(ids(LISTINGS)).toEqual([
      'L-01', 'L-02', 'L-03', 'L-04', 'L-05',
      'L-06', 'L-07', 'L-08', 'L-09', 'L-10',
    ]);
  });
  it('gives every listing an id of the form L-nn', () => {
    LISTINGS.forEach((l) => expect(l.id).toMatch(/^L-\d\d$/));
  });
  it('names only the ten fictional companies', () => {
    const companies = new Set([
      'Northwind Labs',
      'Harborlight Robotics',
      'Cedarworks Systems',
      'Lumenworks',
      'Asterline Health',
      'Quarryline Software',
      'Tidecrest Data',
      'Brightfold Labs',
      'Stonebridge Analytics',
      'Vantagepoint Robotics',
    ]);
    LISTINGS.forEach((l) => expect(companies.has(l.company)).toBe(true));
  });
  it('uses only the known sources and role types', () => {
    expect(SOURCES).toEqual(['career site', 'GitHub list', 'referral']);
    expect(ROLE_TYPES).toEqual(['internship', 'new grad', 'co-op']);
    LISTINGS.forEach((l) => {
      expect(SOURCES).toContain(l.source);
      expect(ROLE_TYPES).toContain(l.roleType);
    });
  });
  it('carries no email address and no stray digit in any listing', () => {
    LISTINGS.forEach((l) => {
      expect(l.title).not.toContain('@');
      expect(l.company).not.toContain('@');
      expect(l.place).not.toContain('@');
      // The date is the only place a digit may appear.
      expect(l.title).not.toMatch(/\d/);
      expect(l.company).not.toMatch(/\d/);
      expect(l.place).not.toMatch(/\d/);
    });
  });
  it('dates every listing in the posted format', () => {
    LISTINGS.forEach((l) => expect(l.posted).toMatch(/^2026-\d\d-\d\d$/));
  });
  it('holds exactly the ten rows, each one pinned', () => {
    // The whole row, not just the id: a fixture edit that mislabels a
    // listing — a title on the wrong row, a source swapped for a role type —
    // would otherwise ship without a word.
    expect(LISTINGS).toEqual([
      { id: 'L-01', title: 'Software Engineering Intern', company: 'Northwind Labs', source: 'career site', roleType: 'internship', posted: '2026-01-12', place: 'Remote' },
      { id: 'L-02', title: 'Robotics Intern', company: 'Harborlight Robotics', source: 'career site', roleType: 'internship', posted: '2026-01-14', place: 'Seattle, WA' },
      { id: 'L-03', title: 'Backend Engineer Intern', company: 'Cedarworks Systems', source: 'GitHub list', roleType: 'internship', posted: '2026-01-15', place: 'Remote' },
      { id: 'L-04', title: 'Software Engineer, New Grad', company: 'Lumenworks', source: 'career site', roleType: 'new grad', posted: '2026-01-16', place: 'Boston, MA' },
      { id: 'L-05', title: 'Health Data Intern', company: 'Asterline Health', source: 'referral', roleType: 'internship', posted: '2026-01-17', place: 'Austin, TX' },
      { id: 'L-06', title: 'Platform Engineering Intern', company: 'Quarryline Software', source: 'GitHub list', roleType: 'internship', posted: '2026-01-19', place: 'Remote' },
      { id: 'L-07', title: 'Data Science Intern', company: 'Tidecrest Data', source: 'GitHub list', roleType: 'internship', posted: '2026-01-20', place: 'Chicago, IL' },
      { id: 'L-08', title: 'Co-op, Test Engineering', company: 'Brightfold Labs', source: 'career site', roleType: 'co-op', posted: '2026-01-21', place: 'Denver, CO' },
      { id: 'L-09', title: 'New Grad Software Engineer', company: 'Stonebridge Analytics', source: 'referral', roleType: 'new grad', posted: '2026-01-22', place: 'Atlanta, GA' },
      { id: 'L-10', title: 'Co-op, Embedded Systems', company: 'Vantagepoint Robotics', source: 'career site', roleType: 'co-op', posted: '2026-01-23', place: 'San Diego, CA' },
    ]);
  });
});

describe('filterListings', () => {
  it('returns every listing, in order, when no filter is set', () => {
    expect(ids(filterListings(LISTINGS, ALL))).toEqual(ids(LISTINGS));
  });
  it('filters by source', () => {
    expect(ids(filterListings(LISTINGS, { source: 'referral', roleType: null }))).toEqual(['L-05', 'L-09']);
  });
  it('filters by role type', () => {
    expect(ids(filterListings(LISTINGS, { source: null, roleType: 'co-op' }))).toEqual(['L-08', 'L-10']);
  });
  it('combines the two filters with AND', () => {
    expect(ids(filterListings(LISTINGS, { source: 'GitHub list', roleType: 'internship' }))).toEqual([
      'L-03', 'L-06', 'L-07',
    ]);
  });
  it('returns nothing when the two filters cannot both hold', () => {
    expect(filterListings(LISTINGS, { source: 'referral', roleType: 'co-op' })).toEqual([]);
  });
  it('never mutates the array it is given', () => {
    const before = JSON.parse(JSON.stringify(LISTINGS));
    filterListings(LISTINGS, { source: 'career site', roleType: 'new grad' });
    filterListings(LISTINGS, { source: 'GitHub list', roleType: 'co-op' });
    expect(LISTINGS).toEqual(before);
  });
});

describe('postToChannel', () => {
  it('appends a listing to the end of the channel', () => {
    const channel = postToChannel([], LISTINGS[0]);
    expect(ids(channel)).toEqual(['L-01']);
    const two = postToChannel(channel, LISTINGS[1]);
    expect(ids(two)).toEqual(['L-01', 'L-02']);
  });
  it('leaves the channel alone when the listing is already in it', () => {
    const channel = postToChannel([], LISTINGS[0]);
    const again = postToChannel(channel, LISTINGS[0]);
    expect(again).toHaveLength(1);
    expect(ids(again)).toEqual(['L-01']);
  });
  it('hands back the same array when the listing is already in it', () => {
    // The same reference, not a copy of it: React bails out of a re-render
    // when the state is unchanged, and a fresh copy would defeat that.
    const channel = postToChannel([], LISTINGS[0]);
    const again = postToChannel(channel, LISTINGS[0]);
    expect(again).toBe(channel);
  });
  it('does not add a second copy of a listing posted twice', () => {
    let channel = postToChannel([], LISTINGS[4]);
    channel = postToChannel(channel, LISTINGS[8]);
    channel = postToChannel(channel, LISTINGS[4]);
    expect(channel).toHaveLength(2);
    expect(ids(channel)).toEqual(['L-05', 'L-09']);
  });
  it('never mutates the channel it is given', () => {
    const channel = postToChannel([], LISTINGS[0]);
    const snapshot = JSON.parse(JSON.stringify(channel));
    postToChannel(channel, LISTINGS[1]);
    postToChannel(channel, LISTINGS[0]);
    expect(channel).toEqual(snapshot);
  });
});

describe('the filter chips', () => {
  it('turns a source filter on and off with the same chip', () => {
    const on = toggleSource(ALL, 'referral');
    expect(on.source).toBe('referral');
    expect(toggleSource(on, 'referral').source).toBeNull();
  });
  it('turns a role-type filter on and off with the same chip', () => {
    const on = toggleRoleType(ALL, 'co-op');
    expect(on.roleType).toBe('co-op');
    expect(toggleRoleType(on, 'co-op').roleType).toBeNull();
  });
  it('moves a source filter to the chip that is pressed next', () => {
    const on = toggleSource(ALL, 'referral');
    const moved = toggleSource(on, 'GitHub list');
    expect(moved.source).toBe('GitHub list');
  });
  it('leaves the other axis alone', () => {
    const on = toggleRoleType(toggleSource(ALL, 'referral'), 'co-op');
    expect(on).toEqual({ source: 'referral', roleType: 'co-op' });
    expect(toggleSource(on, 'referral')).toEqual({ source: null, roleType: 'co-op' });
    expect(toggleRoleType(on, 'co-op')).toEqual({ source: 'referral', roleType: null });
  });
  it('never mutates the filter it is given', () => {
    const before = JSON.parse(JSON.stringify(ALL));
    toggleSource(ALL, 'referral');
    toggleRoleType(ALL, 'co-op');
    expect(ALL).toEqual(before);
  });
});

describe('the channel message', () => {
  it('pings Data / Analytics for a data role and Tech / SWE for any other', () => {
    expect(areaOf(LISTINGS[4])).toBe('Data / Analytics');
    expect(areaOf(LISTINGS[6])).toBe('Data / Analytics');
    expect(areaOf(LISTINGS[0])).toBe('Tech / SWE');
    expect(areaOf(LISTINGS[7])).toBe('Tech / SWE');
  });
  it('groups the posted listings into one card per company, in posting order', () => {
    const cards = groupByCompany([LISTINGS[2], LISTINGS[0]]);
    expect(cards.map((c) => c.company)).toEqual(['Cedarworks Systems', 'Northwind Labs']);
    expect(cards[0].heading).toBe('Cedarworks Systems — 1 new internship');
  });
  it('words a card heading by role type', () => {
    expect(groupByCompany([LISTINGS[3]])[0].heading).toBe('Lumenworks — 1 new grad role');
    expect(groupByCompany([LISTINGS[7]])[0].heading).toBe('Brightfold Labs — 1 new co-op');
  });
  it('counts several listings under one company', () => {
    const two = [LISTINGS[0], { ...LISTINGS[1], company: LISTINGS[0].company }];
    const [card] = groupByCompany(two);
    expect(card.listings).toHaveLength(2);
    expect(card.heading).toBe('Northwind Labs — 2 new internships');
  });
  it('words a mixed card as roles', () => {
    const mixed = [LISTINGS[0], { ...LISTINGS[3], company: LISTINGS[0].company }];
    expect(groupByCompany(mixed)[0].heading).toBe('Northwind Labs — 2 new roles');
  });
  it('summarises the roles, the companies and the areas pinged', () => {
    const summary = channelSummary([LISTINGS[0], LISTINGS[4]]);
    expect(summary.text).toBe('2 new role(s) across 2 companies');
    expect(summary.areas).toEqual(['Data / Analytics', 'Tech / SWE']);
  });
  it('never mutates the channel it is given', () => {
    const channel = [LISTINGS[0], LISTINGS[4]];
    const before = JSON.parse(JSON.stringify(channel));
    groupByCompany(channel);
    channelSummary(channel);
    expect(channel).toEqual(before);
  });
});
