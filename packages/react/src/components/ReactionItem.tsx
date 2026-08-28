import { forwardRef, type KeyboardEvent } from "react";

import type { MediaItem } from "@super-media-picker/core";

export function reactionItemLabel(item: MediaItem): string {
  if (item.type === "emoji" || item.type === "custom") return item.name;
  if (item.type === "gif") return item.alt ?? "GIF reaction";
  return item.alt ?? "Sticker reaction";
}

function ReactionVisual({ item }: { readonly item: MediaItem }) {
  if (item.type === "emoji") {
    return <span aria-hidden="true">{item.value}</span>;
  }
  if (item.type === "gif") {
    return <img alt="" src={item.previewUrl} />;
  }
  return <img alt="" src={item.previewUrl ?? item.url} />;
}

export interface ReactionItemProps {
  readonly active: boolean;
  readonly item: MediaItem;
  readonly selected: boolean;
  readonly onFocus: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onSelect: (item: MediaItem) => void;
}

/** Generic compact renderer ready for normalized future media items. */
export const ReactionItem = forwardRef<HTMLButtonElement, ReactionItemProps>(
  function ReactionItem(
    { active, item, selected, onFocus, onKeyDown, onSelect },
    ref,
  ) {
    const label = reactionItemLabel(item);
    return (
      <button
        aria-label={label}
        className="mp-reaction"
        data-compact-control=""
        data-selected={selected ? "true" : undefined}
        data-tooltip={label}
        onClick={() => onSelect(item)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        ref={ref}
        tabIndex={active ? 0 : -1}
        title={label}
        type="button"
      >
        <ReactionVisual item={item} />
      </button>
    );
  },
);
