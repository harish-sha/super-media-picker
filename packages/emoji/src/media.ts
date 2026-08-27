import type { EmojiMediaItem } from "@company/media-core";

import type { SkinTone } from "@company/media-core";

import type { EmojiRecord } from "./types";
import { resolveEmojiVariant } from "./variants";

/** Converts internal emoji metadata into the SDK-wide selection contract. */
export function toEmojiMediaItem(
  emoji: EmojiRecord,
  skinTone: SkinTone = "default",
): EmojiMediaItem {
  const resolved = resolveEmojiVariant(emoji, skinTone);
  const base = {
    type: "emoji",
    id: resolved.id,
    value: resolved.value,
    name: resolved.name,
    category: emoji.category,
  } as const;
  return resolved.skinTone === undefined
    ? base
    : { ...base, skinTone: resolved.skinTone };
}
