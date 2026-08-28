# ADR 006: recent emoji ranking

## Context

Pure last-used ordering forgets repeated habits, while pure frequency leaves stale items at the top indefinitely.

## Decision

`RecentItemsManager` blends two normalized signals:

```text
score = 0.7 × recency + 0.3 × frequency
recency = 0.5 ^ (age / seven-day half-life)
frequency = log2(count + 1) / maximum collection frequency
```

Weights, half-life, clock, storage key, and result limit are configurable for deterministic tests and host needs. Records contain only stable IDs, counts, and timestamps; React resolves current emoji metadata and the selected skin tone at render time.

Recents therefore follow the current global tone rather than freezing a historical glyph. Favorites use the same stable-base-ID policy. This makes a global preference change predictable everywhere and prevents modifier or ZWJ fragments from being persisted as collection identity.

## Alternatives

Raw timestamp-plus-count arithmetic has incompatible units and unexplained scaling. A server ranking service is unnecessary for local Phase 3 behavior.

## Consequences

New selections rise immediately, frequent selections retain influence, and old items decay predictably. A future server-synced adapter can reuse the manager contract.
