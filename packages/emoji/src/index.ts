export { emojiData } from "./data/emoji-data.generated";
export { toEmojiMediaItem } from "./media";
export {
  getEmojiByCategory,
  getEmojiById,
  normalizeEmojiSearch,
  searchEmoji,
} from "./search";
export { emojiCategories } from "./types";
export { resolveEmojiVariant, supportsSkinTone } from "./variants";
export type {
  EmojiCategory,
  EmojiPickerCategory,
  EmojiRecord,
  EmojiVariant,
  ResolvedEmojiVariant,
} from "./types";
