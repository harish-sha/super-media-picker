import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FavoritesManager,
  LocalStorageAdapter,
  PersistentPreference,
  RecentItemsManager,
  type RecentItemRecord,
  type SkinTone,
  type StorageAdapter,
} from "@company/media-core";

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
  readonly skinTone: SkinTone;
  readonly recordRecent: (id: string) => Promise<readonly RecentItemRecord[]>;
  readonly toggleFavorite: (id: string) => Promise<readonly string[]>;
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
  const [skinTone, setSkinToneState] = useState<SkinTone>(defaultSkinTone);
  const toneChangedByUser = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      recentsManager.getRecents(),
      favoritesManager.getFavorites(),
      tonePreference.get(),
    ]).then(([recents, favorites, tone]) => {
      if (!active) return;
      setRecentRecords(recents);
      setFavoriteIds(favorites);
      if (!toneChangedByUser.current) setSkinToneState(tone);
    });
    return () => {
      active = false;
    };
  }, [favoritesManager, recentsManager, tonePreference]);

  const recordRecent = useCallback(
    async (id: string) => {
      const records = await recentsManager.record(id);
      setRecentRecords(records);
      return records;
    },
    [recentsManager],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const favorites = await favoritesManager.toggle(id);
      setFavoriteIds(favorites);
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
    skinTone,
    recordRecent,
    toggleFavorite,
    setSkinTone,
  };
}
