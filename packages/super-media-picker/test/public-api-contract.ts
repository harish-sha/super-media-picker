import type {
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
}
