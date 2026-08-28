import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FavoritesManager,
  type FavoriteItemRecord,
  LocalStorageAdapter,
  PersistentPreference,
  RecentItemsManager,
  type RecentItemRecord,
  type MediaItem,
  type SkinTone,
  type StorageAdapter,
} from "@super-media-picker/core";

export const mediaPickerStorageKeys = Object.freeze({
  favorites: "emoji.favorites",
  recents: "emoji.recents",
  skinTone: "emoji.skin-tone",
});

const validSkinTones = new Set<SkinTone>([
  "default",
  "light",
  "medium-light",
  "medium",
  "medium-dark",
  "dark",
]);

function isSkinTone(value: unknown): value is SkinTone {
  return typeof value === "string" && validSkinTones.has(value as SkinTone);
}

export interface MediaPickerPersistenceState {
  readonly recentRecords: readonly RecentItemRecord[];
  readonly favoriteIds: readonly string[];
  readonly favoriteRecords: readonly FavoriteItemRecord[];
  readonly skinTone: SkinTone;
  readonly recordRecent: (
    item: string | MediaItem,
  ) => Promise<readonly RecentItemRecord[]>;
  readonly toggleFavorite: (
    item: string | MediaItem,
  ) => Promise<readonly string[]>;
  readonly setSkinTone: (tone: SkinTone) => void;
}

/** Shared persistent state used by compact and full presentations. */
export function useMediaPickerPersistence(
  storage: StorageAdapter | undefined,
  defaultSkinTone: SkinTone,
): MediaPickerPersistenceState {
  const persistence = useMemo(
    () => storage ?? new LocalStorageAdapter("media-picker"),
    [storage],
  );
  const recentsManager = useMemo(
    () =>
      new RecentItemsManager(persistence, {
        storageKey: mediaPickerStorageKeys.recents,
      }),
    [persistence],
  );
  const favoritesManager = useMemo(
    () =>
      new FavoritesManager(persistence, {
        storageKey: mediaPickerStorageKeys.favorites,
      }),
    [persistence],
  );
  const tonePreference = useMemo(
    () =>
      new PersistentPreference<SkinTone>(persistence, {
        storageKey: mediaPickerStorageKeys.skinTone,
        defaultValue: defaultSkinTone,
        validate: isSkinTone,
      }),
    [defaultSkinTone, persistence],
  );
  const [recentRecords, setRecentRecords] = useState<
    readonly RecentItemRecord[]
  >([]);
  const [favoriteIds, setFavoriteIds] = useState<readonly string[]>([]);
  const [favoriteRecords, setFavoriteRecords] = useState<
    readonly FavoriteItemRecord[]
  >([]);
  const [skinTone, setSkinToneState] = useState<SkinTone>(defaultSkinTone);
  const toneChangedByUser = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      recentsManager.getRecents(),
      favoritesManager.getFavoriteRecords(),
      tonePreference.get(),
    ]).then(([recents, favorites, tone]) => {
      if (!active) return;
      setRecentRecords(recents);
      setFavoriteRecords(favorites);
      setFavoriteIds(favorites.map(({ id }) => id));
      if (!toneChangedByUser.current) setSkinToneState(tone);
    });
    return () => {
      active = false;
    };
  }, [favoritesManager, recentsManager, tonePreference]);

  const recordRecent = useCallback(
    async (item: string | MediaItem) => {
      const records = await recentsManager.record(item);
      setRecentRecords(records);
      return records;
    },
    [recentsManager],
  );

  const toggleFavorite = useCallback(
    async (item: string | MediaItem) => {
      const favorites = await favoritesManager.toggle(item);
      setFavoriteIds(favorites);
      setFavoriteRecords(await favoritesManager.getFavoriteRecords());
      return favorites;
    },
    [favoritesManager],
  );

  const setSkinTone = useCallback(
    (tone: SkinTone) => {
      toneChangedByUser.current = true;
      setSkinToneState(tone);
      void tonePreference.set(tone);
    },
    [tonePreference],
  );

  return {
    recentRecords,
    favoriteIds,
    favoriteRecords,
    skinTone,
    recordRecent,
    toggleFavorite,
    setSkinTone,
  };
}
