# @super-media-picker/react

Internal accessible React implementation for Super Media Picker. Consumers should use the public package:

```tsx
import { MediaPicker, type MediaItem } from "super-media-picker";
import "super-media-picker/styles.css";

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
