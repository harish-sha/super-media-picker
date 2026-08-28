import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  MemoryStorageAdapter,
  type MediaItem,
  type SkinTone,
  type StorageAdapter,
} from "@super-media-picker/core";

import { MediaPicker, mediaPickerStorageKeys } from "./MediaPicker";

describe("MediaPicker", () => {
  async function waitForFullPicker() {
    return screen.findByRole("searchbox", { name: "Search emoji" });
  }

  async function chooseTone(
    user: ReturnType<typeof userEvent.setup>,
    label: string,
  ): Promise<void> {
    await user.click(screen.getByRole("button", { name: /Emoji skin tone:/ }));
    await user.click(screen.getByRole("option", { name: label }));
  }

  it("renders named tabs, a tab panel, search, tone control, and an emoji grid", async () => {
    render(
      <MediaPicker
        onSelect={() => undefined}
        storage={new MemoryStorageAdapter()}
      />,
    );
    await waitForFullPicker();
    expect(screen.getByRole("region", { name: "Media picker" })).not.toBeNull();
    expect(
      screen.getByRole("searchbox", { name: "Search emoji" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Emoji skin tone: Default" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("navigation", { name: "Emoji categories" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("tab", { name: "Smileys & Emotion" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("tabpanel", { name: "Smileys & Emotion" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("grid", { name: "Smileys & Emotion emoji" }),
    ).not.toBeNull();
  });

  it("searches and emits a normalized emoji item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(<MediaPicker onSelect={onSelect} />);
    await waitForFullPicker();
    await user.type(
      screen.getByRole("searchbox", { name: "Search emoji" }),
      "rocket",
    );
    await user.click(screen.getByRole("button", { name: "rocket" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({
      type: "emoji",
      value: "🚀",
      name: "rocket",
      category: "Travel & Places",
    });
  });

  it("switches and arrow-navigates category tabs while clearing search", async () => {
    const user = userEvent.setup();
    render(<MediaPicker onSelect={() => undefined} />);
    await waitForFullPicker();
    const search = screen.getByRole("searchbox", { name: "Search emoji" });
    await user.type(search, "rocket");
    const animals = screen.getByRole("tab", { name: "Animals & Nature" });
    await user.click(animals);
    expect((search as HTMLInputElement).value).toBe("");
    expect(animals.getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{ArrowRight}");
    expect(
      screen
        .getByRole("tab", { name: "Food & Drink" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("supports roving grid focus after search and tone changes", async () => {
    const user = userEvent.setup();
    render(<MediaPicker onSelect={() => undefined} />);
    await waitForFullPicker();
    await user.type(
      screen.getByRole("searchbox", { name: "Search emoji" }),
      "thumb",
    );
    await chooseTone(user, "Medium");
    const grid = screen.getByRole("grid");
    const emojiButtons = within(grid).getAllByRole("button");
    emojiButtons[0]!.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(emojiButtons[1]);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(emojiButtons.at(-1));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(emojiButtons[0]);
  });

  it("updates and persists recents after selection", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    render(
      <MediaPicker
        features={{ recents: true }}
        onSelect={() => undefined}
        storage={storage}
      />,
    );
    await waitForFullPicker();
    await user.type(
      screen.getByRole("searchbox", { name: "Search emoji" }),
      "rocket",
    );
    await user.click(screen.getByRole("button", { name: "rocket" }));
    await user.click(screen.getByRole("tab", { name: "Recent" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "rocket" })).not.toBeNull(),
    );
    const stored = await storage.get<
      readonly { readonly id: string; readonly count: number }[]
    >(mediaPickerStorageKeys.recents);
    expect(stored?.[0]).toMatchObject({ count: 1 });
  });

  it("adds, removes, and reloads persistent favorites", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    const first = render(
      <MediaPicker
        features={{ favorites: true }}
        onSelect={() => undefined}
        storage={storage}
      />,
    );
    await waitForFullPicker();
    await user.type(
      screen.getByRole("searchbox", { name: "Search emoji" }),
      "rocket",
    );
    await user.click(
      screen.getByRole("button", { name: "Add rocket to favorites" }),
    );
    await user.click(screen.getByRole("tab", { name: "Favorites" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "rocket" })).not.toBeNull(),
    );
    first.unmount();

    render(
      <MediaPicker
        defaultCategory="Favorites"
        features={{ favorites: true }}
        onSelect={() => undefined}
        storage={storage}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "rocket" })).not.toBeNull(),
    );
    await user.click(
      screen.getByRole("button", { name: "Remove rocket from favorites" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "No favorite emoji yet.",
      ),
    );
  });

  it("applies and persists a compatible skin tone in normalized selection", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(<MediaPicker onSelect={onSelect} storage={storage} />);
    await waitForFullPicker();
    await chooseTone(user, "Medium");
    await user.type(
      screen.getByRole("searchbox", { name: "Search emoji" }),
      "thumbs up",
    );
    await user.click(
      screen.getByRole("button", { name: "thumbs up: medium skin tone" }),
    );
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({
      type: "emoji",
      value: "👍🏽",
      skinTone: "medium",
    });
    await expect(storage.get(mediaPickerStorageKeys.skinTone)).resolves.toBe(
      "medium",
    );
  });

  it("does not corrupt emoji without tone variants", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(<MediaPicker defaultSkinTone="dark" onSelect={onSelect} />);
    await waitForFullPicker();
    await user.type(
      screen.getByRole("searchbox", { name: "Search emoji" }),
      "rocket",
    );
    await user.click(screen.getByRole("button", { name: "rocket" }));
    expect(onSelect.mock.calls[0]?.[0]).toEqual({
      type: "emoji",
      id: "1f680",
      value: "🚀",
      name: "rocket",
      category: "Travel & Places",
    });
  });

  it("hydrates a persisted skin-tone preference", async () => {
    const storage = new MemoryStorageAdapter();
    await storage.set(mediaPickerStorageKeys.skinTone, "medium-dark");
    render(<MediaPicker onSelect={() => undefined} storage={storage} />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Emoji skin tone: Medium-dark",
        }),
      ).not.toBeNull(),
    );
  });

  it("switches exact variants and normalizes selections without stale glyphs", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorageAdapter();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(
      <MediaPicker
        displayMode="bottom-sheet"
        features={{ favorites: true, recents: true }}
        onSelect={onSelect}
        storage={storage}
        theme="dark"
      />,
    );
    await waitForFullPicker();
    await user.type(
      screen.getByRole("searchbox", { name: "Search emoji" }),
      "thumbs up",
    );
    await chooseTone(user, "Medium");
    const medium = screen.getByRole("button", {
      name: "thumbs up: medium skin tone",
    });
    expect(medium.textContent).toBe("👍🏽");
    await user.click(medium);
    expect(onSelect).toHaveBeenLastCalledWith({
      type: "emoji",
      id: "1f44d-1f3fd",
      value: "👍🏽",
      name: "thumbs up: medium skin tone",
      category: "People & Body",
      skinTone: "medium",
    });
    await user.click(
      screen.getByRole("button", { name: "Add thumbs up to favorites" }),
    );

    await chooseTone(user, "Dark");
    const dark = screen.getByRole("button", {
      name: "thumbs up: dark skin tone",
    });
    expect(dark.textContent).toBe("👍🏿");
    expect(dark.textContent).not.toContain("🏽");
    await user.click(dark);
    expect(onSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "1f44d-1f3ff",
        value: "👍🏿",
        skinTone: "dark",
      }),
    );
    await expect(
      storage.get(mediaPickerStorageKeys.favorites),
    ).resolves.toEqual(["1f44d"]);
    await waitFor(async () =>
      expect(await storage.get(mediaPickerStorageKeys.recents)).toEqual([
        expect.objectContaining({ id: "1f44d", count: 2 }),
      ]),
    );
    await user.click(screen.getByRole("tab", { name: "Favorites" }));
    expect(
      screen.getByRole("button", {
        name: "thumbs up: dark skin tone",
      }),
    ).not.toBeNull();
  });

  it("keeps a user tone change made before delayed hydration completes", async () => {
    const user = userEvent.setup();
    let resolveTone!: (tone: SkinTone | null) => void;
    const tone = new Promise<SkinTone | null>((resolve) => {
      resolveTone = resolve;
    });
    const values = new Map<string, unknown>();
    const storage: StorageAdapter = {
      get: <T,>(key: string) =>
        key === mediaPickerStorageKeys.skinTone
          ? (tone as Promise<T | null>)
          : Promise.resolve((values.get(key) as T | undefined) ?? null),
      set: async <T,>(key: string, value: T) => {
        values.set(key, value);
      },
      remove: async (key: string) => {
        values.delete(key);
      },
    };
    render(<MediaPicker onSelect={() => undefined} storage={storage} />);
    await waitForFullPicker();
    await chooseTone(user, "Medium");
    act(() => resolveTone("default"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Emoji skin tone: Medium" }),
      ).not.toBeNull(),
    );
    expect(values.get(mediaPickerStorageKeys.skinTone)).toBe("medium");
  });

  it("supports tone-menu keyboard navigation, selection, and Escape focus return", async () => {
    const user = userEvent.setup();
    render(
      <MediaPicker
        onSelect={() => undefined}
        storage={new MemoryStorageAdapter()}
      />,
    );
    await waitForFullPicker();
    const trigger = screen.getByRole("button", {
      name: "Emoji skin tone: Default",
    });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(
      screen.getByRole("option", { name: "Default" }),
    );
    await user.keyboard("{End}{Enter}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Emoji skin tone: Dark" }),
    );
    await user.keyboard("{Enter}{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Emoji skin tone: Dark" }),
    );
  });

  it("renders deliberate search and disabled empty states", async () => {
    const first = render(
      <MediaPicker
        defaultSearchQuery="not-a-real-emoji-query"
        onSelect={() => undefined}
      />,
    );
    await waitForFullPicker();
    expect(screen.getByRole("status").textContent).toContain(
      "No emoji found for “not-a-real-emoji-query”.",
    );
    first.unmount();
    render(
      <MediaPicker features={{ emoji: false }} onSelect={() => undefined} />,
    );
    expect(
      await screen.findByText("No media features are enabled."),
    ).not.toBeNull();
  });

  it("applies custom themes through the token contract", async () => {
    const view = render(
      <MediaPicker
        onSelect={() => undefined}
        theme={{ mode: "dark", tokens: { accent: "rebeccapurple" } }}
      />,
    );
    await waitForFullPicker();
    const picker = screen.getByRole("region", { name: "Media picker" });
    expect(picker.getAttribute("data-theme")).toBe("dark");
    expect(picker.style.getPropertyValue("--mp-accent")).toBe("rebeccapurple");
    view.rerender(<MediaPicker onSelect={() => undefined} theme="light" />);
    expect(picker.getAttribute("data-theme")).toBe("light");
    expect(picker.style.getPropertyValue("--mp-accent")).toBe("");
  });

  it("supports full size presets, custom dimensions, preview, and search clearing", async () => {
    const user = userEvent.setup();
    const view = render(
      <MediaPicker
        defaultSearchQuery="rocket"
        height="60vh"
        onSelect={() => undefined}
        preview={{ enabled: true }}
        size="sm"
        width={360}
      />,
    );
    const search = await waitForFullPicker();
    const picker = screen.getByRole("region", { name: "Media picker" });
    expect(
      view.container.querySelector(".mp-positioner")?.getAttribute("data-size"),
    ).toBe("sm");
    expect(picker.style.getPropertyValue("--mp-picker-width")).toBe("360px");
    expect(picker.style.getPropertyValue("--mp-picker-height")).toBe("60vh");
    expect(view.container.querySelector(".mp-preview")?.textContent).toContain(
      "rocket",
    );
    await user.click(
      screen.getByRole("button", { name: "Clear emoji search" }),
    );
    expect((search as HTMLInputElement).value).toBe("");
    expect(
      screen.queryByRole("button", { name: "Clear emoji search" }),
    ).toBeNull();
  });

  it("exposes inline, popover, modal, and bottom-sheet display semantics", async () => {
    const first = render(
      <MediaPicker displayMode="inline" onSelect={() => undefined} />,
    );
    expect(
      first.container.querySelector("[data-resolved-display-mode='inline']"),
    ).not.toBeNull();
    first.unmount();
    const second = render(
      <MediaPicker displayMode="modal" onSelect={() => undefined} />,
    );
    await screen.findByRole("dialog", { name: "Media picker" });
    expect(
      screen
        .getByRole("dialog", { name: "Media picker" })
        .getAttribute("aria-modal"),
    ).toBe("true");
    second.unmount();
    const third = render(
      <MediaPicker displayMode="bottom-sheet" onSelect={() => undefined} />,
    );
    await screen.findByRole("dialog", { name: "Media picker" });
    expect(screen.getByRole("dialog", { name: "Media picker" })).not.toBeNull();
    third.unmount();
    const fourth = render(
      <MediaPicker displayMode="popover" onSelect={() => undefined} />,
    );
    expect(
      fourth.container.querySelector("[data-resolved-display-mode='popover']"),
    ).not.toBeNull();
  });

  it("renders the tone selector across compact/full, placement, and theme combinations", async () => {
    const modes = ["compact", "full"] as const;
    const displays = ["inline", "popover", "bottom-sheet"] as const;
    const themes = ["light", "dark", "system"] as const;
    for (const pickerMode of modes) {
      for (const displayMode of displays) {
        for (const theme of themes) {
          const view = render(
            <MediaPicker
              displayMode={displayMode}
              mode={pickerMode}
              onSelect={() => undefined}
              storage={new MemoryStorageAdapter()}
              theme={theme}
            />,
          );
          expect(
            await screen.findByRole("button", {
              name: "Emoji skin tone: Default",
            }),
          ).not.toBeNull();
          const picker = screen.getByRole(
            displayMode === "bottom-sheet" ? "dialog" : "region",
            { name: "Media picker" },
          );
          expect(picker.getAttribute("data-theme")).toBe(theme);
          expect(
            view.container
              .querySelector(".mp-positioner")
              ?.getAttribute("data-resolved-display-mode"),
          ).toBe(displayMode);
          view.unmount();
        }
      }
    }
  });

  it("reactively resolves auto mode and cleans up its viewport listener", async () => {
    let matches = false;
    let viewportListener: ((event: MediaQueryListEvent) => void) | undefined;
    const removeEventListener = vi.fn();
    const addEventListener = vi.fn(
      (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        viewportListener = listener;
      },
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
        () =>
          ({
            get matches() {
              return matches;
            },
            addEventListener,
            removeEventListener,
          }) as unknown as MediaQueryList,
      ),
    );
    const view = render(
      <MediaPicker displayMode="auto" onSelect={() => undefined} />,
    );
    expect(
      view.container.querySelector("[data-resolved-display-mode='popover']"),
    ).not.toBeNull();
    act(() => {
      matches = true;
      viewportListener?.({ matches: true } as MediaQueryListEvent);
    });
    expect(
      view.container.querySelector(
        "[data-resolved-display-mode='bottom-sheet']",
      ),
    ).not.toBeNull();
    expect(
      await screen.findByRole("dialog", { name: "Media picker" }),
    ).not.toBeNull();
    expect(addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
    view.unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
    vi.unstubAllGlobals();
  });

  it("invokes onClose for Escape without trapping focus", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MediaPicker onClose={onClose} onSelect={() => undefined} />);
    await waitForFullPicker();
    await user.click(screen.getByRole("searchbox", { name: "Search emoji" }));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
