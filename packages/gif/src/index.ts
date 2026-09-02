import {
  MediaProviderError,
  HttpProviderTransport,
  isMediaItem,
  isSafeMediaUrl,
  type GifMediaItem,
  type HttpProviderAdapterOptions,
  type MediaProvider,
  type MediaProviderCapabilities,
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

export interface HttpGifProviderOptions extends HttpProviderAdapterOptions {
  readonly capabilities?: MediaProviderCapabilities;
  readonly displayName?: string;
}

/** Calls a host-owned backend endpoint; credentials never enter the SDK. */
export class HttpGifProvider implements GifProvider {
  readonly id: string;
  readonly displayName?: string;
  readonly attribution?: ProviderAttribution;
  readonly capabilities: MediaProviderCapabilities;
  readonly #transport: HttpProviderTransport;
  readonly #mediaSecurity: MediaUrlPolicy;

  constructor(options: HttpGifProviderOptions) {
    this.#transport = new HttpProviderTransport(options, {
      id: "http-gif",
      label: "GIF",
    });
    this.id = this.#transport.id;
    this.#mediaSecurity = options.mediaSecurity ?? {};
    this.capabilities = {
      mediaType: "gif",
      search: true,
      trending: true,
      pagination: true,
      animatedMedia: true,
      ...options.capabilities,
    };
    if (options.displayName !== undefined)
      this.displayName = options.displayName;
    if (this.#transport.attribution !== undefined)
      this.attribution = this.#transport.attribution;
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
    return this.#transport.request(
      {
        mode,
        ...(query === "" ? {} : { query }),
        ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
        ...(options.limit === undefined ? {} : { limit: options.limit }),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      },
      (value): value is SearchResult<GifMediaItem> =>
        isGifResult(value, this.#mediaSecurity),
      "GIF",
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
    (result.nextCursor === undefined ||
      typeof result.nextCursor === "string") &&
    (!result.hasMore ||
      (typeof result.nextCursor === "string" &&
        result.nextCursor.trim().length > 0))
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
