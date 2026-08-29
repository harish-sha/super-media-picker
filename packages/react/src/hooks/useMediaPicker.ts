import { useCallback, useMemo, useState } from "react";

import {
  defaultFeatures,
  mediaItemKey,
  type CustomMediaItem,
  type MediaCapabilities,
  type MediaItem,
  type MediaPickerFeatures,
  type RequestState,
  type SearchOptions,
  type SkinTone,
  type StorageAdapter,
} from "@super-media-picker/core";

import type { CustomMediaTab, MediaPickerProviders } from "../types";
import { useEmojiSearch } from "./useEmojiSearch";
import { useGifSearch } from "./useGifSearch";
import { useMediaPickerPersistence } from "./useMediaPickerPersistence";
import { useProviderSearchState } from "./useProviderSearchState";
import { useStickerSearch } from "./useStickerSearch";

export type HeadlessMediaType = "emoji" | "gif" | "stickers" | "custom";

export interface MediaTypeAvailability {
  readonly emoji: boolean;
  readonly gif: boolean;
  readonly stickers: boolean;
  readonly custom: boolean;
}

export interface UseMediaPickerOptions {
  readonly providers?: MediaPickerProviders;
  readonly customTabs?: readonly CustomMediaTab[];
  readonly features?: Partial<MediaPickerFeatures>;
  readonly capabilities?: Partial<MediaCapabilities>;
  readonly storage?: StorageAdapter;
  readonly defaultMediaType?: HeadlessMediaType;
  readonly defaultSearchQuery?: string;
  readonly defaultSkinTone?: SkinTone;
  readonly onSelect?: (item: MediaItem) => void;
}

export interface UseMediaPickerResult {
  readonly activeMediaType?: HeadlessMediaType;
  readonly availableMediaTypes: readonly HeadlessMediaType[];
  readonly availability: MediaTypeAvailability;
  readonly features: MediaPickerFeatures;
  readonly capabilities?: Partial<MediaCapabilities>;
  readonly query: string;
  readonly results: readonly MediaItem[];
  readonly state: RequestState;
  readonly loading: boolean;
  readonly error?: Error;
  readonly hasMore: boolean;
  readonly recents: ReturnType<
    typeof useMediaPickerPersistence
  >["recentRecords"];
  readonly favorites: ReturnType<
    typeof useMediaPickerPersistence
  >["favoriteRecords"];
  readonly favoriteIds: readonly string[];
  readonly skinTone: SkinTone;
  readonly setActiveMediaType: (type: HeadlessMediaType) => void;
  readonly search: (query: string) => void;
  readonly loadMore: () => void;
  readonly retry: () => void;
  readonly select: (item: MediaItem) => void;
  readonly recordRecent: (item: string | MediaItem) => Promise<void>;
  readonly toggleFavorite: (item: string | MediaItem) => Promise<void>;
  readonly isFavorite: (item: string | MediaItem) => boolean;
  readonly setSkinTone: (tone: SkinTone) => void;
}

/** Intentional headless controller; no component reducers or contexts leak. */
export function useMediaPicker({
  providers,
  customTabs = [],
  features: featureOverrides,
  capabilities,
  storage,
  defaultMediaType = "emoji",
  defaultSearchQuery = "",
  defaultSkinTone = "default",
  onSelect,
}: UseMediaPickerOptions = {}): UseMediaPickerResult {
  const features = useMemo(
    () => ({ ...defaultFeatures, ...featureOverrides }),
    [featureOverrides],
  );
  const availability = useMemo<MediaTypeAvailability>(
    () => ({
      emoji: features.emoji && capabilities?.emoji !== false,
      gif:
        features.gifs &&
        capabilities?.gif !== false &&
        providers?.gifs !== undefined,
      stickers:
        features.stickers &&
        capabilities?.stickers !== false &&
        providers?.stickers !== undefined,
      custom:
        features.customMedia &&
        capabilities?.customMedia !== false &&
        customTabs.length > 0,
    }),
    [capabilities, customTabs.length, features, providers],
  );
  const availableMediaTypes = useMemo(
    () =>
      (Object.entries(availability) as [HeadlessMediaType, boolean][]).flatMap(
        ([type, available]) => (available ? [type] : []),
      ),
    [availability],
  );
  const [requestedType, setRequestedType] =
    useState<HeadlessMediaType>(defaultMediaType);
  const activeMediaType = availability[requestedType]
    ? requestedType
    : availableMediaTypes[0];
  const persistence = useMediaPickerPersistence(storage, defaultSkinTone);
  const emoji = useEmojiSearch({
    initialQuery: defaultSearchQuery,
    skinTone: persistence.skinTone,
  });
  const gifs = useGifSearch({
    provider: activeMediaType === "gif" ? providers?.gifs : undefined,
    initialQuery: defaultSearchQuery,
  });
  const stickers = useStickerSearch({
    provider: activeMediaType === "stickers" ? providers?.stickers : undefined,
    initialQuery: defaultSearchQuery,
  });
  const [customQuery, setCustomQuery] = useState(defaultSearchQuery);
  const customProvider = customTabs[0]?.provider;
  const loadCustom = useCallback(
    (options: SearchOptions) =>
      customProvider?.trending?.(options) ??
      Promise.resolve({ items: [], hasMore: false }),
    [customProvider],
  );
  const custom = useProviderSearchState<CustomMediaItem>({
    provider: activeMediaType === "custom" ? customProvider : undefined,
    query: customQuery,
    loadEmpty: loadCustom,
  });
  const active: {
    readonly query: string;
    readonly results: readonly MediaItem[];
    readonly state: RequestState;
    readonly error?: Error;
    readonly hasMore: boolean;
    readonly loadMore: () => void;
    readonly retry: () => void;
  } =
    activeMediaType === "gif"
      ? gifs
      : activeMediaType === "stickers"
        ? stickers
        : activeMediaType === "custom"
          ? { query: customQuery, ...custom }
          : {
              ...emoji,
              hasMore: false,
              loadMore: () => undefined,
              retry: () => undefined,
            };
  const favoriteSet = useMemo(
    () => new Set(persistence.favoriteIds),
    [persistence.favoriteIds],
  );
  const enabledForItem = useCallback(
    (item: MediaItem) =>
      item.type === "emoji"
        ? availability.emoji
        : item.type === "gif"
          ? availability.gif
          : item.type === "sticker"
            ? availability.stickers
            : availability.custom,
    [availability],
  );

  return {
    ...(activeMediaType === undefined ? {} : { activeMediaType }),
    availableMediaTypes,
    availability,
    features,
    ...(capabilities === undefined ? {} : { capabilities }),
    query: active.query,
    results: active.results,
    state: active.state,
    loading: active.state === "loading" || active.state === "loading-more",
    ...(active.error === undefined ? {} : { error: active.error }),
    hasMore: active.hasMore,
    recents: persistence.recentRecords,
    favorites: persistence.favoriteRecords,
    favoriteIds: persistence.favoriteIds,
    skinTone: persistence.skinTone,
    setActiveMediaType: (type) => {
      if (availability[type]) setRequestedType(type);
    },
    search: (query) => {
      if (activeMediaType === "gif") gifs.search(query);
      else if (activeMediaType === "stickers") stickers.search(query);
      else if (activeMediaType === "custom") setCustomQuery(query);
      else emoji.search(query);
    },
    loadMore: active.loadMore,
    retry: active.retry,
    select: (item) => {
      if (!enabledForItem(item)) return;
      onSelect?.(item);
      if (features.recents) void persistence.recordRecent(item);
    },
    recordRecent: async (item) => {
      await persistence.recordRecent(item);
    },
    toggleFavorite: async (item) => {
      await persistence.toggleFavorite(item);
    },
    isFavorite: (item) =>
      favoriteSet.has(typeof item === "string" ? item : mediaItemKey(item)),
    setSkinTone: persistence.setSkinTone,
  };
}
