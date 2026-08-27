import "./styles.css";

export { MediaPicker, mediaPickerStorageKeys } from "./components/MediaPicker";
export type { MediaPickerProps } from "./components/MediaPicker";

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
  PickerDisplayMode,
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
