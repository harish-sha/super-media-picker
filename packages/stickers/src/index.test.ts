import { describe, expect, it, vi } from "vitest";

import type { StickerMediaItem, StickerPack } from "@super-media-picker/core";

import { HttpStickerProvider, MockStickerProvider } from "./index";

const sticker: StickerMediaItem = {
  type: "sticker",
  id: "bear-wave",
  name: "Bear wave",
  packId: "bears",
  provider: "mock",
  url: "https://cdn.test/bear.webp",
  animated: false,
};
const packs: readonly StickerPack[] = [
  {
    id: "bears",
    name: "Bears",
    iconUrl: "https://cdn.test/packs/bears.webp",
  },
];

describe("MockStickerProvider", () => {
  it("lists packs, loads them lazily, and searches", async () => {
    const provider = new MockStickerProvider({
      packs,
      items: { bears: [sticker] },
    });
    await expect(provider.packs()).resolves.toEqual(packs);
    await expect(provider.packItems("bears")).resolves.toMatchObject({
      items: [sticker],
    });
    await expect(provider.search("wave")).resolves.toMatchObject({
      items: [sticker],
    });
  });

  it("cancels delayed pack metadata requests", async () => {
    const provider = new MockStickerProvider({
      packs,
      items: { bears: [sticker] },
      delayMs: 100,
    });
    const controller = new AbortController();
    const request = provider.packs({ signal: controller.signal });
    controller.abort(new DOMException("stale", "AbortError"));
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("HttpStickerProvider", () => {
  it("invokes the native browser fetch function with its global receiver", async () => {
    const fetch = vi.fn(async function (this: unknown) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return new Response(JSON.stringify(packs), { status: 200 });
    });
    vi.stubGlobal("fetch", fetch);
    try {
      const provider = new HttpStickerProvider({
        endpoint: "https://backend.test/stickers",
      });
      await expect(provider.packs()).resolves.toEqual(packs);
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps a shared pack request alive for an immediate StrictMode resubscribe", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_input, init) =>
        new Promise<Response>((resolve, reject) => {
          resolveResponse = resolve;
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
    const provider = new HttpStickerProvider({
      endpoint: "https://backend.test/stickers",
      fetch,
    });
    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = provider.packs({ signal: firstController.signal });
    firstController.abort(new DOMException("Effect cleanup", "AbortError"));
    const second = provider.packs({ signal: secondController.signal });
    await Promise.resolve();
    resolveResponse?.(
      new Response(JSON.stringify(packs), {
        status: 200,
      }),
    );

    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    await expect(second).resolves.toEqual(packs);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("deduplicates identical requests and caches successful pages", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [sticker], hasMore: false }), {
        status: 200,
      }),
    );
    const provider = new HttpStickerProvider({
      endpoint: "https://backend.test/stickers",
      fetch,
    });
    const [first, second] = await Promise.all([
      provider.search("bear"),
      provider.search("bear"),
    ]);
    expect(first).toEqual(second);
    await expect(provider.search("bear")).resolves.toEqual(first);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("loads pack metadata and cursor pages from a host backend", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation((input) => {
        const url = new URL(
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url,
        );
        const body =
          url.searchParams.get("mode") === "packs"
            ? packs
            : { items: [sticker], hasMore: false };
        return Promise.resolve(
          new Response(JSON.stringify(body), { status: 200 }),
        );
      });
    const provider = new HttpStickerProvider({
      endpoint: "https://backend.test/stickers",
      fetch,
    });
    await expect(provider.packs()).resolves.toEqual(packs);
    await expect(provider.packItems("bears", { limit: 18 })).resolves.toEqual({
      items: [sticker],
      hasMore: false,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("drops unsafe pack icon URLs without rejecting otherwise valid packs", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify([
            { id: "safe-pack", name: "Safe", iconUrl: "javascript:alert(1)" },
          ]),
          { status: 200 },
        ),
      );
    const provider = new HttpStickerProvider({
      endpoint: "https://backend.test/stickers",
      fetch,
    });

    await expect(provider.packs()).resolves.toEqual([
      { id: "safe-pack", name: "Safe" },
    ]);
  });

  it("normalizes malformed and unsafe responses", async () => {
    const unsafe = { ...sticker, url: "javascript:alert(1)" };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [unsafe], hasMore: false }), {
        status: 200,
      }),
    );
    const provider = new HttpStickerProvider({
      endpoint: "https://backend.test/stickers",
      fetch,
    });
    await expect(provider.search("bear")).rejects.toMatchObject({
      name: "MediaProviderError",
      providerCode: "invalid_response",
    });
  });

  it("normalizes provider timeouts", async () => {
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
    const provider = new HttpStickerProvider({
      endpoint: "https://backend.test/stickers",
      fetch,
      timeoutMs: 5,
    });
    await expect(provider.search("bear")).rejects.toMatchObject({
      name: "MediaProviderError",
      providerCode: "timeout",
      cause: { name: "TimeoutError" },
    });
  });
});
