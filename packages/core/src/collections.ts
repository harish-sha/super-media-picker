import { isMediaItem, mediaItemKey, type MediaItem } from "./media";
import type { StorageAdapter } from "./storage";

const millisecondsPerDay = 86_400_000;

export interface RecentItemRecord {
  /** Legacy emoji ID or a namespaced `mediaItemKey`. */
  readonly id: string;
  readonly count: number;
  readonly lastUsedAt: number;
  /** Compact normalized snapshot used to reconstruct provider-backed media. */
  readonly item?: MediaItem;
  readonly version?: 1;
}

export interface RecentItemsManagerOptions {
  readonly storageKey?: string;
  readonly limit?: number;
  readonly now?: () => number;
  /** How quickly the recency contribution halves. Defaults to seven days. */
  readonly recencyHalfLifeDays?: number;
  /** Recency's share of the blended score. Defaults to 0.7. */
  readonly recencyWeight?: number;
}

/** Versioned cross-media recency ranking with legacy ID migration support. */
export class RecentItemsManager {
  readonly #storage: StorageAdapter;
  readonly #storageKey: string;
  readonly #limit: number;
  readonly #now: () => number;
  readonly #halfLifeMs: number;
  readonly #recencyWeight: number;

  constructor(
    storage: StorageAdapter,
    options: RecentItemsManagerOptions = {},
  ) {
    this.#storage = storage;
    this.#storageKey = options.storageKey ?? "emoji.recents";
    this.#limit = Math.max(1, options.limit ?? 40);
    this.#now = options.now ?? Date.now;
    this.#halfLifeMs =
      Math.max(0.001, options.recencyHalfLifeDays ?? 7) * millisecondsPerDay;
    this.#recencyWeight = Math.min(
      1,
      Math.max(0, options.recencyWeight ?? 0.7),
    );
  }

  async record(
    input: string | MediaItem,
  ): Promise<readonly RecentItemRecord[]> {
    const id = typeof input === "string" ? input : mediaItemKey(input);
    const now = this.#now();
    const records = await this.#read();
    const existing = records.find((record) => record.id === id);
    const updated: RecentItemRecord = {
      id,
      count: (existing?.count ?? 0) + 1,
      lastUsedAt: now,
      ...(typeof input === "string"
        ? {}
        : { item: input, version: 1 as const }),
    };
    const next = [updated, ...records.filter((record) => record.id !== id)];
    const ranked = this.#rank(next).slice(0, this.#limit);
    await this.#storage.set(this.#storageKey, ranked);
    return ranked;
  }

  async getRecents(): Promise<readonly RecentItemRecord[]> {
    return this.#rank(await this.#read()).slice(0, this.#limit);
  }

  async clear(): Promise<void> {
    await this.#storage.remove(this.#storageKey);
  }

  #rank(records: readonly RecentItemRecord[]): readonly RecentItemRecord[] {
    const now = this.#now();
    const maxFrequency = Math.max(
      1,
      ...records.map(({ count }) => Math.log2(count + 1)),
    );
    const frequencyWeight = 1 - this.#recencyWeight;
    const score = (record: RecentItemRecord): number => {
      const age = Math.max(0, now - record.lastUsedAt);
      const recency = Math.pow(0.5, age / this.#halfLifeMs);
      const frequency = Math.log2(record.count + 1) / maxFrequency;
      return this.#recencyWeight * recency + frequencyWeight * frequency;
    };
    return [...records].sort(
      (left, right) =>
        score(right) - score(left) ||
        right.lastUsedAt - left.lastUsedAt ||
        right.count - left.count ||
        left.id.localeCompare(right.id),
    );
  }

  async #read(): Promise<readonly RecentItemRecord[]> {
    const stored = await this.#storage.get<unknown>(this.#storageKey);
    if (!Array.isArray(stored)) return [];
    return stored.filter(isRecentItemRecord);
  }
}

function isRecentItemRecord(value: unknown): value is RecentItemRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Readonly<Record<string, unknown>>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.count === "number" &&
    Number.isInteger(candidate.count) &&
    candidate.count > 0 &&
    typeof candidate.lastUsedAt === "number" &&
    Number.isFinite(candidate.lastUsedAt) &&
    (candidate.item === undefined || isMediaItem(candidate.item))
  );
}

export interface FavoriteItemRecord {
  readonly id: string;
  readonly item?: MediaItem;
  readonly version?: 1;
}

export interface FavoritesManagerOptions {
  readonly storageKey?: string;
  readonly limit?: number;
}

/** Versioned cross-media favorites with legacy string-array migration. */
export class FavoritesManager {
  readonly #storage: StorageAdapter;
  readonly #storageKey: string;
  readonly #limit: number;

  constructor(storage: StorageAdapter, options: FavoritesManagerOptions = {}) {
    this.#storage = storage;
    this.#storageKey = options.storageKey ?? "emoji.favorites";
    this.#limit = Math.max(1, options.limit ?? 100);
  }

  async add(input: string | MediaItem): Promise<readonly string[]> {
    const id = typeof input === "string" ? input : mediaItemKey(input);
    const current = await this.getFavoriteRecords();
    const next: readonly FavoriteItemRecord[] = [
      {
        id,
        ...(typeof input === "string"
          ? {}
          : { item: input, version: 1 as const }),
      },
      ...current.filter((favorite) => favorite.id !== id),
    ].slice(0, this.#limit);
    await this.#storage.set(
      this.#storageKey,
      next.map((record) => (record.item === undefined ? record.id : record)),
    );
    return next.map((favorite) => favorite.id);
  }

  async remove(id: string): Promise<readonly string[]> {
    const next = (await this.getFavoriteRecords()).filter(
      (favorite) => favorite.id !== id,
    );
    await this.#storage.set(
      this.#storageKey,
      next.map((record) => (record.item === undefined ? record.id : record)),
    );
    return next.map((favorite) => favorite.id);
  }

  async toggle(input: string | MediaItem): Promise<readonly string[]> {
    const id = typeof input === "string" ? input : mediaItemKey(input);
    return (await this.isFavorite(id)) ? this.remove(id) : this.add(input);
  }

  async isFavorite(id: string): Promise<boolean> {
    return (await this.getFavorites()).includes(id);
  }

  async getFavorites(): Promise<readonly string[]> {
    return (await this.getFavoriteRecords()).map((favorite) => favorite.id);
  }

  async getFavoriteRecords(): Promise<readonly FavoriteItemRecord[]> {
    const stored = await this.#storage.get<unknown>(this.#storageKey);
    if (!Array.isArray(stored)) return [];
    const records = stored.flatMap((value): readonly FavoriteItemRecord[] => {
      if (typeof value === "string") return value === "" ? [] : [{ id: value }];
      if (typeof value !== "object" || value === null) return [];
      const candidate = value as Readonly<Record<string, unknown>>;
      if (typeof candidate.id !== "string" || candidate.id === "") return [];
      if (candidate.item !== undefined && !isMediaItem(candidate.item))
        return [];
      return [
        {
          id: candidate.id,
          ...(candidate.item === undefined ? {} : { item: candidate.item }),
          ...(candidate.version === 1 ? { version: 1 as const } : {}),
        },
      ];
    });
    return [
      ...new Map(records.map((record) => [record.id, record])).values(),
    ].slice(0, this.#limit);
  }

  async clear(): Promise<void> {
    await this.#storage.remove(this.#storageKey);
  }
}

export interface PersistentPreferenceOptions<T> {
  readonly storageKey: string;
  readonly defaultValue: T;
  readonly validate: (value: unknown) => value is T;
}

/** A small typed persistence primitive for global picker preferences. */
export class PersistentPreference<T> {
  readonly #storage: StorageAdapter;
  readonly #options: PersistentPreferenceOptions<T>;

  constructor(
    storage: StorageAdapter,
    options: PersistentPreferenceOptions<T>,
  ) {
    this.#storage = storage;
    this.#options = options;
  }

  async get(): Promise<T> {
    const value = await this.#storage.get<unknown>(this.#options.storageKey);
    return this.#options.validate(value) ? value : this.#options.defaultValue;
  }

  async set(value: T): Promise<void> {
    await this.#storage.set(this.#options.storageKey, value);
  }

  async reset(): Promise<void> {
    await this.#storage.remove(this.#options.storageKey);
  }
}
