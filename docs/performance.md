# Performance measurements

Measured on 2026-09-01 from fresh production ESM builds using Node 23 on macOS ARM. Raw byte counts use the emitted files, gzip uses Node's `zlib.gzipSync`, package values come from the actual `pnpm pack` archives, and Brotli values come from `size-limit`.

| Artifact                                    | Raw       | Compressed     |
| ------------------------------------------- | --------- | -------------- |
| `@super-media-picker/core` JavaScript       | 14,745 B  | 3.35 kB Brotli |
| React public entry shim                     | 1,400 B   | 405 B Brotli   |
| React focused-picker entry shim             | 303 B     | 147 B Brotli   |
| React headless entry shim                   | 349 B     | 156 B Brotli   |
| React shared picker/focused component chunk | 24,594 B  | 5,886 B gzip   |
| React persistence state chunk               | 5,219 B   | 1,400 B gzip   |
| React compact/tone reaction chunk           | 10,978 B  | 2,863 B gzip   |
| React animated-media/visual chunk           | 8,273 B   | 2,317 B gzip   |
| React headless controller/search chunk      | 10,461 B  | 2,646 B gzip   |
| React headless provider-state chunk         | 3,639 B   | 1,185 B gzip   |
| React lazy full-picker chunk                | 26,013 B  | 5,977 B gzip   |
| React lazy provider-panel chunk             | 13,659 B  | 3,257 B gzip   |
| React picker CSS                            | 16,612 B  | 3,158 B gzip   |
| `@super-media-picker/gif`                   | 5,902 B   | 1.64 kB Brotli |
| `@super-media-picker/stickers`              | 7,302 B   | 1.82 kB Brotli |
| Compact emoji data entry                    | 5,962 B   | 1.24 kB Brotli |
| Self-contained public root entry            | 26,294 B  | 5.58 kB Brotli |
| Public headless entry                       | 10,422 B  | 2.33 kB Brotli |
| Public providers entry                      | 439 B     | 163 B Brotli   |
| Public stylesheet with theme tokens         | 17,973 B  | 3,444 B gzip   |
| Full emoji JavaScript/data                  | 599,802 B | 77,128 B gzip  |
| Playground initial JavaScript               | 246,341 B | 76,737 B gzip  |
| Playground lazy full UI                     | 14,425 B  | 4,946 B gzip   |
| Playground lazy provider UI                 | 7,394 B   | 2,670 B gzip   |
| Playground lazy emoji data                  | 461,302 B | 73,897 B gzip  |
| Playground CSS                              | 17,738 B  | 3,897 B gzip   |

Actual `pnpm pack` archives are 16,749 B for core, 184,264 B for emoji, 6,267 B
for GIF, 6,895 B for stickers, 2,592 B for themes, 85,160 B for React, and
123,772 B for the self-contained public `super-media-picker` package. A direct
final `npm pack` of that public package is 120,897 B (811,492 B
unpacked). The public archive bundles the workspace implementation and generated
declarations,
but retains the full picker, provider panels, and full emoji data as separate
lazy chunks. It contains no source maps or internal package imports. `pnpm
package:check` re-measures every archive and validates lazy-chunk references,
public exports, production dependencies, and the absence of playground media,
Storybook output, tests, environment files, and internal source.

## Runtime observations

- The generated dataset contains 1,906 base records and 1,615 skin-tone variants. Variant names are derived from the base CLDR label instead of duplicated in data.
- The largest category is People & Body at 386 records. Its grid structurally creates about 1,159 elements without favorite controls or 1,931 with them. This is the current upper bound before surrounding picker controls.
- A warm Node benchmark of 1,000 alternating `happy`/`thumb` searches took 293.9 ms, or about 0.294 ms per search on the measurement machine.
- Search metadata and the ID map are built once at module initialization. Grid variant resolution and stored-ID collections are memoized by their actual inputs.
- Default compact mode and `ReactionPicker` request the generated ten-record
  emoji subpath plus the small shared animated-media renderer, not full emoji
  data, full-picker UI, provider panels, or provider packages. Expanding
  requests the full picker; a GIF/sticker/custom tab requests the provider-panel
  chunk only when activated. Recent, frequent, favorites, and unknown custom
  Unicode sources request full emoji data because they resolve arbitrary
  persisted IDs.
- `EmojiPicker`, `GifPicker`, and `StickerPicker` share the same lazily loaded
  full-picker shell. An emoji-only composition never activates the provider
  panel chunk, and a focused provider picker activates only its configured
  provider. The focused entry contains no GIF/sticker provider implementation;
  providers remain host-supplied and independently tree-shakeable.
- `super-media-picker/headless` contains no CSS or visual component entry. Its
  self-contained stable hook facade costs 2.33 kB Brotli; emitted hook and
  provider-state chunks are shared, and normal application bundlers can remove
  unused exports.
- The compact entry retains the generic renderer contract because compact
  custom/recent reactions may themselves be animated. For ordinary Unicode
  reactions no renderer component mounts, no `IntersectionObserver`, image,
  video, or Lottie host renderer starts, and no media URL is requested. The
  shared concurrency manager is only inert in-memory bookkeeping until an
  animated item asks for a slot.
- GIF/sticker engines remain independent modules inside the monorepo. The
  public beta bundles their exports so npm consumers do not depend on
  unpublished workspace packages; production tree shaking can still remove
  unused provider classes.
- Remote results arrive in bounded pages. An `IntersectionObserver` sentinel advances cursor pagination near the viewport, while its accessible Load more button remains the keyboard/no-observer fallback. The shared grid incrementally windows inline collections to 60 items and uses native `content-visibility` containment for offscreen cells, avoiding a runtime virtualization dependency. Provider pagination remains the primary large-collection boundary.
- The playground's initial JavaScript is 246,341 B and the full emoji data remains a separate 461,302 B chunk. The comparison includes six SDK surface demos, provider mocks, and React runtime, so it demonstrates delivery behavior rather than a standalone library-size claim.
- The complete served demo fixture set is 569,378 B across 11 media
  files. It belongs only to the playground and Storybook and is rejected by
  package tarball validation.

The incremental grid intentionally keeps the active 60-item window in normal document flow so screen-reader and roving-focus semantics remain predictable. For unbounded providers, cursor pagination prevents the DOM from receiving the complete remote collection. A fixed-row absolute-position virtualizer was rejected because GIF/sticker aspect ratios are adaptive and it would materially complicate keyboard position and dynamic-height accessibility.

Reproduce the principal checks with:

```sh
pnpm build
pnpm size
pnpm package:check
gzip -c packages/emoji/dist/index.js | wc -c
```
