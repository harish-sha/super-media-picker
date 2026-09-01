export { emojiData } from "./data/emoji-data.generated";
export { toEmojiMediaItem } from "./media";
export {
  getEmojiByCategory,
  getEmojiById,
  normalizeEmojiSearch,
  searchEmoji,
  supportsUnicodeVersion,
} from "./search";
export type { EmojiSearchOptions } from "./search";
export { DEFAULT_MAX_UNICODE_VERSION, emojiCategories } from "./types";
export { resolveEmojiVariant, supportsSkinTone } from "./variants";
export type {
  EmojiCategory,
  EmojiPickerCategory,
  EmojiRecord,
  EmojiVariant,
  ResolvedEmojiVariant,
} from "./types";
