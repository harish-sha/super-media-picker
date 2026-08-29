import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type {
  AnimatedMediaConfig,
  CompactReactionSource,
  EmojiMediaItem,
  FavoriteItemRecord,
  MediaItem,
  MediaUrlPolicy,
  RecentItemRecord,
  SkinTone,
} from "@super-media-picker/core";
import { isUnicodeEmoji } from "@super-media-picker/core";
import type { EmojiRecord } from "@super-media-picker/emoji";

import type { CompactReactionInput } from "../types";
import type { MediaPickerRenderers } from "../types";
import type { AnimationConcurrencyManager } from "./AnimatedMediaRenderer";
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
  readonly animation: AnimatedMediaConfig;
  readonly animationManager: AnimationConcurrencyManager;
  readonly ariaLabel: string;
  readonly className: string;
  readonly favoriteRecords: readonly FavoriteItemRecord[];
  readonly maxVisibleItems: number;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly onClose?: () => void;
  readonly onExpand: () => void;
  readonly onRecordRecent: (item: string | MediaItem) => void;
  readonly onSelect: (item: MediaItem) => void;
  readonly onSkinToneChange: (tone: SkinTone) => void;
  readonly overlay: boolean;
  readonly renderers?: MediaPickerRenderers;
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
    !isUnicodeEmoji(item) ||
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
  if (!isUnicodeEmoji(item)) return item.id;
  const compactEmoji = findKnownCompactEmoji(item);
  if (compactEmoji !== undefined) return compactEmoji.id;
  return emojiModule === undefined
    ? item.id
    : (findEmojiRecord(item, emojiModule)?.id ?? item.id);
}

/** Lightweight reaction presentation; full emoji data is loaded only on demand. */
export function CompactMediaPicker({
  allowExpand,
  animation,
  animationManager,
  ariaLabel,
  className,
  favoriteRecords,
  maxVisibleItems,
  mediaSecurity,
  onClose,
  onExpand,
  onRecordRecent,
  onSelect,
  onSkinToneChange,
  overlay,
  renderers,
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
    void import("@super-media-picker/emoji").then((module) => {
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
      candidates = records.flatMap(({ id, item }) => {
        if (item !== undefined) return [item];
        if (emojiModule === undefined) return [];
        const emoji = emojiModule.getEmojiById(id);
        return emoji === undefined ? [] : [emojiModule.toEmojiMediaItem(emoji)];
      });
    } else if (source === "favorites") {
      candidates = favoriteRecords.flatMap(({ id, item }) => {
        if (item !== undefined) return [item];
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
    favoriteRecords,
    maxVisibleItems,
    reactions,
    recentRecords,
    skinTone,
    source,
  ]);

  function handleSelect(item: MediaItem): void {
    onSelect(item);
    if (isUnicodeEmoji(item)) onRecordRecent(baseEmojiId(item, emojiModule));
    else onRecordRecent(item);
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
        animation={animation}
        animationManager={animationManager}
        items={items}
        {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
        onExpand={onExpand}
        onSelect={handleSelect}
        {...(renderers === undefined ? {} : { renderers })}
        {...(onClose === undefined ? {} : { onEscape: onClose })}
      />
      <SkinToneSelector onChange={onSkinToneChange} value={skinTone} />
    </section>
  );
}
