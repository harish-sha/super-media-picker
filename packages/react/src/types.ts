import type {
  AnimatedMediaConfig,
  AnimatedMediaFormat,
  CompactReactionSource,
  CustomMediaProvider,
  CustomMediaItem,
  EmojiPack,
  GifMediaItem,
  EmojiProvider,
  MediaCapabilities,
  MediaItem,
  MediaPickerAnalytics,
  MediaUrlPolicy,
  MediaProvider,
  ProviderRegistration,
  MediaPickerFeatures,
  MediaPickerMode,
  MediaPickerSize,
  PickerDisplayMode,
  SkinTone,
  StickerProvider,
  StorageAdapter,
} from "@super-media-picker/core";
import type { EmojiPickerCategory } from "@super-media-picker/emoji";
import type { MediaPickerTheme } from "@super-media-picker/themes";
import type { ReactNode } from "react";

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

export interface MediaPickerProviders {
  readonly gifs?: MediaProvider<GifMediaItem>;
  readonly stickers?: StickerProvider;
  /** Existing general emoji-provider registration retained for beta compatibility. */
  readonly emoji?: readonly EmojiProvider[];
  /** Additive BYO registration for remote animated/custom emoji packs. */
  readonly animatedEmoji?: ProviderRegistration<EmojiProvider>;
  /** Additive BYO registration for tenant/enterprise custom media sources. */
  readonly custom?: ProviderRegistration<CustomMediaProvider>;
}

export interface CustomMediaTab {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly provider: MediaProvider<CustomMediaItem>;
}

export interface AnimatedMediaRenderProps {
  readonly active: boolean;
  readonly animationUrl: string;
  readonly format: AnimatedMediaFormat;
  readonly label: string;
  readonly previewUrl?: string;
}

export interface MediaPickerRenderers {
  /** Lottie requires a host adapter; native WebM/WebP/GIF need no decoder. */
  readonly lottie?: (props: AnimatedMediaRenderProps) => ReactNode;
  readonly custom?: (item: CustomMediaItem) => ReactNode;
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
  readonly capabilities?: Partial<MediaCapabilities>;
  readonly providers?: MediaPickerProviders;
  readonly emojiPacks?: readonly EmojiPack[];
  readonly customTabs?: readonly CustomMediaTab[];
  readonly renderers?: MediaPickerRenderers;
  readonly animatedMedia?: AnimatedMediaConfig;
  /** Optional host-owned analytics sink. The SDK never sends events itself. */
  readonly analytics?: MediaPickerAnalytics;
  /** Optional allowlist/policy applied before media URLs are rendered. */
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly onSelect: (item: MediaItem) => void;
  readonly onClose?: () => void;
  readonly storage?: StorageAdapter;
  readonly theme?: MediaPickerTheme;
  readonly displayMode?: PickerDisplayMode;
  readonly defaultCategory?: EmojiPickerCategory;
  readonly defaultMediaType?: "emoji" | "gif" | "stickers" | "custom";
  readonly defaultSearchQuery?: string;
  readonly defaultSkinTone?: SkinTone;
  /** Highest native Unicode emoji version shown; defaults to 15 for compatibility. */
  readonly maxUnicodeVersion?: number;
  readonly className?: string;
  readonly ariaLabel?: string;
}
