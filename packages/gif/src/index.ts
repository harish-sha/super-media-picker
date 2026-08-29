import {
  MediaProviderError,
  MediaRequestClient,
  isMediaItem,
  isSafeMediaUrl,
  type GifMediaItem,
  type MediaProvider,
  type MediaUrlPolicy,
  type ProviderAttribution,
  type SearchOptions,
  type SearchResult,
} from "@super-media-picker/core";

export interface GifProvider extends MediaProvider<GifMediaItem> {
  search(
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult<GifMediaItem>>;
  trending(options?: SearchOptions): Promise<SearchResult<GifMediaItem>>;
}

export interface MockGifProviderOptions {
  readonly id?: string;
  readonly items: readonly GifMediaItem[];
  readonly delayMs?: number;
  readonly error?: boolean | ((query: string) => boolean);
  readonly attribution?: ProviderAttribution;
}

/** Deterministic, abortable mock suitable for demos, tests, and Storybook. */
export class MockGifProvider implements GifProvider {
  readonly id: string;
  readonly attribution?: ProviderAttribution;
  readonly #items: readonly GifMediaItem[];
  readonly #delayMs: number;
  readonly #error: MockGifProviderOptions["error"];

  constructor(options: MockGifProviderOptions) {
    this.id = options.id ?? "mock-gif";
    this.#items = options.items;
    this.#delayMs = Math.max(0, options.delayMs ?? 0);
    this.#error = options.error ?? false;
    if (options.attribution !== undefined)
      this.attribution = options.attribution;
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<GifMediaItem>> {
    await wait(this.#delayMs, options.signal);
    const shouldFail =
      typeof this.#error === "function" ? this.#error(query) : this.#error;
    if (shouldFail)
      throw new MediaProviderError("Mock GIF request failed", this.id);
    const normalized = query.trim().toLocaleLowerCase();
    const matches = this.#items.filter((item) =>
      `${item.name ?? ""} ${item.alt ?? ""}`
        .toLocaleLowerCase()
        .includes(normalized),
    );
    return paginate(matches, options);
  }

  async trending(
    options: SearchOptions = {},
  ): Promise<SearchResult<GifMediaItem>> {
    await wait(this.#delayMs, options.signal);
    if (this.#error === true)
      throw new MediaProviderError("Mock GIF request failed", this.id);
    return paginate(this.#items, options);
  }
}

export interface HttpGifProviderOptions {
  readonly id?: string;
  readonly endpoint: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly headers?: Readonly<Record<string, string>>;
  readonly attribution?: ProviderAttribution;
  readonly cacheTtlMs?: number;
  readonly timeoutMs?: number;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly requestClient?: MediaRequestClient;
}

/** Calls a host-owned backend endpoint; credentials never enter the SDK. */
export class HttpGifProvider implements GifProvider {
  readonly id: string;
  readonly attribution?: ProviderAttribution;
  readonly #endpoint: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #headers: Readonly<Record<string, string>>;
  readonly #requests: MediaRequestClient;
  readonly #mediaSecurity: MediaUrlPolicy;

  constructor(options: HttpGifProviderOptions) {
    if (
      !isSafeMediaUrl(options.endpoint, {
        allowBlob: false,
        allowDataImages: false,
        allowHttp: true,
      })
    )
      throw new TypeError("GIF endpoint must be relative, HTTP, or HTTPS");
    this.id = options.id ?? "http-gif";
    this.#endpoint = options.endpoint;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#headers = options.headers ?? {};
    this.#requests =
      options.requestClient ??
      new MediaRequestClient({
        ...(options.cacheTtlMs === undefined
          ? {}
          : { cacheTtlMs: options.cacheTtlMs }),
        ...(options.timeoutMs === undefined
          ? {}
          : { timeoutMs: options.timeoutMs }),
      });
    this.#mediaSecurity = options.mediaSecurity ?? {};
    if (options.attribution !== undefined)
      this.attribution = options.attribution;
  }

  search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<GifMediaItem>> {
    return this.#load("search", query, options);
  }

  trending(options: SearchOptions = {}): Promise<SearchResult<GifMediaItem>> {
    return this.#load("trending", "", options);
  }

  #load(
    mode: "search" | "trending",
    query: string,
    options: SearchOptions,
  ): Promise<SearchResult<GifMediaItem>> {
    const url = new URL(
      this.#endpoint,
      globalThis.location?.origin ?? "http://localhost",
    );
    url.searchParams.set("mode", mode);
    if (query !== "") url.searchParams.set("q", query);
    if (options.cursor !== undefined)
      url.searchParams.set("cursor", options.cursor);
    if (options.limit !== undefined)
      url.searchParams.set("limit", String(options.limit));
    const key = `${this.id}:${url.toString()}`;
    return this.#requests.request(
      key,
      async (signal) => {
        let response: Response;
        try {
          response = await this.#fetch(url, { headers: this.#headers, signal });
        } catch (error) {
          if (signal.aborted) {
            if (
              signal.reason instanceof DOMException &&
              signal.reason.name === "TimeoutError"
            )
              throw new MediaProviderError(
                "GIF backend request timed out",
                this.id,
                {
                  code: "timeout",
                  cause: signal.reason,
                },
              );
            throw signal.reason;
          }
          throw new MediaProviderError("GIF backend request failed", this.id, {
            cause: error,
          });
        }
        if (!response.ok)
          throw new MediaProviderError(
            `GIF backend returned ${response.status}`,
            this.id,
          );
        let data: unknown;
        try {
          data = await response.json();
        } catch (error) {
          throw new MediaProviderError(
            "GIF backend returned malformed JSON",
            this.id,
            { code: "invalid_response", cause: error },
          );
        }
        if (!isGifResult(data, this.#mediaSecurity))
          throw new MediaProviderError(
            "GIF backend returned an invalid response",
            this.id,
            {
              code: "invalid_response",
            },
          );
        return data;
      },
      options.signal === undefined ? {} : { signal: options.signal },
    );
  }
}

function isGifResult(
  value: unknown,
  policy: MediaUrlPolicy,
): value is SearchResult<GifMediaItem> {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Readonly<Record<string, unknown>>;
  return (
    Array.isArray(result.items) &&
    result.items.every(
      (item) =>
        isMediaItem(item) &&
        item.type === "gif" &&
        isSafeMediaUrl(item.url, policy) &&
        isSafeMediaUrl(item.previewUrl, policy) &&
        (item.thumbnailUrl === undefined ||
          isSafeMediaUrl(item.thumbnailUrl, policy)),
    ) &&
    typeof result.hasMore === "boolean" &&
    (result.nextCursor === undefined || typeof result.nextCursor === "string")
  );
}

function paginate<T>(
  items: readonly T[],
  options: SearchOptions,
): SearchResult<T> {
  const offset = Math.max(0, Number.parseInt(options.cursor ?? "0", 10) || 0);
  const limit = Math.max(1, options.limit ?? 12);
  const page = items.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  return {
    items: page,
    hasMore: nextOffset < items.length,
    ...(nextOffset < items.length ? { nextCursor: String(nextOffset) } : {}),
  };
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, milliseconds);
    const abort = (): void => {
      clearTimeout(timeout);
      reject(abortReason(signal));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function abortReason(signal?: AbortSignal): Error {
  return signal?.reason instanceof Error
    ? signal.reason
    : new DOMException("Aborted", "AbortError");
}
