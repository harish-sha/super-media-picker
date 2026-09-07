import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode, createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { MediaPicker } from "./MediaPicker";
import type { MediaPickerMotionPreset } from "../types";

const supportedMotionPresets = [
  "none",
  "fade",
  "scale",
  "pop",
  "slide-up",
  "slide-down",
  "zoom",
  "spring",
  "genie",
] as const satisfies readonly MediaPickerMotionPreset[];

// @ts-expect-error -- morph was removed from the public beta.5 motion contract.
const removedMorphPreset: MediaPickerMotionPreset = "morph";

function pointer(
  target: Element,
  type: string,
  values: Partial<{
    button: number;
    clientX: number;
    clientY: number;
    pointerId: number;
    pointerType: string;
  }>,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.entries(values).forEach(([name, value]) =>
    Object.defineProperty(event, name, { value }),
  );
  fireEvent(target, event);
}

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

describe("MediaPicker presentation", () => {
  it("exposes only the supported public motion presets", () => {
    expect(supportedMotionPresets).toEqual([
      "none",
      "fade",
      "scale",
      "pop",
      "slide-up",
      "slide-down",
      "zoom",
      "spring",
      "genie",
    ]);
    expect(removedMorphPreset).toBe("morph");
  });

  it("keeps spatial handles disabled by default", async () => {
    render(<MediaPicker motion="none" onSelect={() => undefined} />);
    await screen.findByRole("region", { name: "Media picker" });
    expect(screen.queryByRole("button", { name: /Move picker/ })).toBeNull();
    expect(screen.queryByRole("group", { name: "Resize picker" })).toBeNull();
  });

  it("applies first-class dimensions without changing compact mode by default", async () => {
    const view = render(
      <MediaPicker
        defaultMode="compact"
        dimensions={{
          height: 520,
          maxHeight: "90dvh",
          maxWidth: 640,
          minHeight: 360,
          minWidth: 320,
          width: 420,
        }}
        onSelect={() => undefined}
      />,
    );
    const compact = screen.getByRole("region", { name: "Media picker" });
    expect(compact.style.getPropertyValue("--mp-picker-width")).toBe("");
    view.rerender(
      <MediaPicker
        dimensions={{ applyToCompact: true, width: 420 }}
        mode="compact"
        onSelect={() => undefined}
      />,
    );
    expect(compact.style.getPropertyValue("--mp-picker-width")).toBe("420px");
  });

  it("maps full width, height, and min/max constraints to public CSS variables", async () => {
    render(
      <MediaPicker
        dimensions={{
          height: 520,
          maxHeight: "90dvh",
          maxWidth: 640,
          minHeight: 360,
          minWidth: 320,
          width: 420,
        }}
        motion="none"
        onSelect={() => undefined}
      />,
    );
    const picker = await screen.findByRole("region", { name: "Media picker" });
    expect(picker.style.getPropertyValue("--mp-picker-width")).toBe("420px");
    expect(picker.style.getPropertyValue("--mp-picker-height")).toBe("520px");
    expect(picker.style.getPropertyValue("--mp-picker-min-width")).toBe(
      "320px",
    );
    expect(picker.style.getPropertyValue("--mp-picker-max-width")).toBe(
      "640px",
    );
    expect(picker.style.getPropertyValue("--mp-picker-min-height")).toBe(
      "360px",
    );
    expect(picker.style.getPropertyValue("--mp-picker-max-height")).toBe(
      "90dvh",
    );
  });

  it("renders anchored popovers through a portal and flips collisions", async () => {
    vi.stubGlobal("innerWidth", 500);
    vi.stubGlobal("innerHeight", 400);
    const anchorRef = createRef<HTMLButtonElement>();
    const onPlacement = vi.fn();
    render(
      <div>
        <button ref={anchorRef}>Open</button>
        <MediaPicker
          anchorRef={anchorRef}
          dimensions={{ height: 120, width: 200 }}
          displayMode="popover"
          onResolvedPlacementChange={onPlacement}
          onSelect={() => undefined}
          placement="bottom-start"
        />
      </div>,
    );
    const anchor = screen.getByRole("button", { name: "Open" });
    anchor.getBoundingClientRect = () => rect(120, 365, 50, 24);
    const picker = await screen.findByRole("region", { name: "Media picker" });
    picker.getBoundingClientRect = () => rect(0, 0, 200, 120);
    fireEvent(window, new Event("resize"));
    await waitFor(() =>
      expect(onPlacement).toHaveBeenLastCalledWith("top-start"),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("region", { name: "Media picker" })
          .closest(".mp-positioner")?.parentElement,
      ).toBe(document.body),
    );
  });

  it("uses a drag dead zone, then commits a bounded position", async () => {
    const onPositionChange = vi.fn();
    const onDragStart = vi.fn();
    const onDrag = vi.fn();
    render(
      <MediaPicker
        displayMode="popover"
        draggable={{ enabled: true, onDrag, onDragStart, onPositionChange }}
        motion="none"
        onSelect={() => undefined}
      />,
    );
    const handle = await screen.findByRole("button", {
      name: "Move picker; use arrow keys to reposition",
    });
    const picker = screen.getByRole("region", { name: "Media picker" });
    picker.getBoundingClientRect = () => rect(40, 40, 300, 320);
    Object.defineProperties(handle, {
      hasPointerCapture: { value: () => false },
      setPointerCapture: { value: vi.fn() },
    });
    pointer(handle, "pointerdown", {
      button: 0,
      clientX: 50,
      clientY: 50,
      pointerId: 1,
      pointerType: "touch",
    });
    pointer(handle, "pointermove", {
      clientX: 53,
      clientY: 52,
      pointerId: 1,
      pointerType: "touch",
    });
    expect(onDragStart).not.toHaveBeenCalled();
    pointer(handle, "pointermove", {
      clientX: 90,
      clientY: 100,
      pointerId: 1,
      pointerType: "touch",
    });
    pointer(handle, "pointermove", {
      clientX: 90,
      clientY: 100,
      pointerId: 1,
      pointerType: "touch",
    });
    expect(onDrag).not.toHaveBeenCalled();
    const positioner = picker.closest(".mp-positioner");
    const gestureLayer =
      positioner?.querySelector<HTMLElement>(".mp-gesture-layer");
    const motionLayer =
      positioner?.querySelector<HTMLElement>(".mp-motion-layer");
    await waitFor(() =>
      expect(gestureLayer?.style.translate).toBe("40px 50px"),
    );
    expect(onDrag).toHaveBeenCalledOnce();
    expect(motionLayer?.style.translate).toBe("");
    expect(motionLayer?.style.transform).toBe("");
    pointer(handle, "pointerup", {
      clientX: 90,
      clientY: 100,
      pointerId: 1,
      pointerType: "touch",
    });
    expect(onDragStart).toHaveBeenCalledOnce();
    expect(onPositionChange).toHaveBeenCalledWith({ x: 80, y: 90 });
  });

  it("cancels a pointer session and supports keyboard movement", async () => {
    const onPositionChange = vi.fn();
    const onDragEnd = vi.fn();
    render(
      <MediaPicker
        displayMode="popover"
        draggable={{ enabled: true, onDragEnd, onPositionChange }}
        motion="none"
        onSelect={() => undefined}
      />,
    );
    const handle = await screen.findByRole("button", { name: /Move picker/ });
    const picker = screen.getByRole("region", { name: "Media picker" });
    picker.getBoundingClientRect = () => rect(40, 40, 300, 320);
    Object.defineProperties(handle, {
      hasPointerCapture: { value: () => false },
      setPointerCapture: { value: vi.fn() },
    });
    pointer(handle, "pointerdown", {
      button: 0,
      clientX: 50,
      clientY: 50,
      pointerId: 2,
      pointerType: "mouse",
    });
    pointer(handle, "pointermove", {
      clientX: 100,
      clientY: 100,
      pointerId: 2,
      pointerType: "mouse",
    });
    pointer(handle, "pointercancel", {
      pointerId: 2,
      pointerType: "mouse",
    });
    expect(onDragEnd).not.toHaveBeenCalled();
    fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 80, y: 40 });
  });

  it("supports keyboard resize and reset while respecting explicit handles", async () => {
    const onDimensionsChange = vi.fn();
    render(
      <MediaPicker
        displayMode="inline"
        motion="none"
        onSelect={() => undefined}
        resizable={{ enabled: true, onDimensionsChange }}
      />,
    );
    const handle = await screen.findByRole("button", {
      name: /Resize picker bottom-right/,
    });
    const picker = screen.getByRole("region", { name: "Media picker" });
    picker.getBoundingClientRect = () => rect(0, 0, 320, 400);
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onDimensionsChange).toHaveBeenLastCalledWith({
      height: 410,
      width: 330,
    });
    fireEvent.keyDown(handle, { key: "Home" });
    expect(onDimensionsChange).toHaveBeenLastCalledWith({
      height: 400,
      width: 320,
    });
  });

  it("dismisses a bottom sheet only after its swipe threshold", async () => {
    const onClose = vi.fn();
    render(
      <MediaPicker
        displayMode="bottom-sheet"
        motion="none"
        onClose={onClose}
        onSelect={() => undefined}
        swipeToDismiss={{
          distanceThreshold: 80,
          enabled: true,
          velocityThreshold: 99,
        }}
      />,
    );
    const handle = await screen.findByRole("button", {
      name: "Drag down to close picker",
    });
    const picker = screen.getByRole("dialog", { name: "Media picker" });
    picker.getBoundingClientRect = () => rect(0, 0, 360, 500);
    Object.defineProperties(handle, {
      hasPointerCapture: { value: () => false },
      setPointerCapture: { value: vi.fn() },
    });
    pointer(handle, "pointerdown", {
      button: 0,
      clientX: 100,
      clientY: 20,
      pointerId: 4,
      pointerType: "pen",
    });
    pointer(handle, "pointermove", {
      clientX: 100,
      clientY: 45,
      pointerId: 4,
      pointerType: "pen",
    });
    pointer(handle, "pointerup", {
      clientX: 100,
      clientY: 45,
      pointerId: 4,
      pointerType: "pen",
    });
    expect(onClose).not.toHaveBeenCalled();
    pointer(handle, "pointerdown", {
      button: 0,
      clientX: 100,
      clientY: 20,
      pointerId: 5,
      pointerType: "touch",
    });
    pointer(handle, "pointermove", {
      clientX: 100,
      clientY: 140,
      pointerId: 5,
      pointerType: "touch",
    });
    pointer(handle, "pointerup", {
      clientX: 100,
      clientY: 140,
      pointerId: 5,
      pointerType: "touch",
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cleans interaction listeners through StrictMode remounts", async () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const view = render(
      <StrictMode>
        <MediaPicker
          displayMode="popover"
          draggable
          motion="none"
          onSelect={() => undefined}
        />
      </StrictMode>,
    );
    await screen.findByRole("button", {
      name: "Move picker; use arrow keys to reposition",
    });
    view.unmount();
    const blurAdds = add.mock.calls.filter(([type]) => type === "blur").length;
    const blurRemoves = remove.mock.calls.filter(
      ([type]) => type === "blur",
    ).length;
    expect(blurRemoves).toBe(blurAdds);
  });

  it("runs explicit exit motion before closing", async () => {
    const onClose = vi.fn();
    render(
      <MediaPicker
        motion={{ duration: 10, preset: "fade" }}
        onClose={onClose}
        onSelect={() => undefined}
      />,
    );
    const picker = await screen.findByRole("region", { name: "Media picker" });
    fireEvent.keyDown(picker, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(
      picker.closest(".mp-positioner")?.getAttribute("data-motion-state"),
    ).toBe("closing");
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("keeps enter motion active until its animation completes", async () => {
    const view = render(
      <MediaPicker
        motion={{ duration: 1_000, preset: "scale" }}
        onSelect={() => undefined}
      />,
    );
    await screen.findByRole("region", { name: "Media picker" });
    const positioner = view.container.querySelector(".mp-positioner");
    const motionLayer = view.container.querySelector(".mp-motion-layer");
    expect(positioner?.getAttribute("data-motion-preset")).toBe("scale");
    expect(positioner?.getAttribute("data-motion-state")).toBe("opening");
    expect(motionLayer).not.toBeNull();
    const animationEnd = new Event("animationend", { bubbles: true });
    Object.defineProperty(animationEnd, "animationName", {
      value: "mp-motion-scale",
    });
    fireEvent(motionLayer as Element, animationEnd);
    await waitFor(() =>
      expect(positioner?.getAttribute("data-motion-state")).toBe("open"),
    );
  });

  it("switches compact and full surfaces immediately with one enter phase", async () => {
    const view = render(
      <MediaPicker
        compact={{ allowExpand: true }}
        defaultMode="compact"
        motion={{ duration: 1_000, preset: "scale" }}
        onSelect={() => undefined}
      />,
    );
    await screen.findByRole("toolbar", { name: "Quick reactions" });
    const positioner = view.container.querySelector(".mp-positioner");
    const layer = view.container.querySelector(".mp-motion-layer");
    const initialEnd = new Event("animationend", { bubbles: true });
    Object.defineProperty(initialEnd, "animationName", {
      value: "mp-motion-scale",
    });
    fireEvent(layer as Element, initialEnd);

    fireEvent.click(
      screen.getByRole("button", { name: "Open full media picker" }),
    );
    expect(positioner?.getAttribute("data-mode")).toBe("full");
    expect(positioner?.getAttribute("data-motion-state")).toBe("opening");
    expect(positioner?.getAttribute("data-transition-direction")).toBe(
      "expand",
    );
    expect(
      screen.queryByRole("toolbar", { name: "Quick reactions" }),
    ).toBeNull();
    await screen.findByRole("searchbox", { name: "Search emoji" });
  });

  it("creates a bounded decorative genie proxy only during its transition", async () => {
    const bounds = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("mp-picker--compact")
          ? rect(120, 420, 220, 48)
          : rect(80, 120, 420, 520);
      });
    const view = render(
      <StrictMode>
        <MediaPicker
          compact={{ allowExpand: true }}
          defaultMode="compact"
          motion={{ duration: 1_000, preset: "genie" }}
          onSelect={() => undefined}
        />
      </StrictMode>,
    );
    const expand = await screen.findByRole("button", {
      name: "Open full media picker",
    });
    const initialLayer = view.container.querySelector(".mp-motion-layer");
    const initialEnd = new Event("animationend", { bubbles: true });
    Object.defineProperty(initialEnd, "animationName", {
      value: "mp-motion-scale",
    });
    fireEvent(initialLayer as Element, initialEnd);
    fireEvent.click(expand);

    await screen.findByRole("searchbox", { name: "Search emoji" });
    const positioner = view.container.querySelector(".mp-positioner");
    await waitFor(() =>
      expect(positioner?.getAttribute("data-genie-ready")).toBe("true"),
    );
    const proxy = screen.getByTestId("genie-transition-proxy");
    expect(proxy.getAttribute("aria-hidden")).toBe("true");
    expect(proxy.hasAttribute("inert")).toBe(true);
    expect(proxy.parentElement).toBe(document.body);
    expect(screen.getAllByTestId("genie-transition-proxy")).toHaveLength(1);
    expect(proxy.querySelectorAll(".mp-genie-proxy__slice")).toHaveLength(6);
    expect(proxy.style.getPropertyValue("--mp-genie-left")).toBe("80px");
    const transitionEnd = new Event("animationend", { bubbles: true });
    Object.defineProperty(transitionEnd, "animationName", {
      value: "mp-motion-genie-content",
    });
    fireEvent(view.container.querySelector(".mp-motion-layer")!, transitionEnd);
    await waitFor(() =>
      expect(screen.queryByTestId("genie-transition-proxy")).toBeNull(),
    );
    bounds.mockRestore();
  });

  it("falls back without creating a Genie proxy for invalid geometry", async () => {
    const bounds = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(() => rect(0, 0, 0, 0));
    const view = render(
      <MediaPicker
        compact={{ allowExpand: true }}
        defaultMode="compact"
        motion={{ duration: 1_000, preset: "genie" }}
        onSelect={() => undefined}
      />,
    );
    const layer = view.container.querySelector(".mp-motion-layer");
    const initialEnd = new Event("animationend", { bubbles: true });
    Object.defineProperty(initialEnd, "animationName", {
      value: "mp-motion-scale",
    });
    fireEvent(layer as Element, initialEnd);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open full media picker",
      }),
    );
    await screen.findByRole("searchbox", { name: "Search emoji" });
    await waitFor(() =>
      expect(
        view.container
          .querySelector(".mp-positioner")
          ?.getAttribute("data-genie-ready"),
      ).toBe("false"),
    );
    expect(screen.queryByTestId("genie-transition-proxy")).toBeNull();
    bounds.mockRestore();
  });

  it("reduces complex motion to none from the user media preference", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      addEventListener: vi.fn(),
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
    }));
    const view = render(
      <MediaPicker motion="genie" onSelect={() => undefined} />,
    );
    await screen.findByRole("region", { name: "Media picker" });
    await waitFor(() =>
      expect(
        view.container
          .querySelector(".mp-positioner")
          ?.getAttribute("data-motion-preset"),
      ).toBe("none"),
    );
    expect(screen.queryByTestId("genie-transition-proxy")).toBeNull();
  });
});
