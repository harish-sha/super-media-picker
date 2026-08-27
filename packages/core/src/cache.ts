export interface CacheAdapter<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt?: number;
}

/** A bounded-lifetime synchronous cache for remote provider results. */
export class MemoryCache<T> implements CacheAdapter<T> {
  readonly #entries = new Map<string, CacheEntry<T>>();
  readonly #now: () => number;

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  get(key: string): T | undefined {
    const entry = this.#entries.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt !== undefined && entry.expiresAt <= this.#now()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiresAt =
      ttl === undefined ? undefined : this.#now() + Math.max(0, ttl);
    this.#entries.set(
      key,
      expiresAt === undefined ? { value } : { value, expiresAt },
    );
  }

  delete(key: string): void {
    this.#entries.delete(key);
  }

  clear(): void {
    this.#entries.clear();
  }
}
