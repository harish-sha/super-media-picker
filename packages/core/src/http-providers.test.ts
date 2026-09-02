import { describe, expect, it, vi } from "vitest";

import {
  HttpCustomMediaProvider,
  HttpEmojiProvider,
  type AnyEmojiMediaItem,
  type CustomMediaItem,
} from "./index";

function requestUrl(input: RequestInfo | URL): URL {
  return new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
}

const animatedEmoji: AnyEmojiMediaItem = {
  type: "emoji",
  kind: "animated",
  id: "party",
  name: "Party",
  thumbnailUrl: "https://cdn.test/emoji/party-poster.webp",
  previewUrl: "https://cdn.test/emoji/party-preview.webp",
  animationUrl: "https://cdn.test/emoji/party.webm",
  format: "webm",
  width: 128,
  height: 128,
};

const customItem: CustomMediaItem = {
  type: "custom",
  id: "launch",
  kind: "brand",
  name: "Launch",
  thumbnailUrl: "https://cdn.test/custom/launch-poster.webp",
  previewUrl: "https://cdn.test/custom/launch-preview.webp",
  url: "https://cdn.test/custom/launch.webm",
  animated: true,
  format: "webm",
  width: 320,
  height: 180,
};

describe("HttpEmojiProvider", () => {
  it("loads pack metadata and cursor pages through the common contract", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation((input) => {
        const url = requestUrl(input);
        const value =
          url.searchParams.get("mode") === "packs"
            ? [
                {
                  id: "reactions",
                  name: "Reactions",
                  iconUrl: "https://cdn.test/packs/reactions.webp",
                  itemCount: 80,
                  animated: true,
                },
              ]
            : { items: [animatedEmoji], hasMore: false };
        return Promise.resolve(
          new Response(JSON.stringify(value), { status: 200 }),
        );
      });
    const provider = new HttpEmojiProvider({
      endpoint: "https://backend.test/emoji",
      fetch,
      mediaSecurity: {
        allowedOrigins: ["https://cdn.test"],
        allowHttp: false,
      },
    });

    await expect(provider.packs()).resolves.toMatchObject([
      { id: "reactions", itemCount: 80, animated: true },
    ]);
    await expect(
      provider.packItems("reactions", { cursor: "page-2", limit: 20 }),
    ).resolves.toEqual({ items: [animatedEmoji], hasMore: false });
    const pageRequest = fetch.mock.calls[1]?.[0];
    if (pageRequest === undefined) {
      throw new TypeError("Expected a pack-items request");
    }
    const pageUrl = requestUrl(pageRequest);
    expect(pageUrl.searchParams.get("mode")).toBe("pack");
    expect(pageUrl.searchParams.get("packId")).toBe("reactions");
    expect(pageUrl.searchParams.get("cursor")).toBe("page-2");
    expect(provider.capabilities).toMatchObject({
      mediaType: "emoji",
      packs: true,
      pagination: true,
      animatedMedia: true,
    });
  });

  it("drops unsafe pack icons and rejects unsafe animated assets", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "safe", name: "Safe", iconUrl: "javascript:alert(1)" },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ ...animatedEmoji, animationUrl: "javascript:alert(1)" }],
            hasMore: false,
          }),
          { status: 200 },
        ),
      );
    const provider = new HttpEmojiProvider({
      endpoint: "/api/media/emoji",
      fetch,
    });
    await expect(provider.packs()).resolves.toEqual([
      { id: "safe", name: "Safe" },
    ]);
    await expect(provider.trending()).rejects.toMatchObject({
      providerCode: "invalid_response",
    });
  });
});

describe("HttpCustomMediaProvider", () => {
  it("uses dynamic backend headers, retries safe failures, and caches", async () => {
    const headers = vi.fn(() => ({ Authorization: "Bearer session-token" }));
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 503,
          headers: { "retry-after": "0", "x-request-id": "upstream-1" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [customItem], hasMore: false }), {
          status: 200,
        }),
      );
    const provider = new HttpCustomMediaProvider({
      endpoint: "https://backend.test/custom",
      displayName: "Company media",
      fetch,
      headers,
      retry: { maxRetries: 1, baseDelayMs: 0 },
      mediaSecurity: { allowedOrigins: ["https://cdn.test"] },
    });

    const first = await provider.search("launch", { limit: 18 });
    await expect(provider.search("launch", { limit: 18 })).resolves.toEqual(
      first,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(headers).toHaveBeenCalledTimes(2);
    expect(
      new Headers(fetch.mock.calls[1]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer session-token");
    expect(provider.displayName).toBe("Company media");
    expect(provider.capabilities.mediaType).toBe("custom");
  });

  it("normalizes terminal HTTP errors with retry guidance", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { "retry-after": "2", "x-request-id": "limit-1" },
      }),
    );
    const provider = new HttpCustomMediaProvider({
      endpoint: "https://backend.test/custom",
      fetch,
      retry: false,
    });
    await expect(provider.trending()).rejects.toMatchObject({
      providerCode: "rate_limited",
      status: 429,
      retryable: true,
      retryAfterMs: 2_000,
      requestId: "limit-1",
    });
  });

  it("rejects missing cursors, unsafe URLs, and invalid dimensions", async () => {
    const responses = [
      { items: [customItem], hasMore: true },
      {
        items: [{ ...customItem, url: "javascript:alert(1)" }],
        hasMore: false,
      },
      { items: [{ ...customItem, width: 0 }], hasMore: false },
    ];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(responses.shift()), { status: 200 }),
        ),
      );
    const provider = new HttpCustomMediaProvider({
      endpoint: "https://backend.test/custom",
      fetch,
    });
    await expect(provider.trending()).rejects.toMatchObject({
      providerCode: "invalid_response",
    });
    await expect(provider.search("unsafe")).rejects.toMatchObject({
      providerCode: "invalid_response",
    });
    await expect(provider.search("dimensions")).rejects.toMatchObject({
      providerCode: "invalid_response",
    });
  });
});
