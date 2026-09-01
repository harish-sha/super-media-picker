import type {
  AnyEmojiMediaItem,
  EmojiPack,
  EmojiProvider,
  GifMediaItem,
  MediaItem,
  MediaPickerFeatures,
  MediaProvider,
  StickerMediaItem,
  StickerProvider,
} from "@super-media-picker/core";

import type { CompactReactionInput, MediaPickerProps } from "../types";
import { MediaPicker } from "./MediaPicker";

type StandaloneCommonProps = Pick<
  MediaPickerProps,
  | "analytics"
  | "animatedMedia"
  | "ariaLabel"
  | "capabilities"
  | "className"
  | "displayMode"
  | "height"
  | "mediaSecurity"
  | "maxUnicodeVersion"
  | "onClose"
  | "preview"
  | "renderers"
  | "size"
  | "storage"
  | "theme"
  | "width"
>;

type CollectionFeatures = Partial<
  Pick<MediaPickerFeatures, "recents" | "favorites">
>;

export interface EmojiPickerProps extends StandaloneCommonProps {
  readonly onSelect: (item: AnyEmojiMediaItem) => void;
  readonly provider?: EmojiProvider | readonly EmojiProvider[];
  readonly emojiPacks?: readonly EmojiPack[];
  readonly features?: CollectionFeatures &
    Partial<Pick<MediaPickerFeatures, "animatedEmoji">>;
  readonly defaultCategory?: NonNullable<MediaPickerProps["defaultCategory"]>;
  readonly defaultSearchQuery?: string;
  readonly defaultSkinTone?: NonNullable<MediaPickerProps["defaultSkinTone"]>;
}

/** Focused emoji composition over the same full MediaPicker engine. */
export function EmojiPicker({
  onSelect,
  provider,
  emojiPacks,
  features,
  ...props
}: EmojiPickerProps) {
  const emojiProviders: readonly EmojiProvider[] | undefined =
    provider === undefined
      ? undefined
      : Array.isArray(provider)
        ? (provider as readonly EmojiProvider[])
        : [provider as EmojiProvider];
  return (
    <MediaPicker
      {...props}
      defaultMediaType="emoji"
      features={{
        emoji: true,
        animatedEmoji: features?.animatedEmoji ?? true,
        gifs: false,
        stickers: false,
        customMedia: false,
        recents: features?.recents ?? false,
        favorites: features?.favorites ?? false,
      }}
      onSelect={(item) => {
        if (item.type === "emoji") onSelect(item);
      }}
      {...(emojiPacks === undefined ? {} : { emojiPacks })}
      {...(emojiProviders === undefined
        ? {}
        : { providers: { emoji: emojiProviders } })}
    />
  );
}

export interface GifPickerProps extends StandaloneCommonProps {
  readonly provider: MediaProvider<GifMediaItem>;
  readonly onSelect: (item: GifMediaItem) => void;
  readonly features?: CollectionFeatures;
  readonly defaultSearchQuery?: string;
}

/** Focused GIF composition with the same provider panel and persistence. */
export function GifPicker({
  provider,
  onSelect,
  features,
  ...props
}: GifPickerProps) {
  return (
    <MediaPicker
      {...props}
      defaultMediaType="gif"
      features={{
        emoji: false,
        animatedEmoji: false,
        gifs: true,
        stickers: false,
        customMedia: false,
        recents: features?.recents ?? false,
        favorites: features?.favorites ?? false,
      }}
      onSelect={(item) => {
        if (item.type === "gif") onSelect(item);
      }}
      providers={{ gifs: provider }}
    />
  );
}

export interface StickerPickerProps extends StandaloneCommonProps {
  readonly provider: StickerProvider;
  readonly onSelect: (item: StickerMediaItem) => void;
  readonly features?: CollectionFeatures;
  readonly defaultSearchQuery?: string;
}

/** Focused sticker composition with shared pack, renderer, and collection logic. */
export function StickerPicker({
  provider,
  onSelect,
  features,
  ...props
}: StickerPickerProps) {
  return (
    <MediaPicker
      {...props}
      defaultMediaType="stickers"
      features={{
        emoji: false,
        animatedEmoji: false,
        gifs: false,
        stickers: true,
        customMedia: false,
        recents: features?.recents ?? false,
        favorites: features?.favorites ?? false,
      }}
      onSelect={(item) => {
        if (item.type === "sticker") onSelect(item);
      }}
      providers={{ stickers: provider }}
    />
  );
}

export interface ReactionPickerProps extends Pick<
  StandaloneCommonProps,
  | "analytics"
  | "animatedMedia"
  | "ariaLabel"
  | "className"
  | "displayMode"
  | "mediaSecurity"
  | "onClose"
  | "renderers"
  | "size"
  | "storage"
  | "theme"
  | "width"
> {
  readonly source?: NonNullable<MediaPickerProps["compact"]>["source"];
  readonly reactions?: readonly CompactReactionInput[];
  readonly maxVisibleItems?: number;
  readonly onSelect: (item: MediaItem) => void;
  readonly defaultSkinTone?: NonNullable<MediaPickerProps["defaultSkinTone"]>;
}

/** Lightweight reaction-only composition over the compact picker engine. */
export function ReactionPicker({
  source = "default",
  reactions,
  maxVisibleItems,
  onSelect,
  ...props
}: ReactionPickerProps) {
  return (
    <MediaPicker
      {...props}
      compact={{
        allowExpand: false,
        source,
        ...(reactions === undefined ? {} : { reactions }),
        ...(maxVisibleItems === undefined ? {} : { maxVisibleItems }),
      }}
      features={{
        emoji: true,
        animatedEmoji: true,
        gifs: false,
        stickers: false,
        customMedia: false,
        recents: true,
        favorites: source === "favorites",
      }}
      mode="compact"
      onSelect={onSelect}
    />
  );
}
