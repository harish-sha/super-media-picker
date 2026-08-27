export const emojiCategories = [
  "Smileys & Emotion",
  "People & Body",
  "Animals & Nature",
  "Food & Drink",
  "Activities",
  "Travel & Places",
  "Objects",
  "Symbols",
  "Flags",
] as const;

export type EmojiCategory = (typeof emojiCategories)[number];

export interface EmojiRecord {
  readonly id: string;
  readonly value: string;
  readonly name: string;
  readonly category: EmojiCategory;
  readonly aliases: readonly string[];
  readonly variants: readonly EmojiVariant[];
}

export interface EmojiVariant {
  readonly id: string;
  readonly value: string;
  readonly name: string;
  readonly kind: "skin-tone" | "presentation" | "related";
  readonly skinTone?: Exclude<SkinTone, "default">;
}

export interface ResolvedEmojiVariant {
  readonly id: string;
  readonly value: string;
  readonly name: string;
  readonly skinTone?: Exclude<SkinTone, "default">;
}

export type EmojiPickerCategory = "Recent" | "Favorites" | EmojiCategory;
import type { SkinTone } from "@company/media-core";
