import type {
  CompactReactionSource,
  MediaItem,
  MediaPickerFeatures,
  MediaPickerMode,
  MediaPickerSize,
  PickerDisplayMode,
  SkinTone,
  StorageAdapter,
} from "@super-media-picker/core";
import type { EmojiPickerCategory } from "@super-media-picker/emoji";
import type { MediaPickerTheme } from "@super-media-picker/themes";

export type CompactReactionInput = string | MediaItem;

export interface CompactMediaPickerConfig {
  readonly source?: CompactReactionSource;
  readonly reactions?: readonly CompactReactionInput[];
  readonly maxVisibleItems?: number;
  readonly allowExpand?: boolean;
  readonly allowCollapse?: boolean;
}

export interface MediaPickerPreviewConfig {
  readonly enabled?: boolean;
}

export interface MediaPickerProps {
  readonly mode?: MediaPickerMode;
  readonly defaultMode?: MediaPickerMode;
  readonly onModeChange?: (mode: MediaPickerMode) => void;
  /** Convenience alias; `compact.allowExpand` takes precedence. */
  readonly allowExpand?: boolean;
  readonly compact?: CompactMediaPickerConfig;
  readonly size?: MediaPickerSize;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly preview?: MediaPickerPreviewConfig;
  readonly features?: Partial<MediaPickerFeatures>;
  readonly onSelect: (item: MediaItem) => void;
  readonly onClose?: () => void;
  readonly storage?: StorageAdapter;
  readonly theme?: MediaPickerTheme;
  readonly displayMode?: PickerDisplayMode;
  readonly defaultCategory?: EmojiPickerCategory;
  readonly defaultSearchQuery?: string;
  readonly defaultSkinTone?: SkinTone;
  readonly className?: string;
  readonly ariaLabel?: string;
}
