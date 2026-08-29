import { useCallback, useMemo } from "react";

import {
  mediaItemKey,
  type FavoriteItemRecord,
  type MediaItem,
  type RecentItemRecord,
  type SkinTone,
  type StorageAdapter,
} from "@super-media-picker/core";

import { useMediaPickerPersistence } from "./useMediaPickerPersistence";

interface CollectionHookOptions {
  readonly storage?: StorageAdapter;
  readonly defaultSkinTone?: SkinTone;
  readonly limit?: number;
}

export interface UseRecentsResult {
  readonly ready: boolean;
  readonly records: readonly RecentItemRecord[];
  readonly items: readonly MediaItem[];
  readonly record: (item: string | MediaItem) => Promise<void>;
  readonly clear: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export function useRecents({
  storage,
  defaultSkinTone = "default",
  limit,
}: CollectionHookOptions = {}): UseRecentsResult {
  const state = useMediaPickerPersistence(storage, defaultSkinTone);
  const records =
    limit === undefined
      ? state.recentRecords
      : state.recentRecords.slice(0, limit);
  return {
    ready: state.ready,
    records,
    items: records.flatMap(({ item }) => (item === undefined ? [] : [item])),
    record: async (item) => {
      await state.recordRecent(item);
    },
    clear: state.clearRecents,
    refresh: state.refresh,
  };
}

export interface UseFavoritesResult {
  readonly ready: boolean;
  readonly ids: readonly string[];
  readonly records: readonly FavoriteItemRecord[];
  readonly items: readonly MediaItem[];
  readonly isFavorite: (item: string | MediaItem) => boolean;
  readonly toggle: (item: string | MediaItem) => Promise<void>;
  readonly clear: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export function useFavorites({
  storage,
  defaultSkinTone = "default",
  limit,
}: CollectionHookOptions = {}): UseFavoritesResult {
  const state = useMediaPickerPersistence(storage, defaultSkinTone);
  const records =
    limit === undefined
      ? state.favoriteRecords
      : state.favoriteRecords.slice(0, limit);
  const ids = useMemo(() => records.map(({ id }) => id), [records]);
  const idSet = useMemo(() => new Set(ids), [ids]);
  const isFavorite = useCallback(
    (item: string | MediaItem) =>
      idSet.has(typeof item === "string" ? item : mediaItemKey(item)),
    [idSet],
  );
  return {
    ready: state.ready,
    ids,
    records,
    items: records.flatMap(({ item }) => (item === undefined ? [] : [item])),
    isFavorite,
    toggle: async (item) => {
      await state.toggleFavorite(item);
    },
    clear: state.clearFavorites,
    refresh: state.refresh,
  };
}
