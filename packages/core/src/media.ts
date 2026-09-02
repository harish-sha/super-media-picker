export type SkinTone =
  "default" | "light" | "medium-light" | "medium" | "medium-dark" | "dark";

export type AnimatedMediaFormat = "lottie" | "webm" | "webp" | "gif";

export type AnimationAutoplay = "hover" | "visible" | "always" | "never";

export interface AnimatedMediaConfig {
  readonly autoplay?: AnimationAutoplay;
  readonly maxActiveAnimations?: number;
}

/** Native Unicode emoji. `kind` is optional only for pre-0.2 compatibility. */
export interface UnicodeEmojiMediaItem {
  readonly type: "emoji";
  readonly kind?: "unicode";
  readonly id: string;
  readonly value: string;
  readonly name: string;
  readonly category: string;
  readonly skinTone?: SkinTone;
}

/** Provider-backed animated emoji with a static fallback where available. */
export interface AnimatedEmojiMediaItem {
  readonly type: "emoji";
  readonly kind: "animated";
  readonly id: string;
  readonly name: string;
  readonly thumbnailUrl?: string;
  readonly previewUrl?: string;
  readonly animationUrl: string;
  readonly format: AnimatedMediaFormat;
  readonly fallbackEmoji?: string;
  readonly width?: number;
  readonly height?: number;
  readonly provider?: string;
  readonly alt?: string;
}

/** Tenant/workspace supplied emoji. */
export interface CustomEmojiMediaItem {
  readonly type: "emoji";
  readonly kind: "custom";
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly previewUrl?: string;
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
export interface GifMediaItem {
  readonly type: "gif";
  readonly id: string;
  readonly name?: string;
  readonly provider: string;
  readonly url: string;
  /** Optional static poster used before an animated preview is activated. */
  readonly thumbnailUrl?: string;
  /** Optimized grid preview. It may itself be animated. */
  readonly previewUrl: string;
  readonly width?: number;
  readonly height?: number;
  readonly alt?: string;
}

/** A standardized static or animated sticker selection. */
export interface StickerMediaItem {
  readonly type: "sticker";
  readonly id: string;
  readonly name?: string;
  readonly provider?: string;
  readonly packId?: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly previewUrl?: string;
  readonly animated: boolean;
  readonly format?: AnimatedMediaFormat | "png" | "jpeg";
  readonly width?: number;
  readonly height?: number;
  readonly alt?: string;
}

/** A host-defined normalized item from a custom media tab/provider. */
export interface CustomMediaItem {
  readonly type: "custom";
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly previewUrl?: string;
  readonly provider?: string;
  readonly alt?: string;
  readonly animated?: boolean;
  readonly format?: AnimatedMediaFormat | "png" | "jpeg";
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
  | GifMediaItem
  | (StickerMediaItem & { readonly animated: true })
  | (CustomMediaItem & { readonly animated: true }) {
  return (
    item.type === "gif" ||
    (item.type === "emoji" && item.kind === "animated") ||
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
        hasOptionalString(item.thumbnailUrl) &&
        hasOptionalString(item.previewUrl) &&
        hasOptionalString(item.provider) &&
        hasOptionalString(item.alt) &&
        hasOptionalString(item.fallbackEmoji)
      );
    }
    if (item.kind === "custom") {
      return (
        isNonEmptyString(item.name) &&
        isNonEmptyString(item.url) &&
        hasOptionalString(item.thumbnailUrl) &&
        hasOptionalString(item.previewUrl) &&
        hasOptionalString(item.provider) &&
        hasOptionalString(item.alt) &&
        hasOptionalString(item.fallbackText)
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
      hasOptionalString(item.thumbnailUrl) &&
      hasOptionalString(item.name) &&
      hasOptionalString(item.alt)
    );
  }
  if (item.type === "sticker") {
    return (
      isNonEmptyString(item.url) &&
      typeof item.animated === "boolean" &&
      hasOptionalString(item.thumbnailUrl) &&
      hasOptionalString(item.previewUrl) &&
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
    hasOptionalString(item.thumbnailUrl) &&
    hasOptionalString(item.previewUrl) &&
    hasOptionalString(item.provider) &&
    hasOptionalString(item.alt) &&
    (item.animated === undefined || typeof item.animated === "boolean") &&
    (item.format === undefined || isMediaFormat(item.format))
  );
}

function hasOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
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
  return isAnimatedFormat(value) || value === "png" || value === "jpeg";
}

function isAnimatedFormat(value: unknown): value is AnimatedMediaFormat {
  return (
    value === "lottie" ||
    value === "webm" ||
    value === "webp" ||
    value === "gif"
  );
}
