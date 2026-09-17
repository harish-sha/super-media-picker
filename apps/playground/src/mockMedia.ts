import {
  MockGifProvider,
  MockStickerProvider,
  type CustomMediaItem,
  type CustomMediaTab,
  type AnimatedEmojiMediaItem,
  type EmojiPack,
  type GifMediaItem,
  type MediaProvider,
  type MediaPickerRenderers,
  type StickerMediaItem,
  type StickerPack,
} from "super-media-picker";

export type MockScenario = "normal" | "delay" | "error" | "empty";

const media = "/media";

const animatedConceptMetadata = [
  {
    id: "wave",
    name: "Animated wave",
    fallbackEmoji: "👋",
    aliases: ["hello", "hi"],
    keywords: ["greeting", "hand", "welcome"],
  },
  {
    id: "heart",
    name: "Animated heart",
    fallbackEmoji: "❤️",
    aliases: ["heart", "love"],
    keywords: ["pulse", "care", "affection"],
  },
  {
    id: "laugh",
    name: "Animated laugh",
    fallbackEmoji: "😂",
    aliases: ["laugh", "lol"],
    keywords: ["funny", "joy", "happy"],
  },
  {
    id: "party",
    name: "Animated party",
    fallbackEmoji: "🥳",
    aliases: ["party", "celebrate"],
    keywords: ["celebration", "success", "confetti"],
  },
  {
    id: "fire",
    name: "Animated fire",
    fallbackEmoji: "🔥",
    aliases: ["fire", "lit"],
    keywords: ["flame", "hot", "flicker"],
  },
  {
    id: "clap",
    name: "Animated clap",
    fallbackEmoji: "👏",
    aliases: ["clap", "applause"],
    keywords: ["bravo", "congratulations", "hands"],
  },
  {
    id: "celebrate",
    name: "Animated celebration",
    fallbackEmoji: "🎉",
    aliases: ["celebrate", "confetti"],
    keywords: ["burst", "party", "success"],
  },
  {
    id: "thanks",
    name: "Animated thanks",
    fallbackEmoji: "🙏",
    aliases: ["thanks", "thank-you"],
    keywords: ["gratitude", "please", "appreciation"],
  },
  {
    id: "wow",
    name: "Animated wow",
    fallbackEmoji: "😮",
    aliases: ["wow", "surprised"],
    keywords: ["amazed", "shock", "pop"],
  },
  {
    id: "sad",
    name: "Animated sad",
    fallbackEmoji: "😢",
    aliases: ["sad", "cry"],
    keywords: ["tear", "unhappy", "feeling"],
  },
  {
    id: "angry",
    name: "Animated angry",
    fallbackEmoji: "😠",
    aliases: ["angry", "mad"],
    keywords: ["annoyed", "upset", "reaction"],
  },
  {
    id: "rocket",
    name: "Animated rocket",
    fallbackEmoji: "🚀",
    aliases: ["rocket", "launch"],
    keywords: ["space", "ship", "liftoff"],
  },
  {
    id: "coffee",
    name: "Animated coffee",
    fallbackEmoji: "☕",
    aliases: ["coffee", "cafe"],
    keywords: ["drink", "break", "morning"],
  },
  {
    id: "yes",
    name: "Animated yes",
    fallbackEmoji: "✅",
    aliases: ["yes", "okay"],
    keywords: ["approve", "check", "correct"],
  },
  {
    id: "no",
    name: "Animated no",
    fallbackEmoji: "❌",
    aliases: ["no", "nope"],
    keywords: ["reject", "cross", "incorrect"],
  },
  {
    id: "love",
    name: "Animated love",
    fallbackEmoji: "😍",
    aliases: ["love", "adoring"],
    keywords: ["hearts", "affection", "favorite"],
  },
] as const;

const animatedConceptItems: readonly AnimatedEmojiMediaItem[] =
  animatedConceptMetadata.map<AnimatedEmojiMediaItem>((concept) => {
    const animationFormat = concept.id === "heart" ? "webp" : "gif";
    const animationFile =
      concept.id === "heart" ? "heart-animated.webp" : `${concept.id}.gif`;
    return {
      type: "emoji",
      kind: "animated",
      id: `animated-${concept.id}`,
      name: concept.name,
      provider: "local-demo",
      posterUrl: `${media}/animated-emoji/${concept.id}.webp`,
      previewUrl: `${media}/animated-emoji/${concept.id}.webp`,
      animationUrl: `${media}/animated-emoji/${animationFile}`,
      format: animationFormat,
      fallbackEmoji: concept.fallbackEmoji,
      aliases: concept.aliases,
      keywords: concept.keywords,
      localeKeywords: concept.id === "party" ? { hi: ["jashn", "badhai"] } : {},
      packId: "demo-reactions",
      playbackPolicy: "on-intent",
      assets: [
        {
          role: "poster",
          url: `${media}/animated-emoji/${concept.id}.webp`,
          format: "webp",
          width: 160,
          height: 160,
        },
        {
          role: "animation",
          url: `${media}/animated-emoji/${animationFile}`,
          format: animationFormat,
          width: 160,
          height: 160,
        },
      ],
      ...(concept.id === "party"
        ? {
            variants: [
              {
                id: "animated-party-webm",
                name: "Animated party WebM",
                fallbackEmoji: "🥳",
                posterUrl: `${media}/animated-emoji/party.webp`,
                animationUrl: `${media}/animated-emoji/party.webm`,
                format: "webm" as const,
              },
            ],
          }
        : {}),
    };
  });

export const emojiPacks: readonly EmojiPack[] = [
  {
    id: "demo-reactions",
    name: "Demo reactions",
    description: "Tiny self-owned fixtures for animated emoji validation.",
    iconUrl: `${media}/animated-emoji/party.webp`,
    posterUrl: `${media}/animated-emoji/party.webp`,
    version: "1.0.0",
    revision: "fixture-1",
    provider: "local-demo",
    attribution: { label: "Original Super Media demo artwork" },
    capabilities: {
      animated: true,
      custom: true,
      pagination: false,
      search: true,
      variants: true,
    },
    itemCount: 20,
    animated: true,
    searchable: true,
    paginated: false,
    locales: ["en", "hi"],
    items: [
      ...animatedConceptItems,
      {
        type: "emoji",
        kind: "animated",
        id: "animated-party-webm",
        name: "Animated party WebM",
        provider: "local-demo",
        posterUrl: `${media}/animated-emoji/party.webp`,
        animationUrl: `${media}/animated-emoji/party.webm`,
        originalUrl: `${media}/animated-emoji/party.webm`,
        format: "webm",
        fallbackEmoji: "🎉",
        aliases: ["party-video"],
        keywords: ["webm", "celebration"],
        packId: "demo-reactions",
        loopPolicy: "loop",
      },
      {
        type: "emoji",
        kind: "animated",
        id: "animated-sparkle-lottie",
        name: "Animated sparkle Lottie",
        provider: "local-demo",
        posterUrl: `${media}/animated-emoji/party.webp`,
        animationUrl: `${media}/animated-emoji/sparkle.lottie.json`,
        format: "lottie",
        fallbackEmoji: "✨",
        aliases: ["sparkle"],
        keywords: ["shine", "magic"],
        packId: "demo-reactions",
      },
      {
        type: "emoji",
        kind: "animated",
        id: "broken-wave",
        name: "Broken wave fallback",
        provider: "local-demo",
        posterUrl: `${media}/animated-emoji/missing-poster.webp`,
        animationUrl: `${media}/animated-emoji/missing-animation.gif`,
        format: "gif",
        fallbackEmoji: "👋",
        aliases: ["broken-wave"],
        keywords: ["failure", "fallback"],
        packId: "demo-reactions",
      },
      {
        type: "emoji",
        kind: "custom",
        id: "company-mark",
        name: "Company mark",
        provider: "tenant-demo",
        url: `${media}/stickers/cat.webp`,
        fallbackText: ":company:",
        fallbackEmoji: "🏢",
        aliases: ["company"],
        keywords: ["brand", "organization"],
        packId: "demo-reactions",
      },
    ],
  },
];

/** Dependency-free host adapter used only to exercise the Lottie lifecycle. */
export const demoRenderers: MediaPickerRenderers = {
  animatedMedia: {
    lottie: {
      mount(target, { reducedMotion, setState }) {
        const glyph = document.createElement("span");
        glyph.className = "demo-lottie-glyph";
        glyph.textContent = "✨";
        target.append(glyph);
        let animation: Animation | undefined;
        return {
          play() {
            if (reducedMotion) return;
            setState("playing");
            animation = glyph.animate(
              [
                { transform: "scale(.82) rotate(-8deg)", opacity: 0.7 },
                { transform: "scale(1.08) rotate(8deg)", opacity: 1 },
                { transform: "scale(.82) rotate(-8deg)", opacity: 0.7 },
              ],
              { duration: 720, iterations: Infinity, easing: "ease-in-out" },
            );
          },
          pause() {
            animation?.pause();
            setState("paused");
          },
          stop() {
            animation?.cancel();
          },
          destroy() {
            animation?.cancel();
            glyph.remove();
          },
        };
      },
    },
  },
};

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
  {
    id: "bears",
    name: "Bears",
    iconUrl: `${media}/stickers/bear.webp`,
    provider: "mock-stickers",
  },
  { id: "cats", name: "Cats", provider: "mock-stickers" },
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
