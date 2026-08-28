import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within } from "@storybook/test";

import {
  MediaPicker,
  MemoryStorageAdapter,
  mediaPickerStorageKeys,
} from "@company/media-react";

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
