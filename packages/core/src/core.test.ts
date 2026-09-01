import { describe, expect, it, vi } from "vitest";

import {
  LocalStorageAdapter,
  MediaRequestClient,
  MediaProviderError,
  MemoryCache,
  MemoryStorageAdapter,
  createMediaPickerConfig,
  isSafeMediaUrl,
} from "./index";

describe("createMediaPickerConfig", () => {
  it("merges an emoji-first default configuration", () => {
    expect(
      createMediaPickerConfig({ features: { favorites: true } }).features,
    ).toEqual({
      emoji: true,
      animatedEmoji: false,
      customMedia: false,
      favorites: true,
      gifs: false,
      recents: false,
      stickers: false,
    });
  });
});

describe("MediaRequestClient", () => {
  it("deduplicates in-flight work and caches successful results", async () => {
    const load = vi.fn(async () => "result");
    const client = new MediaRequestClient({ cacheTtlMs: 1_000 });
    const [first, second] = await Promise.all([
      client.request("same", load),
      client.request("same", load),
    ]);
    expect([first, second]).toEqual(["result", "result"]);
    await expect(client.request("same", load)).resolves.toBe("result");
    expect(load).toHaveBeenCalledOnce();
  });

  it("reloads successful work after the configured cache TTL expires", async () => {
    let now = 1_000;
    const load = vi.fn(async () => `result-${now}`);
    const client = new MediaRequestClient({
      cache: new MemoryCache<unknown>(() => now),
      cacheTtlMs: 100,
    });
    await expect(client.request("query", load)).resolves.toBe("result-1000");
    now = 1_100;
    await expect(client.request("query", load)).resolves.toBe("result-1100");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("propagates timeout cancellation to provider work", async () => {
    const client = new MediaRequestClient({ timeoutMs: 5 });
    const request = client.request(
      "slow",
      (signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () =>
              reject(
                signal.reason instanceof Error
                  ? signal.reason
                  : new Error("Request aborted"),
              ),
            { once: true },
          );
        }),
    );
    await expect(request).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("keeps deduplicated work alive across an immediate StrictMode resubscribe", async () => {
    const client = new MediaRequestClient();
    const firstController = new AbortController();
    const secondController = new AbortController();
    let resolveLoad: ((value: string) => void) | undefined;
    const load = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((resolve, reject) => {
          resolveLoad = resolve;
          signal.addEventListener(
            "abort",
            () =>
              reject(
                signal.reason instanceof Error
                  ? signal.reason
                  : new DOMException("Aborted", "AbortError"),
              ),
            { once: true },
          );
        }),
    );

    const first = client.request("strict-mode", load, {
      signal: firstController.signal,
    });
    firstController.abort(new DOMException("Effect cleanup", "AbortError"));
    const second = client.request("strict-mode", load, {
      signal: secondController.signal,
    });
    await Promise.resolve();
    resolveLoad?.("result");

    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    await expect(second).resolves.toBe("result");
    expect(load).toHaveBeenCalledOnce();
  });
});

describe("isSafeMediaUrl", () => {
  it("accepts browser media sources and rejects executable schemes", () => {
    expect(isSafeMediaUrl("https://cdn.test/image.webp")).toBe(true);
    expect(isSafeMediaUrl("/tenant/sticker.webp")).toBe(true);
    expect(isSafeMediaUrl("data:image/gif;base64,R0lGODlhAQABAAAAACw=")).toBe(
      true,
    );
    expect(isSafeMediaUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeMediaUrl("data:text/html,<script>alert(1)</script>")).toBe(
      false,
    );
    expect(isSafeMediaUrl("//untrusted.test/image.gif")).toBe(false);
  });

  it("enforces HTTPS, relative, data, and origin policy when configured", () => {
    const policy = {
      allowedOrigins: ["https://media.company.test"],
      allowBlob: false,
      allowDataImages: false,
      allowHttp: false,
      allowRelative: false,
    } as const;
    expect(
      isSafeMediaUrl("https://media.company.test/image.webp", policy),
    ).toBe(true);
    expect(isSafeMediaUrl("https://other.test/image.webp", policy)).toBe(false);
    expect(isSafeMediaUrl("http://media.company.test/image.webp", policy)).toBe(
      false,
    );
    expect(isSafeMediaUrl("/media/image.webp", policy)).toBe(false);
    expect(isSafeMediaUrl("blob:https://media.company.test/id", policy)).toBe(
      false,
    );
    expect(isSafeMediaUrl("data:image/gif;base64,AAAA", policy)).toBe(false);
  });
});

describe("storage adapters", () => {
  it("round-trips values in memory", async () => {
    const storage = new MemoryStorageAdapter();
    await storage.set("selection", { id: "1" });
    await expect(storage.get("selection")).resolves.toEqual({ id: "1" });
    await storage.remove("selection");
    await expect(storage.get("selection")).resolves.toBeNull();
  });

  it("namespaces serialized local-storage values", async () => {
    const values = new Map<string, string>();
    const storage = new LocalStorageAdapter("test", {
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, value),
    });
    await storage.set("tone", "medium");
    expect(values.get("test:tone")).toBe('"medium"');
    await expect(storage.get("tone")).resolves.toBe("medium");
  });

  it("contains unavailable storage failures", async () => {
    const storage = new LocalStorageAdapter("test", {
      getItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    await expect(storage.get("x")).resolves.toBeNull();
    await expect(storage.set("x", true)).resolves.toBeUndefined();
    await expect(storage.remove("x")).resolves.toBeUndefined();
  });

  it("treats corrupt JSON and absent browser storage as empty", async () => {
    const corrupt = new LocalStorageAdapter("test", {
      getItem: () => "{not-json",
      removeItem: () => undefined,
      setItem: () => undefined,
    });
    await expect(corrupt.get("x")).resolves.toBeNull();
    await expect(new LocalStorageAdapter().get("x")).resolves.toBeNull();
  });
});

describe("MemoryCache", () => {
  it("expires entries using their TTL", () => {
    let now = 1_000;
    const cache = new MemoryCache<string>(() => now);
    cache.set("query", "result", 300);
    expect(cache.get("query")).toBe("result");
    now = 1_300;
    expect(cache.get("query")).toBeUndefined();
  });

  it("supports deletion and clearing", () => {
    const cache = new MemoryCache<number>();
    cache.set("a", 1);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
    cache.set("b", 2);
    cache.clear();
    expect(cache.get("b")).toBeUndefined();
  });
});

describe("MediaProviderError", () => {
  it("normalizes provider metadata and causes", () => {
    const cause = new Error("network");
    const error = new MediaProviderError("Unavailable", "mock", {
      cause,
      code: "offline",
    });
    expect(error).toMatchObject({
      cause,
      code: "request_failed",
      name: "MediaProviderError",
      provider: "mock",
      providerCode: "offline",
    });
    expect(vi.isMockFunction(error)).toBe(false);
  });
});
