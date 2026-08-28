export interface MediaCapabilities {
  readonly emoji: boolean;
  readonly animatedEmoji?: boolean;
  readonly gif: boolean;
  readonly stickers: boolean;
  readonly animatedStickers?: boolean;
  readonly customMedia?: boolean;
  readonly customEmoji?: boolean;
  readonly customStickers?: boolean;
}

export interface MediaPickerFeatures {
  readonly emoji: boolean;
  readonly animatedEmoji: boolean;
  readonly gifs: boolean;
  readonly stickers: boolean;
  readonly customMedia: boolean;
  readonly recents: boolean;
  readonly favorites: boolean;
}

export const defaultFeatures: Readonly<MediaPickerFeatures> = Object.freeze({
  emoji: true,
  animatedEmoji: false,
  gifs: false,
  stickers: false,
  customMedia: false,
  recents: false,
  favorites: false,
});

export interface MediaPickerConfig {
  readonly features: MediaPickerFeatures;
  readonly capabilities?: MediaCapabilities;
}

export type PickerDisplayMode =
  "auto" | "popover" | "inline" | "modal" | "bottom-sheet" | "fullscreen";

/** Presentation density, independent from responsive display placement. */
export type MediaPickerMode = "compact" | "full";

/** Theme-token-backed picker size presets. */
export type MediaPickerSize = "sm" | "md" | "lg";

/** Strategy used to populate the compact reaction bar. */
export type CompactReactionSource =
  "default" | "recent" | "frequent" | "favorites" | "custom";

/** Merges partial consumer configuration with stable, emoji-first defaults. */
export function createMediaPickerConfig(
  config: Omit<Partial<MediaPickerConfig>, "features"> & {
    readonly features?: Partial<MediaPickerFeatures>;
  } = {},
): MediaPickerConfig {
  const features = { ...defaultFeatures, ...config.features };
  return config.capabilities === undefined
    ? { features }
    : { features, capabilities: config.capabilities };
}
