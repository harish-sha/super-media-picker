# Performance measurements

Measured on 2026-08-28 from production ESM builds using Node 23 on macOS ARM. Raw byte counts use the emitted files, gzip uses `gzip -c`, package values come from the actual `pnpm pack` archives, and Brotli values come from `size-limit`.

| Artifact                         | Raw       | Compressed     |
| -------------------------------- | --------- | -------------- |
| `@company/media-core` JavaScript | 7,321 B   | 1.81 kB Brotli |
| React compact/base entry         | 20,413 B  | 4.61 kB Brotli |
| React shared tone-menu chunk     | 5,393 B   | 1,566 B gzip   |
| React lazy full-picker chunk     | 13,784 B  | 3,690 B gzip   |
| React picker CSS                 | 12,747 B  | 2,619 B gzip   |
| Emoji JavaScript/data            | 577,548 B | 76,813 B gzip  |
| Playground initial JavaScript    | 220,890 B | 69,337 B gzip  |
| Playground lazy full UI          | 6,574 B   | 2,657 B gzip   |
| Playground lazy emoji data       | 440,821 B | 71,902 B gzip  |
| Playground CSS                   | 13,713 B  | 3,225 B gzip   |

Actual package archives are 8,818 B for core, 177,856 B for emoji, 1,989 B for themes, and 36,403 B for React. The React archive includes the compact entry, shared tone-menu chunk, lazy full-picker chunk, declarations, CSS, and source maps. `pnpm package:check` re-measures every archive and validates internal lazy-chunk references as well as public exports.

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
