import type { Listing, ListingSource, RoleType } from '../fixtures';

/**
 * The filters a feed can be narrowed by. `null` means "no filter on this
 * axis", so a filter set on one axis leaves the other alone.
 */
export interface ListingFilter {
  source: ListingSource | null;
  roleType: RoleType | null;
}

/**
 * The listings that match the filter, in the order they were given. The two
 * axes combine with AND: a listing has to match both to come through.
 *
 * The array handed in is never changed; a new one comes back.
 */
export function filterListings(listings: readonly Listing[], opts: ListingFilter): Listing[] {
  return listings.filter((l) => {
    if (opts.source !== null && l.source !== opts.source) return false;
    if (opts.roleType !== null && l.roleType !== opts.roleType) return false;
    return true;
  });
}

/**
 * The channel with the listing posted to it. A listing already in the
 * channel is not posted twice, so the channel comes back exactly as it was.
 *
 * The channel handed in is never changed; a new one comes back when the
 * listing is posted. When the listing is already there the *same* array
 * comes back, not a copy of it: React bails out of a re-render when the
 * state is unchanged, and a fresh copy would defeat that.
 */
export function postToChannel<T extends readonly Listing[]>(channel: T, listing: Listing): T | Listing[] {
  if (channel.some((l) => l.id === listing.id)) return channel;
  return [...channel, listing];
}

/** The areas a posted listing is pinged under, as the channel shows them. */
export type Area = 'Tech / SWE' | 'Data / Analytics';

export const AREAS: readonly Area[] = ['Data / Analytics', 'Tech / SWE'];

/**
 * The area a listing is pinged under. A role with "data" in its title goes
 * to Data / Analytics and every other role to Tech / SWE, so the pings follow
 * from the listing and need no field of their own.
 */
export function areaOf(listing: Listing): Area {
  return /\bdata\b/i.test(listing.title) ? 'Data / Analytics' : 'Tech / SWE';
}

/** One company's card in the channel message: its heading and its listings. */
export interface CompanyCard {
  company: string;
  heading: string;
  listings: Listing[];
}

/** "new internship", "new co-ops", "new grad role": the noun for a card heading. */
function nounFor(roleType: RoleType, count: number): string {
  if (roleType === 'internship') return count === 1 ? 'new internship' : 'new internships';
  if (roleType === 'co-op') return count === 1 ? 'new co-op' : 'new co-ops';
  return count === 1 ? 'new grad role' : 'new grad roles';
}

/**
 * The posted listings grouped into one card per company, in the order each
 * company first appears. A card's heading counts its listings, the way the
 * real channel's cards do: "Company — 2 new internships".
 *
 * The channel handed in is never changed.
 */
export function groupByCompany(channel: readonly Listing[]): CompanyCard[] {
  const cards: CompanyCard[] = [];
  for (const listing of channel) {
    let card = cards.find((c) => c.company === listing.company);
    if (!card) {
      card = { company: listing.company, heading: '', listings: [] };
      cards.push(card);
    }
    card.listings.push(listing);
  }
  return cards.map((card) => {
    const types = new Set(card.listings.map((l) => l.roleType));
    const count = card.listings.length;
    const noun = types.size === 1 ? nounFor([...types][0], count) : count === 1 ? 'new role' : 'new roles';
    return { ...card, heading: `${card.company} — ${count} ${noun}` };
  });
}

/** The line at the top of the channel message, and the areas it pings. */
export function channelSummary(channel: readonly Listing[]): { text: string; areas: Area[] } {
  const companies = new Set(channel.map((l) => l.company)).size;
  const areas = AREAS.filter((area) => channel.some((l) => areaOf(l) === area));
  return {
    text: `${channel.length} new role(s) across ${companies} ${companies === 1 ? 'company' : 'companies'}`,
    areas: [...areas],
  };
}

/**
 * The filter with the source chip pressed. Pressing the chip that is already
 * on clears the filter, so the same chip turns it back off.
 */
export function toggleSource(filter: ListingFilter, source: ListingSource): ListingFilter {
  return { ...filter, source: filter.source === source ? null : source };
}

/**
 * The filter with the role-type chip pressed. Pressing the chip that is
 * already on clears the filter, so the same chip turns it back off.
 */
export function toggleRoleType(filter: ListingFilter, roleType: RoleType): ListingFilter {
  return { ...filter, roleType: filter.roleType === roleType ? null : roleType };
}
