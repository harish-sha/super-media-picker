import type { MediaItem, SkinTone } from "@super-media-picker/core";
import {
  getCompactEmoji,
  toEmojiMediaItem,
  type EmojiRecord,
} from "@super-media-picker/emoji/compact";

const defaultReactionIds = [
  "1f44d",
  "2764",
  "1f602",
  "1f62e",
  "1f622",
  "1f64f",
] as const;

export const defaultCompactReactions: readonly MediaItem[] =
  defaultReactionIds.flatMap((id) => {
    const emoji = getCompactEmoji(id);
    return emoji === undefined ? [] : [toEmojiMediaItem(emoji)];
  });

export function findKnownCompactEmoji(
  item: MediaItem,
): EmojiRecord | undefined {
  return item.type === "emoji"
    ? (getCompactEmoji(item.id) ?? getCompactEmoji(item.value))
    : undefined;
}

export function findKnownCompactReaction(
  input: string | MediaItem,
): MediaItem | undefined {
  if (typeof input !== "string") return input;
  const emoji = getCompactEmoji(input);
  return emoji === undefined ? undefined : toEmojiMediaItem(emoji);
}

export function applyCompactSkinTone(
  item: MediaItem,
  skinTone: SkinTone,
): MediaItem {
  if (item.type !== "emoji") return item;
  const emoji = findKnownCompactEmoji(item);
  return emoji === undefined ? item : toEmojiMediaItem(emoji, skinTone);
}

export function compactItemKey(item: MediaItem): string {
  return `${item.type}:${item.id}`;
}
