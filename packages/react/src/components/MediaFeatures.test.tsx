import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  MemoryStorageAdapter,
  type AnimatedEmojiMediaItem,
  type CustomEmojiMediaItem,
  type CustomMediaItem,
  type GifMediaItem,
  type MediaItem,
  type MediaProvider,
  type StickerMediaItem,
  type StickerProvider,
} from "@super-media-picker/core";

import {
  AnimatedMediaRenderer,
  AnimationConcurrencyManager,
} from "./AnimatedMediaRenderer";
import { MediaPicker } from "./MediaPicker";

const gif: GifMediaItem = {
  type: "gif",
  id: "party",
  name: "Party",
  provider: "mock",
  previewUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
  url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
};

const sticker: StickerMediaItem = {
  type: "sticker",
  id: "bear-wave",
  name: "Bear wave",
  provider: "mock",
  packId: "bears",
  url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
  animated: false,
};

const providerAnimatedEmoji: AnimatedEmojiMediaItem = {
  type: "emoji",
  kind: "animated",
  id: "provider-party",
  name: "Provider party",
  previewUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
  animationUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
  format: "gif",
};

const providerCustomEmoji: CustomEmojiMediaItem = {
  type: "emoji",
  kind: "custom",
  id: "provider-logo",
  name: "Provider logo",
  url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
};

function gifProvider(
  overrides: Partial<MediaProvider<GifMediaItem>> = {},
): MediaProvider<GifMediaItem> {
  return {
    id: "mock",
    search: async () => ({ items: [gif], hasMore: false }),
    trending: async () => ({ items: [gif], hasMore: false }),
    ...overrides,
  };
}

const stickerProvider: StickerProvider = {
  id: "mock-stickers",
  async packs() {
    return [
      { id: "bears", name: "Bears", icon: "🐻" },
      { id: "cats", name: "Cats", icon: "🐱" },
    ];
  },
  async packItems(packId) {
    return { items: packId === "bears" ? [sticker] : [], hasMore: false };
  },
  async search() {
    return { items: [sticker], hasMore: false };
  },
};

describe("multi-media picker", () => {
  it("shows only configured, enabled, channel-compatible tabs", async () => {
    render(
      <MediaPicker
        capabilities={{ emoji: true, gif: false, stickers: true }}
        features={{ gifs: true, stickers: true, customMedia: true }}
        onSelect={() => undefined}
        providers={{ gifs: gifProvider(), stickers: stickerProvider }}
      />,
    );
    await screen.findByRole("searchbox", { name: "Search emoji" });
    expect(screen.getByRole("tab", { name: "Emoji" })).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Stickers" })).not.toBeNull();
    expect(screen.queryByRole("tab", { name: "GIF" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Custom" })).toBeNull();
  });

  it("loads registered emoji providers and filters their channel capabilities", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    const provider: MediaProvider<
      AnimatedEmojiMediaItem | CustomEmojiMediaItem
    > = {
      id: "workspace",
      async trending() {
        return {
          items: [providerAnimatedEmoji, providerCustomEmoji],
          hasMore: false,
        };
      },
    };
    render(
      <MediaPicker
        capabilities={{ animatedEmoji: false, customEmoji: true }}
        features={{ animatedEmoji: true }}
        onSelect={onSelect}
        providers={{ emoji: [provider] }}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: "Provider logo" }),
    );
    expect(onSelect).toHaveBeenCalledWith(providerCustomEmoji);
    expect(screen.queryByRole("button", { name: "Provider party" })).toBeNull();
  });

  it("loads, searches, selects, favorites, and restores normalized GIFs", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    const first = render(
      <MediaPicker
        defaultMediaType="gif"
        features={{ gifs: true, recents: true, favorites: true }}
        onSelect={onSelect}
        providers={{ gifs: gifProvider() }}
        storage={storage}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Party" }));
    expect(onSelect).toHaveBeenCalledWith(gif);
    await user.click(
      screen.getByRole("button", { name: "Add Party to favorites" }),
    );
    first.unmount();

    render(
      <MediaPicker
        defaultMediaType="gif"
        features={{ gifs: true, favorites: true }}
        onSelect={() => undefined}
        providers={{ gifs: gifProvider() }}
        storage={storage}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Favorites" }));
    expect(await screen.findByRole("button", { name: "Party" })).not.toBeNull();
  });

  it("paginates GIF results without rendering the full collection", async () => {
    const user = userEvent.setup();
    const second = { ...gif, id: "hello", name: "Hello" };
    const provider = gifProvider({
      trending: async (options) =>
        options?.cursor === "next"
          ? { items: [second], hasMore: false }
          : { items: [gif], hasMore: true, nextCursor: "next" },
    });
    render(
      <MediaPicker
        defaultMediaType="gif"
        features={{ gifs: true }}
        onSelect={() => undefined}
        providers={{ gifs: provider }}
      />,
    );
    await screen.findByRole("button", { name: "Party" });
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("button", { name: "Hello" })).not.toBeNull();
  });

  it("aborts a stale debounced GIF search", async () => {
    const user = userEvent.setup();
    const aborted: string[] = [];
    const provider = gifProvider({
      search: (query, options) =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => resolve({ items: [gif], hasMore: false }),
            500,
          );
          options?.signal?.addEventListener("abort", () => {
            clearTimeout(timeout);
            aborted.push(query);
            reject(new DOMException("stale", "AbortError"));
          });
        }),
    });
    render(
      <MediaPicker
        defaultMediaType="gif"
        features={{ gifs: true }}
        onSelect={() => undefined}
        providers={{ gifs: provider }}
      />,
    );
    const search = await screen.findByRole("searchbox", {
      name: "Search GIFs",
    });
    await user.type(search, "party");
    await new Promise((resolve) => setTimeout(resolve, 300));
    await user.clear(search);
    await user.type(search, "hello");
    await waitFor(() => expect(aborted).toContain("party"));
  });

  it("navigates sticker packs without affecting other tabs", async () => {
    const user = userEvent.setup();
    render(
      <MediaPicker
        defaultMediaType="stickers"
        features={{ stickers: true }}
        onSelect={() => undefined}
        providers={{ stickers: stickerProvider }}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "Bear wave" }),
    ).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Cats" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Bear wave" })).toBeNull(),
    );
  });

  it("filters animated stickers when the channel disallows them", async () => {
    const animatedSticker: StickerMediaItem = {
      ...sticker,
      id: "bear-dance",
      name: "Bear dance",
      animated: true,
      format: "gif",
    };
    const provider: StickerProvider = {
      ...stickerProvider,
      async packItems() {
        return { items: [sticker, animatedSticker], hasMore: false };
      },
    };
    render(
      <MediaPicker
        capabilities={{ animatedStickers: false, stickers: true }}
        defaultMediaType="stickers"
        features={{ stickers: true }}
        onSelect={() => undefined}
        providers={{ stickers: provider }}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "Bear wave" }),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Bear dance" })).toBeNull();
  });

  it("persists explicitly configured GIF reactions in compact recents", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    const first = render(
      <MediaPicker
        compact={{ reactions: [gif] }}
        features={{ recents: true }}
        mode="compact"
        onSelect={() => undefined}
        storage={storage}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Party" }));
    first.unmount();
    render(
      <MediaPicker
        compact={{ source: "recent" }}
        features={{ recents: true }}
        mode="compact"
        onSelect={() => undefined}
        storage={storage}
      />,
    );
    expect(await screen.findByRole("button", { name: "Party" })).not.toBeNull();
  });

  it("renders custom providers through the typed extension surface", async () => {
    const item: CustomMediaItem = {
      type: "custom",
      kind: "company",
      id: "launch",
      name: "Launch asset",
      url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    };
    const provider: MediaProvider<CustomMediaItem> = {
      id: "company",
      async trending() {
        return { items: [item], hasMore: false };
      },
      async search() {
        return { items: [item], hasMore: false };
      },
    };
    render(
      <MediaPicker
        customTabs={[{ id: "company", label: "Company", provider }]}
        defaultMediaType="custom"
        features={{ customMedia: true }}
        onSelect={() => undefined}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "Launch asset" }),
    ).not.toBeNull();
  });

  it("isolates a failing provider from the emoji feature", async () => {
    const user = userEvent.setup();
    render(
      <MediaPicker
        defaultMediaType="gif"
        features={{ gifs: true }}
        onSelect={() => undefined}
        providers={{
          gifs: gifProvider({
            trending: async () => {
              throw new Error("GIF offline");
            },
          }),
        }}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "GIF offline",
    );
    await user.click(screen.getByRole("tab", { name: "Emoji" }));
    expect(
      await screen.findByRole("grid", { name: "Smileys & Emotion emoji" }),
    ).not.toBeNull();
  });
});

describe("animated media", () => {
  const animated: AnimatedEmojiMediaItem = {
    type: "emoji",
    kind: "animated",
    id: "party",
    name: "Animated party",
    previewUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    animationUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    format: "gif",
  };

  it("plays on hover/focus and returns to preview on leave", async () => {
    render(
      <MediaPicker
        animatedMedia={{ autoplay: "hover" }}
        emojiPacks={[{ id: "animated", name: "Animated", items: [animated] }]}
        features={{ animatedEmoji: true }}
        onSelect={() => undefined}
      />,
    );
    const visual = await screen.findByRole("img", { name: "Animated party" });
    expect(visual.getAttribute("data-active")).toBe("false");
    fireEvent.pointerEnter(visual);
    await waitFor(() =>
      expect(visual.getAttribute("data-active")).toBe("true"),
    );
    fireEvent.pointerLeave(visual);
    await waitFor(() =>
      expect(visual.getAttribute("data-active")).toBe("false"),
    );
  });

  it("limits concurrent animations and releases resources", () => {
    const manager = new AnimationConcurrencyManager(2);
    expect(manager.acquire("one")).toBe(true);
    expect(manager.acquire("two")).toBe(true);
    expect(manager.acquire("three")).toBe(false);
    manager.release("one");
    expect(manager.acquire("three")).toBe(true);
    expect(manager.activeCount).toBe(2);
  });

  it("respects reduced motion until explicit activation", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(
      <MediaPicker
        animatedMedia={{ autoplay: "always" }}
        emojiPacks={[{ id: "animated", name: "Animated", items: [animated] }]}
        features={{ animatedEmoji: true }}
        onSelect={() => undefined}
      />,
    );
    const visual = await screen.findByRole("img", { name: "Animated party" });
    expect(visual.getAttribute("data-active")).toBe("false");
    fireEvent.pointerDown(visual);
    await waitFor(() =>
      expect(visual.getAttribute("data-active")).toBe("true"),
    );
  });

  it("releases an animated sticker slot when unmounted", async () => {
    const manager = new AnimationConcurrencyManager(1);
    const view = render(
      <AnimatedMediaRenderer
        config={{ autoplay: "always" }}
        item={{ ...sticker, animated: true, format: "gif" }}
        manager={manager}
      />,
    );
    await waitFor(() => expect(manager.activeCount).toBe(1));
    view.unmount();
    expect(manager.activeCount).toBe(0);
  });
});
