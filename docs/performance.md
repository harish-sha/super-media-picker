# Performance measurements

Measured on 2026-09-13 from fresh production ESM builds on macOS ARM. Raw byte
counts use the emitted files, gzip uses Node's `zlib.gzipSync`, package values
come from the actual `pnpm pack` archives, and Brotli values come from
`size-limit`.

| Artifact                                    | Raw       | Compressed     |
| ------------------------------------------- | --------- | -------------- |
| `@super-media-picker/core` JavaScript       | 40,326 B  | 7.84 kB Brotli |
| React public entry shim                     | 1,750 B   | 471 B Brotli   |
| React focused-picker entry shim             | 333 B     | 167 B Brotli   |
| React headless entry shim                   | 349 B     | 157 B Brotli   |
| React shared picker/focused component chunk | 34,419 B  | 8,115 B gzip   |
| React persistence state chunk               | 6,527 B   | 1,757 B gzip   |
| React compact/tone reaction chunk           | 11,146 B  | 2,930 B gzip   |
| React animated-media/visual chunk           | 18,634 B  | 4,727 B gzip   |
| React headless controller/search chunk      | 10,819 B  | 2,715 B gzip   |
| React headless provider-state chunk         | 3,983 B   | 1,283 B gzip   |
| React lazy full-picker chunk                | 34,292 B  | 7,757 B gzip   |
| React lazy provider-panel chunk             | 13,726 B  | 3,229 B gzip   |
| React lazy presentation chunk               | 25,854 B  | 5,718 B gzip   |
| React lazy genie chunk                      | 6,206 B   | 1,930 B gzip   |
| React picker CSS                            | 31,677 B  | 5,291 B gzip   |
| `@super-media-picker/gif`                   | 4,181 B   | 1.22 kB Brotli |
| `@super-media-picker/stickers`              | 6,229 B   | 1.52 kB Brotli |
| Compact emoji data entry                    | 5,962 B   | 1.24 kB Brotli |
| Self-contained public root entry            | 18,159 B  | 6.01 kB Brotli |
| Lazy advanced presentation engine           | 12,792 B  | 3.89 kB Brotli |
| Lazy public genie implementation            | 2,823 B   | 1,337 B gzip   |
| Public headless entry                       | 5,072 B   | 1.85 kB Brotli |
| Public providers entry                      | 436 B     | 212 B Brotli   |
| Public stylesheet with theme tokens         | 33,383 B  | 5,611 B gzip   |
| Full emoji JavaScript/data                  | 599,802 B | 77,128 B gzip  |
| Playground initial JavaScript               | 276,972 B | 85,533 B gzip  |
| Playground lazy presentation engine         | 13,867 B  | 4,618 B gzip   |
| Playground lazy genie                       | 2,839 B   | 1,342 B gzip   |
| Playground lazy full UI                     | 24,518 B  | 8,573 B gzip   |
| Playground lazy provider UI                 | 7,449 B   | 2,685 B gzip   |
| Playground lazy emoji data                  | 461,296 B | 73,895 B gzip  |
| Playground CSS                              | 32,160 B  | 6,225 B gzip   |

### Standalone browser budgets

`pnpm size` measures browser artifacts separately from the existing React SDK
ceilings. Values below are raw / gzip / Brotli from the current candidate:

| Browser artifact             | Raw       | gzip      | Brotli    |
| ---------------------------- | --------- | --------- | --------- |
| Browser ESM initial graph    | 269.84 kB | 85.61 kB  | 75.28 kB  |
| Web Component initial graph  | 257.18 kB | 82.24 kB  | 72.29 kB  |
| Global standalone JavaScript | 819.25 kB | 171.14 kB | 138.62 kB |
| Browser Shadow DOM CSS       | 33.53 kB  | 5.71 kB   | 4.99 kB   |
| Lazy presentation chunk      | 12.94 kB  | 4.32 kB   | 3.94 kB   |
| Lazy Genie chunk             | 2.89 kB   | 1.34 kB   | 1.18 kB   |

The initial ESM/Web Component graphs include the private React runtime and
picker core required by a host with no React installation. Full emoji data,
provider panels, advanced presentation, and Genie remain relative lazy chunks.
The classic global artifact cannot split safely for a one-script deployment,
so it contains the complete runtime and dataset and is correspondingly larger.
React npm consumers continue to use the peer-dependent package root; none of
the standalone runtime is added to that import path, and its existing budgets
remain unchanged. The complete browser directory is also reported as a
diagnostic but is not an initial-download claim because it contains alternative
entries and the duplicated one-file global distribution.

Actual package-validator archives are 37,830 B for core, 184,264 B for emoji,
5,238 B for GIF, 6,241 B for stickers, 2,676 B for themes, 146,661 B for React,
and 490,482 B for the self-contained public `super-media-picker` package. A
direct final `npm pack --dry-run` reports 484,356 B packed (2,438,691 B
unpacked, 50 files). The public archive bundles the workspace implementation, generated
declarations, and standalone browser distributions, while the ESM/Web Component
paths retain the full picker, provider panels, and full emoji data as separate
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
  self-contained stable hook facade costs 2.37 kB Brotli; emitted hook and
  provider-state chunks are shared, and normal application bundlers can remove
  unused exports.
- The compact entry retains the generic renderer contract because compact
  custom/recent reactions may themselves be animated. For ordinary Unicode
  reactions no renderer component mounts, no `IntersectionObserver`, image,
  video, or Lottie host renderer starts, and no media URL is requested. The
  shared concurrency manager is only inert in-memory bookkeeping until an
  animated item asks for a slot.
- Dimensions and the motion facade add only a small amount to the public root.
  Anchored placement, portal coordination, collision observation, drag, resize,
  snap, and sheet-swipe behavior live in a separate lazy presentation chunk and
  are not requested by an ordinary `MediaPicker`, `EmojiPicker`, or
  `ReactionPicker`. Production minification leaves the root at 5.75 kB Brotli
  within its unchanged 7.5 kB ceiling; the optional engine remains under its
  separate 6 kB ceiling rather than being hidden in the root allowance. The
  experimental Genie implementation is a separate 2,823-byte raw chunk and is
  requested only for `motion="genie"`. Selecting Genie prewarms only that lazy
  chunk; once loaded, the component renders without a Suspense scheduling race.
- Genie reads its source/destination rectangles once, then animates six slices
  in a body-level fixed, viewport-clipped proxy using only transform and
  opacity. A Chromium run covering open, close, repeated open, and a scrolled
  document recorded zero layout shift outside the intentional picker-internal
  compact/full swap and no task at or above 50 ms. No shift source was the
  Genie proxy; it did not change body/document dimensions or scroll
  coordinates.
- Enter/exit animations now run on a dedicated transform/opacity layer beneath
  the geometry and gesture wrappers. A warm Chromium spring replay recorded
  three layout events and 18 style recalculations during remount/setup, with no
  long task at or above 50 ms. Motion uses CSS animation rather than per-frame
  React state. This observation is not a physical-device or FPS claim.
- A repeated Emoji → GIF → Stickers → Emoji Chromium run kept all three visited
  panels mounted and reported 50.0/36.8/37.0 ms on first visits and
  31.1/32.0/35.6 ms on revisits (wall-clock Playwright actions, not pure render
  time). The measured interaction window had no task at or above 50 ms, zero
  layout shift, and a net 235-node increase. The earlier implementation
  recreated provider panels on revisit, grew by about 2,565 nodes in the
  comparable flow, and recorded a 63 ms long task. Timings vary by machine; the
  durable improvement is retained state and elimination of repeated requests.
- Sixty scripted drag moves produced six layouts and 71 style recalculations;
  the earlier path produced five and 74. More importantly, pointer samples are
  now coalesced into one animation-frame style write/callback and do not update
  React media state per pixel. Resize bounds and CSS limits are read once when
  the gesture begins; the sampled resize path added no layout and one style
  recalculation. No FPS claim is made.
- GIF/sticker engines remain independent modules inside the monorepo and now
  reuse the core HTTP transport. The public beta bundles all four HTTP adapters
  so npm consumers do not depend on unpublished workspace packages; production
  tree shaking can still remove unused provider classes.
- Remote results arrive in bounded pages. An `IntersectionObserver` sentinel advances cursor pagination near the viewport, while its accessible Load more button remains the keyboard/no-observer fallback. The shared grid incrementally windows inline collections to 60 items and uses native `content-visibility` containment for offscreen cells, avoiding a runtime virtualization dependency. Provider pagination remains the primary large-collection boundary.
- The playground's initial JavaScript is 276,972 B and the full emoji data remains a separate 461,296 B chunk. The comparison includes the SDK surface demos, provider mocks, Presentation Lab, and React runtime, so it demonstrates delivery behavior rather than a standalone library-size claim.
- The complete served demo fixture set is 1,032,524 B across 44 media
  files. It belongs only to the playground and Storybook and is rejected by
  package tarball validation.

The incremental grid intentionally keeps the active 60-item window in normal document flow so screen-reader and roving-focus semantics remain predictable. For unbounded providers, cursor pagination prevents the DOM from receiving the complete remote collection. A fixed-row absolute-position virtualizer was rejected because GIF/sticker aspect ratios are adaptive and it would materially complicate keyboard position and dynamic-height accessibility.

## Animated emoji foundation

Animated emoji reuse the existing shared renderer rather than adding a second
engine or catalog. Idle cells render light poster/thumbnail assets; the
animation URL enters the DOM only after visibility plus the configured intent
policy. A priority queue caps simultaneous playback (three by default), and
document/viewport visibility releases slots. Native images/videos animate in
the browser compositor/decoder without an animation-frame React state loop.
Lottie remains host-supplied.

The richer lifecycle/scheduler/adapter implementation adds 10,319 raw bytes
(2,409 gzip bytes) to the shared React animated-media chunk. The public root
remains within its unchanged 7.5 kB Brotli budget at 6.01 kB. Browser ESM adds
10.85 kB raw / 3.08 kB Brotli over beta.6; the one-file global adds 13.26 kB raw
/ 3.38 kB Brotli. No budget was raised. The demo WebM and Lottie JSON are
playground/test fixtures and package validation rejects them from npm tarballs.

Reproduce the principal checks with:

```sh
pnpm build
pnpm size
pnpm package:check
gzip -c packages/emoji/dist/index.js | wc -c
```
