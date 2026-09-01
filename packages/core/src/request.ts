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

interface InflightRequest<T> {
  readonly controller: AbortController;
  promise: Promise<T>;
  subscribers: number;
  abortTimer: ReturnType<typeof setTimeout> | undefined;
}

/** Small URL policy shared by providers and renderers. */
export interface MediaUrlPolicy {
  readonly allowedOrigins?: readonly string[];
  readonly allowBlob?: boolean;
  readonly allowDataImages?: boolean;
  readonly allowHttp?: boolean;
  readonly allowRelative?: boolean;
}

/**
 * Small provider request coordinator with TTL caching, in-flight deduplication,
 * timeout/cancellation propagation, and deterministic cleanup.
 */
export class MediaRequestClient {
  readonly #cache: CacheAdapter<unknown>;
  readonly #cacheTtlMs: number;
  readonly #timeoutMs: number;
  readonly #inflight = new Map<string, InflightRequest<unknown>>();

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
    const existing = this.#inflight.get(key) as InflightRequest<T> | undefined;
    if (existing !== undefined)
      return this.#subscribe(existing, options.signal);

    if (options.signal?.aborted)
      return Promise.reject(abortReason(options.signal));

    const controller = new AbortController();
    const timeout = setTimeout(
      () =>
        controller.abort(new DOMException("Request timed out", "TimeoutError")),
      Math.max(1, options.timeoutMs ?? this.#timeoutMs),
    );
    const entry: InflightRequest<T> = {
      controller,
      promise: Promise.resolve(undefined as T),
      subscribers: 0,
      abortTimer: undefined,
    };
    const request = Promise.resolve()
      .then(() => load(controller.signal))
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
        if (entry.abortTimer !== undefined) clearTimeout(entry.abortTimer);
        if (this.#inflight.get(key) === entry) this.#inflight.delete(key);
      });
    entry.promise = request;
    this.#inflight.set(key, entry);
    return this.#subscribe(entry, options.signal);
  }

  #subscribe<T>(
    entry: InflightRequest<T>,
    signal: AbortSignal | undefined,
  ): Promise<T> {
    if (signal?.aborted) return Promise.reject(abortReason(signal));
    if (entry.abortTimer !== undefined) {
      clearTimeout(entry.abortTimer);
      entry.abortTimer = undefined;
    }
    entry.subscribers += 1;

    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const release = (): boolean => {
        if (settled) return false;
        settled = true;
        signal?.removeEventListener("abort", abort);
        entry.subscribers = Math.max(0, entry.subscribers - 1);
        if (entry.subscribers === 0 && !entry.controller.signal.aborted) {
          entry.abortTimer = setTimeout(() => {
            entry.abortTimer = undefined;
            if (entry.subscribers === 0 && !entry.controller.signal.aborted) {
              entry.controller.abort(
                new DOMException("Request cancelled", "AbortError"),
              );
            }
          }, 0);
        }
        return true;
      };
      const abort = (): void => {
        if (signal !== undefined && release()) reject(abortReason(signal));
      };
      signal?.addEventListener("abort", abort, { once: true });
      void entry.promise.then(
        (value) => {
          if (release()) resolve(value);
        },
        (error: unknown) => {
          if (release()) reject(asError(error));
        },
      );
    });
  }

  clear(): void {
    this.#cache.clear();
  }
}

function abortReason(signal: AbortSignal): Error {
  return asError(signal.reason ?? new DOMException("Aborted", "AbortError"));
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/** Reject executable URL schemes while allowing browser-safe media sources. */
export function isSafeMediaUrl(
  value: string,
  policy: MediaUrlPolicy = {},
): boolean {
  if (value.startsWith("/"))
    return (policy.allowRelative ?? true) && !value.startsWith("//");
  try {
    const url = new URL(value, "https://media.invalid");
    if (url.protocol === "data:")
      return (policy.allowDataImages ?? true) && /^data:image\//iu.test(value);
    if (url.protocol === "blob:") return policy.allowBlob ?? true;
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.protocol === "http:" && policy.allowHttp === false) return false;
    const allowedOrigins = policy.allowedOrigins;
    return (
      allowedOrigins === undefined ||
      allowedOrigins.some((origin) => new URL(origin).origin === url.origin)
    );
  } catch {
    return false;
  }
}
