# 008: Media provider and network architecture

## Decision

Provider packages normalize host or backend data into the framework-independent `MediaItem` union. React receives `MediaProvider`/`StickerProvider` contracts and never contains vendor-specific request logic.

```text
MediaPicker
  ├─ Unicode dataset (local)
  ├─ GifProvider ─────────→ application media API ─→ configured vendor
  ├─ StickerProvider ─────→ application media API ─→ tenant packs
  ├─ EmojiProvider ──────→ application media API ─→ tenant packs
  └─ CustomMediaProvider ─→ application media API ─→ host-owned source
                                                │
                                                └─→ CDN/object storage
```

`HttpGifProvider`, `HttpStickerProvider`, `HttpEmojiProvider`, and
`HttpCustomMediaProvider` accept a backend endpoint and optional ordinary
browser-to-backend authentication. API/vendor secrets must remain server-side.
Responses are validated as normalized media, and media URLs reject executable
or credential-bearing schemes.

The shared `MediaRequestClient` supplies:

- `AbortController` propagation and timeouts;
- in-flight request deduplication;
- TTL memory caching with an injectable cache contract;
- bounded retries for explicitly retryable network/HTTP failures;
- deterministic cleanup and provider-scoped errors.

All adapters share `HttpProviderTransport`, so status normalization,
`Retry-After`, request IDs, safe header resolution, GET query construction, and
response handling do not diverge by media type.

Search is contextual per active tab. Queries debounce in React, stale requests abort, and pagination appends only the requested page. A provider error is rendered inside its panel and does not affect another feature.

Pack metadata is lightweight. Sticker and remote emoji contents load only for
the selected pack, and every provider page uses the common opaque-cursor
`SearchResult<T>` shape. Large catalog data and media binaries therefore stay
outside npm and outside the picker's initial component payload.

React accepts direct `providers.animatedEmoji` and `providers.custom`
registrations while retaining beta.3 `providers.emoji` and `customTabs`.
Registration normalization is additive and ID-deduplicated; provider business
logic remains outside React.

## Feature loading

GIF and sticker providers remain independent modules in the monorepo. The
public beta bundles their public exports into `super-media-picker` so consumers
never depend on unpublished workspace packages. Code splitting is preserved:
provider panels load only after a GIF, sticker, or custom tab is activated, and
the Unicode compact path continues to use the small generated emoji data.

## Attribution

Attribution metadata belongs to the provider instance and renders only in its panel. The picker does not impose global vendor branding.

See [the backend contract](../backend-api.md), [provider implementation
examples](../providers.md), and [media security/CSP guidance](../security.md).
