# @super-media-picker/core

Framework-independent Unicode/animated/custom emoji, GIF, sticker and custom-media models, provider/pack contracts, request coordination, storage, versioned persistence, caching, analytics, and normalized errors. It has no React dependency and is safe to import during server rendering.

```ts
import {
  LocalStorageAdapter,
  RecentItemsManager,
} from "@super-media-picker/core";

const storage = new LocalStorageAdapter("media-picker");
const recents = new RecentItemsManager(storage);
await recents.record("1f44d");
```

`RecentItemsManager.record` and `FavoritesManager.add/toggle` also accept normalized `MediaItem` values. Provider media is persisted as a compact versioned snapshot under a namespaced key; legacy emoji IDs remain readable. `MediaRequestClient` provides timeout, cancellation, TTL caching, and in-flight deduplication for remote providers.
