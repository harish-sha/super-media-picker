# Private Messaging Media Picker SDK

A modular, performance-conscious TypeScript SDK for normalized messaging media. Phases 0–4 provide a production-ready Unicode emoji picker with search, categories, persistent recents and favorites, skin tones, themes, responsive display modes, and accessible keyboard interaction.

The picker has two intentional presentations: a lightweight compact reaction bar and the complete media picker. Compact mode can expand into full mode without changing the normalized selection contract.

GIF and sticker integrations are intentionally not implemented yet.

## Architecture

```text
application → @company/media-react → @company/media-emoji → @company/media-core
                              └─────→ @company/media-themes
```

Core has no framework dependency or module-time browser access. Compact emoji metadata is generated from CLDR-derived Emojibase data, so the development dataset is absent from published runtime dependencies.

## Installation

Replace `@company` with the configured internal npm organization scope:

```sh
pnpm add @company/media-react react react-dom
```

The packages are configured for restricted private publishing. Nothing in this repository publishes automatically.

## Quick start

```tsx
import { MediaPicker, type MediaItem } from "@company/media-react";
import "@company/media-react/styles.css";

export function ComposerPicker() {
  function handleSelect(item: MediaItem) {
    if (item.type === "emoji") sendText(item.value);
  }

  return <MediaPicker onSelect={handleSelect} />;
}
```

Emoji is enabled by default. Advanced features are opt-in.

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
- `displayMode`: placement as `auto`, `inline`, `popover`, `modal`, or `bottom-sheet`.
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
} from "@company/media-react";

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

Supported modes are `auto`, `popover`, `inline`, `modal`, and `bottom-sheet`. Auto resolves to a popover on regular viewports and a bottom sheet on compact width or height, updating through a cleaned-up media-query listener. Modal and bottom-sheet modes expose dialog semantics; inline and popover expose named regions.

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

The playground imports the built package through `@company/media-react` exports and imports its public stylesheet explicitly. Storybook provides visual/a11y cases, while Playwright verifies toned selection plus persisted recents and favorites.

## Versioning and publishing

Packages use Semantic Versioning, Changesets, explicit `files` lists, and restricted `publishConfig`. Use `pnpm changeset` for a public change. `pnpm package:check` creates temporary tarballs, verifies their export targets and rewritten workspace dependency ranges, and rejects leaked source/test files. It never publishes anything.

See [implementation status](docs/implementation-status.md), [performance measurements](docs/performance.md), and [architecture decisions](docs/architecture/).
