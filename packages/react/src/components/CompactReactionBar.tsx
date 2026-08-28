import { useRef, useState, type KeyboardEvent } from "react";

import type { AnimatedMediaConfig, MediaItem } from "@super-media-picker/core";

import type { MediaPickerRenderers } from "../types";
import type { AnimationConcurrencyManager } from "./AnimatedMediaRenderer";
import { compactItemKey } from "./compactReactions";
import { ReactionItem } from "./ReactionItem";

export interface CompactReactionBarProps {
  readonly items: readonly MediaItem[];
  readonly animation: AnimatedMediaConfig;
  readonly animationManager: AnimationConcurrencyManager;
  readonly renderers?: MediaPickerRenderers;
  readonly allowExpand: boolean;
  readonly onEscape?: () => void;
  readonly onExpand: () => void;
  readonly onSelect: (item: MediaItem) => void;
}

export function CompactReactionBar({
  items,
  animation,
  animationManager,
  renderers,
  allowExpand,
  onEscape,
  onExpand,
  onSelect,
}: CompactReactionBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string>();
  const controlCount = items.length + (allowExpand ? 1 : 0);
  const resolvedActiveIndex = Math.min(
    activeIndex,
    Math.max(0, controlCount - 1),
  );

  function focusAt(index: number): void {
    const nextIndex = Math.min(controlCount - 1, Math.max(0, index));
    if (nextIndex < 0) return;
    setActiveIndex(nextIndex);
    rootRef.current
      ?.querySelectorAll<HTMLButtonElement>("[data-compact-control]")
      .item(nextIndex)
      .focus();
  }

  function handleControlKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    const destinations: Partial<Record<string, number>> = {
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      End: controlCount - 1,
      Home: 0,
    };
    const destination = destinations[event.key];
    if (destination === undefined) return;
    event.preventDefault();
    const wrapped =
      destination < 0
        ? controlCount - 1
        : destination >= controlCount
          ? 0
          : destination;
    focusAt(wrapped);
  }

  function handleSelect(item: MediaItem): void {
    setSelectedKey(compactItemKey(item));
    onSelect(item);
  }

  return (
    <div
      aria-label="Quick reactions"
      className="mp-compact-bar"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || onEscape === undefined) return;
        event.stopPropagation();
        onEscape();
      }}
      ref={rootRef}
      role="toolbar"
    >
      <div className="mp-compact-items">
        {items.map((item, index) => (
          <ReactionItem
            active={index === resolvedActiveIndex}
            animation={animation}
            animationManager={animationManager}
            item={item}
            key={compactItemKey(item)}
            onFocus={() => setActiveIndex(index)}
            onKeyDown={(event) => handleControlKeyDown(event, index)}
            onSelect={handleSelect}
            selected={selectedKey === compactItemKey(item)}
            {...(renderers === undefined ? {} : { renderers })}
          />
        ))}
      </div>
      {allowExpand ? (
        <button
          aria-label="Open full media picker"
          className="mp-expand"
          data-compact-control=""
          onClick={onExpand}
          onFocus={() => setActiveIndex(items.length)}
          onKeyDown={(event) => handleControlKeyDown(event, items.length)}
          tabIndex={resolvedActiveIndex === items.length ? 0 : -1}
          title="Open full media picker"
          type="button"
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : null}
    </div>
  );
}
