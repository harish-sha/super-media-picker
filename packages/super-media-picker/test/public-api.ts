import {
  EmojiPicker,
  GifPicker,
  MediaPicker,
  ReactionPicker,
  StickerPicker,
  detectMediaAssetFormat,
  isSafeMediaAsset,
  isUnicodeEmoji,
  matchesMediaItemSearch,
  resolveAnimatedMediaPlaybackPolicy,
  resolveMediaItemAssets,
  toPersistedMediaItem,
  type AnimatedMediaRendererAdapter,
  type MediaItemVariant,
  type MediaItem,
} from "../src/index";
import {
  useEmojiSearch,
  useFavorites,
  useGifSearch,
  useMediaPicker,
  useRecents,
  useStickerSearch,
} from "../src/headless";
import * as providers from "../src/providers";

declare const item: MediaItem;

void MediaPicker;
void EmojiPicker;
void GifPicker;
void StickerPicker;
void ReactionPicker;
void detectMediaAssetFormat;
void isSafeMediaAsset;
void matchesMediaItemSearch;
void resolveAnimatedMediaPlaybackPolicy;
void resolveMediaItemAssets;
void toPersistedMediaItem;
void useMediaPicker;
void useEmojiSearch;
void useGifSearch;
void useStickerSearch;
void useRecents;
void useFavorites;
void providers.HttpGifProvider;
void providers.HttpStickerProvider;
void providers.HttpEmojiProvider;
void providers.HttpCustomMediaProvider;
void providers.HttpProviderTransport;
declare const adapter: AnimatedMediaRendererAdapter;
declare const variant: MediaItemVariant;
void adapter;
void variant;
if (isUnicodeEmoji(item)) {
  item.value satisfies string;
}
