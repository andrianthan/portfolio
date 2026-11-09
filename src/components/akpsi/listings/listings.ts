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
