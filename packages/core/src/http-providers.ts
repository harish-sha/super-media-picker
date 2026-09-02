import { MediaProviderError } from "./errors";
import {
  isMediaItem,
  type AnyEmojiMediaItem,
  type CustomMediaItem,
} from "./media";
import type {
  CustomMediaProvider,
  EmojiPack,
  EmojiProvider,
  MediaProviderCapabilities,
  ProviderAttribution,
  ProviderOptions,
  SearchOptions,
  SearchResult,
} from "./provider";
import {
  MediaRequestClient,
  isSafeMediaUrl,
  type MediaRequestClientOptions,
  type MediaRetryPolicy,
  type MediaUrlPolicy,
} from "./request";

export type HttpProviderHeaders =
  | HeadersInit
  | ((
      context: HttpProviderHeaderContext,
    ) => HeadersInit | Promise<HeadersInit>);

export interface HttpProviderHeaderContext {
  readonly signal: AbortSignal;
}

export interface HttpProviderAdapterOptions {
  readonly id?: string;
  readonly endpoint: string;
  readonly fetch?: typeof globalThis.fetch;
  /** Browser-to-backend headers only. Never put an upstream vendor secret here. */
  readonly headers?: HttpProviderHeaders;
  readonly credentials?: RequestCredentials;
  readonly attribution?: ProviderAttribution;
  readonly cacheTtlMs?: number;
  readonly timeoutMs?: number;
  readonly retry?: MediaRetryPolicy | false;
  readonly endpointSecurity?: MediaUrlPolicy;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly requestClient?: MediaRequestClient;
}

export interface HttpProviderRequest {
  readonly mode: "packs" | "pack" | "search" | "trending";
  readonly query?: string;
  readonly packId?: string;
  readonly cursor?: string;
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

/** Shared GET/JSON transport used by the built-in host-backend adapters. */
export class HttpProviderTransport {
  readonly id: string;
  readonly attribution?: ProviderAttribution;
  readonly #endpoint: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #headers: HttpProviderHeaders | undefined;
  readonly #credentials: RequestCredentials | undefined;
  readonly #requests: MediaRequestClient;

  constructor(
    options: HttpProviderAdapterOptions,
    defaults: { readonly id: string; readonly label: string } = {
      id: "http-media",
      label: "Media",
    },
  ) {
    const endpointPolicy = {
      allowBlob: false,
      allowDataImages: false,
      allowHttp: true,
      allowRelative: true,
      ...options.endpointSecurity,
    } satisfies MediaUrlPolicy;
    if (!isSafeMediaUrl(options.endpoint, endpointPolicy))
      throw new TypeError(
        `${defaults.label} endpoint is not allowed by the endpoint security policy`,
      );
    this.id = options.id ?? defaults.id;
    this.#endpoint = options.endpoint;
    this.#fetch =
      options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.#headers = options.headers;
    this.#credentials = options.credentials;
    this.#requests =
      options.requestClient ??
      new MediaRequestClient(requestClientOptions(options));
    if (options.attribution !== undefined)
      this.attribution = options.attribution;
  }

  request<T>(
    request: HttpProviderRequest,
    validate: (value: unknown) => value is T,
    label: string,
  ): Promise<T> {
    const url = new URL(this.#endpoint, browserOrigin());
    url.searchParams.set("mode", request.mode);
    if (request.query !== undefined) url.searchParams.set("q", request.query);
    if (request.packId !== undefined)
      url.searchParams.set("packId", request.packId);
    if (request.cursor !== undefined && request.cursor !== "")
      url.searchParams.set("cursor", request.cursor);
    if (
      request.limit !== undefined &&
      Number.isFinite(request.limit) &&
      request.limit > 0
    )
      url.searchParams.set("limit", String(Math.floor(request.limit)));
    return this.#requests.request(
      `${this.id}:${url.toString()}`,
      async (signal) => {
        let headers: Headers;
        try {
          headers = new Headers(
            typeof this.#headers === "function"
              ? await this.#headers({ signal })
              : this.#headers,
          );
        } catch (error) {
          throw new MediaProviderError(
            `${label} backend headers could not be resolved`,
            this.id,
            { code: "configuration_error", cause: error },
          );
        }
        let response: Response;
        try {
          if (!headers.has("accept")) headers.set("accept", "application/json");
          response = await this.#fetch(url, {
            method: "GET",
            headers,
            signal,
            ...(this.#credentials === undefined
              ? {}
              : { credentials: this.#credentials }),
          });
        } catch (error) {
          if (signal.aborted) {
            if (isTimeoutReason(signal.reason))
              throw new MediaProviderError(
                `${label} backend request timed out`,
                this.id,
                {
                  code: "timeout",
                  cause: signal.reason,
                  retryable: false,
                },
              );
            throw abortReason(signal);
          }
          throw new MediaProviderError(
            `${label} backend request failed`,
            this.id,
            { code: "network", cause: error, retryable: true },
          );
        }
        if (!response.ok) throw responseError(response, this.id, label);
        let data: unknown;
        try {
          data = await response.json();
        } catch (error) {
          throw new MediaProviderError(
            `${label} backend returned malformed JSON`,
            this.id,
            { code: "invalid_response", cause: error },
          );
        }
        if (!validate(data))
          throw new MediaProviderError(
            `${label} backend returned an invalid response`,
            this.id,
            { code: "invalid_response" },
          );
        return data;
      },
      request.signal === undefined ? {} : { signal: request.signal },
    );
  }

  clearCache(): void {
    this.#requests.clear();
  }
}

export interface HttpEmojiProviderOptions extends HttpProviderAdapterOptions {
  readonly capabilities?: MediaProviderCapabilities;
  readonly displayName?: string;
}

/** Pack-aware animated/custom emoji adapter for a host-owned backend. */
export class HttpEmojiProvider implements EmojiProvider {
  readonly id: string;
  readonly displayName?: string;
  readonly attribution?: ProviderAttribution;
  readonly capabilities: MediaProviderCapabilities;
  readonly #transport: HttpProviderTransport;
  readonly #mediaSecurity: MediaUrlPolicy;

  constructor(options: HttpEmojiProviderOptions) {
    this.#transport = new HttpProviderTransport(options, {
      id: "http-emoji",
      label: "Emoji",
    });
    this.id = this.#transport.id;
    this.#mediaSecurity = options.mediaSecurity ?? {};
    this.capabilities = {
      mediaType: "emoji",
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

  packs(options: ProviderOptions = {}): Promise<readonly EmojiPack[]> {
    return this.#transport
      .request(
        { mode: "packs", ...withSignal(options.signal) },
        isEmojiPacks,
        "Emoji",
      )
      .then((packs) => sanitizeEmojiPacks(packs, this.#mediaSecurity));
  }

  packItems(
    packId: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<AnyEmojiMediaItem>> {
    return this.#result({ mode: "pack", packId, ...searchRequest(options) });
  }

  search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult<AnyEmojiMediaItem>> {
    return this.#result({ mode: "search", query, ...searchRequest(options) });
  }

  trending(
    options: SearchOptions = {},
  ): Promise<SearchResult<AnyEmojiMediaItem>> {
    return this.#result({ mode: "trending", ...searchRequest(options) });
  }

  #result(request: HttpProviderRequest) {
    return this.#transport.request(
      request,
      (value): value is SearchResult<AnyEmojiMediaItem> =>
        isSearchResult(value, (item) => isSafeEmoji(item, this.#mediaSecurity)),
      "Emoji",
    );
  }
}

export interface HttpCustomMediaProviderOptions extends HttpProviderAdapterOptions {
  readonly capabilities?: MediaProviderCapabilities;
  readonly displayName?: string;
}

/** Search/trending adapter for a host-owned tenant or enterprise media source. */
export class HttpCustomMediaProvider implements CustomMediaProvider {
  readonly id: string;
  readonly displayName?: string;
  readonly attribution?: ProviderAttribution;
  readonly capabilities: MediaProviderCapabilities;
  readonly #transport: HttpProviderTransport;
  readonly #mediaSecurity: MediaUrlPolicy;

  constructor(options: HttpCustomMediaProviderOptions) {
    this.#transport = new HttpProviderTransport(options, {
      id: "http-custom-media",
      label: "Custom media",
    });
    this.id = this.#transport.id;
    this.#mediaSecurity = options.mediaSecurity ?? {};
    this.capabilities = {
      mediaType: "custom",
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
  ): Promise<SearchResult<CustomMediaItem>> {
    return this.#result({ mode: "search", query, ...searchRequest(options) });
  }

  trending(
    options: SearchOptions = {},
  ): Promise<SearchResult<CustomMediaItem>> {
    return this.#result({ mode: "trending", ...searchRequest(options) });
  }

  #result(request: HttpProviderRequest) {
    return this.#transport.request(
      request,
      (value): value is SearchResult<CustomMediaItem> =>
        isSearchResult(
          value,
          (item): item is CustomMediaItem =>
            isMediaItem(item) &&
            item.type === "custom" &&
            safeItemUrls(item, this.#mediaSecurity),
        ),
      "Custom media",
    );
  }
}

function requestClientOptions(
  options: HttpProviderAdapterOptions,
): MediaRequestClientOptions {
  return {
    ...(options.cacheTtlMs === undefined
      ? {}
      : { cacheTtlMs: options.cacheTtlMs }),
    ...(options.timeoutMs === undefined
      ? {}
      : { timeoutMs: options.timeoutMs }),
    ...(options.retry === undefined ? {} : { retry: options.retry }),
  };
}

function browserOrigin(): string {
  return globalThis.location?.origin ?? "http://localhost";
}

function responseError(
  response: Response,
  provider: string,
  label: string,
): MediaProviderError {
  const status = response.status;
  const retryable =
    status === 408 || status === 425 || status === 429 || status >= 500;
  const code =
    status === 401
      ? "unauthorized"
      : status === 403
        ? "forbidden"
        : status === 404
          ? "not_found"
          : status === 429
            ? "rate_limited"
            : status >= 500
              ? "unavailable"
              : "http_error";
  const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
  const requestId = response.headers.get("x-request-id") ?? undefined;
  return new MediaProviderError(
    `${label} backend returned ${response.status}`,
    provider,
    {
      code,
      status,
      retryable,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
      ...(requestId === undefined ? {} : { requestId }),
    },
  );
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

function isTimeoutReason(value: unknown): boolean {
  return value instanceof DOMException && value.name === "TimeoutError";
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("Aborted", "AbortError");
}

function withSignal(signal: AbortSignal | undefined) {
  return signal === undefined ? {} : { signal };
}

function searchRequest(options: SearchOptions) {
  return {
    ...withSignal(options.signal),
    ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
  };
}

function isSearchResult<T>(
  value: unknown,
  validateItem: (item: unknown) => item is T,
): value is SearchResult<T> {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Readonly<Record<string, unknown>>;
  return (
    Array.isArray(result.items) &&
    result.items.every(validateItem) &&
    typeof result.hasMore === "boolean" &&
    (result.nextCursor === undefined ||
      typeof result.nextCursor === "string") &&
    (!result.hasMore ||
      (typeof result.nextCursor === "string" &&
        result.nextCursor.trim().length > 0))
  );
}

function isEmojiPacks(value: unknown): value is readonly EmojiPack[] {
  return Array.isArray(value) && value.every(isEmojiPack);
}

function isEmojiPack(value: unknown): value is EmojiPack {
  if (typeof value !== "object" || value === null) return false;
  const pack = value as Readonly<Record<string, unknown>>;
  return (
    typeof pack.id === "string" &&
    pack.id.trim().length > 0 &&
    typeof pack.name === "string" &&
    pack.name.trim().length > 0 &&
    optionalString(pack.description) &&
    optionalString(pack.iconUrl) &&
    optionalString(pack.icon) &&
    optionalString(pack.provider) &&
    optionalCount(pack.itemCount) &&
    (pack.animated === undefined || typeof pack.animated === "boolean") &&
    pack.items === undefined
  );
}

function sanitizeEmojiPacks(
  packs: readonly EmojiPack[],
  policy: MediaUrlPolicy,
): readonly EmojiPack[] {
  return packs.map((pack) => {
    if (pack.iconUrl === undefined || isSafeMediaUrl(pack.iconUrl, policy))
      return pack;
    const { iconUrl, ...safePack } = pack;
    void iconUrl;
    return safePack;
  });
}

function isSafeEmoji(
  value: unknown,
  policy: MediaUrlPolicy,
): value is AnyEmojiMediaItem {
  if (!isMediaItem(value) || value.type !== "emoji") return false;
  if (value.kind === "animated") {
    return (
      isSafeMediaUrl(value.animationUrl, policy) && safeItemUrls(value, policy)
    );
  }
  return value.kind === "custom" ? safeItemUrls(value, policy) : true;
}

function safeItemUrls(
  item: {
    readonly url?: string;
    readonly thumbnailUrl?: string;
    readonly previewUrl?: string;
  },
  policy: MediaUrlPolicy,
): boolean {
  return (
    (item.url === undefined || isSafeMediaUrl(item.url, policy)) &&
    (item.thumbnailUrl === undefined ||
      isSafeMediaUrl(item.thumbnailUrl, policy)) &&
    (item.previewUrl === undefined || isSafeMediaUrl(item.previewUrl, policy))
  );
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function optionalCount(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isInteger(value) && value >= 0)
  );
}
