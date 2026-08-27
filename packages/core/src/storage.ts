export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

/** In-memory storage suitable for tests, SSR, and ephemeral sessions. */
export class MemoryStorageAdapter implements StorageAdapter {
  readonly #values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.#values.get(key) as T | undefined) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.#values.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.#values.delete(key);
  }
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Defensive JSON local-storage adapter. Browser access is resolved lazily so
 * importing core is SSR-safe. Unavailable or corrupt storage behaves as empty.
 */
export class LocalStorageAdapter implements StorageAdapter {
  readonly #namespace: string;
  readonly #storage: StorageLike | undefined;

  constructor(namespace = "media-picker", storage?: StorageLike) {
    this.#namespace = namespace;
    this.#storage = storage;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const serialized = this.#getStorage()?.getItem(this.#key(key));
      return serialized == null ? null : (JSON.parse(serialized) as T);
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      this.#getStorage()?.setItem(this.#key(key), JSON.stringify(value));
    } catch {
      // Storage quotas and privacy modes must not break picker interactions.
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.#getStorage()?.removeItem(this.#key(key));
    } catch {
      // Removal is best-effort for the same reason as writes.
    }
  }

  #getStorage(): StorageLike | undefined {
    if (this.#storage !== undefined) return this.#storage;
    if (typeof globalThis.localStorage === "undefined") return undefined;
    return globalThis.localStorage;
  }

  #key(key: string): string {
    return `${this.#namespace}:${key}`;
  }
}
