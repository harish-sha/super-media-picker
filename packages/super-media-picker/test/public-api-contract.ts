import type {
  AnimatedEmojiMediaItem,
  CustomMediaTab,
  GifProvider,
  CompactReactionSource,
  MediaCapabilities,
  MediaItem,
  MediaPickerFeatures,
  MediaPickerMode,
  MediaPickerProps,
  MediaPickerSize,
  MediaPickerThemeMode,
  PickerDisplayMode,
  StorageAdapter,
  MediaPicker,
  EmojiPicker,
  GifPicker,
  StickerPicker,
  ReactionPicker,
  useMediaPicker,
  useEmojiSearch,
  useGifSearch,
  useStickerSearch,
  useRecents,
  useFavorites,
  MockGifProvider,
  MockStickerProvider,
  StickerProvider,
} from "../src/index";

/** Compile-time proof of the intentionally supported public consumer surface. */
export interface PublicApiContract {
  readonly MediaPicker: typeof MediaPicker;
  readonly EmojiPicker: typeof EmojiPicker;
  readonly GifPicker: typeof GifPicker;
  readonly StickerPicker: typeof StickerPicker;
  readonly ReactionPicker: typeof ReactionPicker;
  readonly useMediaPicker: typeof useMediaPicker;
  readonly useEmojiSearch: typeof useEmojiSearch;
  readonly useGifSearch: typeof useGifSearch;
  readonly useStickerSearch: typeof useStickerSearch;
  readonly useRecents: typeof useRecents;
  readonly useFavorites: typeof useFavorites;
  readonly props: MediaPickerProps;
  readonly item: MediaItem;
  readonly reactionSource: CompactReactionSource;
  readonly features: MediaPickerFeatures;
  readonly mode: MediaPickerMode;
  readonly size: MediaPickerSize;
  readonly themeMode: MediaPickerThemeMode;
  readonly displayMode: PickerDisplayMode;
  readonly capabilities: MediaCapabilities;
  readonly storage: StorageAdapter;
  readonly animatedEmoji: AnimatedEmojiMediaItem;
  readonly gifProvider: GifProvider;
  readonly stickerProvider: StickerProvider;
  readonly customTab: CustomMediaTab;
  readonly MockGifProvider: typeof MockGifProvider;
  readonly MockStickerProvider: typeof MockStickerProvider;
}
