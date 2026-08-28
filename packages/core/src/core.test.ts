import { describe, expect, it, vi } from "vitest";

import {
  LocalStorageAdapter,
  MediaProviderError,
  MemoryCache,
  MemoryStorageAdapter,
  createMediaPickerConfig,
} from "./index";

describe("createMediaPickerConfig", () => {
  it("merges an emoji-first default configuration", () => {
    expect(
      createMediaPickerConfig({ features: { favorites: true } }).features,
    ).toEqual({
      emoji: true,
      favorites: true,
      gifs: false,
      recents: false,
      stickers: false,
    });
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
