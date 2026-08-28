import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type {
  CompactReactionSource,
  EmojiMediaItem,
  MediaItem,
  RecentItemRecord,
  SkinTone,
} from "@company/media-core";
import type { EmojiRecord } from "@company/media-emoji";

import type { CompactReactionInput } from "../types";
import { CompactReactionBar } from "./CompactReactionBar";
import { SkinToneSelector } from "./SkinToneSelector";
import {
  applyCompactSkinTone,
  compactItemKey,
  defaultCompactReactions,
  findKnownCompactEmoji,
  findKnownCompactReaction,
} from "./compactReactions";

interface EmojiModule {
  readonly emojiData: readonly EmojiRecord[];
  readonly getEmojiById: (id: string) => EmojiRecord | undefined;
  readonly toEmojiMediaItem: (
    emoji: EmojiRecord,
    skinTone?: SkinTone,
  ) => EmojiMediaItem;
}

function normalizeEmojiPresentation(value: string): string {
  return value.replaceAll(/[\uFE0E\uFE0F]/gu, "");
}

export interface CompactMediaPickerProps {
  readonly allowExpand: boolean;
  readonly ariaLabel: string;
  readonly className: string;
  readonly favoriteIds: readonly string[];
  readonly maxVisibleItems: number;
  readonly onClose?: () => void;
  readonly onExpand: () => void;
  readonly onRecordRecent: (id: string) => void;
  readonly onSelect: (item: MediaItem) => void;
  readonly onSkinToneChange: (tone: SkinTone) => void;
  readonly overlay: boolean;
  readonly reactions?: readonly CompactReactionInput[];
  readonly recentRecords: readonly RecentItemRecord[];
  readonly skinTone: SkinTone;
  readonly source: CompactReactionSource;
  readonly style: CSSProperties;
  readonly themeMode: string;
}

function needsEmojiData(
  source: CompactReactionSource,
  reactions: readonly CompactReactionInput[] | undefined,
): boolean {
  if (source === "recent" || source === "frequent" || source === "favorites")
    return true;
  return (
    source === "custom" &&
    (reactions ?? []).some(
      (reaction) => findKnownCompactReaction(reaction) === undefined,
    )
  );
}

function findDynamicReaction(
  input: string,
  emojiModule: EmojiModule,
): MediaItem | undefined {
  const emoji =
    emojiModule.getEmojiById(input) ??
    emojiModule.emojiData.find(
      ({ value }) =>
        normalizeEmojiPresentation(value) === normalizeEmojiPresentation(input),
    );
  return emoji === undefined ? undefined : emojiModule.toEmojiMediaItem(emoji);
}

function findEmojiRecord(
  item: EmojiMediaItem,
  emojiModule: EmojiModule,
): EmojiRecord | undefined {
  return (
    emojiModule.getEmojiById(item.id) ??
    emojiModule.emojiData.find(
      (emoji) =>
        normalizeEmojiPresentation(emoji.value) ===
          normalizeEmojiPresentation(item.value) ||
        emoji.variants.some(
          (variant) =>
            variant.id === item.id ||
            normalizeEmojiPresentation(variant.value) ===
              normalizeEmojiPresentation(item.value),
        ),
    )
  );
}

function applyTone(
  item: MediaItem,
  skinTone: SkinTone,
  emojiModule: EmojiModule | undefined,
): MediaItem {
  const compactItem = applyCompactSkinTone(item, skinTone);
  if (
    compactItem !== item ||
    item.type !== "emoji" ||
    emojiModule === undefined
  )
    return compactItem;
  const emoji = findEmojiRecord(item, emojiModule);
  return emoji === undefined
    ? item
    : emojiModule.toEmojiMediaItem(emoji, skinTone);
}

function baseEmojiId(
  item: MediaItem,
  emojiModule: EmojiModule | undefined,
): string {
  if (item.type !== "emoji") return item.id;
  const compactEmoji = findKnownCompactEmoji(item);
  if (compactEmoji !== undefined) return compactEmoji.id;
  return emojiModule === undefined
    ? item.id
    : (findEmojiRecord(item, emojiModule)?.id ?? item.id);
}

/** Lightweight reaction presentation; full emoji data is loaded only on demand. */
export function CompactMediaPicker({
  allowExpand,
  ariaLabel,
  className,
  favoriteIds,
  maxVisibleItems,
  onClose,
  onExpand,
  onRecordRecent,
  onSelect,
  onSkinToneChange,
  overlay,
  reactions,
  recentRecords,
  skinTone,
  source,
  style,
  themeMode,
}: CompactMediaPickerProps) {
  const [emojiModule, setEmojiModule] = useState<EmojiModule>();
  const loadEmojiData = needsEmojiData(source, reactions);

  useEffect(() => {
    if (!loadEmojiData || emojiModule !== undefined) return;
    let active = true;
    void import("@company/media-emoji").then((module) => {
      if (active) setEmojiModule(module);
    });
    return () => {
      active = false;
    };
  }, [emojiModule, loadEmojiData]);

  const items = useMemo(() => {
    let candidates: readonly MediaItem[];
    if (source === "custom") {
      candidates = (reactions ?? []).flatMap((reaction) => {
        const known = findKnownCompactReaction(reaction);
        if (known !== undefined) return [known];
        if (typeof reaction !== "string" || emojiModule === undefined)
          return [];
        const dynamic = findDynamicReaction(reaction, emojiModule);
        return dynamic === undefined ? [] : [dynamic];
      });
    } else if (source === "recent" || source === "frequent") {
      const records =
        source === "frequent"
          ? [...recentRecords].sort(
              (left, right) =>
                right.count - left.count || right.lastUsedAt - left.lastUsedAt,
            )
          : recentRecords;
      candidates = records.flatMap(({ id }) => {
        if (emojiModule === undefined) return [];
        const emoji = emojiModule.getEmojiById(id);
        return emoji === undefined ? [] : [emojiModule.toEmojiMediaItem(emoji)];
      });
    } else if (source === "favorites") {
      candidates = favoriteIds.flatMap((id) => {
        if (emojiModule === undefined) return [];
        const emoji = emojiModule.getEmojiById(id);
        return emoji === undefined ? [] : [emojiModule.toEmojiMediaItem(emoji)];
      });
    } else {
      candidates = defaultCompactReactions;
    }

    const filled = [...candidates, ...defaultCompactReactions];
    const unique = new Map<string, MediaItem>();
    for (const item of filled) {
      const toned = applyTone(item, skinTone, emojiModule);
      const key = compactItemKey(toned);
      if (!unique.has(key)) unique.set(key, toned);
    }
    return [...unique.values()].slice(0, maxVisibleItems);
  }, [
    emojiModule,
    favoriteIds,
    maxVisibleItems,
    reactions,
    recentRecords,
    skinTone,
    source,
  ]);

  function handleSelect(item: MediaItem): void {
    onSelect(item);
    if (item.type === "emoji") onRecordRecent(baseEmojiId(item, emojiModule));
  }

  return (
    <section
      aria-label={ariaLabel}
      aria-modal={overlay ? true : undefined}
      className={`${className} mp-picker--compact mp-mode-enter`}
      data-theme={themeMode}
      role={overlay ? "dialog" : "region"}
      style={style}
    >
      <CompactReactionBar
        allowExpand={allowExpand}
        items={items}
        onExpand={onExpand}
        onSelect={handleSelect}
        {...(onClose === undefined ? {} : { onEscape: onClose })}
      />
      <SkinToneSelector onChange={onSkinToneChange} value={skinTone} />
    </section>
  );
}
