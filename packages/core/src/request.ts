import { MemoryCache, type CacheAdapter } from "./cache";
import { MediaProviderError } from "./errors";

export interface MediaRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly ttlMs?: number;
  readonly retry?: MediaRetryPolicy | false;
}

export interface MediaRequestClientOptions {
  readonly cache?: CacheAdapter<unknown>;
  readonly cacheTtlMs?: number;
  readonly timeoutMs?: number;
  readonly retry?: MediaRetryPolicy | false;
}

/** Retry settings for idempotent provider reads. `maxRetries` excludes the first attempt. */
export interface MediaRetryPolicy {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
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
  readonly #retry: Required<MediaRetryPolicy>;
  readonly #inflight = new Map<string, InflightRequest<unknown>>();

  constructor(options: MediaRequestClientOptions = {}) {
    this.#cache = options.cache ?? new MemoryCache<unknown>();
    this.#cacheTtlMs = Math.max(0, options.cacheTtlMs ?? 60_000);
    this.#timeoutMs = Math.max(1, options.timeoutMs ?? 10_000);
    this.#retry = normalizeRetryPolicy(options.retry);
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
      .then(() =>
        loadWithRetry(
          load,
          controller.signal,
          options.retry === false
            ? normalizeRetryPolicy(false)
            : options.retry === undefined
              ? this.#retry
              : normalizeRetryPolicy(options.retry),
        ),
      )
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
  if (value.length === 0 || value.trim() !== value) return false;
  const baseOrigin = "https://media.invalid";
  if (!/^[a-z][a-z\d+.-]*:/iu.test(value)) {
    if (!(policy.allowRelative ?? true)) return false;
    try {
      return new URL(value, baseOrigin).origin === baseOrigin;
    } catch {
      return false;
    }
  }
  try {
    const url = new URL(value);
    if (url.protocol === "data:")
      return (
        (policy.allowDataImages ?? true) &&
        /^data:image\/(?:avif|gif|jpeg|png|webp)(?:;|,)/iu.test(value)
      );
    if (url.protocol === "blob:") return policy.allowBlob ?? true;
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.username !== "" || url.password !== "") return false;
    if (url.protocol === "http:" && policy.allowHttp === false) return false;
    const allowedOrigins = policy.allowedOrigins;
    return (
      allowedOrigins === undefined ||
      allowedOrigins.some((origin) => safeOrigin(origin) === url.origin)
    );
  } catch {
    return false;
  }
}

function normalizeRetryPolicy(
  policy: MediaRetryPolicy | false | undefined,
): Required<MediaRetryPolicy> {
  if (policy === false)
    return { maxRetries: 0, baseDelayMs: 100, maxDelayMs: 1_000 };
  return {
    maxRetries: finiteNonNegativeInteger(policy?.maxRetries, 1),
    baseDelayMs: finiteNonNegative(policy?.baseDelayMs, 100),
    maxDelayMs: finiteNonNegative(policy?.maxDelayMs, 1_000),
  };
}

async function loadWithRetry<T>(
  load: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
  retry: Required<MediaRetryPolicy>,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await load(signal);
    } catch (error) {
      if (
        signal.aborted ||
        !(error instanceof MediaProviderError) ||
        !error.retryable ||
        attempt >= retry.maxRetries
      )
        throw error;
      const exponentialDelay = retry.baseDelayMs * 2 ** attempt;
      const requestedDelay = error.retryAfterMs ?? exponentialDelay;
      await waitForRetry(Math.min(retry.maxDelayMs, requestedDelay), signal);
      attempt += 1;
    }
  }
}

function waitForRetry(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        signal.removeEventListener("abort", abort);
        resolve();
      },
      Math.max(0, milliseconds),
    );
    const abort = (): void => {
      clearTimeout(timeout);
      reject(abortReason(signal));
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

function safeOrigin(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

function finiteNonNegative(
  value: number | undefined,
  fallback: number,
): number {
  return value !== undefined && Number.isFinite(value)
    ? Math.max(0, value)
    : fallback;
}

function finiteNonNegativeInteger(
  value: number | undefined,
  fallback: number,
): number {
  return Math.floor(finiteNonNegative(value, fallback));
}
