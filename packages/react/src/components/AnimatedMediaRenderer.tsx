import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
} from "react";

import type {
  AnimatedEmojiMediaItem,
  AnimatedMediaConfig,
  StickerMediaItem,
} from "@super-media-picker/core";

import type { MediaPickerRenderers } from "../types";

export class AnimationConcurrencyManager {
  readonly #active = new Set<string>();
  readonly #maximum: number;

  constructor(maximum = 3) {
    this.#maximum = Math.max(1, Math.floor(maximum));
  }

  acquire(id: string): boolean {
    if (this.#active.has(id)) return true;
    if (this.#active.size >= this.#maximum) return false;
    this.#active.add(id);
    return true;
  }

  release(id: string): void {
    this.#active.delete(id);
  }

  get activeCount(): number {
    return this.#active.size;
  }
}

export interface AnimatedMediaRendererProps {
  readonly item: AnimatedEmojiMediaItem | StickerMediaItem;
  readonly config: AnimatedMediaConfig;
  readonly manager: AnimationConcurrencyManager;
  readonly renderers?: MediaPickerRenderers;
}

export function AnimatedMediaRenderer({
  item,
  config,
  manager,
  renderers,
}: AnimatedMediaRendererProps) {
  const instanceId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [explicitlyActivated, setExplicitlyActivated] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const autoplay = config.autoplay ?? "hover";
  const animationUrl = item.type === "emoji" ? item.animationUrl : item.url;
  const previewUrl = item.previewUrl;
  const format = item.format ?? "webp";
  const label =
    item.type === "emoji"
      ? item.name
      : (item.name ?? item.alt ?? "Animated media");
  const wantsAnimation =
    explicitlyActivated ||
    (!reducedMotion &&
      (autoplay === "always" ||
        (autoplay === "visible" && visible) ||
        (autoplay === "hover" && engaged)));
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const query = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (query === undefined) return;
    const update = (): void => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = rootRef.current;
    if (element === null || globalThis.IntersectionObserver === undefined) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { rootMargin: "80px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    if (!wantsAnimation || !visible) {
      manager.release(instanceId);
      const update = setTimeout(() => {
        if (active) setGranted(false);
      }, 0);
      return () => {
        active = false;
        clearTimeout(update);
      };
    }
    const acquired = manager.acquire(instanceId);
    const update = setTimeout(() => {
      if (active) setGranted(acquired);
    }, 0);
    return () => {
      active = false;
      clearTimeout(update);
      manager.release(instanceId);
    };
  }, [instanceId, manager, visible, wantsAnimation]);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    if (granted) void video.play().catch(() => undefined);
    else {
      video.pause();
      video.currentTime = 0;
    }
    return () => video.pause();
  }, [granted]);

  function engage(): void {
    setEngaged(true);
  }

  function disengage(event: FocusEvent | PointerEvent): void {
    if (event.type === "blur" || event.type === "pointerleave")
      setEngaged(false);
  }

  const staticFallback =
    previewUrl ?? (item.type === "emoji" ? item.fallbackEmoji : undefined);
  let visual;
  if (!granted) {
    visual =
      staticFallback?.startsWith?.("http") ||
      staticFallback?.startsWith?.("data:") ? (
        <img alt="" loading="lazy" src={staticFallback} />
      ) : (
        <span aria-hidden="true">{staticFallback ?? "◌"}</span>
      );
  } else if (format === "webm") {
    visual = (
      <video
        aria-hidden="true"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        ref={videoRef}
        src={animationUrl}
      />
    );
  } else if (format === "lottie") {
    visual = renderers?.lottie?.({
      active: true,
      animationUrl,
      format,
      label,
      ...(previewUrl === undefined ? {} : { previewUrl }),
    }) ?? <span aria-hidden="true">{staticFallback ?? "◌"}</span>;
  } else {
    visual = <img alt="" loading="lazy" src={animationUrl} />;
  }

  return (
    <span
      aria-label={label}
      className="mp-animated-media"
      data-active={granted ? "true" : "false"}
      onBlur={disengage}
      onFocus={engage}
      onPointerDown={() => {
        setExplicitlyActivated(true);
        engage();
      }}
      onPointerEnter={engage}
      onPointerLeave={disengage}
      ref={rootRef}
      role="img"
    >
      {visual}
    </span>
  );
}
