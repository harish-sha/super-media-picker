import { describe, expect, it, vi } from "vitest";

import type { GifMediaItem } from "@super-media-picker/core";

import { HttpGifProvider, MockGifProvider } from "./index";

const items: readonly GifMediaItem[] = [
  {
    type: "gif",
    id: "wave",
    name: "Wave",
    provider: "mock",
    url: "https://cdn.test/wave.gif",
    previewUrl: "https://cdn.test/wave.webp",
  },
  {
    type: "gif",
    id: "party",
    name: "Party",
    provider: "mock",
    url: "https://cdn.test/party.gif",
    previewUrl: "https://cdn.test/party.webp",
  },
];

describe("MockGifProvider", () => {
  it("searches and paginates normalized items", async () => {
    const provider = new MockGifProvider({ items });
    await expect(provider.search("party")).resolves.toMatchObject({
      items: [items[1]],
      hasMore: false,
    });
    await expect(provider.trending({ limit: 1 })).resolves.toMatchObject({
      items: [items[0]],
      hasMore: true,
      nextCursor: "1",
    });
  });

  it("cancels delayed requests", async () => {
    const provider = new MockGifProvider({ items, delayMs: 100 });
    const controller = new AbortController();
    const request = provider.search("wave", { signal: controller.signal });
    controller.abort(new DOMException("stale", "AbortError"));
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("HttpGifProvider", () => {
  it("rejects executable and inline-data backend endpoints", () => {
    expect(
      () =>
        new HttpGifProvider({
          endpoint: "data:image/gif;base64,AAAA",
          fetch: vi.fn<typeof globalThis.fetch>(),
        }),
    ).toThrow("relative, HTTP, or HTTPS");
  });

  it("calls a host backend and deduplicates identical requests", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items, hasMore: false }), {
        status: 200,
      }),
    );
    const provider = new HttpGifProvider({
      endpoint: "https://backend.test/gifs",
      fetch,
    });
    const [first, second] = await Promise.all([
      provider.search("party"),
      provider.search("party"),
    ]);
    expect(first).toEqual(second);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("accepts valid empty responses and rejects malformed JSON without caching failures", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [], hasMore: false }), {
          status: 200,
        }),
      );
    const provider = new HttpGifProvider({
      endpoint: "https://backend.test/gifs",
      fetch,
    });
    await expect(provider.trending()).rejects.toMatchObject({
      name: "MediaProviderError",
      providerCode: "invalid_response",
    });
    await expect(provider.trending()).resolves.toEqual({
      items: [],
      hasMore: false,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("enforces returned media origins", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items, hasMore: false }), {
        status: 200,
      }),
    );
    const provider = new HttpGifProvider({
      endpoint: "https://backend.test/gifs",
      fetch,
      mediaSecurity: {
        allowedOrigins: ["https://approved.test"],
        allowHttp: false,
      },
    });
    await expect(provider.search("party")).rejects.toMatchObject({
      providerCode: "invalid_response",
    });
  });

  it("honors the provider timeout option", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () =>
              reject(
                init.signal?.reason instanceof Error
                  ? init.signal.reason
                  : new DOMException("Aborted", "AbortError"),
              ),
            { once: true },
          );
        }),
    );
    const provider = new HttpGifProvider({
      endpoint: "https://backend.test/gifs",
      fetch,
      timeoutMs: 5,
    });
    await expect(provider.trending()).rejects.toMatchObject({
      name: "MediaProviderError",
      providerCode: "timeout",
      cause: { name: "TimeoutError" },
    });
  });
});
