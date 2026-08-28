import { forwardRef, type KeyboardEvent } from "react";

import type { AnimatedMediaConfig, MediaItem } from "@super-media-picker/core";

import type { MediaPickerRenderers } from "../types";
import type { AnimationConcurrencyManager } from "./AnimatedMediaRenderer";
import { MediaItemVisual, mediaItemLabel } from "./MediaItemVisual";

export function reactionItemLabel(item: MediaItem): string {
  return mediaItemLabel(item);
}

export interface ReactionItemProps {
  readonly active: boolean;
  readonly item: MediaItem;
  readonly animation: AnimatedMediaConfig;
  readonly animationManager: AnimationConcurrencyManager;
  readonly renderers?: MediaPickerRenderers;
  readonly selected: boolean;
  readonly onFocus: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onSelect: (item: MediaItem) => void;
}

/** Generic compact renderer ready for normalized future media items. */
export const ReactionItem = forwardRef<HTMLButtonElement, ReactionItemProps>(
  function ReactionItem(
    {
      active,
      animation,
      animationManager,
      item,
      renderers,
      selected,
      onFocus,
      onKeyDown,
      onSelect,
    },
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
        <MediaItemVisual
          animation={animation}
          item={item}
          manager={animationManager}
          {...(renderers === undefined ? {} : { renderers })}
        />
      </button>
    );
  },
);
