import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
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
import type * as ProviderPanelsModule from "./ProviderPanels";

type PrimaryTab = "emoji" | "gif" | "stickers" | "custom";
type CollectionView = "browse" | "recent" | "favorites";

let providerPanelsModule: Promise<typeof ProviderPanelsModule> | undefined;

function loadProviderPanels() {
  return (providerPanelsModule ??= import("./ProviderPanels"));
}

const LazyGifPanel = lazy(() =>
  loadProviderPanels().then(({ GifPanel }) => ({ default: GifPanel })),
);
const LazyEmojiProviderPanels = lazy(() =>
  loadProviderPanels().then(({ EmojiProviderPanels }) => ({
    default: EmojiProviderPanels,
  })),
);
const LazyStickerPanel = lazy(() =>
  loadProviderPanels().then(({ StickerPanel }) => ({
    default: StickerPanel,
  })),
);
const LazyCustomPanel = lazy(() =>
  loadProviderPanels().then(({ CustomPanel }) => ({
    default: CustomPanel,
  })),
);

interface PrimaryTabDefinition {
  readonly id: PrimaryTab;
  readonly label: string;
}

const emptyMediaItems: readonly MediaItem[] = [];

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
  readonly presentationControls?: ReactNode;
  readonly resizeControls?: ReactNode;
  readonly surfaceRef?: RefObject<HTMLElement | null>;
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
  presentationControls,
  resizeControls,
  surfaceRef,
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
  const [queries, setQueries] = useState<Partial<Record<PrimaryTab, string>>>(
    () => ({ [defaultMediaType]: defaultSearchQuery }),
  );
  const query = activeTab === undefined ? "" : (queries[activeTab] ?? "");
  const activeSearch = useMemo(
    () => ({ query, tab: activeTab }),
    [activeTab, query],
  );
  const deferredSearch = useDeferredValue(activeSearch);
  const queryFor = useCallback(
    (tab: PrimaryTab) =>
      tab === activeTab && deferredSearch.tab === tab
        ? deferredSearch.query
        : (queries[tab] ?? ""),
    [activeTab, deferredSearch, queries],
  );
  const [collectionViews, setCollectionViews] = useState<
    Partial<Record<PrimaryTab, CollectionView>>
  >({});
  const collectionView =
    activeTab === undefined
      ? "browse"
      : (collectionViews[activeTab] ?? "browse");
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<PrimaryTab>>(
    () => new Set([defaultMediaType]),
  );
  const scrollPositions = useRef(new Map<PrimaryTab, number>());
  const [selectedCategory, setSelectedCategory] =
    useState<EmojiPickerCategory>(defaultCategory);
  const [previewEmoji, setPreviewEmoji] = useState<EmojiRecord>();
  const instanceId = useId().replaceAll(":", "");
  const categoryTabPrefix = `${instanceId}-mp-category`;
  const emojiPanelId = `${instanceId}-mp-emoji-panel`;
  const primaryPanelId = (tab: PrimaryTab) =>
    `${instanceId}-mp-primary-panel-${tab}`;
  const categories = useMemo<readonly EmojiPickerCategory[]>(
    () => [
      ...(features.recents ? (["Recent"] as const) : []),
      ...emojiCategories,
      ...(features.favorites ? (["Favorites"] as const) : []),
    ],
    [features.favorites, features.recents],
  );
  const availableCollectionViews = useMemo<readonly CollectionView[]>(
    () => [
      "browse",
      ...(features.recents ? (["recent"] as const) : []),
      ...(features.favorites ? (["favorites"] as const) : []),
    ],
    [features.favorites, features.recents],
  );
  const savedCollectionViews = useMemo(
    () =>
      availableCollectionViews.filter(
        (view): view is Exclude<CollectionView, "browse"> => view !== "browse",
      ),
    [availableCollectionViews],
  );
  const category = categories.includes(selectedCategory)
    ? selectedCategory
    : "Smileys & Emotion";
  const emojiQuery = queryFor("emoji");
  const emojiItems = useMemo(() => {
    if (emojiQuery.trim() !== "")
      return searchEmoji(emojiQuery, { maxUnicodeVersion });
    if (category === "Recent")
      return resolveStoredItems(recentRecords, maxUnicodeVersion);
    if (category === "Favorites")
      return resolveStoredItems(favoriteRecords, maxUnicodeVersion);
    return getEmojiByCategory(category, { maxUnicodeVersion });
  }, [category, emojiQuery, favoriteRecords, maxUnicodeVersion, recentRecords]);
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
    const normalized = emojiQuery.trim().toLocaleLowerCase();
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
    emojiQuery,
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
    if (activeTab !== "emoji" || emojiQuery.trim() === "") return;
    analytics.track("search_completed", {
      mediaType: "emoji",
      resultCount: emojiItems.length + extensionEmoji.length,
    });
  }, [
    activeTab,
    analytics,
    emojiItems.length,
    emojiQuery,
    extensionEmoji.length,
  ]);

  useEffect(() => {
    const hasRemotePanels = availableTabs.some(
      ({ id }) => id === "gif" || id === "stickers" || id === "custom",
    );
    if (!hasRemotePanels || typeof window === "undefined") return;
    const warm = () => void loadProviderPanels();
    if (window.requestIdleCallback !== undefined) {
      const handle = window.requestIdleCallback(warm, { timeout: 500 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(warm, 80);
    return () => window.clearTimeout(handle);
  }, [availableTabs]);

  useLayoutEffect(() => {
    if (activeTab === undefined) return;
    const surface = surfaceRef?.current;
    const activePanel = surface?.querySelector<HTMLElement>(
      `[data-media-panel="${activeTab}"]`,
    );
    const scroller =
      activePanel?.querySelector<HTMLElement>(".mp-content") ?? activePanel;
    const savedScroll = scrollPositions.current.get(activeTab);
    if (
      scroller !== null &&
      scroller !== undefined &&
      savedScroll !== undefined
    )
      scroller.scrollTop = savedScroll;
    surface?.setAttribute("data-active-media-type", activeTab);
    surface?.setAttribute(
      "data-loaded-media-types",
      [...visitedTabs].join(","),
    );
  }, [activeTab, surfaceRef, visitedTabs]);

  const selectItem = useCallback(
    (item: MediaItem): void => {
      onSelect(item);
      if (features.recents) onRecordRecent(item);
    },
    [features.recents, onRecordRecent, onSelect],
  );

  const selectEmoji = useCallback(
    (emoji: EmojiRecord): void => {
      const item = toEmojiMediaItem(emoji, skinTone);
      onSelect(item);
      if (features.recents) onRecordRecent(emoji.id);
    },
    [features.recents, onRecordRecent, onSelect, skinTone],
  );
  const toggleEmojiFavorite = useCallback(
    (emoji: EmojiRecord) => onToggleFavorite(emoji.id),
    [onToggleFavorite],
  );
  const changeStickerCollection = useCallback(
    (view: "browse" | "recent" | "favorites") => {
      setCollectionViews((current) => ({ ...current, stickers: view }));
      setQueries((current) => ({ ...current, stickers: "" }));
    },
    [],
  );

  function changePrimaryTab(tab: PrimaryTab): void {
    if (tab === activeTab) return;
    if (activeTab !== undefined) {
      const activePanel = surfaceRef?.current?.querySelector<HTMLElement>(
        `[data-media-panel="${activeTab}"]`,
      );
      const scroller =
        activePanel?.querySelector<HTMLElement>(".mp-content") ?? activePanel;
      if (scroller !== null && scroller !== undefined)
        scrollPositions.current.set(activeTab, scroller.scrollTop);
    }
    analytics.track("tab_changed", { mediaType: tab });
    setVisitedTabs((current) => {
      if (current.has(tab)) return current;
      const next = new Set(current);
      next.add(tab);
      return next;
    });
    setRequestedTab(tab);
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
    if (event.key === "Escape") {
      const action = onCollapse ?? onClose;
      if (action === undefined) return;
      event.stopPropagation();
      action();
      return;
    }
    if (event.key !== "Tab" || !overlay) return;
    const focusable = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => !element.hidden);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (activeTab === undefined) {
    return (
      <section
        aria-label={ariaLabel}
        className={`${className} mp-picker--full`}
        data-theme={themeMode}
        role="region"
        style={style}
        ref={surfaceRef}
      >
        <div className="mp-empty" role="status">
          No media features are enabled.
        </div>
      </section>
    );
  }

  const searchLabel = `Search ${activeTab === "gif" ? "GIFs" : activeTab}`;
  const collectionFor = (tab: PrimaryTab): CollectionView =>
    collectionViews[tab] ?? "browse";
  const collectionItemsFor = (tab: PrimaryTab) =>
    collectionFor(tab) === "browse"
      ? emptyMediaItems
      : itemsForCollection(
          tab,
          collectionFor(tab) as Exclude<CollectionView, "browse">,
          recentRecords,
          favoriteRecords,
        );
  const renderedTabs = availableTabs.filter(
    ({ id }) => id === activeTab || visitedTabs.has(id),
  );
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
      className={`${className} mp-picker--full`}
      data-theme={themeMode}
      onKeyDown={handleKeyDown}
      role={overlay ? "dialog" : "region"}
      style={style}
      ref={surfaceRef}
    >
      <header className="mp-header">
        {presentationControls}
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
          autoFocus={overlay || onCollapse !== undefined}
          label={searchLabel}
          onChange={(nextQuery) => {
            if (nextQuery.trim() !== "" && nextQuery !== query)
              analytics.track("search_started", { mediaType: activeTab });
            if (activeTab !== "emoji" && nextQuery.trim() !== "")
              setCollectionViews((current) => ({
                ...current,
                [activeTab]: "browse",
              }));
            setQueries((current) => ({ ...current, [activeTab]: nextQuery }));
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
            aria-controls={primaryPanelId(tab.id)}
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
      {activeTab !== "emoji" &&
      activeTab !== "stickers" &&
      (features.recents || features.favorites) ? (
        <div
          aria-label={`${activeTab} collections`}
          className="mp-context-toolbar mp-context-toolbar--end"
        >
          <div className="mp-context-segments" role="group">
            {availableCollectionViews.map((view) => (
              <button
                aria-pressed={collectionView === view}
                key={view}
                onClick={() => {
                  setCollectionViews((current) => ({
                    ...current,
                    [activeTab]: view,
                  }));
                  setQueries((current) => ({
                    ...current,
                    [activeTab]: "",
                  }));
                }}
                type="button"
              >
                {view[0]?.toLocaleUpperCase()}
                {view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {renderedTabs.map(({ id: tab }) => {
        const tabQuery = queryFor(tab);
        const tabCollection = collectionFor(tab);
        const tabCollectionItems = collectionItemsFor(tab);
        return (
          <div
            aria-labelledby={`${instanceId}-mp-primary-${tab}`}
            className="mp-primary-panel"
            data-media-panel={tab}
            hidden={tab !== activeTab}
            id={primaryPanelId(tab)}
            key={tab}
            role="tabpanel"
          >
            {tab === "emoji" ? (
              <>
                <div className="mp-section-title">
                  {tabQuery.trim() === "" ? category : "Search results"}
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
                  {providers?.emoji !== undefined &&
                  providers.emoji.length > 0 ? (
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
                        query={tabQuery}
                        analytics={analytics}
                      />
                    </Suspense>
                  ) : null}
                  <EmojiGrid
                    emptyMessage={
                      extensionEmoji.length > 0
                        ? ""
                        : emptyMessage(category, tabQuery)
                    }
                    favoriteIds={emojiFavoriteIds}
                    favoritesEnabled={features.favorites}
                    items={emojiItems}
                    label={
                      tabQuery.trim() === ""
                        ? `${category} emoji`
                        : `Emoji search results for ${tabQuery}`
                    }
                    onFavoriteToggle={toggleEmojiFavorite}
                    onSelect={selectEmoji}
                    resetKey={`${category}:${tabQuery}:${skinTone}`}
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
                    setQueries((current) => ({ ...current, emoji: "" }));
                  }}
                  panelId={emojiPanelId}
                />
              </>
            ) : tab === "stickers" && providers?.stickers !== undefined ? (
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
                  collectionItems={tabCollectionItems}
                  collections={savedCollectionViews}
                  collectionView={tabCollection}
                  onCollectionViewChange={changeStickerCollection}
                  provider={providers.stickers}
                  query={tabQuery}
                  analytics={analytics}
                />
              </Suspense>
            ) : tabCollection !== "browse" ? (
              <MediaResultsGrid
                {...sharedGridProps}
                emptyMessage={`No ${tabCollection} ${tab}.`}
                items={tabCollectionItems}
                label={`${tabCollection} ${tab}`}
              />
            ) : tab === "gif" && providers?.gifs !== undefined ? (
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
                  query={tabQuery}
                  analytics={analytics}
                />
              </Suspense>
            ) : tab === "custom" ? (
              <Suspense
                fallback={
                  <div className="mp-provider-state" role="status">
                    Opening custom media…
                  </div>
                }
              >
                <LazyCustomPanel
                  {...sharedGridProps}
                  query={tabQuery}
                  tabs={customTabs}
                  analytics={analytics}
                />
              </Suspense>
            ) : null}
          </div>
        );
      })}
      {resizeControls}
    </section>
  );
}
