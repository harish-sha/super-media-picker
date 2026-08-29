import {
  EmojiPicker,
  GifPicker,
  MediaPicker,
  ReactionPicker,
  StickerPicker,
  isUnicodeEmoji,
  useEmojiSearch,
  useFavorites,
  useGifSearch,
  useMediaPicker,
  useRecents,
  useStickerSearch,
  type MediaItem,
} from "../src/index";
import * as headless from "../src/headless";
import * as providers from "../src/providers";

declare const item: MediaItem;

void MediaPicker;
void EmojiPicker;
void GifPicker;
void StickerPicker;
void ReactionPicker;
void useMediaPicker;
void useEmojiSearch;
void useGifSearch;
void useStickerSearch;
void useRecents;
void useFavorites;
void headless.useMediaPicker;
void providers.HttpGifProvider;
void providers.HttpStickerProvider;
if (isUnicodeEmoji(item)) {
  item.value satisfies string;
}
