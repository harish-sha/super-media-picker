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
  CustomMediaItem,
  GifMediaItem,
  MediaUrlPolicy,
  StickerMediaItem,
} from "@super-media-picker/core";
import { isSafeMediaUrl } from "@super-media-picker/core";

import type { MediaPickerRenderers } from "../types";

export class AnimationConcurrencyManager {
  #active: Set<string> | undefined;
  readonly #maximum: number;

  constructor(maximum = 3) {
    this.#maximum = Math.max(1, Math.floor(maximum));
  }

  acquire(id: string): boolean {
    const active = (this.#active ??= new Set<string>());
    if (active.has(id)) return true;
    if (active.size >= this.#maximum) return false;
    active.add(id);
    return true;
  }

  release(id: string): void {
    this.#active?.delete(id);
  }

  get activeCount(): number {
    return this.#active?.size ?? 0;
  }
}

export interface AnimatedMediaRendererProps {
  readonly item:
    AnimatedEmojiMediaItem | GifMediaItem | StickerMediaItem | CustomMediaItem;
  readonly config: AnimatedMediaConfig;
  readonly manager: AnimationConcurrencyManager;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly renderers?: MediaPickerRenderers;
}

export function AnimatedMediaRenderer({
  item,
  config,
  manager,
  mediaSecurity,
  renderers,
}: AnimatedMediaRendererProps) {
  const instanceId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [explicitlyActivated, setExplicitlyActivated] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [animationFailed, setAnimationFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const autoplay = config.autoplay ?? "hover";
  const animationUrl =
    item.type === "emoji"
      ? item.animationUrl
      : item.type === "gif"
        ? item.previewUrl
        : item.url;
  const previewUrl =
    item.type === "gif"
      ? (item.thumbnailUrl ?? item.previewUrl)
      : (item.thumbnailUrl ?? item.previewUrl);
  const format = item.type === "gif" ? "gif" : (item.format ?? "webp");
  const label =
    item.type === "emoji"
      ? item.name
      : (item.name ?? item.alt ?? "Animated media");
  const safeAnimationUrl = isSafeMediaUrl(animationUrl, mediaSecurity);
  const wantsAnimation =
    safeAnimationUrl &&
    !animationFailed &&
    (explicitlyActivated ||
      (!reducedMotion &&
        (autoplay === "always" ||
          (autoplay === "visible" && visible) ||
          (autoplay === "hover" && engaged))));
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
    const control = rootRef.current?.closest("button");
    if (control === null || control === undefined) return;
    const focus = (): void => setEngaged(true);
    const blur = (): void => {
      setEngaged(false);
      setExplicitlyActivated(false);
    };
    control.addEventListener("focus", focus);
    control.addEventListener("blur", blur);
    return () => {
      control.removeEventListener("focus", focus);
      control.removeEventListener("blur", blur);
    };
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
    if (event.type === "blur" || event.type === "pointerleave") {
      setEngaged(false);
      setExplicitlyActivated(false);
    }
  }

  const staticFallback =
    previewUrl ?? (item.type === "emoji" ? item.fallbackEmoji : undefined);
  const safePreviewUrl =
    !previewFailed &&
    staticFallback !== undefined &&
    isSafeMediaUrl(staticFallback, mediaSecurity)
      ? staticFallback
      : undefined;
  const fallbackGlyph = item.type === "emoji" ? item.fallbackEmoji : undefined;
  let visual;
  if (!granted) {
    visual = safePreviewUrl ? (
      <img
        alt=""
        loading="lazy"
        onError={() => setPreviewFailed(true)}
        src={safePreviewUrl}
      />
    ) : (
      <span aria-hidden="true" data-media-fallback="">
        {fallbackGlyph ?? "◌"}
      </span>
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
        onError={() => setAnimationFailed(true)}
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
    }) ?? (
      <span aria-hidden="true" data-media-fallback="">
        {fallbackGlyph ?? "◌"}
      </span>
    );
  } else {
    visual = (
      <img
        alt=""
        loading="lazy"
        onError={() => setAnimationFailed(true)}
        src={animationUrl}
      />
    );
  }

  return (
    <span
      aria-label={label}
      className="mp-animated-media"
      data-active={granted ? "true" : "false"}
      data-error={animationFailed || previewFailed ? "true" : undefined}
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
