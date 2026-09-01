import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import {
  isUnicodeEmoji,
  type AnimatedMediaConfig,
  type FavoriteItemRecord,
  type MediaCapabilities,
  type MediaPickerAnalytics,
  type MediaItem,
  type MediaUrlPolicy,
  type MediaPickerFeatures,
  type RecentItemRecord,
  type SkinTone,
} from "@super-media-picker/core";
import {
  emojiCategories,
  emojiData,
  getEmojiByCategory,
  getEmojiById,
  searchEmoji,
  supportsUnicodeVersion,
  toEmojiMediaItem,
  type EmojiPickerCategory,
  type EmojiRecord,
} from "@super-media-picker/emoji";

import type {
  CustomMediaTab,
  MediaPickerProps,
  MediaPickerProviders,
  MediaPickerRenderers,
} from "../types";
import type { AnimationConcurrencyManager } from "./AnimatedMediaRenderer";
import { categoryTabId, CategoryNavigation } from "./CategoryNavigation";
import { EmojiGrid } from "./EmojiGrid";
import { EmojiPreview } from "./EmojiPreview";
import { MediaResultsGrid } from "./MediaResultsGrid";
import { SearchInput } from "./SearchInput";
import { SkinToneSelector } from "./SkinToneSelector";

type PrimaryTab = "emoji" | "gif" | "stickers" | "custom";
type CollectionView = "browse" | "recent" | "favorites";

const LazyGifPanel = lazy(() =>
  import("./ProviderPanels").then(({ GifPanel }) => ({ default: GifPanel })),
);
const LazyEmojiProviderPanels = lazy(() =>
  import("./ProviderPanels").then(({ EmojiProviderPanels }) => ({
    default: EmojiProviderPanels,
  })),
);
const LazyStickerPanel = lazy(() =>
  import("./ProviderPanels").then(({ StickerPanel }) => ({
    default: StickerPanel,
  })),
);
const LazyCustomPanel = lazy(() =>
  import("./ProviderPanels").then(({ CustomPanel }) => ({
    default: CustomPanel,
  })),
);

interface PrimaryTabDefinition {
  readonly id: PrimaryTab;
  readonly label: string;
}

export interface FullMediaPickerProps {
  readonly animation: AnimatedMediaConfig;
  readonly animationManager: AnimationConcurrencyManager;
  readonly analytics: MediaPickerAnalytics;
  readonly ariaLabel: string;
  readonly capabilities?: Partial<MediaCapabilities>;
  readonly className: string;
  readonly customTabs: readonly CustomMediaTab[];
  readonly defaultCategory: EmojiPickerCategory;
  readonly defaultMediaType: PrimaryTab;
  readonly defaultSearchQuery: string;
  readonly emojiPacks: MediaPickerPropsEmojiPacks;
  readonly favoriteIds: readonly string[];
  readonly favoriteRecords: readonly FavoriteItemRecord[];
  readonly features: MediaPickerFeatures;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly maxUnicodeVersion: number;
  readonly onClose?: () => void;
  readonly onCollapse?: () => void;
  readonly onRecordRecent: (item: string | MediaItem) => void;
  readonly onSelect: (item: MediaItem) => void;
  readonly onSkinToneChange: (tone: SkinTone) => void;
  readonly onToggleFavorite: (item: string | MediaItem) => void;
  readonly overlay: boolean;
  readonly previewEnabled: boolean;
  readonly providers?: MediaPickerProviders;
  readonly recentRecords: readonly RecentItemRecord[];
  readonly renderers?: MediaPickerRenderers;
  readonly skinTone: SkinTone;
  readonly style: CSSProperties;
  readonly themeMode: string;
}

type MediaPickerPropsEmojiPacks = NonNullable<MediaPickerProps["emojiPacks"]>;

function findEmojiRecord(id: string, value?: string): EmojiRecord | undefined {
  return (
    getEmojiById(id) ??
    emojiData.find(
      (emoji) =>
        emoji.variants.some(
          (variant) =>
            variant.id === id ||
            (value !== undefined && variant.value === value),
        ) ||
        (value !== undefined && emoji.value === value),
    )
  );
}

function resolveStoredItems(
  records: readonly RecentItemRecord[] | readonly FavoriteItemRecord[],
  maxUnicodeVersion: number,
): readonly EmojiRecord[] {
  return records.flatMap((record) => {
    const item = record.item;
    if (item !== undefined && isUnicodeEmoji(item)) {
      const emoji = findEmojiRecord(item.id, item.value);
      return emoji === undefined ||
        !supportsUnicodeVersion(emoji, maxUnicodeVersion)
        ? []
        : [emoji];
    }
    const emoji = getEmojiById(record.id);
    return emoji === undefined ||
      !supportsUnicodeVersion(emoji, maxUnicodeVersion)
      ? []
      : [emoji];
  });
}

function emptyMessage(category: EmojiPickerCategory, query: string): string {
  if (query.trim() !== "") return `No emoji found for “${query}”.`;
  if (category === "Recent") return "No recent emoji yet.";
  if (category === "Favorites") return "No favorite emoji yet.";
  return "No emoji found.";
}

function itemsForCollection(
  type: PrimaryTab,
  view: Exclude<CollectionView, "browse">,
  recents: readonly RecentItemRecord[],
  favorites: readonly FavoriteItemRecord[],
): readonly MediaItem[] {
  const records = view === "recent" ? recents : favorites;
  return records.flatMap(({ item }) =>
    item !== undefined &&
    (type === "gif"
      ? item.type === "gif"
      : type === "stickers"
        ? item.type === "sticker"
        : type === "custom"
          ? item.type === "custom"
          : item.type === "emoji")
      ? [item]
      : [],
  );
}

/** Complete, feature-isolated media picker with contextual provider search. */
export function FullMediaPicker({
  animation,
  animationManager,
  analytics,
  ariaLabel,
  capabilities,
  className,
  customTabs,
  defaultCategory,
  defaultMediaType,
  defaultSearchQuery,
  emojiPacks,
  favoriteIds,
  favoriteRecords,
  features,
  mediaSecurity,
  maxUnicodeVersion,
  onClose,
  onCollapse,
  onRecordRecent,
  onSelect,
  onSkinToneChange,
  onToggleFavorite,
  overlay,
  previewEnabled,
  providers,
  recentRecords,
  renderers,
  skinTone,
  style,
  themeMode,
}: FullMediaPickerProps) {
  const availableTabs = useMemo<readonly PrimaryTabDefinition[]>(
    () => [
      ...(features.emoji && capabilities?.emoji !== false
        ? [{ id: "emoji", label: "Emoji" } as const]
        : []),
      ...(features.gifs &&
      capabilities?.gif !== false &&
      providers?.gifs !== undefined
        ? [{ id: "gif", label: "GIF" } as const]
        : []),
      ...(features.stickers &&
      capabilities?.stickers !== false &&
      providers?.stickers !== undefined
        ? [{ id: "stickers", label: "Stickers" } as const]
        : []),
      ...(features.customMedia &&
      capabilities?.customMedia !== false &&
      customTabs.length > 0
        ? [{ id: "custom", label: "Custom" } as const]
        : []),
    ],
    [capabilities, customTabs.length, features, providers],
  );
  const [requestedTab, setRequestedTab] =
    useState<PrimaryTab>(defaultMediaType);
  const activeTab = availableTabs.some(({ id }) => id === requestedTab)
    ? requestedTab
    : availableTabs[0]?.id;
  const [query, setQuery] = useState(defaultSearchQuery);
  const [collectionView, setCollectionView] =
    useState<CollectionView>("browse");
  const [selectedCategory, setSelectedCategory] =
    useState<EmojiPickerCategory>(defaultCategory);
  const [previewEmoji, setPreviewEmoji] = useState<EmojiRecord>();
  const instanceId = useId().replaceAll(":", "");
  const categoryTabPrefix = `${instanceId}-mp-category`;
  const emojiPanelId = `${instanceId}-mp-emoji-panel`;
  const primaryPanelId = `${instanceId}-mp-primary-panel`;
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
  const emojiItems = useMemo(() => {
    if (query.trim() !== "") return searchEmoji(query, { maxUnicodeVersion });
    if (category === "Recent")
      return resolveStoredItems(recentRecords, maxUnicodeVersion);
    if (category === "Favorites")
      return resolveStoredItems(favoriteRecords, maxUnicodeVersion);
    return getEmojiByCategory(category, { maxUnicodeVersion });
  }, [category, favoriteRecords, maxUnicodeVersion, query, recentRecords]);
  const extensionEmoji = useMemo<readonly MediaItem[]>(() => {
    const items = emojiPacks
      .flatMap((pack) => pack.items ?? [])
      .filter((item) => {
        if (item.kind === "animated")
          return (
            features.animatedEmoji && capabilities?.animatedEmoji !== false
          );
        return capabilities?.customEmoji !== false;
      });
    const normalized = query.trim().toLocaleLowerCase();
    if (category === "Recent")
      return recentRecords.flatMap(({ item }) =>
        item?.type === "emoji" && !isUnicodeEmoji(item) ? [item] : [],
      );
    if (category === "Favorites")
      return favoriteRecords.flatMap(({ item }) =>
        item?.type === "emoji" && !isUnicodeEmoji(item) ? [item] : [],
      );
    return normalized === ""
      ? items
      : items.filter((item) =>
          item.name.toLocaleLowerCase().includes(normalized),
        );
  }, [
    capabilities,
    category,
    emojiPacks,
    favoriteRecords,
    features.animatedEmoji,
    query,
    recentRecords,
  ]);
  const emojiFavoriteIds = useMemo(() => {
    const ids = new Set(favoriteIds);
    for (const record of favoriteRecords) {
      if (record.item !== undefined && isUnicodeEmoji(record.item)) {
        const emoji = findEmojiRecord(record.item.id, record.item.value);
        if (emoji !== undefined) ids.add(emoji.id);
      }
    }
    return ids;
  }, [favoriteIds, favoriteRecords]);
  const mediaFavoriteIds = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  useEffect(() => {
    if (activeTab !== "emoji" || query.trim() === "") return;
    analytics.track("search_completed", {
      mediaType: "emoji",
      resultCount: emojiItems.length + extensionEmoji.length,
    });
  }, [activeTab, analytics, emojiItems.length, extensionEmoji.length, query]);

  function selectItem(item: MediaItem): void {
    onSelect(item);
    if (features.recents) onRecordRecent(item);
  }

  function selectEmoji(emoji: EmojiRecord): void {
    const item = toEmojiMediaItem(emoji, skinTone);
    onSelect(item);
    if (features.recents) onRecordRecent(emoji.id);
  }

  function changePrimaryTab(tab: PrimaryTab): void {
    analytics.track("tab_changed", { mediaType: tab });
    setRequestedTab(tab);
    setQuery("");
    setCollectionView("browse");
  }

  function handlePrimaryTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    const last = availableTabs.length - 1;
    const destinations: Partial<Record<string, number>> = {
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowRight: index === last ? 0 : index + 1,
      End: last,
      Home: 0,
    };
    const destination = destinations[event.key];
    if (destination === undefined) return;
    event.preventDefault();
    const tab = availableTabs[destination];
    if (tab === undefined) return;
    changePrimaryTab(tab.id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
      .item(destination)
      .focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key !== "Escape") return;
    const action = onCollapse ?? onClose;
    if (action === undefined) return;
    event.stopPropagation();
    action();
  }

  if (activeTab === undefined) {
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

  const searchLabel = `Search ${activeTab === "gif" ? "GIFs" : activeTab}`;
  const primaryTabId = `${instanceId}-mp-primary-${activeTab}`;
  const collectionItems =
    collectionView === "browse"
      ? []
      : itemsForCollection(
          activeTab,
          collectionView,
          recentRecords,
          favoriteRecords,
        );
  const collectionViews: readonly CollectionView[] = [
    "browse",
    ...(features.recents ? (["recent"] as const) : []),
    ...(features.favorites ? (["favorites"] as const) : []),
  ];
  const sharedGridProps = {
    animation,
    animationManager,
    favoriteIds: mediaFavoriteIds,
    favoritesEnabled: features.favorites,
    onFavoriteToggle: onToggleFavorite,
    onSelect: selectItem,
    ...(mediaSecurity === undefined ? {} : { mediaSecurity }),
    ...(renderers === undefined ? {} : { renderers }),
  } as const;

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
        <SearchInput
          autoFocus={overlay}
          label={searchLabel}
          onChange={(nextQuery) => {
            if (nextQuery.trim() !== "" && nextQuery !== query)
              analytics.track("search_started", { mediaType: activeTab });
            setQuery(nextQuery);
          }}
          value={query}
        />
        {activeTab === "emoji" ? (
          <SkinToneSelector onChange={onSkinToneChange} value={skinTone} />
        ) : null}
      </header>
      <nav aria-label="Media types" className="mp-primary-tabs" role="tablist">
        {availableTabs.map((tab, index) => (
          <button
            aria-controls={primaryPanelId}
            aria-selected={tab.id === activeTab}
            id={`${instanceId}-mp-primary-${tab.id}`}
            key={tab.id}
            onClick={() => changePrimaryTab(tab.id)}
            onKeyDown={(event) => handlePrimaryTabKeyDown(event, index)}
            role="tab"
            tabIndex={tab.id === activeTab ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {activeTab !== "emoji" && (features.recents || features.favorites) ? (
        <nav aria-label={`${activeTab} collections`} className="mp-context-nav">
          {collectionViews.map((view) => (
            <button
              aria-pressed={collectionView === view}
              key={view}
              onClick={() => {
                setCollectionView(view);
                setQuery("");
              }}
              type="button"
            >
              {view[0]?.toLocaleUpperCase()}
              {view.slice(1)}
            </button>
          ))}
        </nav>
      ) : null}
      <div
        aria-labelledby={primaryTabId}
        className="mp-primary-panel"
        id={primaryPanelId}
        role="tabpanel"
      >
        {activeTab === "emoji" ? (
          <>
            <div className="mp-section-title">
              {query.trim() === "" ? category : "Search results"}
              <span aria-live="polite" className="mp-result-count">
                {emojiItems.length + extensionEmoji.length} emoji
              </span>
            </div>
            <div
              aria-labelledby={categoryTabId(categoryTabPrefix, category)}
              className="mp-content"
              id={emojiPanelId}
              role="tabpanel"
              tabIndex={-1}
            >
              {extensionEmoji.length > 0 ? (
                <MediaResultsGrid
                  {...sharedGridProps}
                  emptyMessage="No custom emoji."
                  items={extensionEmoji}
                  label="Custom and animated emoji"
                />
              ) : null}
              {providers?.emoji !== undefined && providers.emoji.length > 0 ? (
                <Suspense
                  fallback={
                    <div className="mp-provider-state" role="status">
                      Opening provider emoji…
                    </div>
                  }
                >
                  <LazyEmojiProviderPanels
                    {...sharedGridProps}
                    allowAnimated={
                      features.animatedEmoji &&
                      capabilities?.animatedEmoji !== false
                    }
                    allowCustom={capabilities?.customEmoji !== false}
                    providers={providers.emoji}
                    query={query}
                    analytics={analytics}
                  />
                </Suspense>
              ) : null}
              <EmojiGrid
                emptyMessage={
                  extensionEmoji.length > 0 ? "" : emptyMessage(category, query)
                }
                favoriteIds={emojiFavoriteIds}
                favoritesEnabled={features.favorites}
                items={emojiItems}
                label={
                  query.trim() === ""
                    ? `${category} emoji`
                    : `Emoji search results for ${query}`
                }
                onFavoriteToggle={(emoji) => onToggleFavorite(emoji.id)}
                onSelect={selectEmoji}
                resetKey={`${category}:${query}:${skinTone}`}
                skinTone={skinTone}
                {...(previewEnabled ? { onPreview: setPreviewEmoji } : {})}
              />
            </div>
            {previewEnabled ? (
              <EmojiPreview
                emoji={previewEmoji ?? emojiItems[0]}
                skinTone={skinTone}
              />
            ) : null}
            <CategoryNavigation
              activeCategory={category}
              categories={categories}
              idPrefix={categoryTabPrefix}
              onChange={(next) => {
                setSelectedCategory(next);
                setPreviewEmoji(undefined);
                setQuery("");
              }}
              panelId={emojiPanelId}
            />
          </>
        ) : collectionView !== "browse" ? (
          <MediaResultsGrid
            {...sharedGridProps}
            emptyMessage={`No ${collectionView} ${activeTab}.`}
            items={collectionItems}
            label={`${collectionView} ${activeTab}`}
          />
        ) : activeTab === "gif" && providers?.gifs !== undefined ? (
          <Suspense
            fallback={
              <div className="mp-provider-state" role="status">
                Opening GIFs…
              </div>
            }
          >
            <LazyGifPanel
              {...sharedGridProps}
              provider={providers.gifs}
              query={query}
              analytics={analytics}
            />
          </Suspense>
        ) : activeTab === "stickers" && providers?.stickers !== undefined ? (
          <Suspense
            fallback={
              <div className="mp-provider-state" role="status">
                Opening stickers…
              </div>
            }
          >
            <LazyStickerPanel
              {...sharedGridProps}
              allowAnimated={capabilities?.animatedStickers !== false}
              provider={providers.stickers}
              query={query}
              analytics={analytics}
            />
          </Suspense>
        ) : activeTab === "custom" ? (
          <Suspense
            fallback={
              <div className="mp-provider-state" role="status">
                Opening custom media…
              </div>
            }
          >
            <LazyCustomPanel
              {...sharedGridProps}
              query={query}
              tabs={customTabs}
              analytics={analytics}
            />
          </Suspense>
        ) : null}
      </div>
    </section>
  );
}
