import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SkinToneSelector } from "./SkinToneSelector";

afterEach(() => vi.restoreAllMocks());

describe("SkinToneSelector overlay", () => {
  it("portals outside clipping ancestors, flips above, and preserves selection focus", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(500);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(760);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        if (this.classList.contains("mp-tone-selector__button")) {
          return new DOMRect(400, 700, 40, 40);
        }
        if (this.classList.contains("mp-tone-menu")) {
          return new DOMRect(0, 0, 208, 244);
        }
        return new DOMRect();
      },
    );
    const view = render(
      <div
        data-testid="clipping-parent"
        style={
          {
            "--mp-background": "rgb(25, 27, 31)",
            "--mp-tone-menu-z-index": "4321",
            height: 20,
            overflow: "hidden",
          } as React.CSSProperties
        }
      >
        <SkinToneSelector onChange={onChange} value="default" />
      </div>,
    );
    const trigger = screen.getByRole("button", {
      name: "Emoji skin tone: Default",
    });

    await user.click(trigger);
    const menu = screen.getByRole("listbox", { name: "Emoji skin tone" });
    await waitFor(() => expect(menu.style.visibility).toBe("visible"));

    expect(view.container.contains(menu)).toBe(false);
    expect(menu.parentElement).toBe(document.body);
    expect(menu.dataset.placement).toBe("above");
    expect(menu.style.position).toBe("fixed");
    expect(menu.style.left).toBe("232px");
    expect(menu.style.top).toBe("450px");
    expect(menu.style.zIndex).toBe("var(--mp-tone-menu-z-index, 1100)");
    expect(menu.style.getPropertyValue("--mp-background")).toBe(
      "rgb(25, 27, 31)",
    );
    expect(menu.style.getPropertyValue("--mp-tone-menu-z-index")).toBe("4321");

    await user.click(screen.getByRole("option", { name: "Medium" }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("medium");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
