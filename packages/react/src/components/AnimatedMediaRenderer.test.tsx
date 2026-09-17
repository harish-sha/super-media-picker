import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { AnimatedEmojiMediaItem } from "@super-media-picker/core";

import type { AnimatedMediaRendererAdapter } from "../types";
import {
  AnimatedMediaRenderer,
  AnimationConcurrencyManager,
  resolveAnimatedMediaPlaybackPolicy,
} from "./AnimatedMediaRenderer";
import { MediaResultsGrid } from "./MediaResultsGrid";

const pixel = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

const animated: AnimatedEmojiMediaItem = {
  type: "emoji",
  kind: "animated",
  id: "wave",
  name: "Animated wave",
  fallbackEmoji: "👋",
  posterUrl: `${pixel}#poster`,
  animationUrl: `${pixel}#animation`,
  format: "gif",
};

describe("animated media foundation", () => {
  it("normalizes explicit and beta.6 playback configuration", () => {
    expect(resolveAnimatedMediaPlaybackPolicy({})).toBe("on-intent");
    expect(resolveAnimatedMediaPlaybackPolicy({ autoplay: "hover" })).toBe(
      "on-intent",
    );
    expect(resolveAnimatedMediaPlaybackPolicy({ autoplay: "visible" })).toBe(
      "always",
    );
    expect(
      resolveAnimatedMediaPlaybackPolicy(
        { playback: "on-focus" },
        "loop-while-active",
      ),
    ).toBe("loop-while-active");
  });

  it("renders a poster first and activates only from intent by default", async () => {
    render(
      <button type="button">
        <AnimatedMediaRenderer
          config={{}}
          item={animated}
          manager={new AnimationConcurrencyManager(1)}
        />
      </button>,
    );
    const visual = screen.getByRole("img", { name: "Animated wave" });
    await waitFor(() =>
      expect(visual.getAttribute("data-media-state")).toBe("preparing"),
    );
    expect(visual.querySelector("img")?.src).toContain("#poster");
    fireEvent.focus(visual.closest("button")!);
    await waitFor(() =>
      expect(visual.getAttribute("data-active")).toBe("true"),
    );
    expect(
      visual.querySelector<HTMLImageElement>(
        ".mp-animated-media__animation img",
      )?.src,
    ).toContain("#animation");
    fireEvent.blur(visual.closest("button")!);
    await waitFor(() =>
      expect(visual.getAttribute("data-active")).toBe("false"),
    );
  });

  it("keeps the poster authoritative until each animation session is ready", async () => {
    render(
      <button type="button">
        <AnimatedMediaRenderer
          config={{}}
          item={animated}
          manager={new AnimationConcurrencyManager(1)}
        />
      </button>,
    );
    const control = screen.getByRole("button");
    const visual = screen.getByRole("img", { name: "Animated wave" });
    const poster = visual.querySelector<HTMLElement>(
      ".mp-animated-media__poster",
    )!;

    fireEvent.focus(control);
    const firstAnimation = await waitFor(() => {
      const layer = visual.querySelector<HTMLElement>(
        ".mp-animated-media__animation",
      );
      expect(layer).not.toBeNull();
      return layer!;
    });
    expect(poster.getAttribute("data-visible")).toBe("true");
    expect(firstAnimation.getAttribute("data-ready")).toBe("false");
    fireEvent.load(firstAnimation.querySelector("img")!);
    await waitFor(() =>
      expect(firstAnimation.getAttribute("data-ready")).toBe("true"),
    );
    expect(poster.getAttribute("data-visible")).toBe("false");

    fireEvent.blur(control);
    await waitFor(() =>
      expect(visual.querySelector(".mp-animated-media__animation")).toBeNull(),
    );
    expect(poster.getAttribute("data-visible")).toBe("true");

    fireEvent.focus(control);
    const secondAnimation = await waitFor(() => {
      const layer = visual.querySelector<HTMLElement>(
        ".mp-animated-media__animation",
      );
      expect(layer).not.toBeNull();
      return layer!;
    });
    expect(secondAnimation.getAttribute("data-ready")).toBe("false");
    expect(poster.getAttribute("data-visible")).toBe("true");
  });

  it("walks poster candidates before the Unicode fallback", async () => {
    const view = render(
      <AnimatedMediaRenderer
        config={{ playback: "never" }}
        item={{
          ...animated,
          assets: [
            { role: "poster", url: `${pixel}#first`, format: "gif" },
            { role: "thumbnail", url: `${pixel}#second`, format: "gif" },
          ],
        }}
        manager={new AnimationConcurrencyManager(1)}
      />,
    );
    fireEvent.error(view.container.querySelector("img")!);
    expect(view.container.querySelector("img")?.src).toContain("#poster");
    fireEvent.error(view.container.querySelector("img")!);
    expect(view.container.querySelector("img")?.src).toContain("#second");
    fireEvent.error(view.container.querySelector("img")!);
    expect(view.container.textContent).toContain("👋");
    expect(
      view.container.querySelector("[data-media-fallback=unicode]"),
    ).not.toBeNull();
  });

  it("queues visible work and preempts it for selected intent", () => {
    const manager = new AnimationConcurrencyManager(1);
    const first = vi.fn();
    const second = vi.fn();
    const releaseFirst = manager.request("first", "visible", first);
    expect(first).toHaveBeenLastCalledWith(true);
    const releaseSecond = manager.request("second", "selected", second);
    expect(first).toHaveBeenLastCalledWith(false);
    expect(second).toHaveBeenLastCalledWith(true);
    expect(manager.activeCount).toBe(1);
    expect(manager.queuedCount).toBe(1);
    releaseSecond();
    expect(first).toHaveBeenLastCalledWith(true);
    releaseFirst();
    expect(manager.activeCount).toBe(0);
  });

  it("notifies a newly queued renderer so dynamic limits cannot retain a stale grant", () => {
    const manager = new AnimationConcurrencyManager(1);
    const first = vi.fn();
    const queued = vi.fn();
    const releaseFirst = manager.request("first", "visible", first);
    const releaseQueued = manager.request("queued", "visible", queued);

    expect(first).toHaveBeenLastCalledWith(true);
    expect(queued).toHaveBeenLastCalledWith(false);
    releaseFirst();
    expect(queued).toHaveBeenLastCalledWith(true);
    releaseQueued();
  });

  it("emits selection immediately and optionally replays afterward", async () => {
    const onSelect = vi.fn();
    render(
      <MediaResultsGrid
        animation={{ playback: "on-intent", playOnSelect: true }}
        animationManager={new AnimationConcurrencyManager(1)}
        emptyMessage="empty"
        favoriteIds={new Set()}
        favoritesEnabled={false}
        items={[animated]}
        label="Animated emoji"
        onFavoriteToggle={() => undefined}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Animated wave" }));
    expect(onSelect).toHaveBeenCalledWith(animated);
    await waitFor(() =>
      expect(screen.getByRole("img").getAttribute("data-active")).toBe("true"),
    );
  });

  it("owns and destroys an optional Lottie adapter lifecycle", async () => {
    const destroy = vi.fn();
    const play = vi.fn();
    const mount = vi.fn<AnimatedMediaRendererAdapter["mount"]>((target) => {
      target.append(document.createElement("i"));
      return { destroy, play };
    });
    const view = render(
      <button type="button">
        <AnimatedMediaRenderer
          config={{ playback: "on-focus" }}
          item={{
            ...animated,
            animationUrl: "/wave.json",
            format: "lottie",
          }}
          manager={new AnimationConcurrencyManager(1)}
          renderers={{ animatedMedia: { lottie: { mount } } }}
        />
      </button>,
    );
    fireEvent.focus(screen.getByRole("button"));
    await waitFor(() => expect(mount).toHaveBeenCalledOnce());
    expect(play).toHaveBeenCalledOnce();
    view.unmount();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("suppresses all activation when reduced motion is requested", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(
      <AnimatedMediaRenderer
        config={{ playback: "always" }}
        item={animated}
        manager={new AnimationConcurrencyManager(1)}
      />,
    );
    const visual = screen.getByRole("img");
    fireEvent.pointerDown(visual, { pointerType: "touch" });
    await waitFor(() =>
      expect(visual.getAttribute("data-reduced-motion")).toBe("true"),
    );
    expect(visual.getAttribute("data-active")).toBe("false");
    expect(visual.querySelector("img")?.src).toContain("#poster");
  });

  it("pauses offscreen and page-hidden media and disconnects its observer", async () => {
    let notify:
      ((entries: readonly { isIntersecting: boolean }[]) => void) | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(
          callback: (entries: readonly { isIntersecting: boolean }[]) => void,
        ) {
          notify = callback;
        }
        observe() {}
        disconnect() {
          disconnect();
        }
      },
    );
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    const view = render(
      <AnimatedMediaRenderer
        config={{ playback: "always" }}
        item={animated}
        manager={new AnimationConcurrencyManager(1)}
      />,
    );
    const visual = screen.getByRole("img");
    expect(visual.getAttribute("data-active")).toBe("false");
    notify?.([{ isIntersecting: true }]);
    await waitFor(() =>
      expect(visual.getAttribute("data-active")).toBe("true"),
    );
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() =>
      expect(visual.getAttribute("data-active")).toBe("false"),
    );
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  it("configures silent inline WebM and releases the media resource", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => undefined);
    const load = vi
      .spyOn(HTMLMediaElement.prototype, "load")
      .mockImplementation(() => undefined);
    const view = render(
      <AnimatedMediaRenderer
        config={{ playback: "always" }}
        item={{ ...animated, animationUrl: "/wave.webm", format: "webm" }}
        manager={new AnimationConcurrencyManager(1)}
      />,
    );
    const video = await waitFor(() => {
      const candidate = view.container.querySelector("video");
      expect(candidate).not.toBeNull();
      return candidate!;
    });
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.controls).toBe(false);
    expect(video.preload).toBe("metadata");
    await waitFor(() => expect(play).toHaveBeenCalledOnce());
    view.unmount();
    expect(video.hasAttribute("src")).toBe(false);
    expect(pause).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
    play.mockRestore();
    pause.mockRestore();
    load.mockRestore();
  });

  it("contains adapter errors and does not leak instances under StrictMode", async () => {
    const destroyed: string[] = [];
    let mounted = 0;
    const adapter: AnimatedMediaRendererAdapter = {
      mount() {
        const id = `adapter-${++mounted}`;
        return { destroy: () => destroyed.push(id) };
      },
    };
    const view = render(
      <StrictMode>
        <button type="button">
          <AnimatedMediaRenderer
            config={{ playback: "always" }}
            item={{ ...animated, animationUrl: "/wave.json", format: "lottie" }}
            manager={new AnimationConcurrencyManager(1)}
            renderers={{ animatedMedia: { lottie: adapter } }}
          />
        </button>
      </StrictMode>,
    );
    await waitFor(() => expect(mounted).toBeGreaterThan(0));
    view.unmount();
    expect(destroyed).toHaveLength(mounted);

    render(
      <button type="button">
        <AnimatedMediaRenderer
          config={{ playback: "on-focus" }}
          item={{ ...animated, animationUrl: "/broken.json", format: "lottie" }}
          manager={new AnimationConcurrencyManager(1)}
          renderers={{
            animatedMedia: {
              lottie: {
                mount() {
                  throw new Error("adapter failed");
                },
              },
            },
          }}
        />
      </button>,
    );
    fireEvent.focus(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.getByRole("img").getAttribute("data-error")).toBe("true"),
    );
    expect(screen.getByRole("img").querySelector("img")?.src).toContain(
      "#poster",
    );
  });
});
