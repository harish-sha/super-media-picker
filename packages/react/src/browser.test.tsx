import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MediaItem } from "@super-media-picker/core";

import {
  configureBrowserAssetBase,
  createSuperMediaPicker,
  defineSuperMediaPicker,
  SUPER_MEDIA_PICKER_TAG,
  SuperMediaPickerElement,
} from "./browser";

configureBrowserAssetBase(
  "https://cdn.example/npm/super-media-picker@candidate/dist/browser/super-media-picker.esm.js",
);
defineSuperMediaPicker();

async function connect(
  configure?: (element: SuperMediaPickerElement) => void,
): Promise<SuperMediaPickerElement> {
  const element = document.createElement(SUPER_MEDIA_PICKER_TAG);
  element.motion = "none";
  configure?.(element);
  await act(async () => {
    document.body.append(element);
    await Promise.resolve();
  });
  await waitFor(() =>
    expect(element.shadowRoot?.querySelector(".mp-picker")).not.toBeNull(),
  );
  return element;
}

afterEach(async () => {
  await act(async () => {
    document.body.replaceChildren();
    await Promise.resolve();
  });
  localStorage.clear();
});

describe("browser custom element", () => {
  it("registers idempotently and resolves assets relative to the browser entry", async () => {
    expect(() => defineSuperMediaPicker()).not.toThrow();
    expect(() => defineSuperMediaPicker()).not.toThrow();
    expect(customElements.get(SUPER_MEDIA_PICKER_TAG)).toBe(
      SuperMediaPickerElement,
    );

    const element = await connect((picker) => {
      picker.mode = "compact";
    });
    const stylesheet = element.shadowRoot?.querySelector<HTMLLinkElement>(
      "link[data-smp-styles]",
    );
    expect(stylesheet?.href).toBe(
      "https://cdn.example/npm/super-media-picker@candidate/dist/browser/styles.css",
    );
    expect(
      element.shadowRoot?.querySelector("[part~='application']"),
    ).not.toBeNull();
    expect(
      element.shadowRoot?.querySelector("[part~='overlay']"),
    ).not.toBeNull();
  });

  it("updates attributes and complex properties without replacing its React mount", async () => {
    const element = await connect((picker) => {
      picker.mode = "compact";
      picker.dimensions = { width: 360, height: 420 };
      picker.interactions = { draggable: false, resizable: false };
      picker.theme = "light";
    });
    const mount = element.shadowRoot?.querySelector("[data-smp-mount]");
    const surface = () =>
      element.shadowRoot?.querySelector<HTMLElement>(".mp-picker");

    expect(surface()?.dataset.theme).toBe("light");
    await act(async () => {
      element.setAttribute("theme", "dark");
      await Promise.resolve();
    });
    expect(surface()?.dataset.theme).toBe("light");

    await act(async () => {
      element.theme = "dark";
      element.update({
        dimensions: { width: 420, height: 500, applyToCompact: true },
        interactions: { draggable: true },
      });
      await Promise.resolve();
    });
    expect(element.shadowRoot?.querySelector("[data-smp-mount]")).toBe(mount);
    expect(surface()?.dataset.theme).toBe("dark");
    expect(surface()?.style.getPropertyValue("--mp-picker-width")).toBe(
      "420px",
    );
  });

  it("emits one normalized MediaItem through a composed, bubbling event", async () => {
    const received: MediaItem[] = [];
    const parent = document.createElement("div");
    document.body.append(parent);
    parent.addEventListener("media-select", (event) => {
      received.push((event as CustomEvent<MediaItem>).detail);
    });
    const element = document.createElement(SUPER_MEDIA_PICKER_TAG);
    element.motion = "none";
    element.defaultSearchQuery = "rocket";
    element.storageNamespace = "browser-event-test";
    element.features = { recents: true };
    await act(async () => {
      parent.append(element);
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(
        element.shadowRoot?.querySelector<HTMLButtonElement>(
          'button[aria-label="rocket"]',
        ),
      ).not.toBeNull(),
    );
    const button = element.shadowRoot?.querySelector<HTMLButtonElement>(
      'button[aria-label="rocket"]',
    );
    await act(async () => {
      button?.click();
      await Promise.resolve();
    });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      type: "emoji",
      name: "rocket",
      value: "🚀",
    });
    await waitFor(() =>
      expect(
        localStorage.getItem("browser-event-test:emoji.recents"),
      ).not.toBeNull(),
    );
  });

  it("keeps tone and picker portals inside its own ShadowRoot overlay", async () => {
    const element = await connect();
    const trigger = element.shadowRoot?.querySelector<HTMLButtonElement>(
      'button[aria-label^="Emoji skin tone:"]',
    );
    expect(trigger).not.toBeNull();
    await act(async () => {
      trigger?.click();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(
        element.shadowRoot?.querySelector("[data-smp-overlay] .mp-tone-menu"),
      ).not.toBeNull(),
    );
    expect(document.body.querySelector(".mp-tone-menu")).toBeNull();
  });

  it("isolates multiple instances and cleans up across disconnect and reconnect", async () => {
    const first = await connect((picker) => {
      picker.mode = "compact";
      picker.theme = "light";
      picker.storageNamespace = "first-picker";
    });
    const second = await connect((picker) => {
      picker.mode = "compact";
      picker.theme = "dark";
      picker.storageNamespace = "second-picker";
    });
    expect(first.shadowRoot).not.toBe(second.shadowRoot);
    expect(
      first.shadowRoot?.querySelector<HTMLElement>(".mp-picker")?.dataset.theme,
    ).toBe("light");
    expect(
      second.shadowRoot?.querySelector<HTMLElement>(".mp-picker")?.dataset
        .theme,
    ).toBe("dark");

    const firstShadow = first.shadowRoot;
    await act(async () => {
      first.remove();
      await Promise.resolve();
      document.body.append(first);
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(first.shadowRoot?.querySelector(".mp-picker")).not.toBeNull(),
    );
    expect(first.shadowRoot).toBe(firstShadow);
    expect(second.shadowRoot?.querySelector(".mp-picker")).not.toBeNull();
  });

  it("supports imperative create, update, close, open, destroy, and recreate", async () => {
    const opened = vi.fn();
    const closed = vi.fn();
    const target = document.createElement("div");
    document.body.append(target);
    let controller: ReturnType<typeof createSuperMediaPicker>;
    await act(async () => {
      controller = createSuperMediaPicker({
        target,
        mode: "compact",
        motion: "none",
        onOpen: opened,
        onClose: closed,
      });
      await Promise.resolve();
    });
    expect(controller!.element.isConnected).toBe(true);
    expect(opened).toHaveBeenCalledOnce();

    await act(async () => {
      controller!.update({ theme: "dark" });
      controller!.close();
      await Promise.resolve();
    });
    expect(controller!.element.isOpen).toBe(false);
    expect(closed).toHaveBeenCalledOnce();

    await act(async () => {
      controller!.open();
      await Promise.resolve();
    });
    expect(controller!.element.isOpen).toBe(true);
    expect(opened).toHaveBeenCalledTimes(2);

    await act(async () => {
      controller!.destroy();
      await Promise.resolve();
    });
    expect(controller!.element.isConnected).toBe(false);

    const recreated = createSuperMediaPicker({
      target,
      mode: "compact",
      motion: "none",
    });
    expect(recreated.element).not.toBe(controller!.element);
    recreated.destroy();
  });

  it("reports reduced motion and does not create a document-body Genie proxy", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const element = await connect((picker) => {
      picker.mode = "compact";
      picker.allowExpand = true;
      picker.motion = "genie";
    });
    expect(
      element.shadowRoot?.querySelector<HTMLElement>(".mp-positioner")?.dataset
        .reducedMotion,
    ).toBe("true");
    expect(document.body.querySelector(".mp-genie-proxy")).toBeNull();
  });
});
