import '../../qa/qa.css';
import './listings.css';
import { useState } from 'react';
import { LISTINGS, ROLE_TYPES, SOURCES, type Listing, type ListingSource, type RoleType } from '../fixtures';
import { filterListings, postToChannel, toggleRoleType, toggleSource, type ListingFilter } from './listings';

/**
 * A mock of the opportunity bot: a feed of scraped listings, narrowed by
 * source and role type, and a "Post to channel" button that moves a listing
 * into a plain message list standing in for the members' channel.
 *
 * The channel is a plain list of messages, not a copy of Discord's UI.
 *
 * The demo is a pure state machine over invented sample data. There is no
 * network call, no model and no timer anywhere in it.
 *
 * `initial` opens a filter on the first render and `posted` pre-fills the
 * channel. They exist so the render test can reach the filtered and the
 * posted states; the demo on the page never passes either.
 */
export default function ListingsDemo({
  initial = { source: null, roleType: null },
  posted = [],
}: { initial?: ListingFilter; posted?: string[] } = {}) {
  const [filter, setFilter] = useState<ListingFilter>(initial);
  const [channel, setChannel] = useState<Listing[]>(() =>
    posted
      .map((id) => LISTINGS.find((l) => l.id === id))
      .filter((l): l is Listing => l !== undefined)
      .reduce<Listing[]>((acc, l) => postToChannel(acc, l), []),
  );

  const visible = filterListings(LISTINGS, filter);

  /** Pressing a chip that is already on clears that filter. */
  function pressSource(source: ListingSource) {
    setFilter((f) => toggleSource(f, source));
  }

  function pressRoleType(roleType: RoleType) {
    setFilter((f) => toggleRoleType(f, roleType));
  }

  function post(listing: Listing) {
    setChannel((c) => postToChannel(c, listing));
  }

  return (
    <div className="qa listings" role="group" aria-label="Sample opportunity listings feed">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Opportunity listings</span>
        <span className="qa-sample">sample data</span>
      </div>

      <div className="listings-filters">
        <div className="listings-frow" role="group" aria-label="Filter by source">
          <span className="listings-flabel">Source</span>
          {SOURCES.map((s) => (
            <button
              key={s}
              type="button"
              className="listings-chip"
              aria-pressed={filter.source === s}
              onClick={() => pressSource(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="listings-frow" role="group" aria-label="Filter by role type">
          <span className="listings-flabel">Role</span>
          {ROLE_TYPES.map((r) => (
            <button
              key={r}
              type="button"
              className="listings-chip"
              aria-pressed={filter.roleType === r}
              onClick={() => pressRoleType(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ul className="listings-feed" aria-label="Listings">
        {visible.map((l) => (
          <li key={l.id} className="listings-row">
            <div className="listings-meta">
              <span className="listings-id">{l.id}</span>
              <span className="listings-tag">{l.source}</span>
              <span className="listings-role">{l.roleType}</span>
              <span className="listings-date">{l.posted}</span>
            </div>
            <p className="listings-title">{l.title} · {l.company} · {l.place}</p>
            <button type="button" className="listings-post" onClick={() => post(l)}>
              Post to channel
            </button>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="listings-empty">No listings match these filters.</li>
        )}
      </ul>

      <div className="listings-channel" role="group" aria-label="Sample member channel">
        <p className="listings-chead">Channel</p>
        {channel.length === 0 ? (
          <p className="listings-cempty">Nothing posted yet. Press “Post to channel” on a listing.</p>
        ) : (
          <ul className="listings-msgs">
            {channel.map((l) => (
              <li key={l.id} className="listings-msg">
                <span className="listings-id">{l.id}</span>
                <span className="listings-msg-t">{l.title} at {l.company}</span>
                <span className="listings-msg-m">{l.place} · {l.roleType}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="listings-cap">Sample listings. Every company and listing here is made up.</p>
    </div>
  );
}
