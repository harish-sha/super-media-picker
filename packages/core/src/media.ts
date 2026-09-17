export type SkinTone =
  "default" | "light" | "medium-light" | "medium" | "medium-dark" | "dark";

export type AnimatedMediaFormat = "lottie" | "webm" | "webp" | "gif";

export type StaticMediaFormat = "avif" | "jpeg" | "png" | "webp";
export type MediaAssetFormat = AnimatedMediaFormat | StaticMediaFormat;
export type MediaAssetRole =
  "poster" | "thumbnail" | "preview" | "animation" | "original";

export type AnimatedMediaPlaybackPolicy =
  | "never"
  | "on-hover"
  | "on-focus"
  | "on-intent"
  | "once"
  | "loop-while-active"
  | "always";

export type AnimatedMediaLoopPolicy = "once" | "loop";

export type AnimatedMediaState =
  | "idle"
  | "preparing"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "completed"
  | "error";

export type AnimationAutoplay = "hover" | "visible" | "always" | "never";

export interface AnimatedMediaConfig {
  /** Preferred beta.7 policy. Defaults to `on-intent`. */
  readonly playback?: AnimatedMediaPlaybackPolicy;
  /** @deprecated Use `playback`; retained for beta.6 compatibility. */
  readonly autoplay?: AnimationAutoplay;
  readonly maxActiveAnimations?: number;
  readonly playOnSelect?: boolean;
  readonly preloadMargin?: string;
  /** `system` follows prefers-reduced-motion. */
  readonly reducedMotion?: "system" | "reduce" | "no-preference";
}

export interface MediaAsset {
  readonly role: MediaAssetRole;
  readonly url: string;
  readonly format?: MediaAssetFormat;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface MediaItemAttribution {
  readonly label: string;
  readonly url?: string;
  readonly logoUrl?: string;
  readonly required?: boolean;
}

export interface MediaItemCapabilities {
  readonly animated?: boolean;
  readonly preview?: boolean;
  readonly textFallback?: boolean;
  readonly variants?: boolean;
}

export interface SearchableMediaMetadata {
  readonly aliases?: readonly string[];
  readonly keywords?: readonly string[];
  readonly localeKeywords?: Readonly<Record<string, readonly string[]>>;
}

/** Provider-neutral visual variant metadata for future custom-emoji pickers. */
export interface MediaItemVariant {
  readonly id: string;
  readonly name?: string;
  readonly fallbackEmoji?: string;
  readonly posterUrl?: string;
  readonly animationUrl?: string;
  readonly format?: MediaAssetFormat;
  readonly assets?: readonly MediaAsset[];
}

export interface ProviderMediaMetadata extends SearchableMediaMetadata {
  readonly animationDurationMs?: number;
  readonly assets?: readonly MediaAsset[];
  readonly attribution?: MediaItemAttribution;
  readonly capabilities?: MediaItemCapabilities;
  readonly packId?: string;
  readonly playbackPolicy?: AnimatedMediaPlaybackPolicy;
  readonly loopPolicy?: AnimatedMediaLoopPolicy;
  readonly variants?: readonly MediaItemVariant[];
}

/** Native Unicode emoji. `kind` is optional only for pre-0.2 compatibility. */
export interface UnicodeEmojiMediaItem extends SearchableMediaMetadata {
  readonly type: "emoji";
  readonly kind?: "unicode";
  readonly id: string;
  readonly value: string;
  readonly name: string;
  readonly category: string;
  readonly skinTone?: SkinTone;
}

/** Provider-backed animated emoji with a static fallback where available. */
export interface AnimatedEmojiMediaItem extends ProviderMediaMetadata {
  readonly type: "emoji";
  readonly kind: "animated";
  readonly id: string;
  readonly name: string;
  readonly thumbnailUrl?: string;
  readonly posterUrl?: string;
  readonly previewUrl?: string;
  readonly animationUrl: string;
  readonly originalUrl?: string;
  readonly format: AnimatedMediaFormat;
  readonly fallbackEmoji?: string;
  readonly fallbackText?: string;
  readonly width?: number;
  readonly height?: number;
  readonly provider?: string;
  readonly alt?: string;
}

/** Tenant/workspace supplied emoji. */
export interface CustomEmojiMediaItem extends ProviderMediaMetadata {
  readonly type: "emoji";
  readonly kind: "custom";
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly animated?: boolean;
  readonly animationUrl?: string;
  readonly format?: MediaAssetFormat;
  readonly thumbnailUrl?: string;
  readonly posterUrl?: string;
  readonly previewUrl?: string;
  readonly originalUrl?: string;
  readonly fallbackEmoji?: string;
  readonly fallbackText?: string;
  readonly provider?: string;
  readonly width?: number;
  readonly height?: number;
  readonly alt?: string;
}

/** Backwards-compatible name for native Unicode selections. */
export type EmojiMediaItem = UnicodeEmojiMediaItem;
export type AnyEmojiMediaItem =
  UnicodeEmojiMediaItem | AnimatedEmojiMediaItem | CustomEmojiMediaItem;

/** A standardized GIF selection independent of its provider payload. */
export interface GifMediaItem extends ProviderMediaMetadata {
  readonly type: "gif";
  readonly id: string;
  readonly name?: string;
  readonly provider: string;
  readonly url: string;
  /** Optional static poster used before an animated preview is activated. */
  readonly thumbnailUrl?: string;
  readonly posterUrl?: string;
  /** Optimized grid preview. It may itself be animated. */
  readonly previewUrl: string;
  readonly originalUrl?: string;
  readonly width?: number;
  readonly height?: number;
  readonly alt?: string;
}

/** A standardized static or animated sticker selection. */
export interface StickerMediaItem extends ProviderMediaMetadata {
  readonly type: "sticker";
  readonly id: string;
  readonly name?: string;
  readonly provider?: string;
  readonly packId?: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly posterUrl?: string;
  readonly previewUrl?: string;
  readonly originalUrl?: string;
  readonly animated: boolean;
  readonly format?: MediaAssetFormat;
  readonly width?: number;
  readonly height?: number;
  readonly alt?: string;
}

/** A host-defined normalized item from a custom media tab/provider. */
export interface CustomMediaItem extends ProviderMediaMetadata {
  readonly type: "custom";
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly posterUrl?: string;
  readonly previewUrl?: string;
  readonly originalUrl?: string;
  readonly provider?: string;
  readonly alt?: string;
  readonly animated?: boolean;
  readonly format?: MediaAssetFormat;
  readonly width?: number;
  readonly height?: number;
}

/** Every picker feature emits one of these normalized media items. */
export type MediaItem =
  AnyEmojiMediaItem | GifMediaItem | StickerMediaItem | CustomMediaItem;

export function isUnicodeEmoji(item: MediaItem): item is UnicodeEmojiMediaItem {
  return (
    item.type === "emoji" &&
    (item.kind === undefined || item.kind === "unicode") &&
    "value" in item
  );
}

export function isAnimatedMedia(
  item: MediaItem,
): item is
  | AnimatedEmojiMediaItem
  | (CustomEmojiMediaItem & { readonly animated: true })
  | GifMediaItem
  | (StickerMediaItem & { readonly animated: true })
  | (CustomMediaItem & { readonly animated: true }) {
  return (
    item.type === "gif" ||
    (item.type === "emoji" && item.kind === "animated") ||
    (item.type === "emoji" &&
      item.kind === "custom" &&
      item.animated === true) ||
    (item.type === "sticker" && item.animated) ||
    (item.type === "custom" && item.animated === true)
  );
}

/** Stable identity across providers and media kinds; safe for collections. */
export function mediaItemKey(item: MediaItem): string {
  const provider = "provider" in item ? (item.provider ?? "local") : "local";
  const kind = "kind" in item ? (item.kind ?? "unicode") : item.type;
  return `${item.type}:${kind}:${provider}:${item.id}`;
}

/**
 * Removes discovery/catalog metadata before local persistence while preserving
 * stable identity, display fallbacks, and direct renderable asset roles.
 */
export function toPersistedMediaItem(item: MediaItem): MediaItem {
  const source = item as MediaItem & Partial<ProviderMediaMetadata>;
  const {
    aliases: _aliases,
    assets: _assets,
    attribution: _attribution,
    capabilities: _capabilities,
    keywords: _keywords,
    localeKeywords: _localeKeywords,
    variants: _variants,
    ...snapshot
  } = source;
  void _aliases;
  void _assets;
  void _attribution;
  void _capabilities;
  void _keywords;
  void _localeKeywords;
  void _variants;
  return snapshot;
}

export interface ResolvedMediaItemAssets {
  readonly animationUrl?: string;
  readonly fallbackText: string;
  readonly format?: MediaAssetFormat;
  readonly originalUrl?: string;
  readonly posterUrls: readonly string[];
}

/** Resolves modern role metadata and beta.6 URL fields without loading assets. */
export function resolveMediaItemAssets(
  item: MediaItem,
): ResolvedMediaItemAssets {
  const role = (name: MediaAssetRole) =>
    "assets" in item
      ? item.assets?.find((asset) => asset.role === name)
      : undefined;
  const posterUrls = uniqueStrings([
    role("poster")?.url,
    "posterUrl" in item ? item.posterUrl : undefined,
    role("thumbnail")?.url,
    "thumbnailUrl" in item ? item.thumbnailUrl : undefined,
    role("preview")?.url,
    "previewUrl" in item ? item.previewUrl : undefined,
  ]);
  const animationAsset = role("animation");
  const originalAsset = role("original");
  const animationUrl =
    animationAsset?.url ??
    (item.type === "emoji"
      ? item.kind === "animated"
        ? item.animationUrl
        : item.kind === "custom" && item.animated === true
          ? (item.animationUrl ?? item.url)
          : undefined
      : item.type === "gif"
        ? item.previewUrl
        : item.animated === true
          ? item.url
          : undefined);
  const originalUrl =
    originalAsset?.url ??
    ("originalUrl" in item ? item.originalUrl : undefined) ??
    ("url" in item ? item.url : undefined) ??
    animationUrl;
  const declaredFormat =
    animationAsset?.format ?? ("format" in item ? item.format : undefined);
  const format =
    declaredFormat ??
    (animationUrl === undefined
      ? undefined
      : detectMediaAssetFormat(animationUrl));
  return {
    ...(animationUrl === undefined ? {} : { animationUrl }),
    fallbackText: isUnicodeEmoji(item)
      ? item.value
      : item.type === "emoji"
        ? (item.fallbackEmoji ?? item.fallbackText ?? item.name)
        : (item.alt ?? item.name ?? item.type),
    ...(format === undefined ? {} : { format }),
    ...(originalUrl === undefined ? {} : { originalUrl }),
    posterUrls,
  };
}

/** Detects browser-native formats from a MIME type or URL extension. */
export function detectMediaAssetFormat(
  url: string,
  mimeType?: string,
): MediaAssetFormat | undefined {
  const normalizedMime = mimeType?.split(";", 1)[0]?.trim().toLowerCase();
  const mimeFormats: Readonly<Record<string, MediaAssetFormat>> = {
    "application/json": "lottie",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "video/webm": "webm",
  };
  if (normalizedMime !== undefined && mimeFormats[normalizedMime] !== undefined)
    return mimeFormats[normalizedMime];
  const pathname = url.split(/[?#]/u, 1)[0]?.toLowerCase() ?? "";
  if (pathname.endsWith(".json")) return "lottie";
  if (pathname.endsWith(".webm")) return "webm";
  if (pathname.endsWith(".webp")) return "webp";
  if (pathname.endsWith(".gif")) return "gif";
  if (pathname.endsWith(".avif")) return "avif";
  if (pathname.endsWith(".png")) return "png";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "jpeg";
  return undefined;
}

/** Local metadata search used for inline packs and future composer indexing. */
export function matchesMediaItemSearch(
  item: MediaItem,
  query: string,
  locale?: string,
): boolean {
  const terms = normalizeSearchQuery(query);
  if (terms.length === 0) return true;
  const localeTerms =
    locale === undefined || !("localeKeywords" in item)
      ? []
      : (item.localeKeywords?.[locale] ?? []);
  const searchable = normalizeSearchQuery(
    [
      "name" in item ? item.name : undefined,
      "value" in item ? item.value : undefined,
      ...("aliases" in item ? (item.aliases ?? []) : []),
      ...("keywords" in item ? (item.keywords ?? []) : []),
      ...localeTerms,
    ]
      .filter((value): value is string => value !== undefined)
      .join(" "),
  );
  return terms.every((term) => searchable.includes(term));
}

/** Runtime guard for values restored from consumer-controlled storage. */
export function isMediaItem(value: unknown): value is MediaItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Readonly<Record<string, unknown>>;
  if (!isNonEmptyString(item.id) || !hasValidOptionalDimensions(item))
    return false;
  if (item.type === "emoji") {
    if (item.kind === "animated") {
      return (
        isNonEmptyString(item.name) &&
        isNonEmptyString(item.animationUrl) &&
        isAnimatedFormat(item.format) &&
        hasProviderMediaMetadata(item) &&
        hasOptionalString(item.thumbnailUrl) &&
        hasOptionalString(item.posterUrl) &&
        hasOptionalString(item.previewUrl) &&
        hasOptionalString(item.originalUrl) &&
        hasOptionalString(item.provider) &&
        hasOptionalString(item.alt) &&
        hasOptionalString(item.fallbackEmoji) &&
        hasOptionalString(item.fallbackText)
      );
    }
    if (item.kind === "custom") {
      return (
        isNonEmptyString(item.name) &&
        isNonEmptyString(item.url) &&
        hasProviderMediaMetadata(item) &&
        (item.animated === undefined || typeof item.animated === "boolean") &&
        hasOptionalString(item.animationUrl) &&
        (item.format === undefined || isMediaFormat(item.format)) &&
        hasOptionalString(item.thumbnailUrl) &&
        hasOptionalString(item.posterUrl) &&
        hasOptionalString(item.previewUrl) &&
        hasOptionalString(item.originalUrl) &&
        hasOptionalString(item.provider) &&
        hasOptionalString(item.alt) &&
        hasOptionalString(item.fallbackText) &&
        hasOptionalString(item.fallbackEmoji)
      );
    }
    return (
      (item.kind === undefined || item.kind === "unicode") &&
      isNonEmptyString(item.value) &&
      isNonEmptyString(item.name) &&
      isNonEmptyString(item.category)
    );
  }
  if (item.type === "gif") {
    return (
      isNonEmptyString(item.provider) &&
      isNonEmptyString(item.url) &&
      isNonEmptyString(item.previewUrl) &&
      hasProviderMediaMetadata(item) &&
      hasOptionalString(item.thumbnailUrl) &&
      hasOptionalString(item.posterUrl) &&
      hasOptionalString(item.originalUrl) &&
      hasOptionalString(item.name) &&
      hasOptionalString(item.alt)
    );
  }
  if (item.type === "sticker") {
    return (
      isNonEmptyString(item.url) &&
      typeof item.animated === "boolean" &&
      hasProviderMediaMetadata(item) &&
      hasOptionalString(item.thumbnailUrl) &&
      hasOptionalString(item.posterUrl) &&
      hasOptionalString(item.previewUrl) &&
      hasOptionalString(item.originalUrl) &&
      hasOptionalString(item.provider) &&
      hasOptionalString(item.packId) &&
      hasOptionalString(item.name) &&
      hasOptionalString(item.alt) &&
      (item.format === undefined || isMediaFormat(item.format))
    );
  }
  return (
    item.type === "custom" &&
    isNonEmptyString(item.kind) &&
    isNonEmptyString(item.name) &&
    isNonEmptyString(item.url) &&
    hasProviderMediaMetadata(item) &&
    hasOptionalString(item.thumbnailUrl) &&
    hasOptionalString(item.posterUrl) &&
    hasOptionalString(item.previewUrl) &&
    hasOptionalString(item.originalUrl) &&
    hasOptionalString(item.provider) &&
    hasOptionalString(item.alt) &&
    (item.animated === undefined || typeof item.animated === "boolean") &&
    (item.format === undefined || isMediaFormat(item.format))
  );
}

function hasOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function hasProviderMediaMetadata(
  item: Readonly<Record<string, unknown>>,
): boolean {
  return (
    optionalStringArray(item.aliases) &&
    (item.animationDurationMs === undefined ||
      (typeof item.animationDurationMs === "number" &&
        Number.isFinite(item.animationDurationMs) &&
        item.animationDurationMs > 0)) &&
    optionalStringArray(item.keywords) &&
    optionalLocaleKeywords(item.localeKeywords) &&
    hasOptionalString(item.packId) &&
    (item.playbackPolicy === undefined ||
      isPlaybackPolicy(item.playbackPolicy)) &&
    (item.loopPolicy === undefined ||
      item.loopPolicy === "once" ||
      item.loopPolicy === "loop") &&
    (item.variants === undefined ||
      (Array.isArray(item.variants) &&
        item.variants.every(isMediaItemVariant))) &&
    (item.assets === undefined ||
      (Array.isArray(item.assets) && item.assets.every(isMediaAsset))) &&
    (item.attribution === undefined || isAttribution(item.attribution)) &&
    (item.capabilities === undefined || isCapabilities(item.capabilities))
  );
}

function isMediaItemVariant(value: unknown): value is MediaItemVariant {
  if (typeof value !== "object" || value === null) return false;
  const variant = value as Readonly<Record<string, unknown>>;
  return (
    isNonEmptyString(variant.id) &&
    hasOptionalString(variant.name) &&
    hasOptionalString(variant.fallbackEmoji) &&
    hasOptionalString(variant.posterUrl) &&
    hasOptionalString(variant.animationUrl) &&
    (variant.format === undefined || isMediaFormat(variant.format)) &&
    (variant.assets === undefined ||
      (Array.isArray(variant.assets) && variant.assets.every(isMediaAsset)))
  );
}

function optionalStringArray(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((item) => isNonEmptyString(item)))
  );
}

function optionalLocaleKeywords(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "object" &&
      value !== null &&
      Object.values(value).every(optionalStringArray))
  );
}

function isMediaAsset(value: unknown): value is MediaAsset {
  if (typeof value !== "object" || value === null) return false;
  const asset = value as Readonly<Record<string, unknown>>;
  return (
    isAssetRole(asset.role) &&
    isNonEmptyString(asset.url) &&
    (asset.format === undefined || isMediaFormat(asset.format)) &&
    hasOptionalString(asset.mimeType) &&
    validDimension(asset.width) &&
    validDimension(asset.height)
  );
}

function isAssetRole(value: unknown): value is MediaAssetRole {
  return (
    value === "poster" ||
    value === "thumbnail" ||
    value === "preview" ||
    value === "animation" ||
    value === "original"
  );
}

function isAttribution(value: unknown): value is MediaItemAttribution {
  if (typeof value !== "object" || value === null) return false;
  const attribution = value as Readonly<Record<string, unknown>>;
  return (
    isNonEmptyString(attribution.label) &&
    hasOptionalString(attribution.url) &&
    hasOptionalString(attribution.logoUrl) &&
    (attribution.required === undefined ||
      typeof attribution.required === "boolean")
  );
}

function isCapabilities(value: unknown): value is MediaItemCapabilities {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every(
    (capability) => capability === undefined || typeof capability === "boolean",
  );
}

function isPlaybackPolicy(
  value: unknown,
): value is AnimatedMediaPlaybackPolicy {
  return (
    value === "never" ||
    value === "on-hover" ||
    value === "on-focus" ||
    value === "on-intent" ||
    value === "once" ||
    value === "loop-while-active" ||
    value === "always"
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValidOptionalDimensions(
  item: Readonly<Record<string, unknown>>,
): boolean {
  return validDimension(item.width) && validDimension(item.height);
}

function validDimension(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isFinite(value) && value > 0)
  );
}

function isMediaFormat(value: unknown): boolean {
  return (
    isAnimatedFormat(value) ||
    value === "png" ||
    value === "jpeg" ||
    value === "avif"
  );
}

function isAnimatedFormat(value: unknown): value is AnimatedMediaFormat {
  return (
    value === "lottie" ||
    value === "webm" ||
    value === "webp" ||
    value === "gif"
  );
}

function uniqueStrings(
  values: readonly (string | undefined)[],
): readonly string[] {
  return [
    ...new Set(values.filter((value): value is string => value !== undefined)),
  ];
}

function normalizeSearchQuery(value: string): readonly string[] {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}_+-]+/u)
    .filter(Boolean);
}
