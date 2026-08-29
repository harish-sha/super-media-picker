import { useMemo } from "react";

import {
  LocalStorageAdapter,
  type StorageAdapter,
} from "@super-media-picker/core";

const defaultStorage = new LocalStorageAdapter("media-picker");
const listeners = new WeakMap<StorageAdapter, Set<() => void>>();

export function useResolvedStorage(storage?: StorageAdapter): StorageAdapter {
  return useMemo(() => storage ?? defaultStorage, [storage]);
}

export function subscribePersistence(
  storage: StorageAdapter,
  listener: () => void,
): () => void {
  const storageListeners = listeners.get(storage) ?? new Set<() => void>();
  storageListeners.add(listener);
  listeners.set(storage, storageListeners);
  return () => {
    storageListeners.delete(listener);
    if (storageListeners.size === 0) listeners.delete(storage);
  };
}

export function notifyPersistence(storage: StorageAdapter): void {
  for (const listener of listeners.get(storage) ?? []) listener();
}
