import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  MemoryStorageAdapter,
  type AnimatedEmojiMediaItem,
  type CustomEmojiMediaItem,
  type CustomMediaItem,
  type EmojiProvider,
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

const pixel = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

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
      { id: "bears", name: "Bears", iconUrl: pixel },
      { id: "cats", name: "Cats", icon: "\u{10FFFF}" },
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

  it("accepts additive animatedEmoji and custom provider registrations", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    const emojiProvider: EmojiProvider = {
      id: "animated-workspace",
      trending: async () => ({
        items: [providerAnimatedEmoji],
        hasMore: false,
      }),
    };
    const customItem: CustomMediaItem = {
      type: "custom",
      kind: "company",
      id: "brand-launch",
      name: "Brand launch",
      url: pixel,
    };
    const customProvider: MediaProvider<CustomMediaItem> = {
      id: "company-library",
      displayName: "Company library",
      trending: async () => ({ items: [customItem], hasMore: false }),
    };
    render(
      <MediaPicker
        features={{ animatedEmoji: true, customMedia: true }}
        onSelect={onSelect}
        providers={{
          animatedEmoji: emojiProvider,
          custom: customProvider,
        }}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Provider party" }),
    );
    expect(onSelect).toHaveBeenLastCalledWith(providerAnimatedEmoji);
    await user.click(screen.getByRole("tab", { name: "Custom" }));
    await user.click(
      await screen.findByRole("button", { name: "Brand launch" }),
    );
    expect(onSelect).toHaveBeenLastCalledWith(customItem);
  });

  it("loads remote emoji packs only after their provider panel mounts", async () => {
    const user = userEvent.setup();
    const packs = vi.fn(async () => [{ id: "team", name: "Team", icon: "✨" }]);
    const packItems = vi.fn(async () => ({
      items: [providerAnimatedEmoji],
      hasMore: false,
    }));
    const provider: EmojiProvider = {
      id: "workspace",
      packs,
      packItems,
    };
    render(
      <MediaPicker
        features={{ animatedEmoji: true }}
        onSelect={() => undefined}
        providers={{ emoji: [provider] }}
      />,
    );
    expect(
      await screen.findByRole("navigation", {
        name: "workspace emoji packs",
      }),
    ).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Team" }));
    expect(
      await screen.findByRole("button", { name: "Provider party" }),
    ).not.toBeNull();
    expect(packs).toHaveBeenCalledOnce();
    expect(packItems).toHaveBeenCalled();
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
        features={{ favorites: true, recents: true, stickers: true }}
        onSelect={() => undefined}
        providers={{ stickers: stickerProvider }}
        theme="dark"
      />,
    );
    const trigger = await screen.findByRole("button", {
      name: "Choose sticker pack, current Bears",
    });
    expect(
      screen.queryByRole("navigation", { name: "Sticker packs" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Browse" })).toBeNull();
    expect(screen.getByRole("button", { name: "Recent" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Favorites" })).not.toBeNull();
    const triggerIcon = trigger.querySelector<HTMLImageElement>(
      ".mp-pack-icon__image",
    );
    expect(triggerIcon?.getAttribute("src")).toBe(pixel);
    expect(
      await screen.findByRole("button", { name: "Bear wave" }),
    ).not.toBeNull();
    trigger.focus();
    await user.keyboard("{Enter}");
    const bears = screen.getByRole("option", { name: "Bears" });
    expect(bears.getAttribute("aria-selected")).toBe("true");
    const bearIcon = bears.querySelector<HTMLImageElement>(
      ".mp-pack-icon__image",
    );
    expect(bearIcon).not.toBeNull();
    if (bearIcon === null) throw new Error("Expected Bears pack icon image");
    fireEvent.error(bearIcon);
    expect(bears.querySelector("[data-pack-icon-fallback]")).not.toBeNull();
    await user.keyboard("{ArrowDown}");
    const cats = screen.getByRole("option", { name: "Cats" });
    expect(document.activeElement).toBe(cats);
    expect(cats.querySelector("[data-pack-icon-fallback]")).not.toBeNull();
    expect(cats.textContent).not.toContain("\u{10FFFF}");
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-label")).toBe(
      "Choose sticker pack, current Cats",
    );
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

  it("uses a GIF thumbnail while idle and only the optimized preview when focused", async () => {
    const optimizedGif: GifMediaItem = {
      ...gif,
      thumbnailUrl: "https://cdn.test/poster.webp",
      previewUrl: "https://cdn.test/preview.gif",
      url: "https://cdn.test/original.gif",
    };
    render(
      <MediaPicker
        animatedMedia={{ autoplay: "hover" }}
        defaultMediaType="gif"
        features={{ gifs: true }}
        onSelect={() => undefined}
        providers={{
          gifs: gifProvider({
            trending: async () => ({ items: [optimizedGif], hasMore: false }),
          }),
        }}
      />,
    );
    const button = await screen.findByRole("button", { name: "Party" });
    const visual = within(button).getByRole("img", { name: "Party" });
    expect(button.querySelector("img")?.getAttribute("src")).toBe(
      optimizedGif.thumbnailUrl,
    );
    button.focus();
    await waitFor(() =>
      expect(button.querySelector("img")?.getAttribute("src")).toBe(
        optimizedGif.previewUrl,
      ),
    );
    expect(button.querySelector("img")?.getAttribute("src")).not.toBe(
      optimizedGif.url,
    );
    button.blur();
    await waitFor(() =>
      expect(visual.getAttribute("data-active")).toBe("false"),
    );
  });

  it("uses the shared animation lifecycle for provider-backed custom media", async () => {
    const custom: CustomMediaItem = {
      type: "custom",
      kind: "brand",
      id: "animated-launch",
      name: "Animated launch",
      thumbnailUrl: "https://cdn.test/custom/poster.webp",
      previewUrl: "https://cdn.test/custom/preview.webp",
      url: "https://cdn.test/custom/original.gif",
      animated: true,
      format: "gif",
    };
    const provider: MediaProvider<CustomMediaItem> = {
      id: "company-animation",
      trending: async () => ({ items: [custom], hasMore: false }),
    };
    render(
      <MediaPicker
        animatedMedia={{ autoplay: "hover" }}
        defaultMediaType="custom"
        features={{ customMedia: true }}
        onSelect={() => undefined}
        providers={{ custom: provider }}
      />,
    );
    const button = await screen.findByRole("button", {
      name: "Animated launch",
    });
    expect(button.querySelector("img")?.getAttribute("src")).toBe(
      custom.thumbnailUrl,
    );
    button.focus();
    await waitFor(() =>
      expect(button.querySelector("img")?.getAttribute("src")).toBe(custom.url),
    );
    button.blur();
    await waitFor(() =>
      expect(button.querySelector("img")?.getAttribute("src")).toBe(
        custom.thumbnailUrl,
      ),
    );
  });

  it("falls back when a static or animated asset fails", async () => {
    const custom: CustomMediaItem = {
      type: "custom",
      kind: "company",
      id: "broken",
      name: "Broken asset",
      url: "https://cdn.test/broken.webp",
    };
    const provider: MediaProvider<CustomMediaItem> = {
      id: "company",
      trending: async () => ({ items: [custom], hasMore: false }),
    };
    const view = render(
      <MediaPicker
        customTabs={[{ id: "company", label: "Company", provider }]}
        defaultMediaType="custom"
        features={{ customMedia: true }}
        onSelect={() => undefined}
      />,
    );
    const button = await screen.findByRole("button", { name: "Broken asset" });
    fireEvent.error(button.querySelector("img")!);
    await waitFor(() =>
      expect(
        view.container.querySelector("[data-media-fallback]"),
      ).not.toBeNull(),
    );

    view.unmount();
    render(
      <AnimatedMediaRenderer
        config={{ autoplay: "always" }}
        item={animated}
        manager={new AnimationConcurrencyManager(1)}
      />,
    );
    const animatedVisual = screen.getByRole("img", { name: "Animated party" });
    await waitFor(() =>
      expect(animatedVisual.getAttribute("data-active")).toBe("true"),
    );
    fireEvent.error(animatedVisual.querySelector("img")!);
    await waitFor(() =>
      expect(animatedVisual.getAttribute("data-active")).toBe("false"),
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
