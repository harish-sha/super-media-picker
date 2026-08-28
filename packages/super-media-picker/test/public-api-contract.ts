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
  MockGifProvider,
  MockStickerProvider,
  StickerProvider,
} from "../src/index";

/** Compile-time proof of the intentionally supported public consumer surface. */
export interface PublicApiContract {
  readonly MediaPicker: typeof MediaPicker;
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
