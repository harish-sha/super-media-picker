# 009: Animated emoji and shared animated media

Animated emoji are first-class `MediaItem` values and use the same
`AnimatedMediaRenderer` as GIFs, animated stickers, and animated custom media.
There is no browser-only or provider-specific item model and no second animation
engine.

The portability rule is: **Super Media owns contracts. Providers, vendors, and
renderers are replaceable adapters.** Consequently there is no `lottie-web`
production dependency, no vendor-specific field in `MediaItem`, no
GIPHY-specific domain model, and no external renderer is required for normal
picker functionality. A host renderer is needed only when the host opts into a
format such as Lottie that browsers do not render natively.

## Normalized model

`AnimatedEmojiMediaItem` has stable `id`, `name`, `kind: "animated"`, optional
`provider`/`packId`, Unicode or text fallback, dimensions, search aliases,
keywords, locale keywords, attribution, capabilities, loop/playback policy, and
role-based assets. `MediaAsset.role` is one of `poster`, `thumbnail`, `preview`,
`animation`, or `original`. Legacy beta.6 URL fields remain valid.

`MediaItemVariant` is provider-neutral metadata for future custom emoji variant
pickers. It does not apply Unicode skin-tone rules to custom artwork and does
not add variant UI in this phase.

The resolver uses light assets in this order:

```text
idle grid: poster → thumbnail → preview → Unicode/text
active:    animation role → legacy animation/preview URL
selected:  normalized item is emitted immediately; optional replay follows
original:  retained for host message rendering, never eagerly loaded by the grid
```

Persisted recents/favorites retain stable identity, direct render URLs, and
fallback metadata. Search catalogs, role manifests, attribution, capabilities,
and variants are stripped so local storage does not become a pack cache.

## Formats and lifecycle

| Format        | Strategy                                             |
| ------------- | ---------------------------------------------------- |
| WebM          | muted, inline native `<video>`, metadata preload     |
| animated WebP | native `<img>` while active                          |
| GIF           | native `<img>` while active                          |
| static raster | poster/fallback path (WebP, PNG, JPEG, AVIF)         |
| Lottie        | optional host-owned `renderers.animatedMedia.lottie` |

Lifecycle states are `idle`, `preparing`, `loading`, `ready`, `playing`,
`paused`, `completed`, and `error`. Browser-native playback does not update
React on every frame. Lottie adapters own `mount`, optional `play/pause/stop`,
and mandatory `destroy`; adapter errors are contained. The older
`renderers.lottie` callback remains supported for beta.6 compatibility.

## Playback and resource policy

`animatedMedia.playback` accepts `never`, `on-hover`, `on-focus`, `on-intent`,
`once`, `loop-while-active`, or `always`. The calm default is `on-intent`.
Legacy `autoplay` remains deprecated but compatible. Per-item
`playbackPolicy`/`loopPolicy` can narrow behavior. `playOnSelect` emits the item
first and then requests a short, bounded replay.

Each picker owns one priority scheduler. Selected, focused, and intentional
previews outrank ordinary visible work; excess items queue instead of polling.
The default cap is three. Instances intentionally do not share hover, pack,
search, or scheduler state.

Intersection observation prepares only nearby items. Leaving the viewport,
hiding the document/tab, closing the picker, or unmounting releases the slot.
Video is paused, reset, detached from its source, and reloaded for cleanup.
Animation URLs are not rendered while poster-only content is idle.

`prefers-reduced-motion` and `animatedMedia.reducedMotion: "reduce"` suppress
decorative animation even after pointer intent; selection, focus, labels, and
poster/Unicode fallback remain functional. Picker presentation motion and media
animation are separate systems.

## Providers, packs, and search

Inline `emojiPacks`, `providers.emoji`, and `providers.animatedEmoji` use the
same model. Remote packs can report version/revision, icon/poster, provider,
attribution, capabilities, item count, pagination/search flags, and locales.
Pack items/search use opaque cursor pagination and optional provider-neutral
`packId`/`locale` filters.

The accessible portal-backed Packs selector replaces a dense horizontal pack
row. Local search covers names, aliases, keywords, and locale keywords;
provider search remains abortable/debounced and pack scoped. No production
catalog or vendor credentials are bundled.

When an extension pack/provider is configured, the Emoji surface shows a
compact `All` / `Standard` / `Animated` filter. It stays hidden for Unicode-only
pickers, works with search and pack selection, and does not create a second
primary media tab. Animated and custom grid items use a small `aria-hidden`
visual marker that does not resize the cell or duplicate the item's accessible
name.

## Security and distribution

Every asset is checked through `MediaUrlPolicy`; `allowedFormats` can restrict
declared/detected raster, video, and Lottie asset formats in addition to scheme,
origin, credentials, relative, blob, and data-image policy. Lottie JSON is data
passed to the host adapter, never script or injected markup.

React, browser ESM, the Web Component, and the global build share this renderer.
The browser `renderers` complex property accepts the same adapter configuration.
Portals use the current picker target, including the instance-local Shadow DOM
overlay. Hostile page CSS cannot resize the bounded media cells.

Production flow remains:

```text
browser → developer backend → provider/CDN
```

Vendor secrets stay server-side. Relevant CSP directives are `img-src` for
posters/GIF/WebP, `media-src` for WebM, `connect-src` for provider and optional
host-adapter fetches, and the existing SDK `style-src` requirements.

## Composer compatibility

The beta.7 model was exercised against future composer needs without changing
the production contract. Stable identity, fallback Unicode/text, aliases,
search metadata, pack/provider identity, and normalized assets can support
plain-text fallback, rich emoji entities, autocomplete, and composer
integration. This validation did not expose the testing lab as SDK behavior and
does not publish a Composer protocol, entity JSON schema, or Composer API.

Composer text remains local by default. The deterministic beta.7 compatibility
lab performs no network request for typed text. Any future semantic/cloud
intelligence must be explicit and opt-in, and its AI/provider implementation
must remain a replaceable adapter rather than becoming part of `MediaItem`.

## Messaging certification and future portability

The external beta.7 Messaging Experience Lab validates animated messages,
reactions, selection, fallbacks, deterministic suggestions, and responsive
picker presentation in a realistic but local fake chat. Its reaction rail,
long-press host policy, suggestion overlay, and composer entities are not public
SDK features. In particular, beta.7 exports neither Composer Intelligence nor a
ReactionController. A future reaction controller must let hosts explicitly
choose reaction long press, native text selection, or a host-defined trigger.

The reusable domain boundary is platform-neutral: `MediaItem`, provider and
asset contracts, aliases/keywords/locales, pack identity, ranking inputs,
collection records, and future suggestion/reaction data. DOM measurement,
textarea/contenteditable integration, CSS, Shadow DOM, `VisualViewport`, and
Pointer Events are web adapters. This separation supports future React Native,
Android/Kotlin, and iOS/Swift implementations without claiming the current DOM
UI can run natively.
