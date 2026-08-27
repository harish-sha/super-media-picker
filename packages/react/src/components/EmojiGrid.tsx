import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { SkinTone } from "@company/media-core";
import { resolveEmojiVariant, type EmojiRecord } from "@company/media-emoji";

export interface EmojiGridProps {
  readonly items: readonly EmojiRecord[];
  readonly label: string;
  readonly emptyMessage: string;
  readonly skinTone: SkinTone;
  readonly favoriteIds: ReadonlySet<string>;
  readonly favoritesEnabled: boolean;
  readonly onFavoriteToggle: (emoji: EmojiRecord) => void;
  readonly onSelect: (emoji: EmojiRecord) => void;
  readonly resetKey: string;
}

const minimumCellSize = 44;

export function EmojiGrid({
  items,
  label,
  emptyMessage,
  skinTone,
  favoriteIds,
  favoritesEnabled,
  onFavoriteToggle,
  onSelect,
  resetKey,
}: EmojiGridProps) {
  const [navigation, setNavigation] = useState({ key: resetKey, index: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const requestedIndex = navigation.key === resetKey ? navigation.index : 0;
  const activeIndex = Math.min(requestedIndex, Math.max(0, items.length - 1));
  const resolvedItems = useMemo(
    () => items.map((emoji) => ({ emoji, resolved: resolveEmojiVariant(emoji, skinTone) })),
    [items, skinTone],
  );

  function focusAt(index: number): void {
    const lastIndex = Math.max(0, items.length - 1);
    const nextIndex = Math.min(lastIndex, Math.max(0, index));
    setNavigation({ key: resetKey, index: nextIndex });
    gridRef.current
      ?.querySelectorAll<HTMLElement>("[data-emoji-select]")
      .item(nextIndex)
      .focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const columns = Math.max(
      1,
      Math.floor((gridRef.current?.clientWidth ?? minimumCellSize) / minimumCellSize),
    );
    const destinations: Partial<Record<string, number>> = {
      ArrowDown: index + columns,
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index - columns,
      End: items.length - 1,
      Home: 0,
    };
    const destination = destinations[event.key];
    if (destination === undefined) return;
    event.preventDefault();
    focusAt(destination);
  }

  if (items.length === 0) {
    return (
      <div className="mp-empty" role="status">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div aria-label={label} className="mp-grid" ref={gridRef} role="grid">
      {resolvedItems.map(({ emoji, resolved }, index) => {
        const favorite = favoriteIds.has(emoji.id);
        return (
          <div className="mp-emoji-cell" key={emoji.id} role="gridcell">
            <button
              aria-label={resolved.name}
              className="mp-emoji"
              data-emoji-select=""
              onClick={() => onSelect(emoji)}
              onFocus={() => setNavigation({ key: resetKey, index })}
              onKeyDown={(event) => handleKeyDown(event, index)}
              tabIndex={index === activeIndex ? 0 : -1}
              title={resolved.name}
              type="button"
            >
              <span aria-hidden="true">{resolved.value}</span>
            </button>
            {favoritesEnabled ? (
              <button
                aria-label={`${favorite ? "Remove" : "Add"} ${emoji.name} ${favorite ? "from" : "to"} favorites`}
                aria-pressed={favorite}
                className="mp-favorite-toggle"
                onClick={() => onFavoriteToggle(emoji)}
                onFocus={() => setNavigation({ key: resetKey, index })}
                tabIndex={index === activeIndex ? 0 : -1}
                title={`${favorite ? "Remove from" : "Add to"} favorites`}
                type="button"
              >
                <span aria-hidden="true">{favorite ? "★" : "☆"}</span>
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
