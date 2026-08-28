# Performance measurements

Measured on 2026-08-28 from production ESM builds using Node 23 on macOS ARM. Raw byte counts use the emitted files, gzip uses `gzip -c`, package values come from the actual `pnpm pack` archives, and Brotli values come from `size-limit`.

| Artifact                              | Raw       | Compressed     |
| ------------------------------------- | --------- | -------------- |
| `@super-media-picker/core` JavaScript | 12,492 B  | 2.89 kB Brotli |
| React compact/base entry              | 22,087 B  | 4.83 kB Brotli |
| React animated-media/visual chunk     | 6,308 B   | 1.72 kB Brotli |
| React shared result-grid chunk        | 3,975 B   | 1.16 kB Brotli |
| React lazy full-picker chunk          | 24,924 B  | 5.08 kB Brotli |
| React lazy provider-panel chunk       | 10,186 B  | 2.47 kB Brotli |
| React picker CSS                      | 16,268 B  | 2.68 kB Brotli |
| `@super-media-picker/gif`             | 4,753 B   | 1.41 kB Brotli |
| `@super-media-picker/stickers`        | 5,522 B   | 1.54 kB Brotli |
| Compact emoji data entry              | 5,744 B   | 1.21 kB Brotli |
| Public JavaScript entry               | 179 B     | 102 B Brotli   |
| Public stylesheet export              | 16,268 B  | 2,675 B Brotli |
| Full emoji JavaScript/data            | 570,574 B | 74,932 B gzip  |
| Playground initial JavaScript         | 234,628 B | 73,530 B gzip  |
| Playground lazy full UI               | 13,866 B  | 4,745 B gzip   |
| Playground lazy provider UI           | 5,525 B   | 2,249 B gzip   |
| Playground lazy emoji data            | 440,821 B | 71,920 B gzip  |
| Playground CSS                        | 16,724 B  | 3,692 B gzip   |

Actual package archives are 14,202 B for core, 177,900 B for emoji, 5,034 B for GIF, 5,395 B for stickers, 1,987 B for themes, 59,209 B for React, and 8,658 B for the public `super-media-picker` aggregator. The public archive includes its CSS source map; the React archive includes compact/animated support plus separate lazy full-picker and provider-panel chunks. `pnpm package:check` re-measures every archive and validates internal lazy-chunk references, source maps, and public exports.

## Runtime observations

- The generated dataset contains 1,906 base records and 1,615 skin-tone variants. Variant names are derived from the base CLDR label instead of duplicated in data.
- The largest category is People & Body at 386 records. Its grid structurally creates about 1,159 elements without favorite controls or 1,931 with them. This is the current upper bound before surrounding picker controls.
- A warm Node benchmark of 1,000 alternating `happy`/`thumb` searches took 293.9 ms, or about 0.294 ms per search on the measurement machine.
- Search metadata and the ID map are built once at module initialization. Grid variant resolution and stored-ID collections are memoized by their actual inputs.
- Default compact mode requests the generated ten-record emoji subpath plus the small shared animated-media renderer, not full emoji data, full-picker UI, provider panels, or provider packages. Expanding requests the full picker; a GIF/sticker/custom tab requests the provider-panel chunk only when activated. Recent, frequent, favorites, and unknown custom Unicode sources request full emoji data because they resolve arbitrary persisted IDs.
- GIF/sticker engines remain independent ESM packages. Re-exporting them from the public aggregator does not make the React package import them, and production tree shaking removes unused provider classes.
- Remote results arrive in bounded pages. An `IntersectionObserver` sentinel advances cursor pagination near the viewport, while its accessible Load more button remains the keyboard/no-observer fallback. The shared grid incrementally windows inline collections to 60 items and uses native `content-visibility` containment for offscreen cells, avoiding a runtime virtualization dependency. Provider pagination remains the primary large-collection boundary.
- The playground's initial JavaScript is 234,628 B and the full emoji data remains a separate 440,821 B chunk. The comparison includes the playground, provider mocks, and React runtime, so it demonstrates delivery behavior rather than a standalone library-size claim.

The incremental grid intentionally keeps the active 60-item window in normal document flow so screen-reader and roving-focus semantics remain predictable. For unbounded providers, cursor pagination prevents the DOM from receiving the complete remote collection. A fixed-row absolute-position virtualizer was rejected because GIF/sticker aspect ratios are adaptive and it would materially complicate keyboard position and dynamic-height accessibility.

Reproduce the principal checks with:

```sh
pnpm build
pnpm size
pnpm package:check
gzip -c packages/emoji/dist/index.js | wc -c
```
