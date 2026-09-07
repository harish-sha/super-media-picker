import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type ComponentType,
  type CSSProperties,
  type PointerEvent,
} from "react";

import {
  defaultFeatures,
  mediaItemKey,
  noOpAnalytics,
  type CompactReactionSource,
  type MediaPickerMode,
} from "@super-media-picker/core";
import { DEFAULT_MAX_UNICODE_VERSION } from "@super-media-picker/emoji/compact";
import {
  resolveMediaPickerTheme,
  themeTokensToCssVariables,
} from "@super-media-picker/themes";

import { useMediaPickerPersistence } from "../hooks/useMediaPickerPersistence";
import { useResolvedDisplayMode } from "../hooks/useResolvedDisplayMode";
import type { AdvancedPresentationState } from "../presentation/AdvancedPresentation";
import { useReducedMotion } from "../presentation/useReducedMotion";
import { resolveProviderConfiguration } from "../providerConfig";
import type {
  MediaPickerDimensions,
  MediaPickerMotion,
  MediaPickerMotionPreset,
  MediaPickerProps,
} from "../types";
import { CompactMediaPicker } from "./CompactMediaPicker";
import { AnimationConcurrencyManager } from "./AnimatedMediaRenderer";
import type { FullMediaPickerProps } from "./FullMediaPicker";

let fullPickerModule:
  | Promise<{
      default: ComponentType<FullMediaPickerProps>;
    }>
  | undefined;

function loadFullMediaPicker() {
  return (fullPickerModule ??= import("./FullMediaPicker").then((module) => ({
    default: module.FullMediaPicker,
  })));
}

const LazyFullMediaPicker = lazy(loadFullMediaPicker);
const LazyAdvancedPresentation = lazy(() =>
  import("../presentation/AdvancedPresentation").then((module) => ({
    default: module.AdvancedPresentation,
  })),
);
const LazyGenieTransition = lazy(
  () => import("../presentation/GenieTransition"),
);

const defaultPresentation: AdvancedPresentationState = {
  activeGesture: "idle",
  resolvedPlacement: "bottom-start",
};

export { mediaPickerStorageKeys } from "../hooks/useMediaPickerPersistence";
export type { MediaPickerProps } from "../types";

function dimension(value: number | string | undefined): string | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? `${value}px` : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
}

function dimensionVariables(
  dimensions: MediaPickerDimensions | undefined,
  width: MediaPickerProps["width"],
  height: MediaPickerProps["height"],
  resized?: { readonly width: number; readonly height: number },
): Readonly<Record<string, string>> {
  const values = {
    width: resized?.width ?? dimensions?.width ?? width,
    height: resized?.height ?? dimensions?.height ?? height,
    minWidth: dimensions?.minWidth,
    maxWidth: dimensions?.maxWidth,
    minHeight: dimensions?.minHeight,
    maxHeight: dimensions?.maxHeight,
  };
  return Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => {
      const resolved = dimension(value);
      const names: Readonly<Record<string, string>> = {
        width: "--mp-picker-width",
        height: "--mp-picker-height",
        minWidth: "--mp-picker-min-width",
        maxWidth: "--mp-picker-max-width",
        minHeight: "--mp-picker-min-height",
        maxHeight: "--mp-picker-max-height",
      };
      return resolved === undefined ? [] : [[names[key] ?? key, resolved]];
    }),
  );
}

function pickerStyles(
  theme: NonNullable<MediaPickerProps["theme"]>,
  dimensions: Readonly<Record<string, string>>,
): CSSProperties {
  return {
    ...themeTokensToCssVariables(resolveMediaPickerTheme(theme).tokens),
    ...dimensions,
  };
}

function resolveMotion(
  motion: MediaPickerMotion | undefined,
  reduced: boolean,
): {
  preset: MediaPickerMotionPreset;
  duration: number;
  easing: string | undefined;
} {
  const config = typeof motion === "string" ? { preset: motion } : motion;
  const preset = reduced ? "none" : (config?.preset ?? "pop");
  const defaultDuration =
    preset === "spring"
      ? 210
      : preset === "genie"
        ? 280
        : preset === "fade"
          ? 120
          : 140;
  return {
    preset,
    duration:
      preset === "none"
        ? 0
        : Math.min(Math.max(config?.duration ?? defaultDuration, 0), 2_000),
    easing: config?.easing,
  };
}

/**
 * Media picker with independent presentation, placement, and size controls.
 * The complete picker module is requested only when full mode is rendered.
 */
export function MediaPicker({
  mode,
  defaultMode = "full",
  onModeChange,
  allowExpand,
  compact = {},
  size = "md",
  dimensions,
  width,
  height,
  placement = "auto",
  anchorRef,
  portal,
  draggable,
  resizable,
  swipeToDismiss,
  motion,
  onResolvedPlacementChange,
  onInteractionChange,
  preview = {},
  features: featureOverrides,
  capabilities,
  providers,
  emojiPacks = [],
  customTabs = [],
  renderers,
  animatedMedia = {},
  analytics = noOpAnalytics,
  mediaSecurity,
  onSelect,
  onClose,
  storage,
  theme = "system",
  displayMode = "auto",
  defaultCategory = "Smileys & Emotion",
  defaultMediaType = "emoji",
  defaultSearchQuery = "",
  defaultSkinTone = "default",
  maxUnicodeVersion = DEFAULT_MAX_UNICODE_VERSION,
  className,
  ariaLabel = "Media picker",
}: MediaPickerProps) {
  const [internalMode, setInternalMode] =
    useState<MediaPickerMode>(defaultMode);
  const resolvedMode = mode ?? internalMode;
  const resolvedTheme = resolveMediaPickerTheme(theme);
  const reducedMotion = useReducedMotion();
  const motionConfig = resolveMotion(motion, reducedMotion);
  const [motionState, setMotionState] = useState<
    "opening" | "open" | "closing"
  >("opening");
  const motionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingExit = useRef<readonly [() => void, boolean] | undefined>(
    undefined,
  );
  const features = { ...defaultFeatures, ...featureOverrides };
  const resolvedDisplayMode = useResolvedDisplayMode(displayMode);
  const overlay =
    resolvedDisplayMode === "modal" ||
    resolvedDisplayMode === "bottom-sheet" ||
    resolvedDisplayMode === "fullscreen";
  const state = useMediaPickerPersistence(storage, defaultSkinTone);
  const lifecycle = useRef({ mounted: false, opened: false, closed: false });
  const initialMode = useRef(resolvedMode);
  const [startedCompact] = useState(resolvedMode === "compact");
  const positionerRef = useRef<HTMLDivElement>(null);
  const gestureLayerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLElement>(null);
  const [motionOrigin, setMotionOrigin] = useState<DOMRect>();
  const [transitionDirection, setTransitionDirection] = useState<
    "expand" | "collapse" | "open"
  >("open");
  const restoreCompactFocus = useRef(false);
  const animationManager = useMemo(
    () =>
      new AnimationConcurrencyManager(animatedMedia.maxActiveAnimations ?? 3),
    [animatedMedia.maxActiveAnimations],
  );
  const pickerClassName = ["mp-picker", className].filter(Boolean).join(" ");
  const source: CompactReactionSource =
    compact.source ?? (compact.reactions === undefined ? "default" : "custom");
  const compactAllowsExpand = compact.allowExpand ?? allowExpand ?? false;
  const compactAllowsCollapse =
    compact.allowCollapse ?? (startedCompact && compactAllowsExpand);
  const requestedItemCount = compact.maxVisibleItems ?? 7;
  const maxVisibleItems =
    Number.isFinite(requestedItemCount) && requestedItemCount > 0
      ? Math.floor(requestedItemCount)
      : 7;
  const trackCompactRecents =
    features.recents || source === "recent" || source === "frequent";
  const providerConfiguration = useMemo(
    () => resolveProviderConfiguration(providers, customTabs),
    [customTabs, providers],
  );
  const advancedPresentationRequested =
    anchorRef !== undefined ||
    draggable !== undefined ||
    resizable !== undefined ||
    swipeToDismiss !== undefined ||
    portal !== undefined ||
    onResolvedPlacementChange !== undefined ||
    onInteractionChange !== undefined;

  useEffect(() => {
    const lifecycleState = lifecycle.current;
    lifecycleState.mounted = true;
    void Promise.resolve().then(() => {
      if (lifecycleState.mounted && !lifecycleState.opened) {
        analytics.track("picker_opened", { mode: initialMode.current });
        lifecycleState.opened = true;
      }
    });
    return () => {
      lifecycleState.mounted = false;
      void Promise.resolve().then(() => {
        if (
          !lifecycleState.mounted &&
          lifecycleState.opened &&
          !lifecycleState.closed
        ) {
          analytics.track("picker_closed");
          lifecycleState.closed = true;
        }
      });
    };
  }, [analytics]);

  const finishMotion = useCallback((phase: "opening" | "closing"): void => {
    if (motionTimer.current !== undefined) clearTimeout(motionTimer.current);
    if (phase === "opening") {
      setMotionState((current) => (current === "opening" ? "open" : current));
      return;
    }
    const pending = pendingExit.current;
    if (pending === undefined) {
      setMotionState("open");
      return;
    }
    pendingExit.current = undefined;
    pending[0]();
    setMotionState(pending[1] ? "opening" : "open");
  }, []);

  useEffect(() => {
    if (motionState === "open") return;
    motionTimer.current = setTimeout(
      () => finishMotion(motionState),
      motionConfig.duration === 0 ? 0 : motionConfig.duration + 80,
    );
    return () => {
      if (motionTimer.current !== undefined) clearTimeout(motionTimer.current);
    };
  }, [finishMotion, motionConfig.duration, motionState]);

  useEffect(
    () => () => {
      if (motionTimer.current !== undefined) clearTimeout(motionTimer.current);
      pendingExit.current = undefined;
    },
    [],
  );

  useEffect(() => {
    if (resolvedMode !== "compact" || !restoreCompactFocus.current) return;
    restoreCompactFocus.current = false;
    positionerRef.current
      ?.querySelector<HTMLButtonElement>(
        '[aria-label="Open full media picker"]',
      )
      ?.focus({ preventScroll: true });
  }, [resolvedMode]);

  function trackSelection(item: Parameters<typeof onSelect>[0]): void {
    analytics.track("media_selected", {
      id: item.id,
      mediaType: item.type,
      ...(item.type !== "emoji" && item.provider !== undefined
        ? { provider: item.provider }
        : item.type === "emoji" &&
            "provider" in item &&
            item.provider !== undefined
          ? { provider: item.provider }
          : {}),
    });
    onSelect(item);
  }

  function afterExit(action: () => void, enterNext: boolean): void {
    if (motionState === "closing") return;
    if (motionConfig.duration === 0) {
      action();
      return;
    }
    pendingExit.current = [action, enterNext];
    setMotionState("closing");
  }

  function requestClose(): void {
    const closeTarget =
      anchorRef?.current?.getBoundingClientRect() ?? motionOrigin;
    if (closeTarget !== undefined) setMotionOrigin(closeTarget);
    afterExit(() => {
      if (!lifecycle.current.closed) {
        analytics.track("picker_closed");
        lifecycle.current.closed = true;
      }
      onClose?.();
    }, false);
  }

  function requestMode(nextMode: MediaPickerMode): void {
    if (nextMode === resolvedMode) return;
    if (surfaceRef.current !== null)
      setMotionOrigin(surfaceRef.current.getBoundingClientRect());
    setTransitionDirection(nextMode === "full" ? "expand" : "collapse");
    if (nextMode === "compact") restoreCompactFocus.current = true;
    if (mode === undefined) setInternalMode(nextMode);
    onModeChange?.(nextMode);
    setMotionState(motionConfig.duration === 0 ? "open" : "opening");
  }

  function handleMotionEnd(event: AnimationEvent<HTMLDivElement>): void {
    if (
      event.target === event.currentTarget &&
      event.animationName?.startsWith("mp-motion-") &&
      motionState !== "open"
    )
      finishMotion(motionState);
  }

  function handleBackdropClick(event: PointerEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget) return;
    if (resolvedMode === "full" && compactAllowsCollapse) {
      requestMode("compact");
      return;
    }
    requestClose();
  }

  function renderPicker(presentation: AdvancedPresentationState) {
    const resolvedDimensions = dimensionVariables(
      dimensions,
      width,
      height,
      presentation.resizedDimensions,
    );
    const legacyDimensions = dimensionVariables(undefined, width, height);
    const fullStyle = pickerStyles(theme, resolvedDimensions);
    const compactStyle = pickerStyles(
      theme,
      dimensions?.applyToCompact ? resolvedDimensions : legacyDimensions,
    );
    const positionerStyle = {
      ...presentation.positionerStyle,
      "--mp-motion-duration": `${motionConfig.duration}ms`,
      "--mp-motion-easing": motionConfig.easing,
    } as CSSProperties;
    const pickerSurface =
      resolvedMode === "compact" ? (
        <CompactMediaPicker
          allowExpand={compactAllowsExpand}
          animation={animatedMedia}
          animationManager={animationManager}
          ariaLabel={ariaLabel}
          className={pickerClassName}
          favoriteRecords={state.favoriteRecords}
          maxVisibleItems={maxVisibleItems}
          onExpand={() => requestMode("full")}
          onExpandIntent={() => {
            void loadFullMediaPicker();
          }}
          onRecordRecent={(id) => {
            if (trackCompactRecents) void state.recordRecent(id);
          }}
          onSelect={trackSelection}
          onSkinToneChange={state.setSkinTone}
          overlay={overlay}
          persistenceReady={state.ready}
          recentRecords={state.recentRecords}
          skinTone={state.skinTone}
          source={source}
          style={compactStyle}
          surfaceRef={surfaceRef}
          themeMode={resolvedTheme.mode}
          {...(presentation.presentationControls === undefined
            ? {}
            : { presentationControls: presentation.presentationControls })}
          {...(renderers === undefined ? {} : { renderers })}
          {...(onClose === undefined ? {} : { onClose: requestClose })}
          {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
          {...(compact.reactions === undefined
            ? {}
            : { reactions: compact.reactions })}
        />
      ) : (
        <Suspense
          fallback={
            <section
              aria-label={ariaLabel}
              className={`${pickerClassName} mp-picker--full mp-picker--loading`}
              data-theme={resolvedTheme.mode}
              ref={surfaceRef}
              role="status"
              style={fullStyle}
            >
              Opening full media picker…
            </section>
          }
        >
          <LazyFullMediaPicker
            animation={animatedMedia}
            analytics={analytics}
            animationManager={animationManager}
            ariaLabel={ariaLabel}
            className={pickerClassName}
            defaultCategory={defaultCategory}
            defaultMediaType={defaultMediaType}
            defaultSearchQuery={defaultSearchQuery}
            favoriteIds={state.favoriteIds}
            favoriteRecords={state.favoriteRecords}
            features={features}
            emojiPacks={emojiPacks}
            customTabs={providerConfiguration.customTabs}
            onRecordRecent={(item) => {
              void state.recordRecent(item);
            }}
            onSelect={trackSelection}
            onSkinToneChange={state.setSkinTone}
            onToggleFavorite={(item) => {
              const id = typeof item === "string" ? item : mediaItemKey(item);
              analytics.track(
                state.favoriteIds.includes(id)
                  ? "favorite_removed"
                  : "favorite_added",
                typeof item === "string"
                  ? { id: item, mediaType: "emoji" }
                  : { id: item.id, mediaType: item.type },
              );
              void state.toggleFavorite(item);
            }}
            overlay={overlay}
            previewEnabled={preview.enabled ?? false}
            recentRecords={state.recentRecords}
            skinTone={state.skinTone}
            maxUnicodeVersion={maxUnicodeVersion}
            style={fullStyle}
            surfaceRef={surfaceRef}
            themeMode={resolvedTheme.mode}
            {...(presentation.presentationControls === undefined
              ? {}
              : { presentationControls: presentation.presentationControls })}
            {...(presentation.resizeControls === undefined
              ? {}
              : { resizeControls: presentation.resizeControls })}
            {...(capabilities === undefined ? {} : { capabilities })}
            {...(providerConfiguration.providers === undefined
              ? {}
              : { providers: providerConfiguration.providers })}
            {...(renderers === undefined ? {} : { renderers })}
            {...(onClose === undefined ? {} : { onClose: requestClose })}
            {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
            {...(compactAllowsCollapse
              ? { onCollapse: () => requestMode("compact") }
              : {})}
          />
        </Suspense>
      );
    return (
      <div
        className="mp-positioner"
        data-active-gesture={presentation.activeGesture}
        data-display-mode={displayMode}
        data-motion-preset={motionConfig.preset}
        data-motion-state={motionState}
        data-mode={resolvedMode}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        data-resolved-placement={presentation.resolvedPlacement}
        data-resolved-display-mode={resolvedDisplayMode}
        data-size={size}
        data-transition-direction={transitionDirection}
        onPointerDown={handleBackdropClick}
        ref={positionerRef}
        style={positionerStyle}
      >
        <div className="mp-gesture-layer" ref={gestureLayerRef}>
          <div className="mp-motion-layer" onAnimationEnd={handleMotionEnd}>
            {pickerSurface}
          </div>
          {motionConfig.preset === "genie" &&
          motionState !== "open" &&
          presentation.activeGesture === "idle" ? (
            <Suspense fallback={null}>
              <LazyGenieTransition
                {...(anchorRef === undefined ? {} : { anchorRef })}
                gestureLayerRef={gestureLayerRef}
                {...(motionOrigin === undefined
                  ? {}
                  : { origin: motionOrigin })}
                positionerRef={positionerRef}
                surfaceRef={surfaceRef}
                duration={motionConfig.duration}
                {...(motionConfig.easing === undefined
                  ? {}
                  : { easing: motionConfig.easing })}
                motionState={motionState}
              />
            </Suspense>
          ) : null}
        </div>
      </div>
    );
  }

  if (!advancedPresentationRequested) return renderPicker(defaultPresentation);
  return (
    <Suspense fallback={renderPicker(defaultPresentation)}>
      <LazyAdvancedPresentation
        displayMode={resolvedDisplayMode}
        gestureLayerRef={gestureLayerRef}
        layoutKey={resolvedMode}
        onDismiss={() => {
          if (resolvedMode === "full" && compactAllowsCollapse)
            requestMode("compact");
          else requestClose();
        }}
        placement={placement}
        {...(portal === undefined ? {} : { portal })}
        surfaceRef={surfaceRef}
        {...(anchorRef === undefined ? {} : { anchorRef })}
        {...(draggable === undefined ? {} : { draggable })}
        {...(onInteractionChange === undefined ? {} : { onInteractionChange })}
        {...(onResolvedPlacementChange === undefined
          ? {}
          : { onResolvedPlacementChange })}
        {...(resizable === undefined ? {} : { resizable })}
        {...(swipeToDismiss === undefined ? {} : { swipeToDismiss })}
      >
        {renderPicker}
      </LazyAdvancedPresentation>
    </Suspense>
  );
}
