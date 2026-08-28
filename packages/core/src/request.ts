import { MemoryCache, type CacheAdapter } from "./cache";
import { MediaProviderError } from "./errors";

export interface MediaRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly ttlMs?: number;
}

export interface MediaRequestClientOptions {
  readonly cache?: CacheAdapter<unknown>;
  readonly cacheTtlMs?: number;
  readonly timeoutMs?: number;
}

/**
 * Small provider request coordinator with TTL caching, in-flight deduplication,
 * timeout/cancellation propagation, and deterministic cleanup.
 */
export class MediaRequestClient {
  readonly #cache: CacheAdapter<unknown>;
  readonly #cacheTtlMs: number;
  readonly #timeoutMs: number;
  readonly #inflight = new Map<string, Promise<unknown>>();

  constructor(options: MediaRequestClientOptions = {}) {
    this.#cache = options.cache ?? new MemoryCache<unknown>();
    this.#cacheTtlMs = Math.max(0, options.cacheTtlMs ?? 60_000);
    this.#timeoutMs = Math.max(1, options.timeoutMs ?? 10_000);
  }

  request<T>(
    key: string,
    load: (signal: AbortSignal) => Promise<T>,
    options: MediaRequestOptions = {},
  ): Promise<T> {
    const cached = this.#cache.get(key) as T | undefined;
    if (cached !== undefined) return Promise.resolve(cached);
    const existing = this.#inflight.get(key) as Promise<T> | undefined;
    if (existing !== undefined) return existing;

    const controller = new AbortController();
    const abort = (): void => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(
      () =>
        controller.abort(new DOMException("Request timed out", "TimeoutError")),
      Math.max(1, options.timeoutMs ?? this.#timeoutMs),
    );

    const request = load(controller.signal)
      .then((value) => {
        this.#cache.set(key, value, options.ttlMs ?? this.#cacheTtlMs);
        return value;
      })
      .catch((error: unknown) => {
        if (error instanceof MediaProviderError) throw error;
        if (controller.signal.aborted) throw controller.signal.reason;
        throw error;
      })
      .finally(() => {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", abort);
        this.#inflight.delete(key);
      });
    this.#inflight.set(key, request);
    return request;
  }

  clear(): void {
    this.#cache.clear();
  }
}

/** Reject executable URL schemes while allowing browser-safe media sources. */
export function isSafeMediaUrl(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value, "https://media.invalid");
    return (
      url.protocol === "https:" ||
      url.protocol === "http:" ||
      url.protocol === "blob:" ||
      (url.protocol === "data:" && /^data:image\//iu.test(value))
    );
  } catch {
    return false;
  }
}
