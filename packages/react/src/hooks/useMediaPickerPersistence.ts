import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FavoritesManager,
  type FavoriteItemRecord,
  PersistentPreference,
  RecentItemsManager,
  type RecentItemRecord,
  type MediaItem,
  type SkinTone,
  type StorageAdapter,
} from "@super-media-picker/core";

import {
  notifyPersistence,
  subscribePersistence,
  useResolvedStorage,
} from "./persistenceStore";

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
  readonly ready: boolean;
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
  readonly clearRecents: () => Promise<void>;
  readonly clearFavorites: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

/** Shared persistent state used by compact and full presentations. */
export function useMediaPickerPersistence(
  storage: StorageAdapter | undefined,
  defaultSkinTone: SkinTone,
): MediaPickerPersistenceState {
  const persistence = useResolvedStorage(storage);
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
  const [ready, setReady] = useState(false);
  const toneChangedByUser = useRef(false);

  const refresh = useCallback(async () => {
    const [recents, favorites, tone] = await Promise.all([
      recentsManager.getRecents(),
      favoritesManager.getFavoriteRecords(),
      tonePreference.get(),
    ]);
    setRecentRecords(recents);
    setFavoriteRecords(favorites);
    setFavoriteIds(favorites.map(({ id }) => id));
    if (!toneChangedByUser.current) setSkinToneState(tone);
    setReady(true);
  }, [favoritesManager, recentsManager, tonePreference]);

  useEffect(() => {
    let active = true;
    const load = (): void => {
      void refresh().catch(() => {
        if (active) setReady(true);
      });
    };
    load();
    const unsubscribe = subscribePersistence(persistence, load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [persistence, refresh]);

  const recordRecent = useCallback(
    async (item: string | MediaItem) => {
      const records = await recentsManager.record(item);
      setRecentRecords(records);
      notifyPersistence(persistence);
      return records;
    },
    [persistence, recentsManager],
  );

  const toggleFavorite = useCallback(
    async (item: string | MediaItem) => {
      const favorites = await favoritesManager.toggle(item);
      setFavoriteIds(favorites);
      setFavoriteRecords(await favoritesManager.getFavoriteRecords());
      notifyPersistence(persistence);
      return favorites;
    },
    [favoritesManager, persistence],
  );

  const setSkinTone = useCallback(
    (tone: SkinTone) => {
      toneChangedByUser.current = true;
      setSkinToneState(tone);
      void tonePreference.set(tone).then(() => {
        toneChangedByUser.current = false;
        notifyPersistence(persistence);
      });
    },
    [persistence, tonePreference],
  );

  const clearRecents = useCallback(async () => {
    await recentsManager.clear();
    setRecentRecords([]);
    notifyPersistence(persistence);
  }, [persistence, recentsManager]);

  const clearFavorites = useCallback(async () => {
    await favoritesManager.clear();
    setFavoriteIds([]);
    setFavoriteRecords([]);
    notifyPersistence(persistence);
  }, [favoritesManager, persistence]);

  return {
    ready,
    recentRecords,
    favoriteIds,
    favoriteRecords,
    skinTone,
    recordRecent,
    toggleFavorite,
    setSkinTone,
    clearRecents,
    clearFavorites,
    refresh,
  };
}
