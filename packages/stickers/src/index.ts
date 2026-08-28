import {
  MediaProviderError,
  MediaRequestClient,
  isMediaItem,
  isSafeMediaUrl,
  type ProviderAttribution,
  type SearchOptions,
  type SearchResult,
  type StickerMediaItem,
  type StickerPack,
  type StickerProvider,
} from "@super-media-picker/core";

export interface MockStickerProviderOptions {
  readonly id?: string;
  readonly packs: readonly StickerPack[];
  readonly items: Readonly<Record<string, readonly StickerMediaItem[]>>;
  readonly delayMs?: number;
  readonly error?: boolean;
  readonly attribution?: ProviderAttribution;
}

/** Pack-aware abortable mock provider for local and tenant sticker fixtures. */
export class MockStickerProvider implements StickerProvider {
  readonly id: string;
  readonly attribution?: ProviderAttribution;
  readonly #packs: readonly StickerPack[];
  readonly #items: Readonly<Record<string, readonly StickerMediaItem[]>>;
  readonly #delayMs: number;
  readonly #error: boolean;

  constructor(options: MockStickerProviderOptions) {
    this.id = options.id ?? "mock-stickers";
    this.#packs = options.packs;
    this.#items = options.items;
    this.#delayMs = Math.max(0, options.delayMs ?? 0);
    this.#error = options.error ?? false;
    if (options.attribution !== undefined)
      this.attribution = options.attribution;
  }

  async packs(): Promise<readonly StickerPack[]> {
    await wait(this.#delayMs);
    if (this.#error)
      throw new MediaProviderError("Mock sticker request failed", this.id);
    return this.#packs;
  }

  async packItems(
    packId: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<StickerMediaItem>> {
    await wait(this.#delayMs, options.signal);
    if (this.#error)
      throw new MediaProviderError("Mock sticker request failed", this.id);
    return paginate(this.#items[packId] ?? [], options);
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<StickerMediaItem>> {
    await wait(this.#delayMs, options.signal);
    if (this.#error)
      throw new MediaProviderError("Mock sticker request failed", this.id);
    const normalized = query.trim().toLocaleLowerCase();
    const items = Object.values(this.#items)
      .flat()
      .filter((item) =>
        `${item.name ?? ""} ${item.alt ?? ""}`
          .toLocaleLowerCase()
          .includes(normalized),
      );
    return paginate(items, options);
  }

  trending(
    options: SearchOptions = {},
  ): Promise<SearchResult<StickerMediaItem>> {
    return this.packItems(this.#packs[0]?.id ?? "", options);
  }
}

export interface HttpStickerProviderOptions {
  readonly id?: string;
  readonly endpoint: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly headers?: Readonly<Record<string, string>>;
  readonly attribution?: ProviderAttribution;
  readonly requestClient?: MediaRequestClient;
}

/** Host-backend sticker provider with no frontend credentials. */
export class HttpStickerProvider implements StickerProvider {
  readonly id: string;
  readonly attribution?: ProviderAttribution;
  readonly #endpoint: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #headers: Readonly<Record<string, string>>;
  readonly #requests: MediaRequestClient;

  constructor(options: HttpStickerProviderOptions) {
    if (!isSafeMediaUrl(options.endpoint))
      throw new TypeError("Sticker endpoint must use a safe URL scheme");
    this.id = options.id ?? "http-stickers";
    this.#endpoint = options.endpoint;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#headers = options.headers ?? {};
    this.#requests = options.requestClient ?? new MediaRequestClient();
    if (options.attribution !== undefined)
      this.attribution = options.attribution;
  }

  packs(): Promise<readonly StickerPack[]> {
    return this.#request("packs", {}, isStickerPacks);
  }

  packItems(
    packId: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<StickerMediaItem>> {
    return this.#request(
      "pack",
      { ...options, query: packId },
      isStickerResult,
    );
  }

  search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<StickerMediaItem>> {
    return this.#request("search", { ...options, query }, isStickerResult);
  }

  trending(
    options: SearchOptions = {},
  ): Promise<SearchResult<StickerMediaItem>> {
    return this.#request("trending", options, isStickerResult);
  }

  #request<T>(
    mode: string,
    options: SearchOptions & { readonly query?: string },
    validate: (value: unknown) => value is T,
  ): Promise<T> {
    const url = new URL(
      this.#endpoint,
      globalThis.location?.origin ?? "http://localhost",
    );
    url.searchParams.set("mode", mode);
    if (options.query !== undefined)
      url.searchParams.set(mode === "pack" ? "packId" : "q", options.query);
    if (options.cursor !== undefined)
      url.searchParams.set("cursor", options.cursor);
    if (options.limit !== undefined)
      url.searchParams.set("limit", String(options.limit));
    return this.#requests.request(
      `${this.id}:${url.toString()}`,
      async (signal) => {
        let response: Response;
        try {
          response = await this.#fetch(url, { headers: this.#headers, signal });
        } catch (error) {
          throw new MediaProviderError(
            "Sticker backend request failed",
            this.id,
            { cause: error },
          );
        }
        if (!response.ok)
          throw new MediaProviderError(
            `Sticker backend returned ${response.status}`,
            this.id,
          );
        const data: unknown = await response.json();
        if (!validate(data))
          throw new MediaProviderError(
            "Sticker backend returned an invalid response",
            this.id,
            { code: "invalid_response" },
          );
        return data;
      },
      options.signal === undefined ? {} : { signal: options.signal },
    );
  }
}

function isStickerPacks(value: unknown): value is readonly StickerPack[] {
  return (
    Array.isArray(value) &&
    value.every((pack: unknown) => {
      if (typeof pack !== "object" || pack === null) return false;
      const candidate = pack as Readonly<Record<string, unknown>>;
      return (
        typeof candidate.id === "string" && typeof candidate.name === "string"
      );
    })
  );
}

function isStickerResult(
  value: unknown,
): value is SearchResult<StickerMediaItem> {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Readonly<Record<string, unknown>>;
  return (
    Array.isArray(result.items) &&
    result.items.every(
      (item) =>
        isMediaItem(item) &&
        item.type === "sticker" &&
        isSafeMediaUrl(item.url),
    ) &&
    typeof result.hasMore === "boolean"
  );
}

function paginate<T>(
  items: readonly T[],
  options: SearchOptions,
): SearchResult<T> {
  const offset = Math.max(0, Number.parseInt(options.cursor ?? "0", 10) || 0);
  const limit = Math.max(1, options.limit ?? 24);
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
