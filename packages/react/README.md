# @company/media-react

Accessible React UI for the private messaging media picker. It provides a lightweight compact reaction mode and a lazily loaded full mode with Unicode emoji search and categories, persistent recents and favorites, skin tones, themes, responsive display modes, and keyboard navigation.

```tsx
import { MediaPicker, type MediaItem } from "@company/media-react";
import "@company/media-react/styles.css";

function handleSelect(item: MediaItem) {
  console.log(item);
}

<MediaPicker
  compact={{ allowCollapse: true, allowExpand: true, source: "frequent" }}
  defaultMode="compact"
  displayMode="popover"
  features={{ recents: true, favorites: true }}
  onSelect={handleSelect}
  theme="system"
/>;
```

Inject a `StorageAdapter` through `storage` to replace the default SSR-safe local-storage adapter. The package re-exports the public storage utilities and theme/media types needed by React consumers.

`mode` (`compact`/`full`), `displayMode` (placement), and `size` (`sm`/`md`/`lg`) are independent. `width` and `height` accept numbers or CSS strings. Compact reactions accept Unicode strings or normalized `MediaItem` values and emit the same `onSelect` payload as full mode.
