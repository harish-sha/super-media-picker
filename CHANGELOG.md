# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0-beta.3] - 2026-09-01

### Changed

- Replaced the permanent sticker-pack navigation row with a responsive,
  accessible `Packs` selector that supports pack images, safe built-in
  fallbacks, selected-state semantics, and scalable provider-backed pack lists.
- Reduced sticker navigation density by presenting Browse, Recent, and
  Favorites as a compact contextual control alongside pack selection.
- Made expandable compact-origin pickers collapse back to the compact reaction
  surface by default, while retaining `allowCollapse: false` as an explicit
  one-way expansion option.

### Fixed

- Kept the integrated compact and full picker surfaces mutually exclusive
  throughout expansion and collapse, including React StrictMode rendering.
- Added consistent Back, Escape, and backdrop collapse behavior with focus
  restoration to the compact expansion control.
- Prevented large sticker-pack collections from overflowing narrow layouts and
  preserved keyboard and screen-reader navigation in the responsive selector.

## [0.1.0-beta.2] - 2026-08-31

### Fixed

- Kept deduplicated provider requests alive across React StrictMode's immediate
  effect cleanup and resubscription while preserving per-subscriber aborts.
- Snapshotted recent/frequent compact reaction order for the mounted
  interaction session, so repeated pointer or keyboard selection cannot move a
  different reaction under the active control; frequency data still persists
  and refreshes on remount.
- Preserved composite emoji as exact dataset Unicode sequences and added
  regression coverage for variation selectors, modifiers, ZWJ sequences,
  flags, keycaps, and one-event normalized selection.
- Added stable emoji-cell dimensions, containment, overflow protection, and a
  configurable cross-platform color-emoji font stack.
- Replaced the sticker-pack navigation's platform-font glyph fallback with a
  built-in SVG and added policy-checked, error-tolerant `iconUrl` support.
- Preserved the browser receiver when the HTTP GIF and sticker providers use
  native `fetch`, preventing `Illegal invocation` failures without a custom
  fetch implementation.

### Added

- Added `maxUnicodeVersion` to `MediaPicker`, `EmojiPicker`, and
  `useEmojiSearch`, defaulting native rendering to Unicode Emoji 15 while
  allowing hosts to opt into newer platform support.
- Documented the exact query-style HTTP adapter contract, required and optional
  normalized fields, cursor and error behavior, media URL security, attribution,
  native emoji limitations, and a minimal backend adapter.
- Added an independent StrictMode consumer regression page for composite
  insertion, native-platform samples, compact stability, providers, and the
  headless API.

## [0.1.0-beta.1] - 2026-08-29

### Added

- Public `MediaPicker`, `EmojiPicker`, `GifPicker`, `StickerPicker`, and
  `ReactionPicker` components with normalized selection output.
- Headless `useMediaPicker`, emoji/GIF/sticker search, recents, and favorites
  hooks.
- Unicode emoji dataset, search, category navigation, skin-tone variants,
  recents/frequency ranking, favorites, and shared persistent preferences.
- Compact/full presentations, responsive placements, light/dark/system/custom
  themes, keyboard navigation, accessibility, and animation policies.
- Provider-first GIF, sticker, animated/custom emoji, and tenant-media
  contracts with cursor pagination, caching, request deduplication,
  cancellation, timeouts, validation, attribution, and URL policies.
- `super-media-picker/headless`, `super-media-picker/providers`, and
  `super-media-picker/styles.css` public exports.
- Offline playground fixtures, Storybook coverage, provider network scenarios,
  unit/component tests, Playwright flows, SSR validation, tarball validation,
  and a clean external installation test.

### Packaging

- The public package is a self-contained ESM distribution with React and React
  DOM as peers; it has no runtime dependency on unpublished workspace packages.
- The project and public package are licensed under the MIT License, copyright
  2026 Harish Sharma.
- Production media catalogs, demo assets, credentials, tests, Storybook output,
  and internal source files are excluded from the tarball.

[Unreleased]: https://github.com/harish-sha/super-media-picker/compare/v0.1.0-beta.3...HEAD
[0.1.0-beta.3]: https://github.com/harish-sha/super-media-picker/compare/v0.1.0-beta.2...v0.1.0-beta.3
[0.1.0-beta.2]: https://github.com/harish-sha/super-media-picker/compare/v0.1.0-beta.1...v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/harish-sha/super-media-picker/releases/tag/v0.1.0-beta.1
