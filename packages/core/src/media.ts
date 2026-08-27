/** A standardized emoji selection. */
export interface EmojiMediaItem {
  readonly type: "emoji";
  readonly id: string;
  readonly value: string;
  readonly name: string;
  readonly category: string;
  readonly skinTone?: SkinTone;
}

/** A standardized GIF selection independent of its provider payload. */
export interface GifMediaItem {
  readonly type: "gif";
  readonly id: string;
  readonly provider: string;
  readonly url: string;
  readonly previewUrl: string;
  readonly width?: number;
  readonly height?: number;
  readonly alt?: string;
}

/** A standardized sticker selection. */
export interface StickerMediaItem {
  readonly type: "sticker";
  readonly id: string;
  readonly provider?: string;
  readonly packId?: string;
  readonly url: string;
  readonly previewUrl?: string;
  readonly animated: boolean;
  readonly alt?: string;
}

/** A tenant-defined emoji or future custom media selection. */
export interface CustomMediaItem {
  readonly type: "custom";
  readonly id: string;
  readonly kind: "emoji" | "sticker";
  readonly name: string;
  readonly url: string;
  readonly previewUrl?: string;
}

export type SkinTone =
  "default" | "light" | "medium-light" | "medium" | "medium-dark" | "dark";

/** Every picker feature emits one of these normalized media items. */
export type MediaItem =
  EmojiMediaItem | GifMediaItem | StickerMediaItem | CustomMediaItem;
