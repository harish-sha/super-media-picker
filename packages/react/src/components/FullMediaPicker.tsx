import {
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import type {
  MediaItem,
  MediaPickerFeatures,
  RecentItemRecord,
  SkinTone,
} from "@super-media-picker/core";
import {
  emojiCategories,
  getEmojiByCategory,
  getEmojiById,
  searchEmoji,
  toEmojiMediaItem,
  type EmojiPickerCategory,
  type EmojiRecord,
} from "@super-media-picker/emoji";

import { categoryTabId, CategoryNavigation } from "./CategoryNavigation";
import { EmojiGrid } from "./EmojiGrid";
import { EmojiPreview } from "./EmojiPreview";
import { SearchInput } from "./SearchInput";
import { SkinToneSelector } from "./SkinToneSelector";

export interface FullMediaPickerProps {
  readonly ariaLabel: string;
  readonly className: string;
  readonly defaultCategory: EmojiPickerCategory;
  readonly defaultSearchQuery: string;
  readonly favoriteIds: readonly string[];
  readonly features: MediaPickerFeatures;
  readonly onClose?: () => void;
  readonly onCollapse?: () => void;
  readonly onRecordRecent: (id: string) => void;
  readonly onSelect: (item: MediaItem) => void;
  readonly onSkinToneChange: (tone: SkinTone) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly overlay: boolean;
  readonly previewEnabled: boolean;
  readonly recentRecords: readonly RecentItemRecord[];
  readonly skinTone: SkinTone;
  readonly style: CSSProperties;
  readonly themeMode: string;
}

function resolveStoredItems(ids: readonly string[]): readonly EmojiRecord[] {
  return ids.flatMap((id) => {
    const emoji = getEmojiById(id);
    return emoji === undefined ? [] : [emoji];
  });
}

function emptyMessage(category: EmojiPickerCategory, query: string): string {
  if (query.trim() !== "") return `No emoji found for “${query}”.`;
  if (category === "Recent") return "No recent emoji yet.";
  if (category === "Favorites") return "No favorite emoji yet.";
  return "No emoji found.";
}

/** Complete search, category, preference, and collection presentation. */
export function FullMediaPicker({
  ariaLabel,
  className,
  defaultCategory,
  defaultSearchQuery,
  favoriteIds,
  features,
  onClose,
  onCollapse,
  onRecordRecent,
  onSelect,
  onSkinToneChange,
  onToggleFavorite,
  overlay,
  previewEnabled,
  recentRecords,
  skinTone,
  style,
  themeMode,
}: FullMediaPickerProps) {
  const [query, setQuery] = useState(defaultSearchQuery);
  const [selectedCategory, setSelectedCategory] =
    useState<EmojiPickerCategory>(defaultCategory);
  const [previewEmoji, setPreviewEmoji] = useState<EmojiRecord>();
  const instanceId = useId().replaceAll(":", "");
  const tabIdPrefix = `${instanceId}-mp-category`;
  const panelId = `${instanceId}-mp-emoji-panel`;
  const categories = useMemo<readonly EmojiPickerCategory[]>(
    () => [
      ...(features.recents ? (["Recent"] as const) : []),
      ...emojiCategories,
      ...(features.favorites ? (["Favorites"] as const) : []),
    ],
    [features.favorites, features.recents],
  );
  const category = categories.includes(selectedCategory)
    ? selectedCategory
    : "Smileys & Emotion";
  const items = useMemo(() => {
    if (query.trim() !== "") return searchEmoji(query);
    if (category === "Recent") {
      return resolveStoredItems(recentRecords.map(({ id }) => id));
    }
    if (category === "Favorites") return resolveStoredItems(favoriteIds);
    return getEmojiByCategory(category);
  }, [category, favoriteIds, query, recentRecords]);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  function handleCategoryChange(nextCategory: EmojiPickerCategory): void {
    setSelectedCategory(nextCategory);
    setPreviewEmoji(undefined);
    setQuery("");
  }

  function handleSelection(emoji: EmojiRecord): void {
    onSelect(toEmojiMediaItem(emoji, skinTone));
    if (features.recents) onRecordRecent(emoji.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key !== "Escape") return;
    const action = onCollapse ?? onClose;
    if (action === undefined) return;
    event.stopPropagation();
    action();
  }

  if (!features.emoji) {
    return (
      <section
        aria-label={ariaLabel}
        className={`${className} mp-picker--full mp-mode-enter`}
        data-theme={themeMode}
        role="region"
        style={style}
      >
        <div className="mp-empty" role="status">
          No media features are enabled.
        </div>
      </section>
    );
  }

  const gridLabel =
    query.trim() === ""
      ? `${category} emoji`
      : `Emoji search results for ${query}`;
  const activeTabId = categoryTabId(tabIdPrefix, category);

  return (
    <section
      aria-label={ariaLabel}
      aria-modal={overlay ? true : undefined}
      className={`${className} mp-picker--full mp-mode-enter`}
      data-theme={themeMode}
      onKeyDown={handleKeyDown}
      role={overlay ? "dialog" : "region"}
      style={style}
    >
      <header className="mp-header">
        {onCollapse === undefined ? null : (
          <button
            aria-label="Return to compact reactions"
            className="mp-collapse"
            onClick={onCollapse}
            title="Return to compact reactions"
            type="button"
          >
            <span aria-hidden="true">‹</span>
          </button>
        )}
        <SearchInput autoFocus={overlay} onChange={setQuery} value={query} />
        <SkinToneSelector onChange={onSkinToneChange} value={skinTone} />
      </header>
      <div className="mp-section-title">
        {query.trim() === "" ? category : "Search results"}
        <span aria-live="polite" className="mp-result-count">
          {items.length} emoji
        </span>
      </div>
      <div
        aria-labelledby={activeTabId}
        className="mp-content"
        id={panelId}
        role="tabpanel"
        tabIndex={-1}
      >
        <EmojiGrid
          emptyMessage={emptyMessage(category, query)}
          favoriteIds={favoriteIdSet}
          favoritesEnabled={features.favorites}
          items={items}
          label={gridLabel}
          onFavoriteToggle={(emoji) => onToggleFavorite(emoji.id)}
          onSelect={handleSelection}
          resetKey={`${category}:${query}:${skinTone}`}
          skinTone={skinTone}
          {...(previewEnabled ? { onPreview: setPreviewEmoji } : {})}
        />
      </div>
      {previewEnabled ? (
        <EmojiPreview emoji={previewEmoji ?? items[0]} skinTone={skinTone} />
      ) : null}
      <CategoryNavigation
        activeCategory={category}
        categories={categories}
        idPrefix={tabIdPrefix}
        onChange={handleCategoryChange}
        panelId={panelId}
      />
    </section>
  );
}
