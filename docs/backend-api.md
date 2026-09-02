# Backend media API contract

These routes are a recommended host-application contract, not URLs hard-coded
by the SDK. `HttpGifProvider`, `HttpStickerProvider`, `HttpEmojiProvider`, and
`HttpCustomMediaProvider` can point at any safe endpoint that translates their
`mode`, query, cursor, and limit parameters into the normalized responses below.

```text
React application
      │
      ▼
super-media-picker
      │
      ▼
Provider interface
      │
      ▼
Application media API
      ├──────────────┬──────────────┐
      ▼              ▼              ▼
 GIF service    Sticker service  Media library
      └──────────────┴──────────────┘
                     │
                     ▼
             CDN / object storage
```

The browser calls only the application API and CDN. Provider credentials,
signing keys, tenant authorization, moderation, and vendor-specific payloads
remain behind the application API.

## Common behavior

- Validate and cap `limit`; 18–50 items is a practical page size.
- Treat `cursor` as opaque. Never expose vendor pagination models to React.
- Return `hasMore: false` and `items: []` for a valid empty page.
- Return stable IDs, accurate dimensions and useful accessible names/alt text.
- Use `https:` CDN URLs in production.
- Use an optimized preview in grids and retain the original URL for selection.
- Apply tenant authorization before returning private packs or media.
- Map vendor/network errors to suitable HTTP status codes without returning
  credentials or raw upstream responses.

The current built-in HTTP adapters use one endpoint per media type. They append
query parameters rather than hard-coding route suffixes:

```text
HttpGifProvider:
  mode=search|trending, q, cursor, limit

HttpStickerProvider:
  mode=packs|pack|search|trending, packId (for pack), q, cursor, limit

HttpEmojiProvider:
  mode=packs|pack|search|trending, packId (for pack), q, cursor, limit

HttpCustomMediaProvider:
  mode=search|trending, q, cursor, limit
```

For example, `new HttpGifProvider({ endpoint: "/api/media/gifs" })` requests
`/api/media/gifs?mode=search&q=hello`. The REST-shaped routes below are a
recommended host contract; a gateway/custom provider may use them directly, or
the single endpoint may translate `mode` to them.

Every paginated result has this exact shape:

```ts
interface SearchResult<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}
```

`items` and boolean `hasMore` are required. A non-empty `nextCursor` is required
when `hasMore` is true. Omit it when no next page exists;
`null`, numeric cursors, and provider-specific pagination objects are rejected.

## GIF routes

```http
GET /api/media/gifs/search?q=hello&cursor=opaque&limit=18
GET /api/media/gifs/trending?cursor=opaque&limit=18
```

```json
{
  "items": [
    {
      "type": "gif",
      "id": "gif_123",
      "provider": "example-provider",
      "name": "Hello",
      "alt": "A friendly character waving hello",
      "thumbnailUrl": "https://media.company.com/gifs/gif_123-poster.webp",
      "previewUrl": "https://media.company.com/gifs/gif_123-preview.webp",
      "url": "https://media.company.com/gifs/gif_123-original.gif",
      "width": 320,
      "height": 240
    }
  ],
  "nextCursor": "next_cursor",
  "hasMore": true
}
```

`thumbnailUrl` is optional. When present, the picker shows it while idle and
activates the optimized `previewUrl` according to the animation policy. It does
not load `url` merely to render the grid.

For GIF items, `type`, non-empty `id`, `provider`, `url`, and `previewUrl` are
required strings. `name`, `thumbnailUrl`, `width`, `height`, and `alt` are
optional. The validator rejects any item whose required media URL fails the
configured `MediaUrlPolicy`.

## Sticker routes

```http
GET /api/media/stickers/packs
GET /api/media/stickers/packs/{packId}?cursor=opaque&limit=18
GET /api/media/stickers/search?q=hello&cursor=opaque&limit=18
GET /api/media/stickers/trending?cursor=opaque&limit=18
```

Pack metadata:

```json
[
  {
    "id": "bear-pack",
    "name": "Bears",
    "description": "Friendly bear reactions",
    "iconUrl": "https://media.company.com/sticker-packs/bears.webp",
    "provider": "company-stickers",
    "itemCount": 80,
    "animated": true
  }
]
```

Pack/search result:

```json
{
  "items": [
    {
      "type": "sticker",
      "id": "wave-bear",
      "packId": "bear-pack",
      "provider": "company-stickers",
      "name": "Waving bear",
      "animated": true,
      "thumbnailUrl": "https://media.company.com/stickers/wave-bear-poster.webp",
      "previewUrl": "https://media.company.com/stickers/wave-bear.webp",
      "url": "https://media.company.com/stickers/wave-bear.webm",
      "format": "webm",
      "width": 256,
      "height": 256
    }
  ],
  "hasMore": false
}
```

For sticker items, `type`, non-empty `id`, `url`, and boolean `animated` are
required. `name`, `provider`, `packId`, `thumbnailUrl`, `previewUrl`, dimensions, and `alt` are
optional. `format` may be `gif`, `webp`, `webm`, `lottie`, `png`, or `jpeg`.
Pack entries require only string `id` and `name`; `description`, `iconUrl`,
legacy `icon`, `provider`, non-negative `itemCount`, and boolean `animated` are
optional. Remote HTTP pack metadata must not embed inline `stickers`. Prefer a CDN-backed `iconUrl`.
The SDK validates it against the media URL policy and uses a built-in SVG when
the URL is absent, unsafe, or fails to load. `mode=packs` returns the array
directly, not wrapped in `{ "items": ... }`.

## Animated/custom emoji routes

```http
GET /api/media/emoji/packs
GET /api/media/emoji/packs/{packId}?cursor=opaque&limit=18
GET /api/media/emoji/search?q=party&cursor=opaque&limit=18
GET /api/media/emoji/trending?cursor=opaque&limit=18
```

An `EmojiProvider` may expose pack metadata through `packs`, load only the
selected pack through `packItems`, and optionally implement `search` and
`trending`. Pack items use `AnimatedEmojiMediaItem` or `CustomEmojiMediaItem`.

Animated emoji example:

```json
{
  "type": "emoji",
  "kind": "animated",
  "id": "party",
  "name": "Party",
  "thumbnailUrl": "https://media.company.com/emoji/party-poster.webp",
  "previewUrl": "https://media.company.com/emoji/party-preview.webp",
  "animationUrl": "https://media.company.com/emoji/party.webm",
  "format": "webm",
  "fallbackEmoji": "🎉",
  "provider": "company-emoji"
}
```

Animated emoji require `type: "emoji"`, `kind: "animated"`, non-empty `id`,
`name`, `animationUrl`, and `format` (`gif`, `webp`, `webm`, or `lottie`).
`thumbnailUrl`, `previewUrl`, `provider`, positive dimensions, and `alt` are
optional.
Custom emoji require `type: "emoji"`, `kind: "custom"`, non-empty `id`,
`name`, and `url`; `previewUrl`, `fallbackText`, and `provider` are optional.

`HttpEmojiProvider` implements this exact single-endpoint query contract and
validates normalized items, asset origins, cursor shape, pack metadata, and
dimensions. A custom `EmojiProvider` remains supported for other route shapes.

## Custom media routes

```http
GET /api/media/custom/search?q=launch&cursor=opaque&limit=18
GET /api/media/custom/trending?cursor=opaque&limit=18
```

```json
{
  "items": [
    {
      "type": "custom",
      "id": "launch",
      "kind": "brand-animation",
      "name": "Product launch",
      "thumbnailUrl": "https://media.company.com/custom/launch-poster.webp",
      "previewUrl": "https://media.company.com/custom/launch-preview.webp",
      "url": "https://media.company.com/custom/launch.webm",
      "animated": true,
      "format": "webm",
      "width": 320,
      "height": 180,
      "provider": "company-library"
    }
  ],
  "hasMore": false
}
```

Custom items require `type: "custom"`, non-empty `id`, `kind`, `name`, and
`url`. `thumbnailUrl`, `previewUrl`, `provider`, `alt`, boolean `animated`,
format, and positive dimensions are optional. Animated custom media uses the
same renderer lifecycle as animated emoji and stickers.

## Minimal built-in-adapter endpoint

This intentionally vendor-neutral Express-style example matches the actual
query contract. Production code must also authenticate, authorize, validate
the cursor, and normalize the selected upstream provider's response.

```ts
app.get("/api/media/gifs", async (request, response) => {
  const mode = request.query.mode === "search" ? "search" : "trending";
  const query = mode === "search" ? String(request.query.q ?? "").trim() : "";
  const cursor =
    typeof request.query.cursor === "string" ? request.query.cursor : undefined;
  const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 18));

  if (mode === "search" && query.length === 0) {
    return response.status(400).json({ error: "q is required" });
  }

  try {
    const upstream = await applicationGifService({
      mode,
      query,
      cursor,
      limit,
    });
    const result = {
      items: upstream.items.map(normalizeGif),
      hasMore: upstream.nextCursor !== undefined,
      ...(upstream.nextCursor === undefined
        ? {}
        : { nextCursor: upstream.nextCursor }),
    };
    return response.json(result);
  } catch {
    return response.status(502).json({ error: "media_provider_unavailable" });
  }
});
```

Do not return an HTTP 200 placeholder result for an upstream failure unless the
product intentionally treats failure as empty. The HTTP adapters convert
non-2xx status, network failure, timeout, malformed JSON, and schema failure to
`MediaProviderError`; React panels render those errors without crashing other
tabs.

## Attribution and URL security

Attribution is configured on the provider as
`{ label, url?, logoUrl?, required? }`; it is
not read from each search response. When a vendor requires branding, populate
that provider option and preserve it through the host integration.

`isSafeMediaUrl` rejects executable schemes. Its default remains convenient for
local development, so production integrations should explicitly set
`allowedOrigins`, `allowHttp: false`, `allowDataImages: false`, and the desired
relative/blob policy on both the provider and picker. See `docs/security.md`.

## Error and caching recommendations

- `400`: invalid query, cursor, pack ID or limit.
- `401`/`403`: authentication or tenant authorization failure.
- `404`: unknown pack; a missing individual CDN asset should fall back in UI.
- `429`: rate limited; include `Retry-After` when appropriate.
- `502`/`503`: upstream provider unavailable.
- `504`: upstream timeout.

Cache public trending/pack metadata at the backend/CDN. Keep user-specific
searches and tenant media private. The SDK adds only a short, configurable
in-memory TTL, in-flight request deduplication, and bounded retry policy; it is
not the authoritative cache. `X-Request-Id` is preserved on normalized errors
for diagnostics, but response bodies and upstream credentials are not exposed.
