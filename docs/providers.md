# Provider integration guide

The npm packages contain contracts, UI, state, renderers, request/cache tools,
and normalized models. They do not contain a production GIF catalog, sticker
catalog, animated-emoji catalog, or vendor credentials.

## GIF provider

Use the built-in host-backend adapter:

```ts
import { HttpGifProvider } from "super-media-picker/providers";

const gifs = new HttpGifProvider({
  endpoint: "/api/media/gifs",
  timeoutMs: 8_000,
  cacheTtlMs: 60_000,
  mediaSecurity: {
    allowedOrigins: ["https://media.company.com"],
    allowHttp: false,
  },
  attribution: {
    label: "Media provided by Example",
    url: "https://example.com",
  },
});
```

`HttpGifProvider` sends `mode=search|trending`, `q`, `cursor`, and `limit` to
the configured endpoint. A host may route those parameters however it wants.

## Sticker provider

```ts
import { HttpStickerProvider } from "super-media-picker/providers";

const stickers = new HttpStickerProvider({
  endpoint: "/api/media/stickers",
  timeoutMs: 8_000,
  cacheTtlMs: 60_000,
  mediaSecurity: {
    allowedOrigins: ["https://media.company.com"],
    allowHttp: false,
  },
});
```

Sticker packs are loaded first as lightweight metadata. `packItems` runs only
for the selected pack, and cursor pagination keeps large packs bounded.

## Animated/custom emoji provider

Applications can implement a pack-aware provider without changing the SDK:

```ts
import type {
  AnyEmojiMediaItem,
  EmojiPack,
  EmojiProvider,
  SearchResult,
} from "super-media-picker/providers";

interface BackendQuery {
  readonly query?: string;
  readonly cursor?: string;
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

async function requestJson<T>(
  path: string,
  { signal, ...parameters }: BackendQuery = {},
): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const response = await fetch(
    query.size === 0 ? path : `${path}?${query.toString()}`,
    signal === undefined ? {} : { signal },
  );
  if (!response.ok)
    throw new Error(`Media backend returned ${response.status}`);
  return (await response.json()) as T;
}

export const workspaceEmoji: EmojiProvider = {
  id: "workspace-emoji",
  async packs(options) {
    return requestJson<readonly EmojiPack[]>("/api/media/emoji/packs", {
      signal: options?.signal,
    });
  },
  async packItems(packId, options) {
    return requestJson<SearchResult<AnyEmojiMediaItem>>(
      `/api/media/emoji/packs/${encodeURIComponent(packId)}`,
      {
        cursor: options?.cursor,
        limit: options?.limit,
        signal: options?.signal,
      },
    );
  },
  async search(query, options) {
    return requestJson<SearchResult<AnyEmojiMediaItem>>(
      "/api/media/emoji/search",
      { query, cursor: options?.cursor, signal: options?.signal },
    );
  },
};
```

Register it with `providers={{ emoji: [workspaceEmoji] }}`. Small known packs
can still be supplied inline through `emojiPacks`.

## Custom media provider

```ts
import type {
  CustomMediaItem,
  MediaProvider,
  SearchResult,
} from "super-media-picker";

const companyLibrary: MediaProvider<CustomMediaItem> = {
  id: "company-library",
  search: (query, options) =>
    requestJson<SearchResult<CustomMediaItem>>("/api/media/custom/search", {
      query,
      cursor: options?.cursor,
      limit: options?.limit,
      signal: options?.signal,
    }),
  trending: (options) =>
    requestJson<SearchResult<CustomMediaItem>>("/api/media/custom/trending", {
      cursor: options?.cursor,
      limit: options?.limit,
      signal: options?.signal,
    }),
};
```

Register this through `customTabs`. Every result remains a normalized
`CustomMediaItem`, and `renderers.custom` can provide tenant-specific visuals.

## Demo and production

```tsx
// Offline demo/test
<MediaPicker providers={{ gifs: mockGifs, stickers: mockStickers }} />

// Production
<MediaPicker
  features={{ gifs: true, stickers: true }}
  providers={{ gifs, stickers }}
  mediaSecurity={{
    allowedOrigins: ["https://media.company.com"],
    allowDataImages: false,
    allowHttp: false,
  }}
  onSelect={handleSelect}
/>
```

Provider attribution stays provider-owned. The generic picker does not
hard-code vendor branding.
