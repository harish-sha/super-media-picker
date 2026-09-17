import {
  Component,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  isSafeMediaAsset,
  mediaItemKey,
  resolveMediaItemAssets,
  type AnimatedEmojiMediaItem,
  type AnimatedMediaConfig,
  type AnimatedMediaFormat,
  type AnimatedMediaPlaybackPolicy,
  type AnimatedMediaState,
  type CustomEmojiMediaItem,
  type CustomMediaItem,
  type GifMediaItem,
  type MediaUrlPolicy,
  type StickerMediaItem,
} from "@super-media-picker/core";

import type {
  AnimatedMediaRenderProps,
  AnimatedMediaRendererAdapter,
  MediaPickerRenderers,
} from "../types";

export type AnimationPriority = "visible" | "intent" | "focused" | "selected";

interface AnimationRequest {
  readonly id: string;
  readonly order: number;
  readonly notify: (granted: boolean) => void;
  priority: AnimationPriority;
  granted: boolean;
}

const priorityWeight: Readonly<Record<AnimationPriority, number>> = {
  visible: 0,
  intent: 1,
  focused: 2,
  selected: 3,
};

/** Per-picker priority scheduler shared by emoji, GIF, sticker, and custom media. */
export class AnimationConcurrencyManager {
  readonly #manual = new Set<string>();
  readonly #requests = new Map<string, AnimationRequest>();
  readonly #maximum: number;
  #order = 0;

  constructor(maximum = 3) {
    this.#maximum = Math.max(1, Math.floor(maximum));
  }

  /** Legacy immediate acquisition retained for beta.6 consumers. */
  acquire(id: string): boolean {
    if (this.#manual.has(id)) return true;
    if (this.activeCount >= this.#maximum) return false;
    this.#manual.add(id);
    this.#rebalance();
    return true;
  }

  /** Queues and reprioritizes a renderer without polling from React. */
  request(
    id: string,
    priority: AnimationPriority,
    notify: (granted: boolean) => void,
  ): () => void {
    const existing = this.#requests.get(id);
    const created = existing === undefined;
    if (existing === undefined) {
      this.#requests.set(id, {
        id,
        priority,
        notify,
        order: this.#order++,
        granted: false,
      });
    } else {
      existing.priority = priority;
    }
    this.#rebalance();
    const current = this.#requests.get(id);
    if (created && current !== undefined && !current.granted)
      current.notify(false);
    return () => {
      const request = this.#requests.get(id);
      if (request === undefined) return;
      this.#requests.delete(id);
      if (request.granted) request.notify(false);
      this.#rebalance();
    };
  }

  release(id: string): void {
    this.#manual.delete(id);
    const request = this.#requests.get(id);
    if (request !== undefined) {
      this.#requests.delete(id);
      if (request.granted) request.notify(false);
    }
    this.#rebalance();
  }

  get activeCount(): number {
    return (
      this.#manual.size +
      [...this.#requests.values()].filter(({ granted }) => granted).length
    );
  }

  get queuedCount(): number {
    return [...this.#requests.values()].filter(({ granted }) => !granted)
      .length;
  }

  #rebalance(): void {
    const capacity = Math.max(0, this.#maximum - this.#manual.size);
    const granted = new Set(
      [...this.#requests.values()]
        .sort(
          (left, right) =>
            priorityWeight[right.priority] - priorityWeight[left.priority] ||
            left.order - right.order,
        )
        .slice(0, capacity)
        .map(({ id }) => id),
    );
    for (const request of this.#requests.values()) {
      const next = granted.has(request.id);
      if (next === request.granted) continue;
      request.granted = next;
      request.notify(next);
    }
  }
}

export interface AnimatedMediaRendererProps {
  readonly item:
    | AnimatedEmojiMediaItem
    | (CustomEmojiMediaItem & { readonly animated: true })
    | GifMediaItem
    | StickerMediaItem
    | CustomMediaItem;
  readonly config: AnimatedMediaConfig;
  readonly manager: AnimationConcurrencyManager;
  readonly activationToken?: number;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly renderers?: MediaPickerRenderers;
}

export function resolveAnimatedMediaPlaybackPolicy(
  config: AnimatedMediaConfig,
  itemPolicy?: AnimatedMediaPlaybackPolicy,
): AnimatedMediaPlaybackPolicy {
  if (itemPolicy !== undefined) return itemPolicy;
  if (config.playback !== undefined) return config.playback;
  if (config.autoplay === "never") return "never";
  if (config.autoplay === "always" || config.autoplay === "visible")
    return "always";
  return "on-intent";
}

export function AnimatedMediaRenderer({
  ...props
}: AnimatedMediaRendererProps) {
  return (
    <AnimatedMediaRendererInstance key={mediaItemKey(props.item)} {...props} />
  );
}

function AnimatedMediaRendererInstance({
  item,
  config,
  manager,
  activationToken,
  mediaSecurity,
  renderers,
}: AnimatedMediaRendererProps) {
  const instanceId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previousActivation = useRef(activationToken);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(
    () => globalThis.document?.visibilityState !== "hidden",
  );
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [selectionIntent, setSelectionIntent] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [animationFailed, setAnimationFailed] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);
  const [posterReady, setPosterReady] = useState(false);
  const [nativeState, setNativeState] = useState<AnimatedMediaState>("idle");
  const [hasPlayed, setHasPlayed] = useState(false);
  const [granted, setGranted] = useState(false);
  const assets = useMemo(() => resolveMediaItemAssets(item), [item]);
  const format = assets.format;
  const animationFormat = isAnimatedFormat(format) ? format : undefined;
  const animationUrl = assets.animationUrl;
  const safeAnimationUrl =
    animationUrl !== undefined &&
    animationFormat !== undefined &&
    isSafeMediaAsset(animationUrl, animationFormat, mediaSecurity);
  const posterUrls = useMemo(
    () =>
      assets.posterUrls.filter((url) =>
        isSafeMediaAsset(url, undefined, mediaSecurity),
      ),
    [assets.posterUrls, mediaSecurity],
  );
  const posterUrl = posterUrls[posterIndex];
  const policy = resolveAnimatedMediaPlaybackPolicy(
    config,
    "playbackPolicy" in item ? item.playbackPolicy : undefined,
  );
  const reducedMotion =
    config.reducedMotion === "reduce" ||
    (config.reducedMotion !== "no-preference" && systemReducedMotion);
  const intent = hovered || focused || pressed || selectionIntent;
  const wantsAnimation =
    safeAnimationUrl &&
    !animationFailed &&
    !reducedMotion &&
    policy !== "never" &&
    documentVisible &&
    visible &&
    (policy === "always" ||
      (policy === "on-hover" && hovered) ||
      (policy === "on-focus" && focused) ||
      ((policy === "on-intent" || policy === "loop-while-active") && intent) ||
      (policy === "once" && intent && !hasPlayed));
  const priority: AnimationPriority = selectionIntent
    ? "selected"
    : focused
      ? "focused"
      : intent
        ? "intent"
        : "visible";
  const lottieProps = useMemo<AnimatedMediaRenderProps>(
    () => ({
      active: true,
      animationUrl: animationUrl ?? "",
      format: "lottie",
      label: item.name ?? item.alt ?? assets.fallbackText,
      ...(posterUrl === undefined ? {} : { previewUrl: posterUrl }),
    }),
    [animationUrl, assets.fallbackText, item, posterUrl],
  );

  useEffect(() => {
    const query = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (query === undefined) return;
    const update = (): void => setSystemReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const ownerDocument = rootRef.current?.ownerDocument;
    if (ownerDocument === undefined) return;
    const update = (): void =>
      setDocumentVisible(ownerDocument.visibilityState !== "hidden");
    update();
    ownerDocument.addEventListener("visibilitychange", update);
    return () => ownerDocument.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const control = rootRef.current?.closest("button");
    if (control === null || control === undefined) return;
    let active = true;
    const focus = (): void => setFocused(true);
    const blur = (): void => {
      setFocused(false);
      setPressed(false);
    };
    control.addEventListener("focus", focus);
    control.addEventListener("blur", blur);
    // A browser automation, autofocus host, or fast keyboard user can focus the
    // button between commit and this passive effect. Reconcile that state once
    // without moving focus or making the media wrapper independently tabbable.
    queueMicrotask(() => {
      if (active && control.ownerDocument.activeElement === control)
        setFocused(true);
    });
    return () => {
      active = false;
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
      { rootMargin: config.preloadMargin ?? "80px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [config.preloadMargin]);

  useEffect(() => {
    if (
      activationToken === undefined ||
      activationToken === previousActivation.current
    )
      return;
    previousActivation.current = activationToken;
    if (config.playOnSelect !== true || reducedMotion) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setSelectionIntent(true);
    });
    const timeout = setTimeout(() => setSelectionIntent(false), 900);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [activationToken, config.playOnSelect, reducedMotion]);

  useEffect(() => {
    let active = true;
    const update = (next: boolean): void => {
      queueMicrotask(() => {
        if (!active) return;
        setGranted(next);
        if (!next)
          setNativeState((current) => (current === "error" ? current : "idle"));
      });
    };
    if (!wantsAnimation) {
      update(false);
      return () => {
        active = false;
      };
    }
    const release = manager.request(instanceId, priority, update);
    return () => {
      active = false;
      release();
    };
  }, [instanceId, manager, priority, wantsAnimation]);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    if (granted) void video.play().catch(() => setAnimationFailed(true));
    else {
      video.pause();
      video.currentTime = 0;
    }
    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [granted]);

  useEffect(() => {
    if (!granted || policy !== "once") return;
    const duration =
      "animationDurationMs" in item &&
      typeof item.animationDurationMs === "number"
        ? item.animationDurationMs
        : 1_000;
    const timeout = setTimeout(
      () => {
        setHasPlayed(true);
        setNativeState("completed");
      },
      Math.max(100, duration),
    );
    return () => clearTimeout(timeout);
  }, [granted, item, policy]);

  const fallbackKind =
    posterUrl !== undefined
      ? "poster"
      : item.type === "emoji" && "fallbackEmoji" in item && item.fallbackEmoji
        ? "unicode"
        : "text";
  const state: AnimatedMediaState = animationFailed
    ? "error"
    : granted
      ? nativeState === "idle"
        ? "loading"
        : nativeState
      : visible
        ? posterUrl === undefined || posterReady
          ? "ready"
          : "preparing"
        : "idle";

  const fallbackVisual =
    posterUrl === undefined ? (
      <span aria-hidden="true" data-media-fallback={fallbackKind}>
        {assets.fallbackText}
      </span>
    ) : (
      <img
        alt=""
        decoding="async"
        draggable={false}
        loading="lazy"
        onError={() => {
          setPosterReady(false);
          setPosterIndex((current) => current + 1);
        }}
        onLoad={() => setPosterReady(true)}
        src={posterUrl}
      />
    );

  const canRenderAnimation =
    granted &&
    animationUrl !== undefined &&
    animationFormat !== undefined &&
    (animationFormat !== "lottie" ||
      renderers?.animatedMedia?.lottie !== undefined ||
      renderers?.lottie !== undefined);
  const animationReady =
    canRenderAnimation &&
    (nativeState === "ready" ||
      nativeState === "playing" ||
      nativeState === "completed");
  let animationVisual: ReactNode;
  if (!canRenderAnimation) {
    animationVisual = null;
  } else if (animationFormat === "webm") {
    animationVisual = (
      <video
        aria-hidden="true"
        autoPlay
        loop={item.loopPolicy !== "once" && policy !== "once"}
        muted
        onEnded={() => {
          setHasPlayed(true);
          setNativeState("completed");
        }}
        onError={() => {
          setAnimationFailed(true);
          setNativeState("error");
        }}
        onLoadedData={() => setNativeState("ready")}
        onPause={() =>
          setNativeState((current) =>
            current === "completed" || current === "error" ? current : "paused",
          )
        }
        onPlaying={() => setNativeState("playing")}
        playsInline
        preload="metadata"
        ref={videoRef}
        src={animationUrl}
      />
    );
  } else if (animationFormat === "lottie") {
    const adapter = renderers?.animatedMedia?.lottie;
    const fallback = fallbackVisual;
    animationVisual =
      adapter !== undefined ? (
        <AdapterRenderer
          adapter={adapter}
          fallback={fallback}
          key={animationUrl}
          onError={() => setAnimationFailed(true)}
          onStateChange={setNativeState}
          playbackPolicy={policy}
          props={lottieProps}
          reducedMotion={reducedMotion}
        />
      ) : renderers?.lottie !== undefined ? (
        <RendererBoundary
          fallback={fallback}
          onError={() => setAnimationFailed(true)}
        >
          <LegacyRenderer render={renderers.lottie} props={lottieProps} />
        </RendererBoundary>
      ) : null;
  } else {
    animationVisual = (
      <img
        alt=""
        decoding="async"
        draggable={false}
        onError={() => {
          setAnimationFailed(true);
          setNativeState("error");
        }}
        onLoad={() => setNativeState("playing")}
        src={animationUrl}
      />
    );
  }

  return (
    <span
      aria-label={item.name ?? item.alt ?? "Animated media"}
      className="mp-animated-media"
      data-active={granted ? "true" : "false"}
      data-error={animationFailed ? "true" : undefined}
      data-fallback={canRenderAnimation ? "none" : fallbackKind}
      data-format={animationFormat ?? "unsupported"}
      data-media-state={state}
      data-queued={wantsAnimation && !granted ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPointerCancel={() => setPressed(false)}
      onPointerDown={() => setPressed(true)}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={(event) => {
        setHovered(false);
        if (event.pointerType !== "touch") setPressed(false);
      }}
      onPointerUp={() => setPressed(false)}
      ref={rootRef}
      role="img"
    >
      <span
        className="mp-animated-media__poster"
        data-visible={animationReady ? "false" : "true"}
      >
        {fallbackVisual}
      </span>
      {canRenderAnimation ? (
        <span
          className="mp-animated-media__animation"
          data-ready={animationReady ? "true" : "false"}
        >
          {animationVisual}
        </span>
      ) : null}
    </span>
  );
}

function isAnimatedFormat(
  format: ReturnType<typeof resolveMediaItemAssets>["format"],
): format is AnimatedMediaFormat {
  return (
    format === "gif" ||
    format === "webp" ||
    format === "webm" ||
    format === "lottie"
  );
}

function AdapterRenderer({
  adapter,
  fallback,
  onError,
  onStateChange,
  playbackPolicy,
  props,
  reducedMotion,
}: {
  readonly adapter: AnimatedMediaRendererAdapter;
  readonly fallback: ReactNode;
  readonly onError: () => void;
  readonly onStateChange: (state: AnimatedMediaState) => void;
  readonly playbackPolicy: AnimatedMediaPlaybackPolicy;
  readonly props: AnimatedMediaRenderProps;
  readonly reducedMotion: boolean;
}) {
  const targetRef = useRef<HTMLSpanElement>(null);
  const onErrorRef = useRef(onError);
  const onStateChangeRef = useRef(onStateChange);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    onErrorRef.current = onError;
    onStateChangeRef.current = onStateChange;
  }, [onError, onStateChange]);
  useEffect(() => {
    const target = targetRef.current;
    if (target === null || reducedMotion) return;
    let active = true;
    let controller: ReturnType<AnimatedMediaRendererAdapter["mount"]>;
    try {
      onStateChangeRef.current("loading");
      controller = adapter.mount(target, {
        ...props,
        playbackPolicy,
        reducedMotion,
        setState: (state) => {
          if (active) onStateChangeRef.current(state);
        },
      });
      onStateChangeRef.current("ready");
      void controller?.play?.();
      onStateChangeRef.current("playing");
    } catch {
      queueMicrotask(() => {
        if (active) setFailed(true);
      });
      onErrorRef.current();
      onStateChangeRef.current("error");
    }
    return () => {
      active = false;
      try {
        controller?.stop?.();
        controller?.destroy();
      } catch {
        // Host adapters cannot prevent SDK cleanup.
      }
      target.replaceChildren();
    };
  }, [adapter, playbackPolicy, props, reducedMotion]);
  return failed ? (
    fallback
  ) : (
    <span
      aria-hidden="true"
      className="mp-animated-media__adapter"
      ref={targetRef}
    />
  );
}

function LegacyRenderer({
  render,
  props,
}: {
  readonly render: NonNullable<MediaPickerRenderers["lottie"]>;
  readonly props: AnimatedMediaRenderProps;
}) {
  return render(props);
}

class RendererBoundary extends Component<
  {
    readonly children: ReactNode;
    readonly fallback: ReactNode;
    readonly onError: () => void;
  },
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { readonly failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(): void {
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
