import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
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
import type { MediaPickerProps } from "../types";
import { CompactMediaPicker } from "./CompactMediaPicker";
import { AnimationConcurrencyManager } from "./AnimatedMediaRenderer";

const LazyFullMediaPicker = lazy(() =>
  import("./FullMediaPicker").then((module) => ({
    default: module.FullMediaPicker,
  })),
);

export { mediaPickerStorageKeys } from "../hooks/useMediaPickerPersistence";
export type { MediaPickerProps } from "../types";

function dimension(value: number | string | undefined): string | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? `${value}px` : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") return value;
  return undefined;
}

function pickerStyles(
  theme: NonNullable<MediaPickerProps["theme"]>,
  width: MediaPickerProps["width"],
  height: MediaPickerProps["height"],
): CSSProperties {
  const resolvedWidth = dimension(width);
  const resolvedHeight = dimension(height);
  const dimensions: Readonly<Record<string, string>> = {
    ...(resolvedWidth === undefined
      ? {}
      : { "--mp-picker-width": resolvedWidth }),
    ...(resolvedHeight === undefined
      ? {}
      : { "--mp-picker-height": resolvedHeight }),
  };
  return {
    ...themeTokensToCssVariables(resolveMediaPickerTheme(theme).tokens),
    ...dimensions,
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
  width,
  height,
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
  const restoreCompactFocus = useRef(false);
  const animationManager = useMemo(
    () =>
      new AnimationConcurrencyManager(animatedMedia.maxActiveAnimations ?? 3),
    [animatedMedia.maxActiveAnimations],
  );
  const style = useMemo(
    () => pickerStyles(theme, width, height),
    [height, theme, width],
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

  useEffect(() => {
    if (resolvedMode !== "compact" || !restoreCompactFocus.current) return;
    restoreCompactFocus.current = false;
    positionerRef.current
      ?.querySelector<HTMLButtonElement>(
        '[aria-label="Open full media picker"]',
      )
      ?.focus();
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

  function requestClose(): void {
    if (!lifecycle.current.closed) {
      analytics.track("picker_closed");
      lifecycle.current.closed = true;
    }
    onClose?.();
  }

  function requestMode(nextMode: MediaPickerMode): void {
    if (resolvedMode === "compact" && nextMode === "full")
      restoreCompactFocus.current = true;
    if (mode === undefined) setInternalMode(nextMode);
    onModeChange?.(nextMode);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget) return;
    if (resolvedMode === "full" && compactAllowsCollapse) {
      requestMode("compact");
      return;
    }
    requestClose();
  }

  return (
    <div
      className="mp-positioner"
      data-display-mode={displayMode}
      data-mode={resolvedMode}
      data-resolved-display-mode={resolvedDisplayMode}
      data-size={size}
      onMouseDown={handleBackdropClick}
      ref={positionerRef}
    >
      {resolvedMode === "compact" ? (
        <CompactMediaPicker
          allowExpand={compactAllowsExpand}
          animation={animatedMedia}
          animationManager={animationManager}
          ariaLabel={ariaLabel}
          className={pickerClassName}
          favoriteRecords={state.favoriteRecords}
          maxVisibleItems={maxVisibleItems}
          onExpand={() => requestMode("full")}
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
          style={style}
          themeMode={resolvedTheme.mode}
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
              role="status"
              style={style}
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
            customTabs={customTabs}
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
            style={style}
            themeMode={resolvedTheme.mode}
            {...(capabilities === undefined ? {} : { capabilities })}
            {...(providers === undefined ? {} : { providers })}
            {...(renderers === undefined ? {} : { renderers })}
            {...(onClose === undefined ? {} : { onClose: requestClose })}
            {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
            {...(compactAllowsCollapse
              ? { onCollapse: () => requestMode("compact") }
              : {})}
          />
        </Suspense>
      )}
    </div>
  );
}
