# 010: Versioned cross-media collections

Legacy Unicode recents/favorites stored base emoji IDs. Those arrays remain readable and retain their current-tone behavior.

New provider-backed records use a namespaced key:

```text
type:kind:provider:id
```

and a versioned compact normalized snapshot. The snapshot contains identifiers, display metadata, provider identity, preview/full URLs, dimensions, and animation format—not binary assets or original provider payloads. It is sufficient to reconstruct a selected GIF, sticker, animated emoji, or custom item after reload.

Recents continue to rank count and last-used time. Favorites preserve order and deduplicate by the namespaced key. Mixed legacy/new collections are migrated on read, allowing existing installations to upgrade without clearing user state.
