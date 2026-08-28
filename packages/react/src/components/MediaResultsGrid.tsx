import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import {
  mediaItemKey,
  type AnimatedMediaConfig,
  type MediaItem,
} from "@super-media-picker/core";

import type { MediaPickerRenderers } from "../types";
import type { AnimationConcurrencyManager } from "./AnimatedMediaRenderer";
import { MediaItemVisual, mediaItemLabel } from "./MediaItemVisual";

export interface MediaResultsGridProps {
  readonly animation: AnimatedMediaConfig;
  readonly animationManager: AnimationConcurrencyManager;
  readonly emptyMessage: string;
  readonly favoriteIds: ReadonlySet<string>;
  readonly favoritesEnabled: boolean;
  readonly items: readonly MediaItem[];
  readonly label: string;
  readonly onFavoriteToggle: (item: MediaItem) => void;
  readonly onSelect: (item: MediaItem) => void;
  readonly renderers?: MediaPickerRenderers;
}

/** Adaptive, incrementally windowed media grid with roving keyboard focus. */
export function MediaResultsGrid({
  animation,
  animationManager,
  emptyMessage,
  favoriteIds,
  favoritesEnabled,
  items,
  label,
  onFavoriteToggle,
  onSelect,
  renderers,
}: MediaResultsGridProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [windowSize, setWindowSize] = useState(60);
  const gridRef = useRef<HTMLDivElement>(null);
  const visibleItems = useMemo(
    () => items.slice(0, windowSize),
    [items, windowSize],
  );
  const resolvedActive = Math.min(
    activeIndex,
    Math.max(0, visibleItems.length - 1),
  );

  function focusAt(index: number): void {
    const next = Math.min(visibleItems.length - 1, Math.max(0, index));
    setActiveIndex(next);
    gridRef.current
      ?.querySelectorAll<HTMLButtonElement>("[data-media-select]")
      .item(next)
      .focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    const columns = Math.max(
      1,
      Math.floor((gridRef.current?.clientWidth ?? 88) / 88),
    );
    const destinations: Partial<Record<string, number>> = {
      ArrowDown: index + columns,
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index - columns,
      End: visibleItems.length - 1,
      Home: 0,
    };
    const destination = destinations[event.key];
    if (destination === undefined) return;
    event.preventDefault();
    focusAt(destination);
  }

  if (items.length === 0)
    return (
      <div className="mp-empty" role="status">
        {emptyMessage}
      </div>
    );

  return (
    <>
      <div
        aria-label={label}
        className="mp-media-grid"
        ref={gridRef}
        role="grid"
      >
        {visibleItems.map((item, index) => {
          const key = mediaItemKey(item);
          const favorite = favoriteIds.has(key);
          const itemLabel = mediaItemLabel(item);
          return (
            <div className="mp-media-cell" key={key} role="gridcell">
              <button
                aria-label={itemLabel}
                className="mp-media-item"
                data-media-select=""
                onClick={() => onSelect(item)}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                tabIndex={index === resolvedActive ? 0 : -1}
                title={itemLabel}
                type="button"
              >
                <MediaItemVisual
                  animation={animation}
                  item={item}
                  manager={animationManager}
                  {...(renderers === undefined ? {} : { renderers })}
                />
              </button>
              {favoritesEnabled ? (
                <button
                  aria-label={`${favorite ? "Remove" : "Add"} ${itemLabel} ${favorite ? "from" : "to"} favorites`}
                  aria-pressed={favorite}
                  className="mp-favorite-toggle mp-media-favorite"
                  onClick={() => onFavoriteToggle(item)}
                  tabIndex={-1}
                  type="button"
                >
                  <span aria-hidden="true">{favorite ? "★" : "☆"}</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {visibleItems.length < items.length ? (
        <button
          className="mp-load-more"
          onClick={() => setWindowSize((current) => current + 60)}
          type="button"
        >
          Show more results
        </button>
      ) : null}
    </>
  );
}
