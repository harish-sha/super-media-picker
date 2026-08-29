# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/harish-sha/super-media-picker/compare/v0.1.0-beta.1...HEAD
[0.1.0-beta.1]: https://github.com/harish-sha/super-media-picker/releases/tag/v0.1.0-beta.1
