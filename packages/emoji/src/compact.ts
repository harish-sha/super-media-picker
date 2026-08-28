import { compactEmojiData } from "./data/compact-emoji-data.generated";
import { toEmojiMediaItem } from "./media";
import type { EmojiRecord } from "./types";
import { resolveEmojiVariant, supportsSkinTone } from "./variants";

const compactEmojiById = new Map(
  compactEmojiData.map((emoji) => [emoji.id, emoji]),
);
const compactEmojiByValue = new Map(
  compactEmojiData.map((emoji) => [emoji.value, emoji]),
);
const compactEmojiByNormalizedValue = new Map(
  compactEmojiData.map((emoji) => [
    normalizeEmojiPresentation(emoji.value),
    emoji,
  ]),
);
const compactEmojiByVariant = new Map(
  compactEmojiData.flatMap((emoji) =>
    emoji.variants.flatMap((variant) => [
      [variant.id, emoji] as const,
      [variant.value, emoji] as const,
      [normalizeEmojiPresentation(variant.value), emoji] as const,
    ]),
  ),
);

function normalizeEmojiPresentation(value: string): string {
  return value.replaceAll(/[\uFE0E\uFE0F]/gu, "");
}

export {
  compactEmojiData,
  resolveEmojiVariant,
  supportsSkinTone,
  toEmojiMediaItem,
};
export type { EmojiRecord };

/** Finds an emoji in the generated lightweight reaction subset. */
export function getCompactEmoji(idOrValue: string): EmojiRecord | undefined {
  return (
    compactEmojiById.get(idOrValue) ??
    compactEmojiByValue.get(idOrValue) ??
    compactEmojiByVariant.get(idOrValue) ??
    compactEmojiByNormalizedValue.get(normalizeEmojiPresentation(idOrValue))
  );
}
