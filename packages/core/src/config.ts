export interface MediaCapabilities {
  readonly emoji: boolean;
  readonly gif: boolean;
  readonly stickers: boolean;
  readonly customEmoji?: boolean;
  readonly customStickers?: boolean;
}

export interface MediaPickerFeatures {
  readonly emoji: boolean;
  readonly gifs: boolean;
  readonly stickers: boolean;
  readonly recents: boolean;
  readonly favorites: boolean;
}

export const defaultFeatures: Readonly<MediaPickerFeatures> = Object.freeze({
  emoji: true,
  gifs: false,
  stickers: false,
  recents: false,
  favorites: false,
});

export interface MediaPickerConfig {
  readonly features: MediaPickerFeatures;
  readonly capabilities?: MediaCapabilities;
}

export type PickerDisplayMode =
  | "auto"
  | "popover"
  | "inline"
  | "modal"
  | "bottom-sheet";

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
