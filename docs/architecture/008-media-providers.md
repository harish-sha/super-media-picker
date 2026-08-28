# 008: Media provider and network architecture

## Decision

Provider packages normalize host or backend data into the framework-independent `MediaItem` union. React receives `MediaProvider`/`StickerProvider` contracts and never contains vendor-specific request logic.

```text
MediaPicker
  ├─ Unicode dataset (local)
  ├─ GifProvider ─────────→ host CPaaS backend ─→ configured vendor
  ├─ StickerProvider ─────→ host CPaaS backend/tenant packs
  └─ CustomMediaProvider ─→ host-owned source
```

`HttpGifProvider` and `HttpStickerProvider` accept a backend endpoint and optional ordinary headers. API secrets must remain server-side. Responses are validated as normalized media, and media URLs reject executable schemes.

The shared `MediaRequestClient` supplies:

- `AbortController` propagation and timeouts;
- in-flight request deduplication;
- TTL memory caching with an injectable cache contract;
- deterministic cleanup and provider-scoped errors.

Search is contextual per active tab. Queries debounce in React, stale requests abort, and pagination appends only the requested page. A provider error is rendered inside its panel and does not affect another feature.

## Feature loading

`@super-media-picker/gif` and `@super-media-picker/stickers` are independent ESM packages. The public aggregator re-exports them for installation convenience, but the React package does not import them. Provider panels are dynamically imported only after a GIF, sticker, or custom tab is activated. The Unicode compact path continues to use the small generated emoji subpath.

## Attribution

Attribution metadata belongs to the provider instance and renders only in its panel. The picker does not impose global vendor branding.
