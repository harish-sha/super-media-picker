import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within } from "@storybook/test";

import {
  EmojiPicker,
  GifPicker,
  MediaPicker,
  MemoryStorageAdapter,
  ReactionPicker,
  StickerPicker,
  mediaPickerStorageKeys,
} from "super-media-picker";
import { useGifSearch } from "super-media-picker/headless";

import { createMockProviders, customTabs, emojiPacks } from "./mockMedia";

const normalProviders = createMockProviders("normal");
const slowProviders = createMockProviders("delay");
const errorProviders = createMockProviders("error");

function HeadlessGifExample() {
  const gifs = useGifSearch({ provider: normalProviders.gifs });
  return (
    <section aria-label="Headless GIF picker example">
      <label>
        Search GIFs
        <input
          aria-label="Search headless GIFs"
          onChange={(event) => gifs.search(event.currentTarget.value)}
          value={gifs.query}
        />
      </label>
      <p aria-live="polite">
        {gifs.loading
          ? "Loading…"
          : (gifs.error?.message ?? `${gifs.results.length} results`)}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {gifs.results.map((item) => (
          <img
            alt={item.name}
            height={96}
            key={item.id}
            src={item.previewUrl ?? item.url}
            width={96}
          />
        ))}
      </div>
      {gifs.hasMore ? (
        <button onClick={gifs.loadMore} type="button">
          Load more
        </button>
      ) : null}
    </section>
  );
}

function storageWith(options: {
  readonly recents?: boolean;
  readonly favorites?: boolean;
}) {
  const storage = new MemoryStorageAdapter();
  if (options.recents) {
    void storage.set(mediaPickerStorageKeys.recents, [
      { id: "1f680", count: 4, lastUsedAt: Date.now() },
      { id: "2764", count: 2, lastUsedAt: Date.now() - 1_000 },
    ]);
  }
  if (options.favorites) {
    void storage.set(mediaPickerStorageKeys.favorites, ["1f680", "2764"]);
  }
  return storage;
}

const meta = {
  title: "Media Picker/Emoji",
  component: MediaPicker,
  args: {
    displayMode: "inline",
    features: { emoji: true, recents: true, favorites: true },
    onSelect: fn(),
  },
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof MediaPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmojiOnly: Story = {
  args: { features: { emoji: true, recents: false, favorites: false } },
};

export const Light: Story = { args: { theme: "light" } };

export const Dark: Story = { args: { theme: "dark" } };

export const System: Story = { args: { theme: "system" } };

export const CustomTheme: Story = {
  args: {
    theme: {
      mode: "light",
      tokens: {
        accent: "#8b35d1",
        background: "#fff9ef",
        surface: "#fff3dc",
        surfaceHover: "#f3e6ff",
        radiusLarge: "0.25rem",
      },
    },
  },
};

export const Mobile: Story = {
  args: { displayMode: "bottom-sheet" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const SmallContainer: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export const NoRecents: Story = {
  args: { defaultCategory: "Recent", storage: storageWith({}) },
};

export const WithRecents: Story = {
  args: {
    defaultCategory: "Recent",
    storage: storageWith({ recents: true }),
  },
};

export const NoFavorites: Story = {
  args: {
    defaultCategory: "Favorites",
    storage: storageWith({}),
  },
};

export const WithFavorites: Story = {
  args: {
    defaultCategory: "Favorites",
    storage: storageWith({ favorites: true }),
  },
};

export const SkinToneDefault: Story = { args: { defaultSkinTone: "default" } };

export const SkinToneMedium: Story = {
  args: { defaultSearchQuery: "thumbs up", defaultSkinTone: "medium" },
};

export const SkinToneMenuDarkBottomSheet: Story = {
  args: {
    defaultSearchQuery: "thumbs up",
    defaultSkinTone: "medium",
    displayMode: "bottom-sheet",
    theme: "dark",
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Emoji skin tone: Medium" }),
    );
  },
};

export const SearchResults: Story = { args: { defaultSearchQuery: "happy" } };

export const EmptySearch: Story = {
  args: { defaultSearchQuery: "not-a-real-emoji-query" },
};

export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button", { name: "grinning face" }).focus();
  },
};

export const CompactDefault: Story = {
  args: { mode: "compact" },
};

export const CompactCustomReactions: Story = {
  args: {
    compact: {
      reactions: ["👍", "❤️", "😀", "😢", "🙏", "👎", "😡"],
    },
    mode: "compact",
  },
};

export const CompactFrequent: Story = {
  args: {
    compact: { source: "frequent" },
    mode: "compact",
    storage: storageWith({ recents: true }),
  },
};

export const CompactFavorites: Story = {
  args: {
    compact: { source: "favorites" },
    mode: "compact",
    storage: storageWith({ favorites: true }),
  },
};

export const CompactDark: Story = {
  args: { mode: "compact", theme: "dark" },
};

export const CompactMobile: Story = {
  args: { displayMode: "bottom-sheet", mode: "compact" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const CompactToneMenuBottomSheet: Story = {
  args: {
    defaultSkinTone: "medium-dark",
    displayMode: "bottom-sheet",
    mode: "compact",
    theme: "light",
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Emoji skin tone: Medium-dark" }),
    );
  },
};

export const CompactWithExpand: Story = {
  args: { compact: { allowExpand: true }, mode: "compact" },
};

export const CompactWithoutExpand: Story = {
  args: { compact: { allowExpand: false }, mode: "compact" },
};

export const CompactKeyboard: Story = {
  args: { compact: { allowExpand: true }, mode: "compact" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button", { name: "thumbs up" }).focus();
    await userEvent.keyboard("{ArrowRight}");
  },
};

export const FullSmall: Story = {
  args: { mode: "full", size: "sm" },
};

export const FullMedium: Story = {
  args: { mode: "full", size: "md" },
};

export const FullLarge: Story = {
  args: { mode: "full", preview: { enabled: true }, size: "lg" },
};

export const FullCustomDimensions: Story = {
  args: { height: "65vh", mode: "full", width: "min(90vw, 30rem)" },
};

export const CompactToFull: Story = {
  args: {
    compact: { allowCollapse: true, allowExpand: true },
    defaultMode: "compact",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Open full media picker" }),
    );
  },
};

export const AnimatedEmoji: Story = {
  args: {
    animatedMedia: { autoplay: "visible", maxActiveAnimations: 2 },
    emojiPacks,
    features: { emoji: true, animatedEmoji: true },
  },
};

export const AnimatedEmojiHover: Story = {
  args: {
    animatedMedia: { autoplay: "hover" },
    emojiPacks,
    features: { emoji: true, animatedEmoji: true },
  },
};

export const ReducedMotion: Story = {
  args: {
    animatedMedia: { autoplay: "never" },
    emojiPacks,
    features: { emoji: true, animatedEmoji: true },
  },
};

export const GifTrending: Story = {
  args: {
    animatedMedia: { autoplay: "visible", maxActiveAnimations: 2 },
    defaultMediaType: "gif",
    features: { emoji: true, gifs: true },
    providers: normalProviders,
  },
};

export const GifSearch: Story = {
  args: {
    animatedMedia: { autoplay: "visible", maxActiveAnimations: 2 },
    defaultMediaType: "gif",
    defaultSearchQuery: "party",
    features: { emoji: true, gifs: true },
    providers: normalProviders,
  },
};

export const GifLoading: Story = {
  args: {
    defaultMediaType: "gif",
    features: { emoji: true, gifs: true },
    providers: slowProviders,
  },
};

export const GifError: Story = {
  args: {
    defaultMediaType: "gif",
    features: { emoji: true, gifs: true },
    providers: errorProviders,
  },
};

export const StickerPacks: Story = {
  args: {
    defaultMediaType: "stickers",
    features: { emoji: true, stickers: true },
    providers: normalProviders,
  },
};

export const AnimatedStickers: Story = {
  args: {
    animatedMedia: { autoplay: "hover" },
    defaultMediaType: "stickers",
    features: { emoji: true, stickers: true },
    providers: normalProviders,
  },
};

export const CustomStickerPack: Story = StickerPacks;

export const CustomEmoji: Story = {
  args: {
    emojiPacks,
    features: { emoji: true, animatedEmoji: true },
  },
};

export const CustomProvider: Story = {
  args: {
    customTabs,
    defaultMediaType: "custom",
    features: { emoji: true, customMedia: true },
  },
};

export const AllFeatures: Story = {
  args: {
    customTabs,
    emojiPacks,
    features: {
      emoji: true,
      animatedEmoji: true,
      gifs: true,
      stickers: true,
      customMedia: true,
      recents: true,
      favorites: true,
    },
    providers: normalProviders,
  },
};

export const ChannelRestricted: Story = {
  args: {
    capabilities: { emoji: true, gif: false, stickers: true },
    customTabs,
    emojiPacks,
    features: {
      emoji: true,
      gifs: true,
      stickers: true,
      customMedia: true,
    },
    providers: normalProviders,
  },
};

export const MobileAllFeatures: Story = {
  args: { ...AllFeatures.args, displayMode: "bottom-sheet" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const FullMediaPicker: Story = {
  args: { ...AllFeatures.args, mode: "full" },
};

export const StandaloneEmojiPicker: Story = {
  render: () => (
    <EmojiPicker
      emojiPacks={emojiPacks}
      features={{ animatedEmoji: true, favorites: true, recents: true }}
      onSelect={fn()}
    />
  ),
};

export const StandaloneGifPicker: Story = {
  render: () => <GifPicker onSelect={fn()} provider={normalProviders.gifs} />,
};

export const StandaloneStickerPicker: Story = {
  render: () => (
    <StickerPicker onSelect={fn()} provider={normalProviders.stickers} />
  ),
};

export const StandaloneReactionPicker: Story = {
  render: () => <ReactionPicker onSelect={fn()} source="frequent" />,
};

export const HeadlessCustomUi: Story = {
  render: () => <HeadlessGifExample />,
};
