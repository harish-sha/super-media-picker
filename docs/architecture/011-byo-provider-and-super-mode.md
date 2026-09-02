# 011: BYO providers and future hosted Super Media mode

## Current decision

The production SDK consumes one normalized provider graph regardless of who
operates the backend:

```text
MediaPicker
    │
    ▼
MediaPickerProviders
    ├── gifs
    ├── stickers
    ├── animatedEmoji
    └── custom
         │
         ▼
provider interfaces + normalized MediaItem results
```

In BYO mode, applications construct this graph directly using built-in HTTP
adapters or custom implementations. There is no hosted Super Media runtime in
the current SDK.

## Reserved future resolver boundary

A future API may accept a public project identifier:

```tsx
<MediaPicker superMode={{ projectKey: "public_project_identifier" }} />
```

This example is not implemented. When implemented, `superMode` should resolve
to the same internal `MediaPickerProviders` graph rather than introduce a
second picker engine. BYO providers must remain usable independently.

Conceptual resolver inputs:

```ts
interface HostedProviderResolverConfig {
  readonly projectKey: string;
  readonly endpoint?: string;
  readonly getAccessToken?: () => Promise<string>;
}
```

The project key identifies configuration and is not an upstream vendor secret.
Private tenant access should use host sessions or short-lived, audience-bound
tokens. Long-lived vendor/API credentials remain only in the hosted gateway.

## Hosted gateway responsibilities

The future gateway, not the browser package, owns:

- project and tenant authentication/authorization;
- usage metering after authorization, using request/result metadata rather
  than raw search text by default;
- quota and rate-limit decisions;
- routing and failover across multiple upstream vendors;
- upstream credential storage and rotation;
- moderation and tenant policy;
- normalization into the existing SDK media/result contracts;
- CDN/object-storage URL generation and cache policy;
- audit/request IDs and retry guidance.

The browser SDK continues to own cancellation, stale-request protection,
short-lived memory caching, safe retries, response validation, and rendering.

## CDN and cache model

Provider search JSON is private or tenant-scoped unless explicitly public.
Optimized immutable media derivatives should use versioned CDN URLs. Grid
responses return poster/preview URLs; selection retains the original URL.

Suggested cache layers:

```text
SDK memory TTL
    ↓
application/hosted API cache (tenant-aware)
    ↓
vendor response cache where licensing permits
    ↓
CDN/object storage for media derivatives
```

Authorization responses must include appropriate `Cache-Control` and `Vary`
headers. The SDK cache is never an authorization boundary.

## Multiple vendors

Vendor-specific cursors and errors terminate at the gateway. The gateway maps
them to opaque `nextCursor`, normalized media items, and HTTP/error metadata.
Routing decisions must not leak vendor payloads or credentials to React.

Attribution remains provider-owned. A hosted resolver can attach the selected
vendor's attribution to the resolved provider instance without hard-coding
vendor branding into the generic picker.

## Animated emoji packs

Animated emoji already use the pack-aware `EmojiProvider` contract and shared
animation renderer. A hosted implementation needs only to resolve:

- lightweight pack metadata (`id`, `name`, `iconUrl`, `itemCount`, `animated`);
- lazy cursor-paginated pack items;
- search/trending pages of normalized animated/custom emoji;
- optimized poster/preview and original animation URLs;
- format and dimensions;
- tenant capability and origin policies.

No hosted animated-emoji catalog or media asset is bundled in npm.

## Compatibility rule

Future hosted mode must be an optional provider-construction layer. It must not
change normalized selection output, persistence, rendering, capabilities,
headless hooks, or custom-provider behavior. If BYO providers and hosted mode
are supplied together, a future release must document deterministic precedence
or reject ambiguous duplicate media slots during configuration validation.
