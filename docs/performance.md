# Performance measurements

Measured on 2026-08-28 from production ESM builds using Node 23 on macOS ARM. Raw byte counts use the emitted files, gzip uses `gzip -c`, package values come from the actual `pnpm pack` archives, and Brotli values come from `size-limit`.

| Artifact                              | Raw       | Compressed     |
| ------------------------------------- | --------- | -------------- |
| `@super-media-picker/core` JavaScript | 7,321 B   | 1.81 kB Brotli |
| React compact/base entry              | 20,443 B  | 4.62 kB Brotli |
| React shared tone-menu chunk          | 5,398 B   | 1,569 B gzip   |
| React lazy full-picker chunk          | 13,803 B  | 3,694 B gzip   |
| React picker CSS                      | 12,752 B  | 2,624 B gzip   |
| Public JavaScript entry               | 92 B      | 88 B Brotli    |
| Public stylesheet export              | 12,752 B  | 2,624 B gzip   |
| Emoji JavaScript/data                 | 577,548 B | 76,819 B gzip  |
| Playground initial JavaScript         | 220,888 B | 69,346 B gzip  |
| Playground lazy full UI               | 6,574 B   | 2,661 B gzip   |
| Playground lazy emoji data            | 440,821 B | 71,903 B gzip  |
| Playground CSS                        | 13,713 B  | 3,225 B gzip   |

Actual package archives are 8,819 B for core, 177,877 B for emoji, 1,987 B for themes, 36,319 B for React, and 3,727 B for the public `super-media-picker` aggregator. The React archive includes the compact entry, shared tone-menu chunk, lazy full-picker chunk, declarations, CSS, and source maps. `pnpm package:check` re-measures every archive and validates internal lazy-chunk references as well as public exports.

## Runtime observations

- The generated dataset contains 1,906 base records and 1,615 skin-tone variants. Variant names are derived from the base CLDR label instead of duplicated in data.
- The largest category is People & Body at 386 records. Its grid structurally creates about 1,159 elements without favorite controls or 1,931 with them. This is the current upper bound before surrounding picker controls.
- A warm Node benchmark of 1,000 alternating `happy`/`thumb` searches took 293.9 ms, or about 0.294 ms per search on the measurement machine.
- Search metadata and the ID map are built once at module initialization. Grid variant resolution and stored-ID collections are memoized by their actual inputs.
- Default compact mode requests only the generated ten-record emoji subpath (6,974 B raw / 1,892 B gzip across its entry and shared resolver), not the full-picker or full emoji-data chunks. Expanding requests both lazy chunks; recent, frequent, favorites, and unknown custom Unicode sources request the full emoji-data chunk because they resolve arbitrary persisted IDs.
- The playground's initial JavaScript remains far below the previous 650,904 B single chunk at 220,890 B. The comparison includes the playground and React runtime, so it demonstrates delivery behavior rather than a standalone library-size claim.

Virtualization is not used in Phase 4. The maximum current result set is bounded and virtualization would complicate the accessible roving grid. Reconsider it if custom datasets materially increase the rendered count or browser profiling shows a user-visible problem.

Reproduce the principal checks with:

```sh
pnpm build
pnpm size
pnpm package:check
gzip -c packages/emoji/dist/index.js | wc -c
```
