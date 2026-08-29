# Backend media API contract

These routes are a recommended host-application contract, not URLs hard-coded
by the SDK. `HttpGifProvider` and `HttpStickerProvider` can point at any safe
endpoint that translates their `mode`, query, cursor, and limit parameters into
the normalized responses below.

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
    "icon": "🐻",
    "provider": "company-stickers"
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
      "previewUrl": "https://media.company.com/stickers/wave-bear.webp",
      "url": "https://media.company.com/stickers/wave-bear.webm",
      "format": "webm",
      "width": 256,
      "height": 256
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

Omit `nextCursor` instead of returning `null` when implementing the TypeScript
contract directly.

## Animated/custom emoji routes

```http
GET /api/media/emoji/packs
GET /api/media/emoji/packs/{packId}?cursor=opaque&limit=18
GET /api/media/emoji/search?q=party&cursor=opaque&limit=18
```

An `EmojiProvider` may expose pack metadata through `packs`, load only the
selected pack through `packItems`, and optionally implement `search` and
`trending`. Pack items use `AnimatedEmojiMediaItem` or `CustomEmojiMediaItem`.

## Error and caching recommendations

- `400`: invalid query, cursor, pack ID or limit.
- `401`/`403`: authentication or tenant authorization failure.
- `404`: unknown pack; a missing individual CDN asset should fall back in UI.
- `429`: rate limited; include ordinary retry metadata if the host uses it.
- `502`/`503`: upstream provider unavailable.
- `504`: upstream timeout.

Cache public trending/pack metadata at the backend/CDN. Keep user-specific
searches and tenant media private. The SDK adds only a short, configurable
in-memory TTL and in-flight request deduplication; it is not the authoritative
cache.
