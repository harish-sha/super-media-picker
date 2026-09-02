# Production provider integration

`super-media-picker` is provider-first: npm contains the UI, normalized models,
request runtime, and adapters, while production catalogs remain in developer
backends and CDNs. The SDK supports three integration strategies:

1. point a built-in HTTP adapter at a host-owned backend;
2. provide a custom TypeScript implementation of the provider contract;
3. in a future release, let hosted Super Media mode resolve the same contracts.

Hosted Super Media mode is design-only in this release. There is no
`superMode` prop and no project-key network path yet.

## Recommended BYO configuration

```tsx
import { MediaPicker } from "super-media-picker";
import {
  HttpCustomMediaProvider,
  HttpEmojiProvider,
  HttpGifProvider,
  HttpStickerProvider,
} from "super-media-picker/providers";

const mediaSecurity = {
  allowedOrigins: ["https://media.company.com"],
  allowHttp: false,
  allowDataImages: false,
  allowBlob: false,
};

const gifs = new HttpGifProvider({
  endpoint: "/api/media/gifs",
  timeoutMs: 8_000,
  cacheTtlMs: 60_000,
  retry: { maxRetries: 1, baseDelayMs: 150, maxDelayMs: 1_000 },
  mediaSecurity,
  attribution: {
    label: "Media provided by Example",
    url: "https://example.com",
    required: true,
  },
});

const stickers = new HttpStickerProvider({
  endpoint: "/api/media/stickers",
  timeoutMs: 8_000,
  mediaSecurity,
});

const animatedEmoji = new HttpEmojiProvider({
  endpoint: "/api/media/emoji",
  displayName: "Workspace emoji",
  mediaSecurity,
});

const custom = new HttpCustomMediaProvider({
  endpoint: "/api/media/custom",
  displayName: "Company media",
  mediaSecurity,
});

<MediaPicker
  features={{
    emoji: true,
    animatedEmoji: true,
    gifs: true,
    stickers: true,
    customMedia: true,
  }}
  providers={{ gifs, stickers, animatedEmoji, custom }}
  mediaSecurity={mediaSecurity}
  onSelect={handleSelect}
/>;
```

`providers.animatedEmoji` and `providers.custom` accept one provider or an
array. Existing beta.3 `providers.emoji` arrays and `customTabs` remain fully
supported and are merged by stable provider/tab ID. An explicit `customTabs`
entry wins if it has the same ID as a direct custom provider.

## Browser authentication and secrets

The HTTP adapters accept static headers or an async header factory for ordinary
browser-to-application authentication:

```ts
const custom = new HttpCustomMediaProvider({
  endpoint: "/api/media/custom",
  credentials: "include",
  headers: async () => ({
    Authorization: `Bearer ${await getShortLivedApplicationToken()}`,
  }),
});
```

These values are sent to the developer backend. Never put Giphy-style vendor
keys, upstream bearer tokens, CDN signing secrets, or Super Media service
credentials in browser code. The required boundary is:

```text
browser → developer backend → selected upstream vendor → CDN/object storage
```

## Custom implementations

Applications may implement the interfaces directly. All cursors are opaque,
all methods receive an optional `AbortSignal`, and every page uses one shape:

```ts
interface SearchOptions {
  readonly cursor?: string;
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

interface SearchResult<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}
```

Example custom GIF provider:

```ts
import type {
  GifProvider,
  SearchResult,
  GifMediaItem,
} from "super-media-picker/providers";

export const gifs: GifProvider = {
  id: "company-gifs",
  displayName: "Company GIFs",
  capabilities: {
    mediaType: "gif",
    search: true,
    trending: true,
    pagination: true,
    animatedMedia: true,
  },
  attribution: { label: "Example media", required: true },
  search: (query, options) =>
    applicationMediaApi<SearchResult<GifMediaItem>>("/gifs/search", {
      query,
      cursor: options?.cursor,
      limit: options?.limit,
      signal: options?.signal,
    }),
  trending: (options) =>
    applicationMediaApi<SearchResult<GifMediaItem>>("/gifs/trending", {
      cursor: options?.cursor,
      limit: options?.limit,
      signal: options?.signal,
    }),
};
```

`MediaProviderCapabilities` is discovery metadata for hosts and future provider
resolvers. The method itself remains authoritative: declaring `search: true`
does not synthesize a missing `search` function, while an explicit `false`
prevents the React engine from invoking that operation.

## Runtime guarantees

Built-in HTTP adapters use the shared `HttpProviderTransport` and
`MediaRequestClient`:

- GET-only, cursor-based requests;
- per-subscriber cancellation and stale-request protection;
- an overall request timeout;
- in-flight deduplication by provider and complete request URL;
- short, configurable in-memory TTL caching of successful results only;
- bounded exponential retries for errors marked retryable;
- `Retry-After` support, capped by `maxDelayMs`;
- no retries for invalid JSON, invalid normalized data, unsafe URLs, or ordinary
  client errors;
- normalized `MediaProviderError` metadata: `provider`, `providerCode`,
  `status`, `retryable`, `retryAfterMs`, and `requestId` where available.

The default is one retry for explicitly retryable network/HTTP failures. Set
`retry: false` to disable it, or inject a `MediaRequestClient` for advanced
cache/runtime ownership. Cache entries are provider-instance local and never
act as an authorization cache.

## Normalized media and assets

Grid rendering prefers `thumbnailUrl`, then `previewUrl`; selection preserves
the original `url` or animated emoji `animationUrl`. Optional `width` and
`height` must be finite positive numbers. Static and animated custom media may
declare `animated` and `format`; animated custom media shares the existing
visibility, reduced-motion, and concurrency-controlled renderer.

Pack metadata supports `id`, `name`, `description`, `iconUrl`, `provider`,
`itemCount`, and `animated`. Sticker/emoji pack contents are requested only for
the selected pack and use normal cursor pagination.

See [the exact backend contract](backend-api.md), [security guidance](security.md),
and [future hosted-mode design](architecture/011-byo-provider-and-super-mode.md).
