import {
  MediaProviderError,
  HttpProviderTransport,
  isMediaItem,
  isSafeMediaUrl,
  type ProviderAttribution,
  type ProviderOptions,
  type HttpProviderAdapterOptions,
  type MediaProviderCapabilities,
  type MediaUrlPolicy,
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

  async packs(options: ProviderOptions = {}): Promise<readonly StickerPack[]> {
    await wait(this.#delayMs, options.signal);
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

export interface HttpStickerProviderOptions extends HttpProviderAdapterOptions {
  readonly capabilities?: MediaProviderCapabilities;
  readonly displayName?: string;
}

/** Host-backend sticker provider with no frontend credentials. */
export class HttpStickerProvider implements StickerProvider {
  readonly id: string;
  readonly displayName?: string;
  readonly attribution?: ProviderAttribution;
  readonly capabilities: MediaProviderCapabilities;
  readonly #transport: HttpProviderTransport;
  readonly #mediaSecurity: MediaUrlPolicy;

  constructor(options: HttpStickerProviderOptions) {
    this.#transport = new HttpProviderTransport(options, {
      id: "http-stickers",
      label: "Sticker",
    });
    this.id = this.#transport.id;
    this.#mediaSecurity = options.mediaSecurity ?? {};
    this.capabilities = {
      mediaType: "sticker",
      search: true,
      trending: true,
      packs: true,
      pagination: true,
      animatedMedia: true,
      ...options.capabilities,
    };
    if (options.displayName !== undefined)
      this.displayName = options.displayName;
    if (this.#transport.attribution !== undefined)
      this.attribution = this.#transport.attribution;
  }

  packs(options: ProviderOptions = {}): Promise<readonly StickerPack[]> {
    return this.#request("packs", options, isStickerPacks).then((packs) =>
      packs.map((pack) => {
        if (
          pack.iconUrl === undefined ||
          isSafeMediaUrl(pack.iconUrl, this.#mediaSecurity)
        ) {
          return pack;
        }
        const { iconUrl, ...safePack } = pack;
        void iconUrl;
        return safePack;
      }),
    );
  }

  packItems(
    packId: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<StickerMediaItem>> {
    return this.#request(
      "pack",
      { ...options, query: packId },
      (value): value is SearchResult<StickerMediaItem> =>
        isStickerResult(value, this.#mediaSecurity),
    );
  }

  search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<StickerMediaItem>> {
    return this.#request(
      "search",
      { ...options, query },
      (value): value is SearchResult<StickerMediaItem> =>
        isStickerResult(value, this.#mediaSecurity),
    );
  }

  trending(
    options: SearchOptions = {},
  ): Promise<SearchResult<StickerMediaItem>> {
    return this.#request(
      "trending",
      options,
      (value): value is SearchResult<StickerMediaItem> =>
        isStickerResult(value, this.#mediaSecurity),
    );
  }

  #request<T>(
    mode: string,
    options: SearchOptions & { readonly query?: string },
    validate: (value: unknown) => value is T,
  ): Promise<T> {
    return this.#transport.request(
      {
        mode: mode as "packs" | "pack" | "search" | "trending",
        ...(options.query === undefined
          ? {}
          : mode === "pack"
            ? { packId: options.query }
            : { query: options.query }),
        ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
        ...(options.limit === undefined ? {} : { limit: options.limit }),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      },
      validate,
      "Sticker",
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
        typeof candidate.id === "string" &&
        candidate.id.trim().length > 0 &&
        typeof candidate.name === "string" &&
        candidate.name.trim().length > 0 &&
        (candidate.description === undefined ||
          typeof candidate.description === "string") &&
        (candidate.icon === undefined || typeof candidate.icon === "string") &&
        (candidate.iconUrl === undefined ||
          typeof candidate.iconUrl === "string") &&
        (candidate.provider === undefined ||
          typeof candidate.provider === "string") &&
        (candidate.itemCount === undefined ||
          (typeof candidate.itemCount === "number" &&
            Number.isInteger(candidate.itemCount) &&
            candidate.itemCount >= 0)) &&
        (candidate.animated === undefined ||
          typeof candidate.animated === "boolean") &&
        candidate.stickers === undefined
      );
    })
  );
}

function isStickerResult(
  value: unknown,
  policy: MediaUrlPolicy,
): value is SearchResult<StickerMediaItem> {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Readonly<Record<string, unknown>>;
  return (
    Array.isArray(result.items) &&
    result.items.every(
      (item) =>
        isMediaItem(item) &&
        item.type === "sticker" &&
        isSafeMediaUrl(item.url, policy) &&
        (item.thumbnailUrl === undefined ||
          isSafeMediaUrl(item.thumbnailUrl, policy)) &&
        (item.previewUrl === undefined ||
          isSafeMediaUrl(item.previewUrl, policy)),
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
