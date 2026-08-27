import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { MediaItem } from "@company/media-core";

import { MediaPicker } from "./MediaPicker";

describe("MediaPicker", () => {
  it("renders an accessible emoji picker with categories", () => {
    render(<MediaPicker onSelect={() => undefined} />);
    expect(screen.getByRole("region", { name: "Media picker" })).not.toBeNull();
    expect(
      screen.getByRole("searchbox", { name: "Search emoji" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("navigation", { name: "Emoji categories" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("grid", { name: "Smileys & Emotion emoji" }),
    ).not.toBeNull();
  });

  it("searches and emits a normalized emoji item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(item: MediaItem) => void>();
    render(<MediaPicker onSelect={onSelect} />);
    await user.type(
      screen.getByRole("searchbox", { name: "Search emoji" }),
      "rocket",
    );
    await user.click(screen.getByRole("gridcell", { name: "rocket" }));
    expect(onSelect).toHaveBeenCalledOnce();
    const selected = onSelect.mock.calls[0]?.[0];
    expect(selected).toMatchObject({
      type: "emoji",
      value: "🚀",
      name: "rocket",
      category: "Travel & Places",
    });
    expect(selected?.id).toEqual(expect.any(String));
  });

  it("switches categories and clears search", async () => {
    const user = userEvent.setup();
    render(<MediaPicker onSelect={() => undefined} />);
    const search = screen.getByRole("searchbox", { name: "Search emoji" });
    await user.type(search, "rocket");
    await user.click(screen.getByRole("button", { name: "Animals & Nature" }));
    expect((search as HTMLInputElement).value).toBe("");
    expect(
      screen.getByRole("grid", { name: "Animals & Nature emoji" }),
    ).not.toBeNull();
  });

  it("supports roving focus with arrow, home, and end keys", async () => {
    const user = userEvent.setup();
    render(<MediaPicker onSelect={() => undefined} />);
    const cells = screen.getAllByRole("gridcell");
    cells[0]!.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(cells[1]);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(cells.at(-1));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(cells[0]);
  });

  it("invokes onClose for Escape without trapping focus", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MediaPicker onClose={onClose} onSelect={() => undefined} />);
    await user.click(screen.getByRole("searchbox", { name: "Search emoji" }));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders a deliberate disabled state", () => {
    render(
      <MediaPicker features={{ emoji: false }} onSelect={() => undefined} />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "No media features are enabled.",
    );
  });

  it("applies themes and custom token values", () => {
    render(
      <MediaPicker
        onSelect={() => undefined}
        theme="dark"
        themeTokens={{ accent: "rebeccapurple" }}
      />,
    );
    const picker = screen.getByRole("region", { name: "Media picker" });
    expect(picker.getAttribute("data-theme")).toBe("dark");
    expect(picker.style.getPropertyValue("--mp-accent")).toBe("rebeccapurple");
  });
});
