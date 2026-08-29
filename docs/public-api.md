# Public API and compatibility

`super-media-picker` is the canonical application-facing package. Most React
applications should import components, normalized media types, and common
provider contracts from the package root and import the stylesheet once.

## Stable API

The following APIs follow the documented beta versioning policy from
`0.1.0-beta.1` onward. Breaking changes are announced in release notes and
require a major version after 1.0.

- Components: `MediaPicker`, `EmojiPicker`, `GifPicker`, `StickerPicker`, and
  `ReactionPicker`.
- Headless hooks: `useMediaPicker`, `useEmojiSearch`, `useGifSearch`,
  `useStickerSearch`, `useRecents`, and `useFavorites`.
- Normalized media item, provider, capabilities, persistence, animation,
  rendering, analytics, and configuration types documented in the README.
- `super-media-picker/styles.css`.

Focused pickers are thin configurations of the same picker engine. They emit
the same normalized `MediaItem` subtypes and share the configured storage
adapter, skin tone, recents, and favorites with `MediaPicker` and the headless
hooks. They do not maintain a second provider or persistence implementation.

The `super-media-picker/headless` subpath exports only the public hooks and the
core types needed to build a custom interface. It does not import picker CSS.
The `super-media-picker/providers` subpath is a convenient production adapter
entry point for `HttpGifProvider`, `HttpStickerProvider`, request runtime, and
provider types.

## Advanced API

Custom renderers, animation policies, raw provider/cache classes, storage
adapters, analytics sinks, custom tabs, and emoji packs are supported advanced
APIs. They are public and typed, but require the host to preserve the documented
media and security contracts. Scoped `@super-media-picker/*` workspace modules
are internal release inputs during the beta and are not supported npm consumer
entry points.

## Internal implementation

Component reducers, React contexts, provider panel state, grid cells, request
sequence counters, persistence subscriptions, generated dataset modules, and
lazy chunk boundaries are internal. They are intentionally absent from public
exports and may change without a deprecation cycle.

## Experimental API

There are no experimental exports in this release. A future experimental API
will be explicitly named in its documentation and release notes; undocumented
internals are not experimental APIs.

## Deprecation policy

A stable API is deprecated in types and documentation before removal whenever
practical. Deprecations include a migration path and remain through at least one
minor release. Security fixes or corrections to behavior that never matched the
documented contract may ship without a full deprecation window.

Versioning follows SemVer: patch releases fix compatible behavior, minor
releases add compatible APIs, and major releases may remove deprecated APIs or
make documented breaking changes. Before 1.0, any intentional stable-API break
is still called out prominently and is never hidden in a patch release.
