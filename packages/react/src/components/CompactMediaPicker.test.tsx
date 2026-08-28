import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  MemoryStorageAdapter,
  type MediaItem,
  type MediaPickerMode,
} from "@super-media-picker/core";

import { MediaPicker, mediaPickerStorageKeys } from "./MediaPicker";

describe("MediaPicker compact mode", () => {
  it("renders the small normalized default reaction set", () => {
    render(<MediaPicker mode="compact" onSelect={() => undefined} />);
    const toolbar = screen.getByRole("toolbar", { name: "Quick reactions" });
    expect(
      within(toolbar).getByRole("button", { name: "thumbs up" }),
    ).not.toBeNull();
    expect(
      within(toolbar).getByRole("button", { name: "red heart" }),
    ).not.toBeNull();
    expect(within(toolbar).getAllByRole("button")).toHaveLength(6);
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("renders custom reactions, limits visibility, and emits normalized selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(
      <MediaPicker
        compact={{ reactions: ["😀", "😡", "❤️"], maxVisibleItems: 2 }}
        mode="compact"
        onSelect={onSelect}
      />,
    );
    const toolbar = screen.getByRole("toolbar", { name: "Quick reactions" });
    expect(within(toolbar).getAllByRole("button")).toHaveLength(2);
    await user.click(
      within(toolbar).getByRole("button", { name: "grinning face" }),
    );
    expect(onSelect).toHaveBeenCalledWith({
      type: "emoji",
      kind: "unicode",
      id: "1f600",
      value: "😀",
      name: "grinning face",
      category: "Smileys & Emotion",
    });
  });

  it("renders a supplied normalized future-media reaction without a new callback type", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    const tenantReaction: MediaItem = {
      type: "custom",
      id: "tenant-party",
      kind: "emoji",
      name: "Tenant party",
      url: "https://cdn.invalid/tenant-party.png",
    };
    render(
      <MediaPicker
        compact={{ reactions: [tenantReaction], maxVisibleItems: 1 }}
        mode="compact"
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Tenant party" }));
    expect(onSelect).toHaveBeenCalledWith(tenantReaction);
  });

  it("applies the persisted global skin tone to compatible reactions", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(
      <MediaPicker
        defaultSkinTone="medium"
        mode="compact"
        onSelect={onSelect}
      />,
    );
    await user.click(
      screen.getByRole("button", {
        name: "thumbs up: medium skin tone",
      }),
    );
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({
      id: "1f44d-1f3fd",
      value: "👍🏽",
      skinTone: "medium",
    });
  });

  it("resolves common inputs without explicit variation selectors", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(
      <MediaPicker
        compact={{ reactions: ["👍", "❤️", "😂"] }}
        defaultSkinTone="medium"
        mode="compact"
        onSelect={onSelect}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "thumbs up: medium skin tone" }),
    );
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ value: "👍🏽", skinTone: "medium" }),
    );
    expect(screen.getByRole("button", { name: "red heart" }).textContent).toBe(
      "❤️",
    );
    expect(
      screen.getByRole("button", { name: "face with tears of joy" })
        .textContent,
    ).toBe("😂");
  });

  it("uses frequency-ranked persisted reactions and fills missing slots", async () => {
    const storage = new MemoryStorageAdapter();
    await storage.set(mediaPickerStorageKeys.recents, [
      { id: "1f680", count: 8, lastUsedAt: 100 },
      { id: "1f408", count: 3, lastUsedAt: 200 },
    ]);
    render(
      <MediaPicker
        compact={{ source: "frequent", maxVisibleItems: 3 }}
        mode="compact"
        onSelect={() => undefined}
        storage={storage}
      />,
    );
    await screen.findByRole("button", { name: "rocket" });
    const buttons = within(
      screen.getByRole("toolbar", { name: "Quick reactions" }),
    ).getAllByRole("button");
    expect(buttons[0]?.getAttribute("aria-label")).toBe("rocket");
    expect(buttons[1]?.getAttribute("aria-label")).toBe("cat");
    expect(buttons).toHaveLength(3);
  });

  it("uses persisted favorites and falls back to defaults when empty", async () => {
    const storage = new MemoryStorageAdapter();
    await storage.set(mediaPickerStorageKeys.favorites, ["1f680"]);
    const first = render(
      <MediaPicker
        compact={{ source: "favorites", maxVisibleItems: 1 }}
        mode="compact"
        onSelect={() => undefined}
        storage={storage}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "rocket" }),
    ).not.toBeNull();
    first.unmount();

    render(
      <MediaPicker
        compact={{ source: "favorites", maxVisibleItems: 2 }}
        mode="compact"
        onSelect={() => undefined}
        storage={new MemoryStorageAdapter()}
      />,
    );
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("toolbar", { name: "Quick reactions" }),
        ).getAllByRole("button"),
      ).toHaveLength(2),
    );
    expect(screen.getByRole("button", { name: "thumbs up" })).not.toBeNull();
  });

  it("supports roving toolbar navigation and native keyboard selection", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(
      <MediaPicker
        compact={{ allowExpand: true }}
        mode="compact"
        onSelect={onSelect}
      />,
    );
    const first = screen.getByRole("button", { name: "thumbs up" });
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "red heart" }),
    );
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Open full media picker" }),
    );
    await user.keyboard("{Home}{Enter}");
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("expands and collapses in uncontrolled mode", async () => {
    const user = userEvent.setup();
    render(
      <MediaPicker
        compact={{ allowExpand: true, allowCollapse: true }}
        defaultMode="compact"
        onSelect={() => undefined}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Open full media picker" }),
    );
    expect(
      await screen.findByRole("searchbox", { name: "Search emoji" }),
    ).not.toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Return to compact reactions" }),
    );
    expect(
      screen.getByRole("toolbar", { name: "Quick reactions" }),
    ).not.toBeNull();
  });

  it("requests but does not mutate controlled mode", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn<(mode: MediaPickerMode) => void>();
    const view = render(
      <MediaPicker
        allowExpand
        compact={{ allowCollapse: true }}
        mode="compact"
        onModeChange={onModeChange}
        onSelect={() => undefined}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Open full media picker" }),
    );
    expect(onModeChange).toHaveBeenCalledWith("full");
    expect(screen.queryByRole("searchbox")).toBeNull();

    view.rerender(
      <MediaPicker
        allowExpand
        compact={{ allowCollapse: true }}
        mode="full"
        onModeChange={onModeChange}
        onSelect={() => undefined}
      />,
    );
    await screen.findByRole("searchbox", { name: "Search emoji" });
    await user.click(
      screen.getByRole("button", { name: "Return to compact reactions" }),
    );
    expect(onModeChange).toHaveBeenLastCalledWith("compact");
    expect(
      screen.getByRole("searchbox", { name: "Search emoji" }),
    ).not.toBeNull();
  });

  it("keeps size, dimensions, display, and theme as independent axes", () => {
    const view = render(
      <MediaPicker
        displayMode="bottom-sheet"
        height={64}
        mode="compact"
        onSelect={() => undefined}
        size="lg"
        theme="dark"
        width="75%"
      />,
    );
    const positioner = view.container.querySelector(".mp-positioner");
    const picker = screen.getByRole("dialog", { name: "Media picker" });
    expect(positioner?.getAttribute("data-mode")).toBe("compact");
    expect(positioner?.getAttribute("data-size")).toBe("lg");
    expect(positioner?.getAttribute("data-resolved-display-mode")).toBe(
      "bottom-sheet",
    );
    expect(picker.getAttribute("data-theme")).toBe("dark");
    expect(picker.style.getPropertyValue("--mp-picker-width")).toBe("75%");
    expect(picker.style.getPropertyValue("--mp-picker-height")).toBe("64px");
  });

  it("keeps the expand control outside the horizontally scrollable reaction list", () => {
    const view = render(
      <MediaPicker
        compact={{
          allowExpand: true,
          maxVisibleItems: 9,
          reactions: ["👍", "❤️", "😀", "😢", "🙏", "👎", "😡", "😂", "😮"],
        }}
        mode="compact"
        onSelect={() => undefined}
      />,
    );
    const scroller = view.container.querySelector(".mp-compact-items");
    const expand = screen.getByRole("button", {
      name: "Open full media picker",
    });
    expect(scroller).not.toBeNull();
    expect(scroller?.contains(expand)).toBe(false);
  });

  it("supports Escape without trapping compact toolbar focus", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MediaPicker
        mode="compact"
        onClose={onClose}
        onSelect={() => undefined}
      />,
    );
    screen.getByRole("button", { name: "thumbs up" }).focus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("switches compact reaction variants through the shared tone menu", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(<MediaPicker mode="compact" onSelect={onSelect} />);
    await user.click(
      screen.getByRole("button", { name: "Emoji skin tone: Default" }),
    );
    await user.click(screen.getByRole("option", { name: "Medium" }));
    await user.click(
      screen.getByRole("button", {
        name: "thumbs up: medium skin tone",
      }),
    );
    expect(onSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "👍🏽", skinTone: "medium" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Emoji skin tone: Medium" }),
    );
    await user.click(screen.getByRole("option", { name: "Dark" }));
    await user.click(
      screen.getByRole("button", { name: "thumbs up: dark skin tone" }),
    );
    expect(onSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "👍🏿", skinTone: "dark" }),
    );
  });
});
