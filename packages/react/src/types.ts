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
import type { ReactNode, RefObject } from "react";

export type CompactReactionInput = string | MediaItem;

export type MediaPickerCssDimension = number | string;
export type MediaPickerPlacement =
  | "auto"
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "right";
export type MediaPickerMotionPreset =
  | "none"
  | "fade"
  | "scale"
  | "pop"
  | "slide-up"
  | "slide-down"
  | "zoom"
  | "spring"
  | "genie";
export type MediaPickerSnap =
  "none" | "nearest-edge" | "left" | "right" | "top" | "bottom" | "corners";
export type MediaPickerResizeDirection = "right" | "bottom" | "bottom-right";
export type MediaPickerActiveGesture =
  "idle" | "pressing" | "dragging" | "resizing" | "swiping";

export interface MediaPickerPoint {
  readonly x: number;
  readonly y: number;
}

export interface MediaPickerResolvedDimensions {
  readonly width: number;
  readonly height: number;
}

export interface MediaPickerDimensions {
  readonly width?: MediaPickerCssDimension;
  readonly height?: MediaPickerCssDimension;
  readonly minWidth?: MediaPickerCssDimension;
  readonly maxWidth?: MediaPickerCssDimension;
  readonly minHeight?: MediaPickerCssDimension;
  readonly maxHeight?: MediaPickerCssDimension;
  /** Dimensions apply to full mode by default, preserving compact density. */
  readonly applyToCompact?: boolean;
}

export interface MediaPickerMotionConfig {
  readonly preset: MediaPickerMotionPreset;
  readonly duration?: number;
  readonly easing?: string;
}

export type MediaPickerMotion =
  MediaPickerMotionPreset | MediaPickerMotionConfig;

export interface MediaPickerDragEvent {
  readonly position: MediaPickerPoint;
  readonly pointerType: string;
  readonly velocity: MediaPickerPoint;
}

export interface MediaPickerResizeEvent {
  readonly dimensions: MediaPickerResolvedDimensions;
  readonly pointerType: string;
}

export interface MediaPickerDraggableConfig {
  readonly enabled?: boolean;
  readonly handle?: "header";
  readonly boundary?: "viewport";
  readonly snap?: MediaPickerSnap;
  readonly snapThreshold?: number;
  readonly position?: MediaPickerPoint;
  readonly defaultPosition?: MediaPickerPoint;
  readonly onPositionChange?: (position: MediaPickerPoint) => void;
  readonly onDragStart?: (event: MediaPickerDragEvent) => void;
  readonly onDrag?: (event: MediaPickerDragEvent) => void;
  readonly onDragEnd?: (event: MediaPickerDragEvent) => void;
}

export interface MediaPickerResizableConfig {
  readonly enabled?: boolean;
  readonly directions?: readonly MediaPickerResizeDirection[];
  readonly onDimensionsChange?: (
    dimensions: MediaPickerResolvedDimensions,
  ) => void;
  readonly onResizeStart?: (event: MediaPickerResizeEvent) => void;
  readonly onResize?: (event: MediaPickerResizeEvent) => void;
  readonly onResizeEnd?: (event: MediaPickerResizeEvent) => void;
}

export interface MediaPickerSwipeToDismissConfig {
  readonly enabled?: boolean;
  readonly distanceThreshold?: number;
  readonly velocityThreshold?: number;
}

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
  /** Full-surface geometry. Kept separate from the `size` density preset. */
  readonly dimensions?: MediaPickerDimensions;
  /** @deprecated Prefer `dimensions.width`. */
  readonly width?: number | string;
  /** @deprecated Prefer `dimensions.height`. */
  readonly height?: number | string;
  readonly placement?: MediaPickerPlacement;
  /** Anchor used by floating popovers and origin-aware motion. */
  readonly anchorRef?: RefObject<HTMLElement | null>;
  /** Portal floating/overlay modes to this node, or to document.body when true. */
  readonly portal?: boolean | HTMLElement;
  readonly draggable?: boolean | MediaPickerDraggableConfig;
  readonly resizable?: boolean | MediaPickerResizableConfig;
  readonly swipeToDismiss?: boolean | MediaPickerSwipeToDismissConfig;
  readonly motion?: MediaPickerMotion;
  readonly onResolvedPlacementChange?: (
    placement: Exclude<MediaPickerPlacement, "auto">,
  ) => void;
  readonly onInteractionChange?: (gesture: MediaPickerActiveGesture) => void;
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
