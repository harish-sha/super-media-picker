import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  MemoryStorageAdapter,
  type GifMediaItem,
  type MediaItem,
  type MediaProvider,
  type StickerMediaItem,
  type StickerProvider,
} from "@super-media-picker/core";

import {
  EmojiPicker,
  GifPicker,
  ReactionPicker,
  StickerPicker,
} from "../standalone";
import {
  useEmojiSearch,
  useFavorites,
  useGifSearch,
  useMediaPicker,
  useRecents,
  useStickerSearch,
} from "../headless";
import { MediaPicker } from "./MediaPicker";

const pixel = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const gif: GifMediaItem = {
  type: "gif",
  id: "party",
  name: "Party",
  provider: "test-gif",
  previewUrl: pixel,
  url: pixel,
};
const sticker: StickerMediaItem = {
  type: "sticker",
  id: "wave",
  name: "Wave sticker",
  provider: "test-stickers",
  packId: "waves",
  url: pixel,
  animated: false,
};

function createGifProvider(): MediaProvider<GifMediaItem> {
  return {
    id: "test-gif",
    trending: async (options) =>
      options?.cursor === "next"
        ? { items: [{ ...gif, id: "second", name: "Second" }], hasMore: false }
        : { items: [gif], hasMore: true, nextCursor: "next" },
    search: async () => ({ items: [gif], hasMore: false }),
  };
}

function createStickerProvider(): StickerProvider {
  return {
    id: "test-stickers",
    packs: async () => [{ id: "waves", name: "Waves" }],
    packItems: async () => ({ items: [sticker], hasMore: false }),
    search: async () => ({ items: [sticker], hasMore: false }),
  };
}

describe("public standalone pickers", () => {
  it("returns normalized subtype items from every focused composition", async () => {
    const user = userEvent.setup();
    const emojiSelect = vi.fn();
    const emojiView = render(
      <EmojiPicker
        defaultSearchQuery="thumbs up"
        defaultSkinTone="medium"
        onSelect={emojiSelect}
      />,
    );
    await user.click(
      await screen.findByRole("button", {
        name: "thumbs up: medium skin tone",
      }),
    );
    expect(emojiSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "emoji",
        value: "👍🏽",
        skinTone: "medium",
      }),
    );
    emojiView.unmount();

    const gifSelect = vi.fn();
    const gifView = render(
      <GifPicker provider={createGifProvider()} onSelect={gifSelect} />,
    );
    await user.click(await screen.findByRole("button", { name: "Party" }));
    expect(gifSelect).toHaveBeenCalledWith(gif);
    gifView.unmount();

    const stickerSelect = vi.fn();
    const stickerView = render(
      <StickerPicker
        provider={createStickerProvider()}
        onSelect={stickerSelect}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: "Wave sticker" }),
    );
    expect(stickerSelect).toHaveBeenCalledWith(sticker);
    stickerView.unmount();

    const reactionSelect = vi.fn();
    render(
      <ReactionPicker
        onSelect={reactionSelect}
        reactions={[gif]}
        source="custom"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Party" }));
    expect(reactionSelect).toHaveBeenCalledWith(gif);
  });

  it("uses identical provider output in full and standalone pickers", async () => {
    const user = userEvent.setup();
    const provider = createGifProvider();
    const fullSelect = vi.fn<(item: MediaItem) => void>();
    const full = render(
      <MediaPicker
        defaultMediaType="gif"
        features={{ emoji: false, gifs: true }}
        onSelect={fullSelect}
        providers={{ gifs: provider }}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Party" }));
    full.unmount();

    const standaloneSelect = vi.fn();
    const standalone = render(
      <GifPicker provider={provider} onSelect={standaloneSelect} />,
    );
    await user.click(await screen.findByRole("button", { name: "Party" }));
    expect(standaloneSelect.mock.calls[0]?.[0]).toEqual(
      fullSelect.mock.calls[0]?.[0],
    );
    standalone.unmount();

    const stickerProvider = createStickerProvider();
    const fullStickerSelect = vi.fn<(item: MediaItem) => void>();
    const fullSticker = render(
      <MediaPicker
        defaultMediaType="stickers"
        features={{ emoji: false, stickers: true }}
        onSelect={fullStickerSelect}
        providers={{ stickers: stickerProvider }}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: "Wave sticker" }),
    );
    fullSticker.unmount();

    const standaloneStickerSelect = vi.fn();
    render(
      <StickerPicker
        provider={stickerProvider}
        onSelect={standaloneStickerSelect}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: "Wave sticker" }),
    );
    expect(standaloneStickerSelect.mock.calls[0]?.[0]).toEqual(
      fullStickerSelect.mock.calls[0]?.[0],
    );
  });

  it("shares live recents, favorites, and skin tone through one adapter", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();

    function Controls() {
      const favorites = useFavorites({ storage });
      const picker = useMediaPicker({ storage });
      return (
        <>
          <button onClick={() => void favorites.toggle(gif)} type="button">
            Favorite party
          </button>
          <button onClick={() => picker.setSkinTone("medium")} type="button">
            Medium tone
          </button>
        </>
      );
    }

    render(
      <>
        <Controls />
        <ReactionPicker
          onSelect={() => undefined}
          reactions={[gif]}
          source="custom"
          storage={storage}
        />
        <ReactionPicker
          onSelect={() => undefined}
          source="frequent"
          storage={storage}
        />
        <ReactionPicker
          onSelect={() => undefined}
          source="favorites"
          storage={storage}
        />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Party" }));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Party" })).toHaveLength(2),
    );
    await user.click(screen.getByRole("button", { name: "Favorite party" }));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Party" })).toHaveLength(3),
    );
    await user.click(screen.getByRole("button", { name: "Medium tone" }));
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "thumbs up: medium skin tone" }),
      ).toHaveLength(3),
    );
  });

  it("applies capabilities and isolates provider errors", async () => {
    const trending = vi.fn(async () => ({ items: [gif], hasMore: false }));
    const restricted = render(
      <GifPicker
        capabilities={{ gif: false }}
        onSelect={() => undefined}
        provider={{ id: "restricted", trending }}
      />,
    );
    expect(
      await screen.findByText("No media features are enabled."),
    ).not.toBeNull();
    expect(trending).not.toHaveBeenCalled();
    restricted.unmount();

    render(
      <>
        <GifPicker
          onSelect={() => undefined}
          provider={{
            id: "broken",
            trending: async () => {
              throw new Error("GIF unavailable");
            },
          }}
        />
        <EmojiPicker onSelect={() => undefined} />
      </>,
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "GIF unavailable",
    );
    expect(
      await screen.findByRole("grid", { name: "Smileys & Emotion emoji" }),
    ).not.toBeNull();
  });
});

describe("public headless hooks", () => {
  it("searches local emoji with normalized tone variants", () => {
    const { result } = renderHook(() =>
      useEmojiSearch({ initialQuery: "thumbs up", skinTone: "dark", limit: 1 }),
    );
    expect(result.current.results[0]).toMatchObject({
      type: "emoji",
      value: "👍🏿",
      skinTone: "dark",
    });
    act(() => result.current.search("not-a-real-emoji"));
    expect(result.current.state).toBe("empty");
  });

  it("supports provider search, pagination, packs, and errors headlessly", async () => {
    const gifProvider = createGifProvider();
    const gifs = renderHook(() =>
      useGifSearch({ provider: gifProvider, debounceMs: 0 }),
    );
    await waitFor(() => expect(gifs.result.current.state).toBe("success"));
    act(() => gifs.result.current.loadMore());
    await waitFor(() => expect(gifs.result.current.results).toHaveLength(2));
    act(() => gifs.result.current.search("party"));
    await waitFor(() => expect(gifs.result.current.results).toEqual([gif]));

    const stickerProvider = createStickerProvider();
    const stickers = renderHook(() =>
      useStickerSearch({ provider: stickerProvider, debounceMs: 0 }),
    );
    await waitFor(() =>
      expect(stickers.result.current.results).toEqual([sticker]),
    );
    expect(stickers.result.current.packs).toEqual([
      { id: "waves", name: "Waves" },
    ]);

    const brokenProvider: MediaProvider<GifMediaItem> = {
      id: "broken",
      trending: async () => {
        throw new Error("offline");
      },
    };
    const broken = renderHook(() =>
      useGifSearch({ provider: brokenProvider, debounceMs: 0 }),
    );
    await waitFor(() => expect(broken.result.current.state).toBe("error"));
    expect(broken.result.current.error?.message).toBe("offline");
  });

  it("exposes focused recent and favorite collection actions", async () => {
    const storage = new MemoryStorageAdapter();
    const recents = renderHook(() => useRecents({ storage }));
    const favorites = renderHook(() => useFavorites({ storage }));
    await waitFor(() => expect(recents.result.current.ready).toBe(true));
    await act(async () => recents.result.current.record(gif));
    expect(recents.result.current.items).toEqual([gif]);
    await act(async () => favorites.result.current.toggle(gif));
    expect(favorites.result.current.isFavorite(gif)).toBe(true);
    await act(async () => {
      await recents.result.current.clear();
      await favorites.result.current.clear();
    });
    expect(recents.result.current.records).toHaveLength(0);
    expect(favorites.result.current.records).toHaveLength(0);
  });

  it("coordinates active type, selection, recents, and favorites", async () => {
    const onSelect = vi.fn();
    const storage = new MemoryStorageAdapter();
    const provider = createGifProvider();
    const { result } = renderHook(() =>
      useMediaPicker({
        defaultMediaType: "gif",
        features: { gifs: true, recents: true, favorites: true },
        onSelect,
        providers: { gifs: provider },
        storage,
      }),
    );
    await waitFor(() => expect(result.current.results[0]).toEqual(gif));
    act(() => result.current.select(gif));
    expect(onSelect).toHaveBeenCalledWith(gif);
    await waitFor(() => expect(result.current.recents[0]?.item).toEqual(gif));
    await act(async () => result.current.toggleFavorite(gif));
    expect(result.current.isFavorite(gif)).toBe(true);
  });
});
