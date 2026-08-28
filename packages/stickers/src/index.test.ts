import { describe, expect, it } from "vitest";

import type { StickerMediaItem, StickerPack } from "@super-media-picker/core";

import { MockStickerProvider } from "./index";

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
  { id: "bears", name: "Bears", icon: "🐻" },
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
});
