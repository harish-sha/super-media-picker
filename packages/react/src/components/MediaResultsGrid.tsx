import { memo, useMemo, useRef, useState, type KeyboardEvent } from "react";

import {
  isAnimatedMedia,
  isUnicodeEmoji,
  mediaItemKey,
  type AnimatedMediaConfig,
  type MediaItem,
  type MediaUrlPolicy,
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
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly label: string;
  readonly onFavoriteToggle: (item: MediaItem) => void;
  readonly onSelect: (item: MediaItem) => void;
  readonly renderers?: MediaPickerRenderers;
}

/** Adaptive, incrementally windowed media grid with roving keyboard focus. */
export const MediaResultsGrid = memo(function MediaResultsGrid({
  animation,
  animationManager,
  emptyMessage,
  favoriteIds,
  favoritesEnabled,
  items,
  mediaSecurity,
  label,
  onFavoriteToggle,
  onSelect,
  renderers,
}: MediaResultsGridProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [windowSize, setWindowSize] = useState(60);
  const [selectionReplay, setSelectionReplay] = useState<{
    readonly key: string;
    readonly token: number;
  }>();
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
          const itemKind =
            item.type === "emoji" && isAnimatedMedia(item)
              ? "animated-emoji"
              : item.type === "emoji" && !isUnicodeEmoji(item)
                ? "custom-emoji"
                : undefined;
          return (
            <div
              className="mp-media-cell"
              data-media-key={key}
              key={key}
              role="gridcell"
            >
              <button
                aria-label={itemLabel}
                className="mp-media-item"
                {...(itemKind === undefined
                  ? {}
                  : { "data-media-kind": itemKind })}
                data-media-select=""
                onClick={() => {
                  onSelect(item);
                  if (animation.playOnSelect === true)
                    setSelectionReplay((current) => ({
                      key,
                      token: (current?.token ?? 0) + 1,
                    }));
                }}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                tabIndex={index === resolvedActive ? 0 : -1}
                title={itemLabel}
                type="button"
              >
                <span className="mp-media-item__visual">
                  <MediaItemVisual
                    animation={animation}
                    {...(selectionReplay?.key === key
                      ? { activationToken: selectionReplay.token }
                      : {})}
                    item={item}
                    manager={animationManager}
                    {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
                    {...(renderers === undefined ? {} : { renderers })}
                  />
                </span>
                {itemKind === undefined ? null : (
                  <span aria-hidden="true" className="mp-media-kind-indicator">
                    {itemKind === "animated-emoji" ? (
                      <svg viewBox="0 0 16 16">
                        <path d="m8 1 .9 3.1L12 5l-3.1.9L8 9l-.9-3.1L4 5l3.1-.9L8 1Zm4.4 7 .55 1.9 1.85.55-1.85.55-.55 1.9-.55-1.9-1.85-.55 1.85-.55.55-1.9Z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16">
                        <path d="M3 2.5h10A1.5 1.5 0 0 1 14.5 4v6A1.5 1.5 0 0 1 13 11.5H8.2L5 14v-2.5H3A1.5 1.5 0 0 1 1.5 10V4A1.5 1.5 0 0 1 3 2.5Z" />
                      </svg>
                    )}
                  </span>
                )}
              </button>
              {favoritesEnabled ? (
                <button
                  aria-label={`${favorite ? "Remove" : "Add"} ${itemLabel} ${favorite ? "from" : "to"} favorites`}
                  aria-pressed={favorite}
                  className="mp-favorite-toggle mp-media-favorite"
                  onClick={() => onFavoriteToggle(item)}
                  onFocus={() => setActiveIndex(index)}
                  tabIndex={index === resolvedActive ? 0 : -1}
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
});
