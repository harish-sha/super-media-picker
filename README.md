# Super Media Picker

A modular, performance-conscious TypeScript SDK for normalized messaging media: Unicode, animated and custom emoji, GIFs, static/animated stickers, custom provider tabs, recents, favorites, and compact reactions.

The picker has two intentional presentations: a lightweight compact reaction bar and the complete media picker. Compact mode can expand into full mode without changing the normalized selection contract.

## Architecture

```text
application → super-media-picker → @super-media-picker/react
                                      ├─→ @super-media-picker/emoji
                                      ├─→ @super-media-picker/core
                                      ├─→ @super-media-picker/gif
                                      ├─→ @super-media-picker/stickers
                                      └─→ @super-media-picker/themes
```

Core has no framework dependency or module-time browser access. Compact emoji metadata is generated from CLDR-derived Emojibase data, so the development dataset is absent from published runtime dependencies.

## Installation

```sh
pnpm add super-media-picker react react-dom
```

The public aggregator remains private while the package is under development. Nothing in this repository publishes automatically.

## Quick start

```tsx
import {
  isUnicodeEmoji,
  MediaPicker,
  type MediaItem,
} from "super-media-picker";
import "super-media-picker/styles.css";

export function ComposerPicker() {
  function handleSelect(item: MediaItem) {
    if (isUnicodeEmoji(item)) sendText(item.value);
  }

  return <MediaPicker onSelect={handleSelect} />;
}
```

Emoji is enabled by default. Provider-backed features are opt-in and their tabs appear only when enabled, channel-compatible, and configured.

## Compact / Reaction Mode

Render the built-in reaction set without initializing full search and category UI:

```tsx
<MediaPicker mode="compact" onSelect={handleSelect} />
```

Use persisted frequency data and allow an uncontrolled transition into the full picker:

```tsx
<MediaPicker
  defaultMode="compact"
  compact={{
    source: "frequent",
    allowExpand: true,
    allowCollapse: true,
    maxVisibleItems: 7,
  }}
  features={{ recents: true }}
  onSelect={handleSelect}
/>
```

Custom reactions may be Unicode strings or normalized `MediaItem` objects. Normalized items keep the compact renderer extensible to tenant emoji and future reaction media without adding a second selection type.

```tsx
<MediaPicker
  mode="compact"
  compact={{ reactions: ["👍", "❤️", "😀", "😢", "🙏", "👎", "😡"] }}
  onSelect={handleSelect}
/>
```

Available compact sources are `default`, `recent`, `frequent`, `favorites`, and `custom`. Dynamic sources are filled with defaults when persisted data is insufficient. Compatible compact emoji use the persisted global skin tone.

Controlled presentation works like other controlled React state:

```tsx
<MediaPicker mode={mode} onModeChange={setMode} onSelect={handleSelect} />
```

In controlled mode, expand/collapse emits `onModeChange`; the host remains responsible for updating `mode`.

## Full mode and sizing

```tsx
<MediaPicker mode="full" size="lg" onSelect={handleSelect} />
```

`sm`, `md`, and `lg` presets use shared CSS variables and responsive constraints. Explicit dimensions accept numbers as pixels or any valid CSS length:

```tsx
<MediaPicker
  mode="full"
  width={360}
  height="60vh"
  preview={{ enabled: true }}
  onSelect={handleSelect}
/>
```

The three layout concepts are independent:

- `mode`: `compact` reaction bar or `full` picker content.
- `displayMode`: placement as `auto`, `inline`, `popover`, `modal`, `bottom-sheet`, or `fullscreen`.
- `size`: `sm`, `md`, or `lg` preset, optionally overridden by `width`/`height`.

For example, `mode="compact" displayMode="popover"` is a quick desktop reaction surface, while `mode="full" displayMode="inline" size="lg"` is a large embedded picker.

## Emoji only

```tsx
<MediaPicker
  features={{
    emoji: true,
    gifs: false,
    stickers: false,
    recents: false,
    favorites: false,
  }}
  onSelect={handleSelect}
/>
```

Search considers CLDR names, keywords, aliases, shortcodes, and category metadata. It normalizes case, punctuation, separators, and whitespace.

## Animated and custom emoji

Hosts register appropriately licensed assets through `EmojiPack`; the SDK does not bundle a proprietary collection.

```tsx
const emojiPacks = [
  {
    id: "workspace",
    name: "Workspace",
    items: [
      {
        type: "emoji" as const,
        kind: "animated" as const,
        id: "party",
        name: "Animated party",
        previewUrl: "/media/party.webp",
        animationUrl: "/media/party.webm",
        format: "webm" as const,
        fallbackEmoji: "🥳",
      },
      {
        type: "emoji" as const,
        kind: "custom" as const,
        id: "company",
        name: "Company mark",
        url: "/media/company.png",
        fallbackText: ":company:",
      },
    ],
  },
];

<MediaPicker
  animatedMedia={{ autoplay: "hover", maxActiveAnimations: 3 }}
  emojiPacks={emojiPacks}
  features={{ animatedEmoji: true }}
  onSelect={handleSelect}
/>;
```

WebM, animated WebP, and GIF use native browser rendering. Lottie is supported through the typed `renderers.lottie` adapter so consumers choose their compatible runtime. Hover/focus is the desktop default; `visible`, `always`, and `never` policies are available. Visibility observation, lazy assets, concurrency limits, pause/cleanup, and `prefers-reduced-motion` protection prevent grids from continuously animating every item.

## GIF and sticker providers

```tsx
import {
  HttpGifProvider,
  HttpStickerProvider,
  MediaPicker,
  MockStickerProvider,
} from "super-media-picker";

const gifs = new HttpGifProvider({
  endpoint: "https://api.example.test/media/gifs",
});
const stickers = new HttpStickerProvider({
  endpoint: "https://api.example.test/media/stickers",
});

<MediaPicker
  features={{ gifs: true, stickers: true, recents: true, favorites: true }}
  providers={{ gifs, stickers }}
  onSelect={handleSelect}
/>;
```

Both HTTP adapters call the host application's backend—not a paid provider directly. They implement abortable requests, timeouts, TTL memory caching, request deduplication, pagination, response validation, and isolated errors. GIF results use preview assets in the grid and retain the full URL only for selection. Sticker providers expose packs and may fetch pack contents lazily. `MockGifProvider` and `MockStickerProvider` cover local development, empty/error/loading states, and pagination without credentials.

Registered tenant packs use the same sticker contract and shared static/animated renderer:

```tsx
const tenantStickers = new MockStickerProvider({
  packs: [{ id: "company", name: "Company", icon: "◆" }],
  items: {
    company: [
      {
        type: "sticker",
        id: "launch",
        name: "Launch",
        provider: "tenant",
        packId: "company",
        url: "/media/launch.webp",
        animated: true,
        format: "webp",
      },
    ],
  },
});

<MediaPicker
  features={{ stickers: true }}
  providers={{ stickers: tenantStickers }}
  onSelect={handleSelect}
/>;
```

Static and animated WebM, WebP, GIF, and Lottie sticker items use the same grid and animation controls as animated emoji. Lottie assets require the host `renderers.lottie` adapter.

## Custom providers and tabs

```tsx
<MediaPicker
  customTabs={[
    {
      id: "company-assets",
      label: "Company",
      provider: companyAssetProvider,
    },
  ]}
  features={{ customMedia: true }}
  onSelect={handleSelect}
/>
```

Providers normalize data into `MediaItem`; the React extension surface receives no internal picker state. `renderers.custom` can override custom-media visuals, and each provider owns its optional attribution metadata.

## Channel capabilities

```tsx
<MediaPicker
  capabilities={{
    emoji: true,
    animatedEmoji: true,
    gif: false,
    stickers: true,
    animatedStickers: false,
    customMedia: false,
  }}
  features={{ gifs: true, stickers: true }}
  providers={{ gifs, stickers }}
  onSelect={handleSelect}
/>
```

Feature flags express product configuration; capabilities apply the current channel's constraints. Missing providers and disallowed capabilities never produce broken tabs.

## Security

- Keep GIF/sticker vendor credentials and signing secrets in the host backend.
- Providers return data, never remote HTML; the SDK does not use `dangerouslySetInnerHTML`.
- Normalized remote media URLs accept HTTP(S), browser blob URLs, local paths, and image data fixtures while rejecting executable schemes.
- Hosts should still apply their Content Security Policy, authentication, URL allowlist, and tenant authorization at the backend boundary.
- Tests and playground fixtures contain no credentials or proprietary provider assets.

## Recents and favorites

```tsx
<MediaPicker
  features={{ emoji: true, recents: true, favorites: true }}
  onSelect={handleSelect}
/>
```

Selecting an emoji updates its usage count and last-used timestamp. Recent ranking blends 70% exponentially decaying recency with 30% logarithmic normalized frequency; see [the ranking ADR](docs/architecture/006-recent-ranking.md).

When favorites are enabled, each active grid cell exposes an accessible add/remove-favorite button. The Recent and Favorites collections appear as keyboard-operable category tabs.

## Skin tones

The global selector supports default, light, medium-light, medium, medium-dark, and dark tones. The preference persists and applies only to compatible emoji.

```tsx
<MediaPicker defaultSkinTone="medium" onSelect={handleSelect} />
```

Changing the preference does not modify unsupported emoji. Compatible selections include the resolved variant ID, glyph, accessible name, and `skinTone`.

Recents and favorites persist stable base emoji IDs, not hand-built Unicode strings. They resolve through the generated variant table using the current global tone when rendered and selected. This means changing Medium to Dark updates compatible entries consistently, while unsupported entries and persisted collection data remain intact.

## Storage adapter

The default `LocalStorageAdapter` is namespaced, SSR-safe, corruption-safe, and tolerant of browser storage failures. Consumers can inject any asynchronous adapter:

```tsx
import {
  MediaPicker,
  MemoryStorageAdapter,
  type StorageAdapter,
} from "super-media-picker";

const storage: StorageAdapter = new MemoryStorageAdapter();

<MediaPicker storage={storage} onSelect={handleSelect} />;
```

The same contract can represent future IndexedDB or server-backed storage.

## Themes

Named themes:

```tsx
<MediaPicker theme="light" onSelect={handleSelect} />
<MediaPicker theme="dark" onSelect={handleSelect} />
<MediaPicker theme="system" onSelect={handleSelect} />
```

System mode reacts live to `prefers-color-scheme` through CSS and remains SSR-safe.

Custom theme:

```tsx
<MediaPicker
  theme={{
    mode: "dark",
    tokens: {
      background: "#101318",
      surface: "#191e26",
      surfaceHover: "#252c38",
      accent: "#8aa4ff",
      radiusLarge: "0.75rem",
    },
  }}
  onSelect={handleSelect}
/>
```

Hosts may also override the documented `--mp-*` CSS variables externally. Typography inherits from the host unless overridden.

## Responsive modes

```tsx
<MediaPicker displayMode="auto" onSelect={handleSelect} />
```

Supported modes are `auto`, `popover`, `inline`, `modal`, `bottom-sheet`, and `fullscreen`. Auto resolves to a popover on regular viewports and a bottom sheet on compact width or height, updating through a cleaned-up media-query listener. Modal, bottom-sheet, and fullscreen modes expose dialog semantics; inline and popover expose named regions.

## Selection format

```json
{
  "type": "emoji",
  "id": "1f44d-1f3fd",
  "value": "👍🏽",
  "name": "thumbs up: medium skin tone",
  "category": "People & Body",
  "skinTone": "medium"
}
```

All future picker features use the `MediaItem` discriminated union.

## Accessibility and keyboard behavior

- Named region/dialog, search, tablist, tabs, tab panel, grid, and grid-cell semantics.
- Roving grid focus with Arrow keys, Home, and End.
- Native Enter/Space selection.
- Arrow Left/Right and Home/End category-tab navigation.
- Escape closure callback, visible focus, 44-pixel touch targets, and no focus trap.
- Accessible emoji, favorite, skin-tone, and empty-state labels.

## Development

Requirements: Node.js 20.19 or newer and pnpm 10.15 through Corepack.

```sh
corepack enable
pnpm install
pnpm dev
```

## Testing and build

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm size
pnpm build-storybook
pnpm test:e2e
pnpm package:check
```

The playground imports through the built `super-media-picker` package and its public stylesheet export, making it a real consumer check for JavaScript, declarations, workspace linking, and CSS. Storybook provides visual/a11y cases, while Playwright verifies toned selection plus persisted recents and favorites.

## Versioning and publishing

Packages use Semantic Versioning, Changesets, and explicit `files` lists. Internal packages use restricted `publishConfig`; the public aggregator remains private until publishing is intentionally enabled. Use `pnpm changeset` for a public change. `pnpm package:check` creates temporary tarballs, verifies their export targets and rewritten workspace dependency ranges, and rejects leaked source/test files. It never publishes anything.

See [implementation status](docs/implementation-status.md), [performance measurements](docs/performance.md), and [architecture decisions](docs/architecture/).
