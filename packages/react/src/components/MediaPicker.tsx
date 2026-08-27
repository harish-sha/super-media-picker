import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import {
  FavoritesManager,
  LocalStorageAdapter,
  PersistentPreference,
  RecentItemsManager,
  defaultFeatures,
  type MediaItem,
  type MediaPickerFeatures,
  type PickerDisplayMode,
  type RecentItemRecord,
  type SkinTone,
  type StorageAdapter,
} from "@company/media-core";
import {
  emojiCategories,
  getEmojiByCategory,
  getEmojiById,
  searchEmoji,
  toEmojiMediaItem,
  type EmojiPickerCategory,
  type EmojiRecord,
} from "@company/media-emoji";
import {
  resolveMediaPickerTheme,
  themeTokensToCssVariables,
  type MediaPickerTheme,
} from "@company/media-themes";

import { useResolvedDisplayMode } from "../hooks/useResolvedDisplayMode";
import { CategoryNavigation } from "./CategoryNavigation";
import { EmojiGrid } from "./EmojiGrid";
import { SearchInput } from "./SearchInput";
import { SkinToneSelector } from "./SkinToneSelector";

export const mediaPickerStorageKeys = Object.freeze({
  favorites: "emoji.favorites",
  recents: "emoji.recents",
  skinTone: "emoji.skin-tone",
});

const validSkinTones = new Set<SkinTone>([
  "default",
  "light",
  "medium-light",
  "medium",
  "medium-dark",
  "dark",
]);

function isSkinTone(value: unknown): value is SkinTone {
  return typeof value === "string" && validSkinTones.has(value as SkinTone);
}

export interface MediaPickerProps {
  readonly features?: Partial<MediaPickerFeatures>;
  readonly onSelect: (item: MediaItem) => void;
  readonly onClose?: () => void;
  readonly storage?: StorageAdapter;
  readonly theme?: MediaPickerTheme;
  readonly displayMode?: PickerDisplayMode;
  readonly defaultCategory?: EmojiPickerCategory;
  readonly defaultSearchQuery?: string;
  readonly defaultSkinTone?: SkinTone;
  readonly className?: string;
  readonly ariaLabel?: string;
}

function tokenStyles(theme: MediaPickerTheme): CSSProperties {
  return themeTokensToCssVariables(resolveMediaPickerTheme(theme).tokens) as CSSProperties;
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

/** Accessible emoji picker with persistent recents, favorites, and skin tone. */
export function MediaPicker({
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
  const features = { ...defaultFeatures, ...featureOverrides };
  const persistence = useMemo(
    () => storage ?? new LocalStorageAdapter("media-picker"),
    [storage],
  );
  const recentsManager = useMemo(
    () =>
      new RecentItemsManager(persistence, {
        storageKey: mediaPickerStorageKeys.recents,
      }),
    [persistence],
  );
  const favoritesManager = useMemo(
    () =>
      new FavoritesManager(persistence, {
        storageKey: mediaPickerStorageKeys.favorites,
      }),
    [persistence],
  );
  const tonePreference = useMemo(
    () =>
      new PersistentPreference<SkinTone>(persistence, {
        storageKey: mediaPickerStorageKeys.skinTone,
        defaultValue: defaultSkinTone,
        validate: isSkinTone,
      }),
    [defaultSkinTone, persistence],
  );
  const [query, setQuery] = useState(defaultSearchQuery);
  const [selectedCategory, setSelectedCategory] =
    useState<EmojiPickerCategory>(defaultCategory);
  const [recentRecords, setRecentRecords] = useState<readonly RecentItemRecord[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<readonly string[]>([]);
  const [skinTone, setSkinTone] = useState<SkinTone>(defaultSkinTone);
  const resolvedDisplayMode = useResolvedDisplayMode(displayMode);
  const resolvedTheme = resolveMediaPickerTheme(theme);

  useEffect(() => {
    let active = true;
    void Promise.all([
      recentsManager.getRecents(),
      favoritesManager.getFavorites(),
      tonePreference.get(),
    ]).then(([recents, favorites, tone]) => {
      if (!active) return;
      setRecentRecords(recents);
      setFavoriteIds(favorites);
      setSkinTone(tone);
    });
    return () => {
      active = false;
    };
  }, [favoritesManager, recentsManager, tonePreference]);

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
    setQuery("");
  }

  function handleSelection(emoji: EmojiRecord): void {
    onSelect(toEmojiMediaItem(emoji, skinTone));
    if (features.recents) {
      void recentsManager.record(emoji.id).then(setRecentRecords);
    }
  }

  function handleFavoriteToggle(emoji: EmojiRecord): void {
    void favoritesManager.toggle(emoji.id).then(setFavoriteIds);
  }

  function handleToneChange(tone: SkinTone): void {
    setSkinTone(tone);
    void tonePreference.set(tone);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key !== "Escape" || onClose === undefined) return;
    event.stopPropagation();
    onClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) onClose?.();
  }

  const overlay = resolvedDisplayMode === "modal" || resolvedDisplayMode === "bottom-sheet";
  const pickerClassName = ["mp-picker", className].filter(Boolean).join(" ");

  if (!features.emoji) {
    return (
      <div
        className="mp-positioner"
        data-display-mode={displayMode}
        data-resolved-display-mode={resolvedDisplayMode}
      >
        <section
          aria-label={ariaLabel}
          className={pickerClassName}
          data-theme={resolvedTheme.mode}
          role="region"
          style={tokenStyles(theme)}
        >
          <div className="mp-empty" role="status">
            No media features are enabled.
          </div>
        </section>
      </div>
    );
  }

  const gridLabel =
    query.trim() === "" ? `${category} emoji` : `Emoji search results for ${query}`;
  const activeTabId = `mp-category-${category.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`;

  return (
    <div
      className="mp-positioner"
      data-display-mode={displayMode}
      data-resolved-display-mode={resolvedDisplayMode}
      onMouseDown={handleBackdropClick}
    >
      <section
        aria-label={ariaLabel}
        aria-modal={overlay ? true : undefined}
        className={pickerClassName}
        data-theme={resolvedTheme.mode}
        onKeyDown={handleKeyDown}
        role={overlay ? "dialog" : "region"}
        style={tokenStyles(theme)}
      >
        <header className="mp-header">
          <SearchInput onChange={setQuery} value={query} />
          <SkinToneSelector onChange={handleToneChange} value={skinTone} />
        </header>
        <div className="mp-section-title" id="mp-current-category">
          {query.trim() === "" ? category : "Search results"}
          <span aria-live="polite" className="mp-result-count">
            {items.length} emoji
          </span>
        </div>
        <div
          aria-labelledby={activeTabId}
          className="mp-content"
          id="mp-emoji-panel"
          role="tabpanel"
          tabIndex={-1}
        >
          <EmojiGrid
            emptyMessage={emptyMessage(category, query)}
            favoriteIds={favoriteIdSet}
            favoritesEnabled={features.favorites}
            items={items}
            label={gridLabel}
            onFavoriteToggle={handleFavoriteToggle}
            onSelect={handleSelection}
            resetKey={`${category}:${query}:${skinTone}`}
            skinTone={skinTone}
          />
        </div>
        <CategoryNavigation
          activeCategory={category}
          categories={categories}
          onChange={handleCategoryChange}
        />
      </section>
    </div>
  );
}
