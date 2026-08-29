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

const media = "/media";

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
        previewUrl: `${media}/animated-emoji/party.webp`,
        animationUrl: `${media}/animated-emoji/party.gif`,
        format: "gif",
        fallbackEmoji: "🥳",
      },
      {
        type: "emoji",
        kind: "custom",
        id: "company-mark",
        name: "Company mark",
        provider: "tenant-demo",
        url: `${media}/stickers/cat.webp`,
        fallbackText: ":company:",
      },
    ],
  },
];

const gifItems: readonly GifMediaItem[] = Array.from(
  { length: 12 },
  (_, index) => ({
    type: "gif",
    id: `demo-gif-${index + 1}`,
    name: index % 2 === 0 ? `Party ${index + 1}` : `Hello ${index + 1}`,
    alt:
      index % 2 === 0 ? "Colorful party animation" : "Friendly hello animation",
    provider: "mock-gif",
    thumbnailUrl:
      index % 2 === 0
        ? `${media}/gifs/celebration-poster.webp`
        : `${media}/gifs/hello-poster.webp`,
    previewUrl:
      index % 2 === 0
        ? `${media}/gifs/celebration.gif`
        : `${media}/gifs/hello.gif`,
    url:
      index % 2 === 0
        ? `${media}/gifs/celebration.gif`
        : `${media}/gifs/hello.gif`,
    width: 240,
    height: 180,
  }),
);

const stickerPacks: readonly StickerPack[] = [
  { id: "bears", name: "Bears", icon: "🐻", provider: "mock-stickers" },
  { id: "cats", name: "Cats", icon: "🐱", provider: "mock-stickers" },
];

const stickerItems: Readonly<Record<string, readonly StickerMediaItem[]>> = {
  bears: Array.from({ length: 5 }, (_, index) => ({
    type: "sticker",
    id: `bear-${index + 1}`,
    name: `Bear sticker ${index + 1}`,
    provider: "mock-stickers",
    packId: "bears",
    previewUrl: `${media}/stickers/bear.webp`,
    url:
      index === 0
        ? `${media}/stickers/bear-wave.gif`
        : `${media}/stickers/bear.webp`,
    animated: index === 0,
    format: index === 0 ? "gif" : "webp",
  })),
  cats: Array.from({ length: 5 }, (_, index) => ({
    type: "sticker",
    id: `cat-${index + 1}`,
    name: `Cat sticker ${index + 1}`,
    provider: "mock-stickers",
    packId: "cats",
    url: `${media}/stickers/cat.webp`,
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
    url: `${media}/custom/launch.webp`,
  },
  {
    type: "custom",
    kind: "brand",
    id: "support-card",
    name: "Support card",
    provider: "company-assets",
    url: `${media}/custom/support.webp`,
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
      attribution: { label: "Original local demo media" },
    }),
    stickers: new MockStickerProvider({
      packs: empty ? [] : stickerPacks,
      items: empty ? {} : stickerItems,
      delayMs,
      error: scenario === "error",
      attribution: { label: "Original local demo media" },
    }),
  };
}
