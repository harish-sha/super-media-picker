# super-media-picker

Public consumer package for Super Media Picker.

```tsx
import { MediaPicker, type MediaItem } from "super-media-picker";
import "super-media-picker/styles.css";
```

The public package also exports the normalized media/provider contracts,
`MockGifProvider`, `HttpGifProvider`, `MockStickerProvider`, and
`HttpStickerProvider`. Provider-backed tabs remain opt-in and are dynamically
loaded by the React picker.

This package re-exports the supported React, media-item, configuration, storage, and theme contracts from the internal workspace packages. Publishing remains disabled while the package is under private development.
