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
  readonly previewUrl?: string;
  readonly animationUrl: string;
  readonly format: AnimatedMediaFormat;
  readonly fallbackEmoji?: string;
  readonly width?: number;
  readonly height?: number;
  readonly provider?: string;
}

/** Tenant/workspace supplied emoji. */
export interface CustomEmojiMediaItem {
  readonly type: "emoji";
  readonly kind: "custom";
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly previewUrl?: string;
  readonly fallbackText?: string;
  readonly provider?: string;
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
  readonly previewUrl?: string;
  readonly provider?: string;
  readonly alt?: string;
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
): item is AnimatedEmojiMediaItem | GifMediaItem | StickerMediaItem {
  return (
    item.type === "gif" ||
    (item.type === "emoji" && item.kind === "animated") ||
    (item.type === "sticker" && item.animated)
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
  if (typeof item.id !== "string" || item.id.length === 0) return false;
  if (item.type === "emoji") {
    if (item.kind === "animated") {
      return (
        typeof item.name === "string" &&
        typeof item.animationUrl === "string" &&
        isAnimatedFormat(item.format)
      );
    }
    if (item.kind === "custom") {
      return typeof item.name === "string" && typeof item.url === "string";
    }
    return (
      (item.kind === undefined || item.kind === "unicode") &&
      typeof item.value === "string" &&
      typeof item.name === "string" &&
      typeof item.category === "string"
    );
  }
  if (item.type === "gif") {
    return (
      typeof item.provider === "string" &&
      typeof item.url === "string" &&
      typeof item.previewUrl === "string" &&
      (item.thumbnailUrl === undefined || typeof item.thumbnailUrl === "string")
    );
  }
  if (item.type === "sticker") {
    return typeof item.url === "string" && typeof item.animated === "boolean";
  }
  return (
    item.type === "custom" &&
    typeof item.kind === "string" &&
    typeof item.name === "string" &&
    typeof item.url === "string"
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
