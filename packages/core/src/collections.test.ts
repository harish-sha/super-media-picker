import { describe, expect, it } from "vitest";

import {
  FavoritesManager,
  MemoryStorageAdapter,
  PersistentPreference,
  RecentItemsManager,
} from "./index";

describe("RecentItemsManager", () => {
  it("increments usage and persists ranked records", async () => {
    let now = 1_000;
    const storage = new MemoryStorageAdapter();
    const manager = new RecentItemsManager(storage, {
      now: () => now,
      recencyHalfLifeDays: 1,
    });

    await manager.record("rocket");
    now += 100;
    await manager.record("heart");
    now += 100;
    const records = await manager.record("rocket");

    expect(records).toEqual([
      { id: "rocket", count: 2, lastUsedAt: 1_200 },
      { id: "heart", count: 1, lastUsedAt: 1_100 },
    ]);
    expect(await new RecentItemsManager(storage).getRecents()).toHaveLength(2);
  });

  it("balances recency and frequency using documented options", async () => {
    let now = 10 * 86_400_000;
    const storage = new MemoryStorageAdapter();
    await storage.set("emoji.recents", [
      { id: "frequent", count: 32, lastUsedAt: now - 86_400_000 },
      { id: "new", count: 1, lastUsedAt: now },
    ]);
    const recencyFirst = new RecentItemsManager(storage, {
      now: () => now,
      recencyWeight: 1,
    });
    expect((await recencyFirst.getRecents())[0]?.id).toBe("new");

    const frequencyFirst = new RecentItemsManager(storage, {
      now: () => now,
      recencyWeight: 0,
    });
    expect((await frequencyFirst.getRecents())[0]?.id).toBe("frequent");
    now += 1;
  });

  it("ignores malformed persisted records and supports clearing", async () => {
    const storage = new MemoryStorageAdapter();
    await storage.set("emoji.recents", [{ id: "bad", count: 0, lastUsedAt: 1 }, null]);
    const manager = new RecentItemsManager(storage);
    expect(await manager.getRecents()).toEqual([]);
    await manager.record("valid");
    await manager.clear();
    expect(await manager.getRecents()).toEqual([]);
  });
});

describe("FavoritesManager", () => {
  it("adds, deduplicates, checks, removes, and persists favorites", async () => {
    const storage = new MemoryStorageAdapter();
    const manager = new FavoritesManager(storage);
    await manager.add("rocket");
    await manager.add("heart");
    await manager.add("rocket");
    expect(await manager.getFavorites()).toEqual(["rocket", "heart"]);
    expect(await manager.isFavorite("heart")).toBe(true);
    await manager.toggle("heart");
    expect(await manager.isFavorite("heart")).toBe(false);
    await manager.clear();
    expect(await manager.getFavorites()).toEqual([]);
  });
});

describe("PersistentPreference", () => {
  it("validates, persists, and resets a preference", async () => {
    const storage = new MemoryStorageAdapter();
    const preference = new PersistentPreference(storage, {
      storageKey: "tone",
      defaultValue: "default" as const,
      validate: (value): value is "default" => value === "default",
    });
    await storage.set("tone", "invalid");
    expect(await preference.get()).toBe("default");
    await preference.set("default");
    expect(await preference.get()).toBe("default");
    await preference.reset();
    expect(await storage.get("tone")).toBeNull();
  });
});
