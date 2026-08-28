import {
  lazy,
  Suspense,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

import {
  defaultFeatures,
  type CompactReactionSource,
  type MediaPickerMode,
} from "@super-media-picker/core";
import {
  resolveMediaPickerTheme,
  themeTokensToCssVariables,
} from "@super-media-picker/themes";

import { useMediaPickerPersistence } from "../hooks/useMediaPickerPersistence";
import { useResolvedDisplayMode } from "../hooks/useResolvedDisplayMode";
import type { MediaPickerProps } from "../types";
import { CompactMediaPicker } from "./CompactMediaPicker";

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
  onSelect,
  onClose,
  storage,
  theme = "system",
  displayMode = "auto",
  defaultCategory = "Smileys & Emotion",
  defaultSearchQuery = "",
  defaultSkinTone = "default",
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
    resolvedDisplayMode === "modal" || resolvedDisplayMode === "bottom-sheet";
  const state = useMediaPickerPersistence(storage, defaultSkinTone);
  const style = useMemo(
    () => pickerStyles(theme, width, height),
    [height, theme, width],
  );
  const pickerClassName = ["mp-picker", className].filter(Boolean).join(" ");
  const source: CompactReactionSource =
    compact.source ?? (compact.reactions === undefined ? "default" : "custom");
  const compactAllowsExpand = compact.allowExpand ?? allowExpand ?? false;
  const compactAllowsCollapse = compact.allowCollapse ?? false;
  const requestedItemCount = compact.maxVisibleItems ?? 7;
  const maxVisibleItems =
    Number.isFinite(requestedItemCount) && requestedItemCount > 0
      ? Math.floor(requestedItemCount)
      : 7;
  const trackCompactRecents =
    features.recents || source === "recent" || source === "frequent";

  function requestMode(nextMode: MediaPickerMode): void {
    if (mode === undefined) setInternalMode(nextMode);
    onModeChange?.(nextMode);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) onClose?.();
  }

  return (
    <div
      className="mp-positioner"
      data-display-mode={displayMode}
      data-mode={resolvedMode}
      data-resolved-display-mode={resolvedDisplayMode}
      data-size={size}
      onMouseDown={handleBackdropClick}
    >
      {resolvedMode === "compact" ? (
        <CompactMediaPicker
          allowExpand={compactAllowsExpand}
          ariaLabel={ariaLabel}
          className={pickerClassName}
          favoriteIds={state.favoriteIds}
          maxVisibleItems={maxVisibleItems}
          onExpand={() => requestMode("full")}
          onRecordRecent={(id) => {
            if (trackCompactRecents) void state.recordRecent(id);
          }}
          onSelect={onSelect}
          onSkinToneChange={state.setSkinTone}
          overlay={overlay}
          recentRecords={state.recentRecords}
          skinTone={state.skinTone}
          source={source}
          style={style}
          themeMode={resolvedTheme.mode}
          {...(onClose === undefined ? {} : { onClose })}
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
            ariaLabel={ariaLabel}
            className={pickerClassName}
            defaultCategory={defaultCategory}
            defaultSearchQuery={defaultSearchQuery}
            favoriteIds={state.favoriteIds}
            features={features}
            onRecordRecent={(id) => {
              void state.recordRecent(id);
            }}
            onSelect={onSelect}
            onSkinToneChange={state.setSkinTone}
            onToggleFavorite={(id) => {
              void state.toggleFavorite(id);
            }}
            overlay={overlay}
            previewEnabled={preview.enabled ?? false}
            recentRecords={state.recentRecords}
            skinTone={state.skinTone}
            style={style}
            themeMode={resolvedTheme.mode}
            {...(onClose === undefined ? {} : { onClose })}
            {...(compactAllowsCollapse
              ? { onCollapse: () => requestMode("compact") }
              : {})}
          />
        </Suspense>
      )}
    </div>
  );
}
