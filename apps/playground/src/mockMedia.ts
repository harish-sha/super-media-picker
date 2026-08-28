import {
  MockGifProvider,
  MockStickerProvider,
  type CustomMediaItem,
  type CustomMediaTab,
  type EmojiPack,
  type GifMediaItem,
  type MediaProvider,
  type StickerMediaItem,
  type StickerPack,
} from "super-media-picker";

export type MockScenario = "normal" | "delay" | "error" | "empty";

const animatedPixel =
  "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

function fixture(label: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" rx="18" fill="${color}"/><text x="80" y="68" text-anchor="middle" font-size="22" font-family="sans-serif" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const emojiPacks: readonly EmojiPack[] = [
  {
    id: "demo-reactions",
    name: "Demo reactions",
    icon: "✨",
    provider: "local-demo",
    items: [
      {
        type: "emoji",
        kind: "animated",
        id: "animated-party",
        name: "Animated party",
        provider: "local-demo",
        previewUrl: fixture("Party", "#8b5cf6"),
        animationUrl: animatedPixel,
        format: "gif",
        fallbackEmoji: "🥳",
      },
      {
        type: "emoji",
        kind: "custom",
        id: "company-mark",
        name: "Company mark",
        provider: "tenant-demo",
        url: fixture("ACME", "#2563eb"),
        fallbackText: ":company:",
      },
    ],
  },
];

const gifItems: readonly GifMediaItem[] = Array.from(
  { length: 42 },
  (_, index) => ({
    type: "gif",
    id: `demo-gif-${index + 1}`,
    name: index % 2 === 0 ? `Party ${index + 1}` : `Hello ${index + 1}`,
    alt:
      index % 2 === 0 ? "Colorful party animation" : "Friendly hello animation",
    provider: "mock-gif",
    previewUrl: fixture(
      `GIF ${index + 1}`,
      index % 2 === 0 ? "#db2777" : "#0891b2",
    ),
    url: animatedPixel,
    width: 160,
    height: 120,
  }),
);

const stickerPacks: readonly StickerPack[] = [
  { id: "bears", name: "Bears", icon: "🐻", provider: "mock-stickers" },
  { id: "cats", name: "Cats", icon: "🐱", provider: "mock-stickers" },
];

const stickerItems: Readonly<Record<string, readonly StickerMediaItem[]>> = {
  bears: Array.from({ length: 20 }, (_, index) => ({
    type: "sticker",
    id: `bear-${index + 1}`,
    name: `Bear sticker ${index + 1}`,
    provider: "mock-stickers",
    packId: "bears",
    previewUrl: fixture(`Bear ${index + 1}`, "#b45309"),
    url: index === 0 ? animatedPixel : fixture(`Bear ${index + 1}`, "#b45309"),
    animated: index === 0,
    format: index === 0 ? "gif" : "webp",
  })),
  cats: Array.from({ length: 16 }, (_, index) => ({
    type: "sticker",
    id: `cat-${index + 1}`,
    name: `Cat sticker ${index + 1}`,
    provider: "mock-stickers",
    packId: "cats",
    url: fixture(`Cat ${index + 1}`, "#7c3aed"),
    animated: false,
    format: "webp",
  })),
};

const customItems: readonly CustomMediaItem[] = [
  {
    type: "custom",
    kind: "brand",
    id: "launch-card",
    name: "Launch card",
    provider: "company-assets",
    url: fixture("Launch", "#059669"),
  },
  {
    type: "custom",
    kind: "brand",
    id: "support-card",
    name: "Support card",
    provider: "company-assets",
    url: fixture("Support", "#ea580c"),
  },
];

const customProvider: MediaProvider<CustomMediaItem> = {
  id: "company-assets",
  attribution: { label: "Company demo assets" },
  async search(query) {
    const normalized = query.toLocaleLowerCase();
    const items = customItems.filter(({ name }) =>
      name.toLocaleLowerCase().includes(normalized),
    );
    return { items, hasMore: false };
  },
  async trending() {
    return { items: customItems, hasMore: false };
  },
};

export const customTabs: readonly CustomMediaTab[] = [
  {
    id: "company-assets",
    label: "Company",
    icon: "◆",
    provider: customProvider,
  },
];

export function createMockProviders(scenario: MockScenario) {
  const empty = scenario === "empty";
  const delayMs = scenario === "delay" ? 900 : 80;
  return {
    gifs: new MockGifProvider({
      items: empty ? [] : gifItems,
      delayMs,
      error: scenario === "error",
      attribution: { label: "Mock GIF provider" },
    }),
    stickers: new MockStickerProvider({
      packs: empty ? [] : stickerPacks,
      items: empty ? {} : stickerItems,
      delayMs,
      error: scenario === "error",
      attribution: { label: "Mock sticker provider" },
    }),
  };
}
