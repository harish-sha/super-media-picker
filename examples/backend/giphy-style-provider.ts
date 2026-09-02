/**
 * Framework-neutral reference for a Giphy-style search/trending backend.
 * It deliberately does not choose, import, or contact a real vendor.
 */

export interface UpstreamGif {
  readonly id: string;
  readonly title?: string;
  readonly alt?: string;
  readonly posterUrl?: string;
  readonly previewUrl: string;
  readonly originalUrl: string;
  readonly width?: number;
  readonly height?: number;
}

export interface UpstreamGifPage {
  readonly items: readonly UpstreamGif[];
  readonly nextCursor?: string;
}

export interface GiphyStyleVendorClient {
  readonly id: string;
  search(input: {
    readonly apiKey: string;
    readonly query: string;
    readonly cursor?: string;
    readonly limit: number;
    readonly signal: AbortSignal;
  }): Promise<UpstreamGifPage>;
  trending(input: {
    readonly apiKey: string;
    readonly cursor?: string;
    readonly limit: number;
    readonly signal: AbortSignal;
  }): Promise<UpstreamGifPage>;
}

export interface GifBackendDependencies {
  /** Read from server secrets at process startup; never serialize this value. */
  readonly vendorApiKey: string;
  readonly vendor: GiphyStyleVendorClient;
  readonly authorize: (request: Request) => Promise<boolean>;
  readonly cdn: {
    poster(input: UpstreamGif): string | undefined;
    preview(input: UpstreamGif): string;
    original(input: UpstreamGif): string;
  };
}

/** Matches `HttpGifProvider({ endpoint: "/api/media/gifs" })`. */
export function createGifBackendHandler(dependencies: GifBackendDependencies) {
  return async function handleGifRequest(request: Request): Promise<Response> {
    if (request.method !== "GET")
      return errorResponse(405, "method_not_allowed");
    if (!(await dependencies.authorize(request)))
      return errorResponse(401, "unauthorized");

    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    const cursor = optionalBounded(url.searchParams.get("cursor"), 2_000);
    const limit = boundedLimit(url.searchParams.get("limit"));
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    if (mode !== "search" && mode !== "trending")
      return errorResponse(400, "invalid_mode");
    if (mode === "search" && query === "")
      return errorResponse(400, "query_required");

    try {
      const upstream =
        mode === "search"
          ? await dependencies.vendor.search({
              apiKey: dependencies.vendorApiKey,
              query,
              limit,
              signal: request.signal,
              ...(cursor === undefined ? {} : { cursor }),
            })
          : await dependencies.vendor.trending({
              apiKey: dependencies.vendorApiKey,
              limit,
              signal: request.signal,
              ...(cursor === undefined ? {} : { cursor }),
            });
      const nextCursor = upstream.nextCursor;
      return Response.json(
        {
          items: upstream.items.map((item) => normalizeGif(item, dependencies)),
          hasMore: nextCursor !== undefined,
          ...(nextCursor === undefined ? {} : { nextCursor }),
        },
        {
          headers: {
            "cache-control":
              mode === "trending" ? "private, max-age=30" : "private, no-store",
          },
        },
      );
    } catch (error) {
      if (request.signal.aborted) throw error;
      // Log the internal error/request ID server-side; do not return raw vendor data.
      return errorResponse(502, "media_provider_unavailable", {
        "retry-after": "1",
      });
    }
  };
}

function normalizeGif(item: UpstreamGif, dependencies: GifBackendDependencies) {
  const thumbnailUrl = dependencies.cdn.poster(item);
  return {
    type: "gif" as const,
    id: item.id,
    provider: dependencies.vendor.id,
    ...(item.title === undefined ? {} : { name: item.title }),
    ...(item.alt === undefined ? {} : { alt: item.alt }),
    ...(thumbnailUrl === undefined ? {} : { thumbnailUrl }),
    previewUrl: dependencies.cdn.preview(item),
    url: dependencies.cdn.original(item),
    ...(validDimension(item.width) ? { width: item.width } : {}),
    ...(validDimension(item.height) ? { height: item.height } : {}),
  };
}

function boundedLimit(value: string | null): number {
  const requested = Number(value);
  return Number.isFinite(requested)
    ? Math.min(50, Math.max(1, Math.floor(requested)))
    : 18;
}

function optionalBounded(
  value: string | null,
  maximum: number,
): string | undefined {
  return value === null || value.length === 0 || value.length > maximum
    ? undefined
    : value;
}

function validDimension(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function errorResponse(
  status: number,
  code: string,
  headers?: HeadersInit,
): Response {
  return Response.json({ error: code }, { status, headers });
}
