# super-media-picker

Public beta `0.1.0-beta.1` of an accessible, provider-first React SDK for
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
