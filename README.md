# Private Messaging Media Picker SDK

A modular, performance-conscious TypeScript SDK for selecting normalized messaging media. The current Phase 0–2 milestone provides a production-quality Unicode emoji picker; remote GIFs, stickers, and advanced persistence features remain isolated roadmap modules.

## Architecture

Dependency flow is one-way:

```text
application → media-react → media-emoji → media-core
                          ↘ media-themes
```

`@company/media-core` has no framework dependency or module-time browser access. Compact emoji metadata is generated at build time from CLDR-derived Emojibase data, leaving the source dataset out of runtime dependencies.

## Packages

| Package                 | Responsibility                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `@company/media-core`   | Normalized media types, provider contracts, configuration, storage, cache, analytics, and errors |
| `@company/media-emoji`  | Compact generated Unicode data, categories, normalization, search, and media conversion          |
| `@company/media-react`  | Accessible picker UI, category navigation, search, keyboard grid, and responsive layout          |
| `@company/media-themes` | Theme type and CSS custom-property contract                                                      |

The `gif` and `stickers` package boundaries are reserved for their explicitly deferred milestones; no placeholder provider behavior is shipped.

## Requirements

- Node.js 20.19 or newer
- pnpm 10.15 through Corepack
- Modern Chrome, Edge, Firefox, Safari, Mobile Safari, or Chrome for Android

## Development

```sh
corepack enable
pnpm install
pnpm dev
```

Quality commands:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm size
pnpm build-storybook
```

Run Storybook interactively with `pnpm storybook`. Run the Playwright smoke flow after installing its Chromium browser with `pnpm exec playwright install chromium`, then `pnpm test:e2e`.

## React quick start

```tsx
import { MediaPicker } from "@company/media-react";
import "@company/media-react/styles.css";

export function ComposerPicker() {
  return (
    <MediaPicker
      features={{ emoji: true }}
      onSelect={(item) => {
        if (item.type === "emoji") {
          sendText(item.value);
        }
      }}
    />
  );
}
```

The callback receives a normalized `EmojiMediaItem` with `type`, stable Unicode-derived `id`, rendered `value`, CLDR `name`, and `category`.

## Search and categories

`@company/media-emoji` can also be consumed without React:

```ts
import { searchEmoji, toEmojiMediaItem } from "@company/media-emoji";

const firstMatch = searchEmoji("party", { limit: 1 })[0];
const media = firstMatch ? toEmojiMediaItem(firstMatch) : undefined;
```

Search normalizes Unicode text, case, punctuation, whitespace, and separators, then searches canonical CLDR labels, tags/aliases, and category metadata.

## Themes

Choose `light`, `dark`, or `system` with the `theme` prop. Override a focused set of values with `themeTokens`, or provide host-level values for the documented `--mp-*` variables. Typography inherits from the host by default.

## Accessibility

The picker provides named regions, search, category navigation, grid semantics, 44-pixel touch targets, visible focus, roving grid focus, arrow/Home/End navigation, Enter/Space selection through native buttons, and optional Escape closure. Storybook runs the accessibility addon in error mode.

## Storage, providers, and analytics

Phase 1 contracts live in core. `MemoryStorageAdapter` supports SSR/tests, while `LocalStorageAdapter` resolves browser APIs lazily and contains access failures. `MemoryCache` supports TTL expiration. `MediaProvider<T>` and analytics contracts prepare later remote features without embedding provider credentials or analytics implementations.

## Versioning and publishing

Packages use semantic versions and restricted `publishConfig`. Add a Changeset for public package behavior with `pnpm changeset`. The root is private and publishing is intentionally not automated in this milestone.

See [the implementation plan](docs/implementation-plan.md) and [architecture decisions](docs/architecture/) for scope and rationale.
