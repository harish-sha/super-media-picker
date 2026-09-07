import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  EmojiPicker,
  GifPicker,
  MediaPicker,
  ReactionPicker,
  StickerPicker,
  type CompactReactionSource,
  type AnimationAutoplay,
  type MediaCapabilities,
  type MediaItem,
  type MediaPickerFeatures,
  type MediaPickerActiveGesture,
  type MediaPickerMotionPreset,
  type MediaPickerMode,
  type MediaPickerPlacement,
  type MediaPickerPoint,
  type MediaPickerResolvedDimensions,
  type MediaPickerSize,
  type MediaPickerSnap,
  type MediaPickerThemeMode,
  type PickerDisplayMode,
} from "super-media-picker";
import { useGifSearch } from "super-media-picker/headless";
import "super-media-picker/styles.css";

import {
  createMockProviders,
  customTabs,
  emojiPacks,
  type MockScenario,
} from "./mockMedia";
import "./playground.css";

type PreviewWidth = "desktop" | "mobile";
type SdkSurface =
  "media" | "emoji" | "gif" | "sticker" | "reaction" | "headless";

interface FluidityDiagnostics {
  readonly activeAnimatedMedia: number;
  readonly activePanel: string;
  readonly lastTabSwitch: string;
  readonly lazyPanels: string;
  readonly longTasks: number;
  readonly mediaNodes: number;
}

const initialFluidity: FluidityDiagnostics = {
  activeAnimatedMedia: 0,
  activePanel: "compact",
  lastTabSwitch: "not measured",
  lazyPanels: "none",
  longTasks: 0,
  mediaNodes: 0,
};

const initialFeatures: MediaPickerFeatures = {
  emoji: true,
  animatedEmoji: true,
  gifs: true,
  stickers: true,
  customMedia: true,
  recents: true,
  favorites: true,
};

type CapabilityPreset = "all" | "emoji-only" | "no-gif";

const capabilityPresets: Readonly<Record<CapabilityPreset, MediaCapabilities>> =
  {
    all: {
      emoji: true,
      animatedEmoji: true,
      gif: true,
      stickers: true,
      animatedStickers: true,
      customMedia: true,
      customEmoji: true,
      customStickers: true,
    },
    "emoji-only": { emoji: true, gif: false, stickers: false },
    "no-gif": {
      emoji: true,
      animatedEmoji: true,
      gif: false,
      stickers: true,
      animatedStickers: true,
      customMedia: true,
    },
  };

function Playground() {
  const [selection, setSelection] = useState<MediaItem>();
  const [mode, setMode] = useState<MediaPickerMode>("compact");
  const [size, setSize] = useState<MediaPickerSize>("md");
  const [theme, setTheme] = useState<MediaPickerThemeMode>("system");
  const [displayMode, setDisplayMode] = useState<PickerDisplayMode>("inline");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const [compactSource, setCompactSource] =
    useState<CompactReactionSource>("default");
  const [allowExpand, setAllowExpand] = useState(true);
  const [features, setFeatures] = useState(initialFeatures);
  const [capabilityPreset, setCapabilityPreset] =
    useState<CapabilityPreset>("all");
  const [scenario, setScenario] = useState<MockScenario>("normal");
  const [autoplay, setAutoplay] = useState<AnimationAutoplay>("hover");
  const [surface, setSurface] = useState<SdkSurface>("media");
  const [pickerWidth, setPickerWidth] = useState(420);
  const [pickerHeight, setPickerHeight] = useState(560);
  const [placement, setPlacement] = useState<MediaPickerPlacement>("auto");
  const [draggable, setDraggable] = useState(false);
  const [resizable, setResizable] = useState(false);
  const [snap, setSnap] = useState<MediaPickerSnap>("none");
  const [swipeToDismiss, setSwipeToDismiss] = useState(false);
  const [motion, setMotion] = useState<MediaPickerMotionPreset>("pop");
  const [simulateReducedMotion, setSimulateReducedMotion] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [motionReplayKey, setMotionReplayKey] = useState(0);
  const [inputMode, setInputMode] = useState("actual device");
  const [position, setPosition] = useState<MediaPickerPoint>();
  const [resolvedDimensions, setResolvedDimensions] =
    useState<MediaPickerResolvedDimensions>();
  const [resolvedPlacement, setResolvedPlacement] = useState("bottom-start");
  const [activeGesture, setActiveGesture] =
    useState<MediaPickerActiveGesture>("idle");
  const [fluidity, setFluidity] =
    useState<FluidityDiagnostics>(initialFluidity);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const providers = useMemo(() => createMockProviders(scenario), [scenario]);
  const resolvedReducedMotion = simulateReducedMotion || systemReducedMotion;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let longTasks = 0;
    let frame: number | undefined;
    let tabStartedAt: number | undefined;
    let lastTabSwitch = "not measured";
    let previousPanel = "compact";
    const update = () => {
      frame = undefined;
      const picker = document.querySelector<HTMLElement>(".mp-picker");
      const activePanel = picker?.dataset.activeMediaType ?? "compact";
      if (activePanel !== previousPanel) {
        previousPanel = activePanel;
        if (tabStartedAt !== undefined) {
          lastTabSwitch = `${(performance.now() - tabStartedAt).toFixed(2)} ms`;
          performance.clearMarks("super-media-picker:tab-content-ready");
          performance.clearMeasures("super-media-picker:tab-switch");
          performance.mark("super-media-picker:tab-content-ready");
          performance.measure(
            "super-media-picker:tab-switch",
            "super-media-picker:tab-switch-start",
            "super-media-picker:tab-content-ready",
          );
          tabStartedAt = undefined;
        }
      }
      const activeRoot =
        picker?.querySelector<HTMLElement>(
          `[data-media-panel="${activePanel}"]`,
        ) ?? picker;
      setFluidity({
        activeAnimatedMedia:
          activeRoot?.querySelectorAll('.mp-animated-media[data-active="true"]')
            .length ?? 0,
        activePanel,
        lastTabSwitch,
        lazyPanels: picker?.dataset.loadedMediaTypes ?? "none",
        longTasks,
        mediaNodes:
          activeRoot?.querySelectorAll(".mp-emoji-cell, .mp-media-cell")
            .length ?? 0,
      });
    };
    const schedule = () => {
      if (frame === undefined) frame = requestAnimationFrame(update);
    };
    const mutation = new MutationObserver(schedule);
    const positioner = document.querySelector(".mp-positioner");
    const measureTabIntent = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('.mp-primary-tabs [role="tab"]') !== null
      ) {
        tabStartedAt = performance.now();
        performance.clearMarks("super-media-picker:tab-switch-start");
        performance.mark("super-media-picker:tab-switch-start");
      }
    };
    if (positioner !== null) {
      mutation.observe(positioner, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      positioner.addEventListener("pointerdown", measureTabIntent, true);
      positioner.addEventListener("keydown", measureTabIntent, true);
    }
    const observer =
      typeof PerformanceObserver === "undefined"
        ? undefined
        : new PerformanceObserver((entries) => {
            longTasks += entries
              .getEntries()
              .filter((entry) => entry.duration >= 50).length;
            schedule();
          });
    try {
      observer?.observe({ type: "longtask", buffered: true });
    } catch {
      // Long-task entries are optional development diagnostics.
    }
    schedule();
    return () => {
      mutation.disconnect();
      positioner?.removeEventListener("pointerdown", measureTabIntent, true);
      positioner?.removeEventListener("keydown", measureTabIntent, true);
      observer?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [motionReplayKey, surface]);

  function replayMotion(nextMotion = motion): void {
    if (surface === "media")
      setMode(nextMotion === "genie" ? "compact" : "full");
    setMotionReplayKey((current) => current + 1);
  }

  const presentationProps = {
    anchorRef,
    dimensions: {
      height: pickerHeight,
      maxHeight: 720,
      maxWidth: 720,
      minHeight: 320,
      minWidth: 300,
      width: pickerWidth,
    },
    draggable: {
      enabled: draggable,
      onPositionChange: setPosition,
      snap,
      snapThreshold: 32,
    },
    motion: resolvedReducedMotion ? ("none" as const) : motion,
    onInteractionChange: setActiveGesture,
    onResolvedPlacementChange: setResolvedPlacement,
    placement,
    resizable: {
      directions: ["right", "bottom", "bottom-right"] as const,
      enabled: resizable,
      onDimensionsChange: setResolvedDimensions,
    },
    swipeToDismiss: { enabled: swipeToDismiss },
  };

  function setFeature(
    feature: keyof MediaPickerFeatures,
    enabled: boolean,
  ): void {
    setFeatures((current) => ({ ...current, [feature]: enabled }));
  }

  function showExample(example: "quick" | "frequent" | "full" | "mobile") {
    if (example === "quick") {
      setMode("compact");
      setCompactSource("default");
      setDisplayMode("inline");
      setPreviewWidth("desktop");
    } else if (example === "frequent") {
      setMode("compact");
      setCompactSource("frequent");
      setDisplayMode("inline");
    } else if (example === "full") {
      setMode("full");
      setDisplayMode("inline");
      setPreviewWidth("desktop");
    } else {
      setMode("compact");
      setDisplayMode("bottom-sheet");
      setPreviewWidth("mobile");
    }
  }

  return (
    <main className="playground-shell">
      <header className="playground-intro">
        <p className="playground-eyebrow">SUPER MEDIA PICKER</p>
        <h1>Compact reactions and full media</h1>
        <p>
          Start with a focused reaction bar, expand into the complete picker,
          and exercise persistence, responsive placement, themes, and keyboard
          navigation.
        </p>
      </header>

      <nav aria-label="Picker examples" className="playground-presets">
        <button onClick={() => showExample("quick")} type="button">
          Quick reactions
        </button>
        <button onClick={() => showExample("frequent")} type="button">
          Frequent reactions
        </button>
        <button onClick={() => showExample("full")} type="button">
          Full picker
        </button>
        <button onClick={() => showExample("mobile")} type="button">
          Mobile
        </button>
      </nav>

      <section aria-label="Playground controls" className="playground-controls">
        <label>
          SDK surface
          <select
            onChange={(event) =>
              setSurface(event.currentTarget.value as SdkSurface)
            }
            value={surface}
          >
            <option value="media">MediaPicker</option>
            <option value="emoji">EmojiPicker</option>
            <option value="gif">GifPicker</option>
            <option value="sticker">StickerPicker</option>
            <option value="reaction">ReactionPicker</option>
            <option value="headless">Headless custom UI</option>
          </select>
        </label>
        <label>
          Mode
          <select
            onChange={(event) =>
              setMode(event.currentTarget.value as MediaPickerMode)
            }
            value={mode}
          >
            <option value="compact">Compact</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label>
          Size
          <select
            onChange={(event) =>
              setSize(event.currentTarget.value as MediaPickerSize)
            }
            value={size}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
        <label>
          Theme
          <select
            onChange={(event) =>
              setTheme(event.currentTarget.value as MediaPickerThemeMode)
            }
            value={theme}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Display
          <select
            onChange={(event) =>
              setDisplayMode(event.currentTarget.value as PickerDisplayMode)
            }
            value={displayMode}
          >
            <option value="auto">Auto</option>
            <option value="inline">Inline</option>
            <option value="popover">Popover</option>
            <option value="modal">Modal</option>
            <option value="bottom-sheet">Bottom sheet</option>
            <option value="fullscreen">Fullscreen</option>
          </select>
        </label>
        <label>
          Preview
          <select
            onChange={(event) =>
              setPreviewWidth(event.currentTarget.value as PreviewWidth)
            }
            value={previewWidth}
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile / embedded</option>
          </select>
        </label>
        <label>
          Width
          <input
            max="720"
            min="300"
            onChange={(event) =>
              setPickerWidth(event.currentTarget.valueAsNumber)
            }
            type="number"
            value={pickerWidth}
          />
        </label>
        <label>
          Height
          <input
            max="720"
            min="320"
            onChange={(event) =>
              setPickerHeight(event.currentTarget.valueAsNumber)
            }
            type="number"
            value={pickerHeight}
          />
        </label>
        <label>
          Placement
          <select
            onChange={(event) =>
              setPlacement(event.currentTarget.value as MediaPickerPlacement)
            }
            value={placement}
          >
            {[
              "auto",
              "top",
              "top-start",
              "top-end",
              "bottom",
              "bottom-start",
              "bottom-end",
              "left",
              "right",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Snap
          <select
            onChange={(event) =>
              setSnap(event.currentTarget.value as MediaPickerSnap)
            }
            value={snap}
          >
            {[
              "none",
              "nearest-edge",
              "left",
              "right",
              "top",
              "bottom",
              "corners",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Motion
          <select
            onChange={(event) => {
              const next = event.currentTarget.value as MediaPickerMotionPreset;
              setMotion(next);
              replayMotion(next);
            }}
            value={motion}
          >
            {[
              "none",
              "fade",
              "scale",
              "pop",
              "slide-up",
              "slide-down",
              "zoom",
              "spring",
              "genie",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Pointer/input
          <select
            onChange={(event) => setInputMode(event.currentTarget.value)}
            value={inputMode}
          >
            <option>actual device</option>
            <option>mouse checklist</option>
            <option>touch checklist</option>
            <option>pen checklist</option>
            <option>keyboard checklist</option>
          </select>
        </label>
        <label>
          Reactions
          <select
            onChange={(event) =>
              setCompactSource(
                event.currentTarget.value as CompactReactionSource,
              )
            }
            value={compactSource}
          >
            <option value="default">Default</option>
            <option value="recent">Recent</option>
            <option value="frequent">Frequent</option>
            <option value="favorites">Favorites</option>
            <option value="custom">Animated/custom</option>
          </select>
        </label>
        <label>
          Capabilities
          <select
            onChange={(event) =>
              setCapabilityPreset(event.currentTarget.value as CapabilityPreset)
            }
            value={capabilityPreset}
          >
            <option value="all">All media</option>
            <option value="emoji-only">Emoji only</option>
            <option value="no-gif">No GIF channel</option>
          </select>
        </label>
        <label>
          Mock network
          <select
            onChange={(event) =>
              setScenario(event.currentTarget.value as MockScenario)
            }
            value={scenario}
          >
            <option value="normal">Normal</option>
            <option value="delay">Slow</option>
            <option value="error">Error</option>
            <option value="empty">Empty</option>
          </select>
        </label>
        <label>
          Animation
          <select
            onChange={(event) =>
              setAutoplay(event.currentTarget.value as AnimationAutoplay)
            }
            value={autoplay}
          >
            <option value="hover">Hover/focus</option>
            <option value="visible">Visible</option>
            <option value="always">Always</option>
            <option value="never">Never</option>
          </select>
        </label>
        <label className="playground-checkbox">
          <input
            checked={allowExpand}
            onChange={(event) => setAllowExpand(event.currentTarget.checked)}
            type="checkbox"
          />
          Allow expand
        </label>
        <label className="playground-checkbox">
          <input
            checked={draggable}
            onChange={(event) => setDraggable(event.currentTarget.checked)}
            type="checkbox"
          />
          Draggable
        </label>
        <label className="playground-checkbox">
          <input
            checked={resizable}
            onChange={(event) => setResizable(event.currentTarget.checked)}
            type="checkbox"
          />
          Resizable
        </label>
        <label className="playground-checkbox">
          <input
            checked={swipeToDismiss}
            onChange={(event) => setSwipeToDismiss(event.currentTarget.checked)}
            type="checkbox"
          />
          Swipe dismiss
        </label>
        <label className="playground-checkbox">
          <input
            checked={simulateReducedMotion}
            onChange={(event) => {
              setSimulateReducedMotion(event.currentTarget.checked);
              replayMotion();
            }}
            type="checkbox"
          />
          Simulate reduced motion
        </label>
        <label className="playground-checkbox">
          <input
            checked={features.recents}
            onChange={(event) =>
              setFeature("recents", event.currentTarget.checked)
            }
            type="checkbox"
          />
          Recents
        </label>
        <label className="playground-checkbox">
          <input
            checked={features.favorites}
            onChange={(event) =>
              setFeature("favorites", event.currentTarget.checked)
            }
            type="checkbox"
          />
          Favorites
        </label>
        {(
          ["emoji", "animatedEmoji", "gifs", "stickers", "customMedia"] as const
        ).map((feature) => (
          <label className="playground-checkbox" key={feature}>
            <input
              checked={features[feature]}
              onChange={(event) =>
                setFeature(feature, event.currentTarget.checked)
              }
              type="checkbox"
            />
            {feature}
          </label>
        ))}
      </section>

      <section className="playground-demo" aria-label="Interactive demo">
        <div
          className="playground-preview presentation-lab"
          data-preview-width={previewWidth}
        >
          <div className="presentation-lab__header">
            <strong>Presentation Lab</strong>
            <div className="presentation-lab__actions">
              <button onClick={() => replayMotion()} type="button">
                Replay selected motion
              </button>
              <button ref={anchorRef} type="button">
                Floating anchor
              </button>
            </div>
          </div>
          {surface === "media" ? (
            <MediaPicker
              key={`media-${motionReplayKey}`}
              {...presentationProps}
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              capabilities={capabilityPresets[capabilityPreset]}
              compact={{
                allowCollapse: true,
                allowExpand,
                source: compactSource,
                ...(compactSource === "custom"
                  ? { reactions: emojiPacks[0]?.items ?? [] }
                  : {}),
              }}
              customTabs={customTabs}
              displayMode={displayMode}
              features={features}
              emojiPacks={emojiPacks}
              mode={mode}
              onModeChange={setMode}
              onSelect={setSelection}
              preview={{ enabled: true }}
              providers={providers}
              size={size}
              theme={theme}
            />
          ) : surface === "emoji" ? (
            <EmojiPicker
              key={`emoji-${motionReplayKey}`}
              {...presentationProps}
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              capabilities={capabilityPresets[capabilityPreset]}
              displayMode={displayMode}
              emojiPacks={emojiPacks}
              features={{
                animatedEmoji: features.animatedEmoji,
                favorites: features.favorites,
                recents: features.recents,
              }}
              onSelect={setSelection}
              size={size}
              theme={theme}
            />
          ) : surface === "gif" ? (
            <GifPicker
              key={`gif-${motionReplayKey}`}
              {...presentationProps}
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              capabilities={capabilityPresets[capabilityPreset]}
              displayMode={displayMode}
              onSelect={setSelection}
              provider={providers.gifs}
              size={size}
              theme={theme}
            />
          ) : surface === "sticker" ? (
            <StickerPicker
              key={`sticker-${motionReplayKey}`}
              {...presentationProps}
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              capabilities={capabilityPresets[capabilityPreset]}
              displayMode={displayMode}
              onSelect={setSelection}
              provider={providers.stickers}
              size={size}
              theme={theme}
            />
          ) : surface === "reaction" ? (
            <ReactionPicker
              key={`reaction-${motionReplayKey}`}
              {...presentationProps}
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              displayMode={displayMode}
              onSelect={setSelection}
              {...(compactSource === "custom"
                ? { reactions: emojiPacks[0]?.items ?? [] }
                : {})}
              source={compactSource}
              theme={theme}
            />
          ) : (
            <HeadlessGifDemo
              onSelect={setSelection}
              provider={providers.gifs}
            />
          )}
          <dl className="presentation-lab__diagnostics">
            <div>
              <dt>Pointer</dt>
              <dd>{inputMode}</dd>
            </div>
            <div>
              <dt>Gesture</dt>
              <dd>{activeGesture}</dd>
            </div>
            <div>
              <dt>Position</dt>
              <dd data-testid="presentation-position">
                {position === undefined
                  ? "automatic"
                  : `${position.x}, ${position.y}`}
              </dd>
            </div>
            <div>
              <dt>Dimensions</dt>
              <dd data-testid="presentation-dimensions">
                {resolvedDimensions === undefined
                  ? `${pickerWidth} × ${pickerHeight}`
                  : `${Math.round(resolvedDimensions.width)} × ${Math.round(resolvedDimensions.height)}`}
              </dd>
            </div>
            <div>
              <dt>Placement</dt>
              <dd>{resolvedPlacement}</dd>
            </div>
            <div>
              <dt>Reduced motion</dt>
              <dd data-testid="resolved-reduced-motion">
                {resolvedReducedMotion
                  ? simulateReducedMotion
                    ? "reduced (simulated)"
                    : "reduced (system)"
                  : "no-preference (system)"}
              </dd>
            </div>
            <div className="presentation-lab__diagnostic-heading">
              <dt>Fluidity</dt>
              <dd>local diagnostics</dd>
            </div>
            <div>
              <dt>Last tab switch</dt>
              <dd data-testid="last-tab-switch">{fluidity.lastTabSwitch}</dd>
            </div>
            <div>
              <dt>Active panel</dt>
              <dd>{fluidity.activePanel}</dd>
            </div>
            <div>
              <dt>Media nodes</dt>
              <dd>{fluidity.mediaNodes}</dd>
            </div>
            <div>
              <dt>Active animation</dt>
              <dd>{fluidity.activeAnimatedMedia}</dd>
            </div>
            <div>
              <dt>Long tasks</dt>
              <dd>{fluidity.longTasks}</dd>
            </div>
            <div>
              <dt>Loaded panels</dt>
              <dd>{fluidity.lazyPanels}</dd>
            </div>
          </dl>
        </div>
        <aside className="playground-output" aria-live="polite">
          <h2>Normalized selection</h2>
          <pre data-testid="selection-output">
            {selection === undefined
              ? "Select media to inspect its normalized MediaItem."
              : JSON.stringify(selection, null, 2)}
          </pre>
          <p>
            Compact selection uses the same MediaItem output. Recents,
            favorites, and skin tone persist across expansion and reloads.
          </p>
        </aside>
      </section>
    </main>
  );
}

function HeadlessGifDemo({
  provider,
  onSelect,
}: {
  readonly provider: NonNullable<
    ReturnType<typeof createMockProviders>["gifs"]
  >;
  readonly onSelect: (item: MediaItem) => void;
}) {
  const gifs = useGifSearch({ provider });
  return (
    <section className="playground-headless" aria-label="Headless GIF picker">
      <label htmlFor="headless-search">Search GIFs</label>
      <input
        id="headless-search"
        onChange={(event) => gifs.search(event.currentTarget.value)}
        placeholder="Try party"
        value={gifs.query}
      />
      <p aria-live="polite">
        {gifs.loading
          ? "Loading…"
          : (gifs.error?.message ?? `${gifs.results.length} results`)}
      </p>
      <div className="playground-headless-grid">
        {gifs.results.map((item) => (
          <button key={item.id} onClick={() => onSelect(item)} type="button">
            <img
              alt=""
              height={96}
              src={item.previewUrl ?? item.url}
              width={96}
            />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      {gifs.hasMore ? (
        <button onClick={gifs.loadMore} type="button">
          Load more
        </button>
      ) : null}
    </section>
  );
}

const root = document.querySelector<HTMLDivElement>("#root");
if (root === null) throw new Error("Playground root element was not found.");

createRoot(root).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);
