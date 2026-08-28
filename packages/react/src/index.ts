import "./styles.css";

export { MediaPicker, mediaPickerStorageKeys } from "./components/MediaPicker";
export type {
  CompactMediaPickerConfig,
  CompactReactionInput,
  MediaPickerPreviewConfig,
  MediaPickerProps,
} from "./types";

export {
  FavoritesManager,
  LocalStorageAdapter,
  MemoryStorageAdapter,
  PersistentPreference,
  RecentItemsManager,
  createMediaPickerConfig,
} from "@company/media-core";
export type {
  EmojiMediaItem,
  MediaCapabilities,
  MediaItem,
  MediaPickerFeatures,
  MediaPickerMode,
  MediaPickerSize,
  PickerDisplayMode,
  CompactReactionSource,
  RecentItemRecord,
  SkinTone,
  StorageAdapter,
} from "@company/media-core";
export type {
  MediaPickerCustomTheme,
  MediaPickerTheme,
  MediaPickerThemeMode,
  MediaPickerThemeTokens,
} from "@company/media-themes";
