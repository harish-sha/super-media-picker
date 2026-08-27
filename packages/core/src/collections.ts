import type { StorageAdapter } from "./storage";

const millisecondsPerDay = 86_400_000;

export interface RecentItemRecord {
  readonly id: string;
  readonly count: number;
  readonly lastUsedAt: number;
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

/**
 * Persists and ranks recently used item identifiers. Ranking blends an
 * exponential recency score with a logarithmic, collection-normalized
 * frequency score. Recency defaults to 70% with a seven-day half-life, so a
 * newly used item rises immediately while repeated use remains meaningful.
 */
export class RecentItemsManager {
  readonly #storage: StorageAdapter;
  readonly #storageKey: string;
  readonly #limit: number;
  readonly #now: () => number;
  readonly #halfLifeMs: number;
  readonly #recencyWeight: number;

  constructor(storage: StorageAdapter, options: RecentItemsManagerOptions = {}) {
    this.#storage = storage;
    this.#storageKey = options.storageKey ?? "emoji.recents";
    this.#limit = Math.max(1, options.limit ?? 40);
    this.#now = options.now ?? Date.now;
    this.#halfLifeMs =
      Math.max(0.001, options.recencyHalfLifeDays ?? 7) * millisecondsPerDay;
    this.#recencyWeight = Math.min(1, Math.max(0, options.recencyWeight ?? 0.7));
  }

  async record(id: string): Promise<readonly RecentItemRecord[]> {
    const now = this.#now();
    const records = await this.#read();
    const existing = records.find((record) => record.id === id);
    const updated: RecentItemRecord = {
      id,
      count: (existing?.count ?? 0) + 1,
      lastUsedAt: now,
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
    const maxFrequency = Math.max(1, ...records.map(({ count }) => Math.log2(count + 1)));
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
    Number.isFinite(candidate.lastUsedAt)
  );
}

export interface FavoritesManagerOptions {
  readonly storageKey?: string;
  readonly limit?: number;
}

/** Persistent ordered favorite identifiers with duplicate protection. */
export class FavoritesManager {
  readonly #storage: StorageAdapter;
  readonly #storageKey: string;
  readonly #limit: number;

  constructor(storage: StorageAdapter, options: FavoritesManagerOptions = {}) {
    this.#storage = storage;
    this.#storageKey = options.storageKey ?? "emoji.favorites";
    this.#limit = Math.max(1, options.limit ?? 100);
  }

  async add(id: string): Promise<readonly string[]> {
    const current = await this.getFavorites();
    const next = [id, ...current.filter((favoriteId) => favoriteId !== id)].slice(
      0,
      this.#limit,
    );
    await this.#storage.set(this.#storageKey, next);
    return next;
  }

  async remove(id: string): Promise<readonly string[]> {
    const next = (await this.getFavorites()).filter((favoriteId) => favoriteId !== id);
    await this.#storage.set(this.#storageKey, next);
    return next;
  }

  async toggle(id: string): Promise<readonly string[]> {
    return (await this.isFavorite(id)) ? this.remove(id) : this.add(id);
  }

  async isFavorite(id: string): Promise<boolean> {
    return (await this.getFavorites()).includes(id);
  }

  async getFavorites(): Promise<readonly string[]> {
    const stored = await this.#storage.get<unknown>(this.#storageKey);
    if (!Array.isArray(stored)) return [];
    return [...new Set(stored.filter((value): value is string => typeof value === "string"))].slice(
      0,
      this.#limit,
    );
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

  constructor(storage: StorageAdapter, options: PersistentPreferenceOptions<T>) {
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
