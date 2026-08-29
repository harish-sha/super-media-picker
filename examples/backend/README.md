# Minimal backend adapter

This is framework-neutral pseudocode for the intended server boundary. It is
not a complete backend and deliberately does not select a vendor.

```ts
type VendorGif = unknown;

export async function gifSearch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit")) || 18),
  );

  // Authenticate the application user and enforce tenant/channel policy here.
  const upstream = await configuredProvider.search({ query, cursor, limit });
  const items = upstream.items.map(normalizeVendorGif);

  return Response.json({
    items,
    nextCursor: upstream.nextCursor,
    hasMore: Boolean(upstream.nextCursor),
  });
}

function normalizeVendorGif(input: VendorGif) {
  // Validate the real vendor payload before this mapping.
  return {
    type: "gif" as const,
    id: readStableId(input),
    provider: configuredProvider.id,
    name: readName(input),
    alt: readAlt(input),
    thumbnailUrl: cdnPosterUrl(input),
    previewUrl: cdnOptimizedPreviewUrl(input),
    url: cdnOriginalUrl(input),
    width: readWidth(input),
    height: readHeight(input),
  };
}
```

The adapter validates queries, calls a server-side provider, normalizes its
payload, and returns the picker contract. Vendor credentials never cross the
server boundary. The same pattern applies to sticker and emoji pack routes.
