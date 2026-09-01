# super-media-picker

Public beta `0.1.0-beta.3` of an accessible, provider-first React SDK for
Unicode emoji, animated/custom emoji, GIFs, stickers, custom media, reactions,
recents, and favorites.

> Beta notice: the documented public APIs are ready for integration testing,
> but feedback may result in breaking changes before `1.0.0`.

## Install

```sh
npm install super-media-picker@beta react react-dom
# or: pnpm add super-media-picker@beta react react-dom
# or: yarn add super-media-picker@beta react react-dom
```

React and React DOM `>=18.3.0 <20.0.0` are peer dependencies. The package is
ESM-only and ships its own TypeScript declarations. Import the stylesheet once
in the application entry point:

```tsx
import "super-media-picker/styles.css";
```

## Complete picker

```tsx
import { MediaPicker, type MediaItem } from "super-media-picker";
import "super-media-picker/styles.css";

export function ComposerMedia({
  onSelect,
}: {
  onSelect: (item: MediaItem) => void;
}) {
  return <MediaPicker onSelect={onSelect} />;
}
```

Provider-backed tabs remain opt-in:

```tsx
<MediaPicker
  features={{ emoji: true, gifs: true, stickers: true }}
  providers={{ gifs: gifProvider, stickers: stickerProvider }}
  onSelect={handleSelect}
/>
```

## Focused pickers

All focused pickers use the same normalized media, provider, persistence,
capability, renderer, animation, and security contracts as `MediaPicker`.

```tsx
import {
  EmojiPicker,
  GifPicker,
  ReactionPicker,
  StickerPicker,
} from "super-media-picker";

<EmojiPicker onSelect={handleEmoji} />;
<GifPicker provider={gifProvider} onSelect={handleGif} />;
<StickerPicker provider={stickerProvider} onSelect={handleSticker} />;
<ReactionPicker source="frequent" onSelect={handleReaction} />;
```

When an integrated `MediaPicker` starts in expandable compact mode, it renders
only the reaction capsule until expansion. While the full picker is active the
capsule is unmounted; Back, Escape, or backdrop dismissal returns to compact
mode and restores focus. Sticker packs are selected from a responsive,
keyboard-accessible `Packs` menu that remains usable with large provider-backed
pack collections.

## Headless UI

The CSS-free headless entry exposes stable controller/search/collection hooks:

```tsx
import { useGifSearch } from "super-media-picker/headless";
import type { GifMediaItem, GifProvider } from "super-media-picker/providers";

function CustomGifSearch({
  provider,
  onSelect,
}: {
  provider: GifProvider;
  onSelect: (item: GifMediaItem) => void;
}) {
  const gifs = useGifSearch({ provider });
  return (
    <section>
      <input
        aria-label="Search GIFs"
        onChange={(event) => gifs.search(event.currentTarget.value)}
        value={gifs.query}
      />
      {gifs.results.map((item) => (
        <button key={item.id} onClick={() => onSelect(item)}>
          {item.name}
        </button>
      ))}
      {gifs.hasMore && <button onClick={gifs.loadMore}>Load more</button>}
    </section>
  );
}
```

Available hooks are `useMediaPicker`, `useEmojiSearch`, `useGifSearch`,
`useStickerSearch`, `useRecents`, and `useFavorites`.

## Host-backend providers

Production adapters call your backend; the browser never receives vendor
secrets:

```ts
import {
  HttpGifProvider,
  HttpStickerProvider,
} from "super-media-picker/providers";

export const gifProvider = new HttpGifProvider({
  endpoint: "/api/media/gifs",
  timeoutMs: 8_000,
});

export const stickerProvider = new HttpStickerProvider({
  endpoint: "/api/media/stickers",
  timeoutMs: 8_000,
});
```

The built-in adapters call the configured endpoint with query parameters:

```text
GET /api/media/gifs?mode=search&q=hello&cursor=opaque&limit=18
GET /api/media/gifs?mode=trending&cursor=opaque&limit=18
GET /api/media/stickers?mode=packs
GET /api/media/stickers?mode=pack&packId=bears&cursor=opaque&limit=18
GET /api/media/stickers?mode=search&q=hello&cursor=opaque&limit=18
GET /api/media/stickers?mode=trending&cursor=opaque&limit=18
```

`cursor` is an opaque string. When no next page exists, return
`{"items":[],"hasMore":false}` or another valid page and omit
`nextCursor`; never return `nextCursor: null`.

```ts
interface SearchResult<T> {
  items: readonly T[];
  nextCursor?: string;
  hasMore: boolean;
}

interface GifMediaItem {
  type: "gif"; // required, exact value
  id: string; // required, non-empty
  provider: string; // required
  url: string; // required original/selection URL
  previewUrl: string; // required optimized grid URL
  name?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  alt?: string;
}

interface StickerMediaItem {
  type: "sticker"; // required, exact value
  id: string; // required, non-empty
  url: string; // required
  animated: boolean; // required
  name?: string;
  provider?: string;
  packId?: string;
  previewUrl?: string;
  format?: "gif" | "webp" | "webm" | "lottie" | "png" | "jpeg";
  width?: number;
  height?: number;
  alt?: string;
}

interface StickerPack {
  id: string; // required
  name: string; // required
  iconUrl?: string; // recommended image URL
  icon?: string; // legacy text or URL; text may use the built-in fallback
  provider?: string;
}
```

GIF search response example:

```json
{
  "items": [
    {
      "type": "gif",
      "id": "gif_123",
      "name": "Hello",
      "provider": "example-provider",
      "previewUrl": "https://media.company.com/gifs/gif_123-preview.webp",
      "url": "https://media.company.com/gifs/gif_123.gif",
      "width": 320,
      "height": 240
    }
  ],
  "nextCursor": "next_page",
  "hasMore": true
}
```

Sticker `mode=packs` returns a JSON array of `StickerPack`; every other sticker
mode returns `SearchResult<StickerMediaItem>`. Successful responses must be
valid JSON. Non-2xx responses, malformed JSON, invalid fields, timeouts, and
unsafe media URLs become `MediaProviderError`. A valid empty response is
`{"items":[],"hasMore":false}`.

Pack navigation renders a policy-checked `iconUrl` as an image. Missing, unsafe,
unsupported legacy text, or failed images use the SDK's font-independent sticker
SVG fallback, so hosts do not need platform-specific Unicode glyphs.

Configure `mediaSecurity` with production CDN origins and `allowHttp: false`.
Attribution is provider configuration (`{ label, url?, logoUrl? }`), not a JSON
result field. Keep vendor keys behind your backend. See the
[complete backend contract](https://github.com/harish-sha/super-media-picker/blob/main/docs/backend-api.md)
for animated/custom emoji shapes and a working server adapter.

## Native emoji compatibility

Native Unicode rendering remains lightweight and follows the host OS/browser's
installed emoji font. The picker uses a cross-platform color-emoji stack and
stable contained cells, but it cannot make an older Windows emoji font draw a
newer Unicode character. `MediaPicker`, `EmojiPicker`, and `useEmojiSearch`
therefore default `maxUnicodeVersion` to `15`:

```tsx
<EmojiPicker maxUnicodeVersion={14} onSelect={handleEmoji} />
```

Raise the value only when the supported client platforms have suitable fonts.
For guaranteed artwork across platforms, register provider-backed custom or
animated emoji with image previews; the SDK deliberately does not bundle a
large proprietary image-emoji catalog. Composite sequences are returned intact
as one `item.value`; insert with a functional state update:

```tsx
import { EmojiPicker, isUnicodeEmoji } from "super-media-picker";

<EmojiPicker
  onSelect={(item) => {
    if (isUnicodeEmoji(item)) {
      setValue((current) => current + item.value);
    }
  }}
/>;
```

The npm package contains UI, state, renderers, provider contracts, cache and
storage utilities, generated Unicode metadata, and declarations. It does not
contain a production GIF/sticker/animated-emoji catalog, provider credentials,
playground assets, or a backend.

## Exports

- `super-media-picker`: components, normalized media types, shared utilities,
  and common provider APIs.
- `super-media-picker/headless`: public hooks and their types; no CSS import.
- `super-media-picker/providers`: HTTP/mock providers, request/cache utilities,
  and provider contracts.
- `super-media-picker/styles.css`: required component styles and theme tokens.

Imports are SSR-safe: browser globals are resolved lazily rather than at module
evaluation time.

## Release and support

- [Full documentation](https://github.com/harish-sha/super-media-picker#readme)
- [Changelog](https://github.com/harish-sha/super-media-picker/blob/main/CHANGELOG.md)
- [Security policy](https://github.com/harish-sha/super-media-picker/blob/main/SECURITY.md)
- [Contributing](https://github.com/harish-sha/super-media-picker/blob/main/CONTRIBUTING.md)

This beta is not published automatically by the repository. It is licensed
under the [MIT License](LICENSE).
