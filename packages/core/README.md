# @super-media-picker/core

Framework-independent media models, configuration, storage, persistence, caching, analytics, and normalized errors for the private media picker SDK. It has no React dependency and is safe to import during server rendering.

```ts
import {
  LocalStorageAdapter,
  RecentItemsManager,
} from "@super-media-picker/core";

const storage = new LocalStorageAdapter("media-picker");
const recents = new RecentItemsManager(storage);
await recents.record("1f44d");
```

`MemoryStorageAdapter`, `FavoritesManager`, and `PersistentPreference` use the same asynchronous `StorageAdapter` contract. Browser storage is accessed lazily and unavailable or corrupt values fail safely.
