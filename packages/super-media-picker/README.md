# super-media-picker

Public consumer package for Super Media Picker.

```tsx
import {
  EmojiPicker,
  GifPicker,
  isUnicodeEmoji,
  MediaPicker,
  ReactionPicker,
  StickerPicker,
  type MediaItem,
} from "super-media-picker";
import "super-media-picker/styles.css";
```

The public package also exports the normalized media/provider contracts,
`MockGifProvider`, `HttpGifProvider`, `MockStickerProvider`, and
`HttpStickerProvider`. Provider-backed tabs remain opt-in and are dynamically
loaded by the React picker.

Focused surfaces use the same normalized selection and persistence engine:

```tsx
<EmojiPicker onSelect={handleEmoji} />
<GifPicker provider={gifProvider} onSelect={handleGif} />
<StickerPicker provider={stickerProvider} onSelect={handleSticker} />
<ReactionPicker source="frequent" onSelect={handleReaction} />
```

For custom rendering, import `useMediaPicker`, `useEmojiSearch`,
`useGifSearch`, `useStickerSearch`, `useRecents`, or `useFavorites` from
`super-media-picker/headless`. Production HTTP adapters are available from
`super-media-picker/providers`; styles are provided separately by
`super-media-picker/styles.css`.

This package re-exports the supported React, media-item, configuration,
storage, and theme contracts from the internal workspace packages. Publication
requires an explicit release command and is never performed by build or CI.
