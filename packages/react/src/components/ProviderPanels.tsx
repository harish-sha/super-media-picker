import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AnyEmojiMediaItem,
  type AnimatedMediaConfig,
  type CustomMediaItem,
  type EmojiPack,
  type EmojiProvider,
  type GifMediaItem,
  type MediaItem,
  type MediaPickerAnalytics,
  type MediaUrlPolicy,
  type MediaProvider,
  type ProviderAttribution,
  type RequestState,
  type SearchOptions,
  type SearchResult,
  type StickerPack,
  type StickerProvider,
  isSafeMediaUrl,
} from "@super-media-picker/core";

import type { CustomMediaTab, MediaPickerRenderers } from "../types";
import { useProviderSearchState } from "../hooks/useProviderSearchState";
import type { AnimationConcurrencyManager } from "./AnimatedMediaRenderer";
import { MediaResultsGrid } from "./MediaResultsGrid";

interface CollectionPanelProps {
  readonly analytics: MediaPickerAnalytics;
  readonly animation: AnimatedMediaConfig;
  readonly animationManager: AnimationConcurrencyManager;
  readonly favoriteIds: ReadonlySet<string>;
  readonly favoritesEnabled: boolean;
  readonly onFavoriteToggle: (item: MediaItem) => void;
  readonly onSelect: (item: MediaItem) => void;
  readonly query: string;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly renderers?: MediaPickerRenderers;
}

interface ProviderResult<T extends MediaItem> {
  readonly error?: Error;
  readonly hasMore: boolean;
  readonly items: readonly T[];
  readonly loadMore: () => void;
  readonly retry: () => void;
  readonly state: RequestState;
}

function useProviderResults<T extends MediaItem>(
  provider: MediaProvider<T>,
  query: string,
  mediaType: MediaItem["type"],
  analytics: MediaPickerAnalytics,
  loadEmpty: (options: SearchOptions) => Promise<SearchResult<T>>,
): ProviderResult<T> {
  const onCompleted = useCallback(
    (resultCount: number) =>
      analytics.track("search_completed", {
        mediaType,
        provider: provider.id,
        resultCount,
      }),
    [analytics, mediaType, provider.id],
  );
  const onError = useCallback(
    () =>
      analytics.track("provider_error", {
        mediaType,
        provider: provider.id,
      }),
    [analytics, mediaType, provider.id],
  );
  const onLoadMore = useCallback(
    () => analytics.track("load_more", { mediaType, provider: provider.id }),
    [analytics, mediaType, provider.id],
  );
  const result = useProviderSearchState({
    provider,
    query,
    loadEmpty,
    onCompleted,
    onError,
    onLoadMore,
  });
  return {
    ...result,
    items: result.results,
  };
}

function Attribution({
  value,
  mediaSecurity,
}: {
  readonly value?: ProviderAttribution;
  readonly mediaSecurity?: MediaUrlPolicy;
}) {
  if (value === undefined) return null;
  const logoUrl =
    value.logoUrl !== undefined && isSafeMediaUrl(value.logoUrl, mediaSecurity)
      ? value.logoUrl
      : undefined;
  const attributionUrl =
    value.url !== undefined && isSafeMediaUrl(value.url, mediaSecurity)
      ? value.url
      : undefined;
  return (
    <div className="mp-attribution">
      {logoUrl === undefined ? null : <img alt="" src={logoUrl} />}
      {attributionUrl === undefined ? (
        value.label
      ) : (
        <a href={attributionUrl} rel="noreferrer" target="_blank">
          {value.label}
        </a>
      )}
    </div>
  );
}

function LoadMoreControl<T extends MediaItem>({
  result,
}: {
  readonly result: ProviderResult<T>;
}) {
  const controlRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const control = controlRef.current;
    if (
      control === null ||
      !result.hasMore ||
      result.state === "loading-more" ||
      globalThis.IntersectionObserver === undefined
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) result.loadMore();
      },
      { rootMargin: "160px" },
    );
    observer.observe(control);
    return () => observer.disconnect();
  }, [result]);

  if (!result.hasMore) return null;
  return (
    <button
      className="mp-load-more"
      disabled={result.state === "loading-more"}
      onClick={result.loadMore}
      ref={controlRef}
      type="button"
    >
      {result.state === "loading-more" ? "Loading…" : "Load more"}
    </button>
  );
}

function ResultState<T extends MediaItem>({
  result,
  label,
  emptyMessage,
  provider,
  mediaSecurity,
  ...gridProps
}: CollectionPanelProps & {
  readonly emptyMessage: string;
  readonly label: string;
  readonly provider: MediaProvider<T>;
  readonly result: ProviderResult<T>;
}) {
  if (result.state === "loading")
    return (
      <div className="mp-provider-state" role="status">
        Loading {label.toLocaleLowerCase()}…
      </div>
    );
  if (result.state === "error")
    return (
      <div className="mp-provider-state" role="alert">
        <p>{result.error?.message ?? `${label} could not be loaded.`}</p>
        <button onClick={result.retry} type="button">
          Retry
        </button>
      </div>
    );
  return (
    <>
      <MediaResultsGrid
        {...gridProps}
        {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
        emptyMessage={emptyMessage}
        items={result.items}
        label={label}
      />
      <LoadMoreControl result={result} />
      {provider.attribution === undefined ? null : (
        <Attribution
          value={provider.attribution}
          {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
        />
      )}
    </>
  );
}

export function GifPanel({
  provider,
  ...props
}: CollectionPanelProps & { readonly provider: MediaProvider<GifMediaItem> }) {
  const loadTrending = useCallback(
    (options: Parameters<NonNullable<typeof provider.trending>>[0]) =>
      provider.trending?.(options) ??
      Promise.resolve({ items: [], hasMore: false }),
    [provider],
  );
  const result = useProviderResults(
    provider,
    props.query,
    "gif",
    props.analytics,
    loadTrending,
  );
  return (
    <ResultState
      {...props}
      emptyMessage={
        props.query.trim() === ""
          ? "No trending GIFs."
          : `No GIFs found for “${props.query}”.`
      }
      label={props.query.trim() === "" ? "Trending GIFs" : "GIF search results"}
      provider={provider}
      result={result}
    />
  );
}

function EmojiProviderPanel({
  provider,
  allowAnimated,
  allowCustom,
  ...props
}: CollectionPanelProps & {
  readonly allowAnimated: boolean;
  readonly allowCustom: boolean;
  readonly provider: EmojiProvider;
}) {
  const [packs, setPacks] = useState<readonly EmojiPack[]>([]);
  const [packId, setPackId] = useState("");
  useEffect(() => {
    if (provider.packs === undefined) return;
    const controller = new AbortController();
    void provider
      .packs({ signal: controller.signal })
      .then((next) => {
        if (controller.signal.aborted) return;
        setPacks(next);
        setPackId((current) => current || next[0]?.id || "");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPacks([]);
        props.analytics.track("provider_error", {
          mediaType: "emoji",
          provider: provider.id,
        });
      });
    return () =>
      controller.abort(new DOMException("Stale request", "AbortError"));
  }, [props.analytics, provider]);
  const loadTrending = useCallback(
    (options: SearchOptions) =>
      (packId !== "" && provider.packItems !== undefined
        ? provider.packItems(packId, options)
        : provider.trending?.(options)) ??
      Promise.resolve({ items: [], hasMore: false }),
    [packId, provider],
  );
  const result = useProviderResults(
    provider,
    props.query,
    "emoji",
    props.analytics,
    loadTrending,
  );
  const visibleResult: ProviderResult<AnyEmojiMediaItem> = {
    ...result,
    items: result.items.filter(
      (item) =>
        (item.kind !== "animated" || allowAnimated) &&
        (item.kind !== "custom" || allowCustom),
    ),
  };
  return (
    <>
      {props.query.trim() === "" && packs.length > 0 ? (
        <nav aria-label={`${provider.id} emoji packs`} className="mp-pack-nav">
          {packs.map((pack) => (
            <button
              aria-pressed={pack.id === packId}
              key={pack.id}
              onClick={() => setPackId(pack.id)}
              title={pack.name}
              type="button"
            >
              <span aria-hidden="true">{pack.icon ?? "✨"}</span>
              <span>{pack.name}</span>
            </button>
          ))}
        </nav>
      ) : null}
      <ResultState
        {...props}
        emptyMessage={`No emoji available from ${provider.id}.`}
        label={`${provider.id} emoji`}
        provider={provider}
        result={visibleResult}
      />
    </>
  );
}

export function EmojiProviderPanels({
  providers,
  ...props
}: CollectionPanelProps & {
  readonly allowAnimated: boolean;
  readonly allowCustom: boolean;
  readonly providers: readonly EmojiProvider[];
}) {
  return providers.map((provider) => (
    <EmojiProviderPanel key={provider.id} provider={provider} {...props} />
  ));
}

export function StickerPanel({
  provider,
  allowAnimated,
  ...props
}: CollectionPanelProps & {
  readonly allowAnimated: boolean;
  readonly provider: StickerProvider;
}) {
  const [packs, setPacks] = useState<readonly StickerPack[]>([]);
  const [packId, setPackId] = useState("");
  const [packError, setPackError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void provider
      .packs({ signal: controller.signal })
      .then((next) => {
        if (controller.signal.aborted) return;
        setPackError(false);
        setPacks(next);
        setPackId((current) => current || next[0]?.id || "");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPacks([]);
        setPackError(true);
        props.analytics.track("provider_error", {
          mediaType: "sticker",
          provider: provider.id,
        });
      });
    return () =>
      controller.abort(new DOMException("Stale request", "AbortError"));
  }, [props.analytics, provider]);
  const loadPack = useCallback(
    (options: SearchOptions) =>
      packId === ""
        ? Promise.resolve({ items: [], hasMore: false })
        : provider.packItems(packId, options),
    [packId, provider],
  );
  const result = useProviderResults(
    provider,
    props.query,
    "sticker",
    props.analytics,
    loadPack,
  );
  const visibleResult = {
    ...result,
    items: allowAnimated
      ? result.items
      : result.items.filter((item) => !item.animated),
  };
  return (
    <>
      {packError ? (
        <div className="mp-provider-state" role="alert">
          Sticker packs could not be loaded.
        </div>
      ) : null}
      {props.query.trim() === "" && packs.length > 0 ? (
        <nav aria-label="Sticker packs" className="mp-pack-nav">
          {packs.map((pack) => (
            <button
              aria-pressed={pack.id === packId}
              key={pack.id}
              onClick={() => setPackId(pack.id)}
              title={pack.name}
              type="button"
            >
              <span aria-hidden="true">{pack.icon ?? "▣"}</span>
              <span className="mp-visually-hidden">{pack.name}</span>
            </button>
          ))}
        </nav>
      ) : null}
      <ResultState
        {...props}
        emptyMessage={
          props.query.trim() === ""
            ? "This sticker pack is empty."
            : `No stickers found for “${props.query}”.`
        }
        label={
          props.query.trim() === ""
            ? `${packs.find(({ id }) => id === packId)?.name ?? "Sticker"} pack`
            : "Sticker search results"
        }
        provider={provider}
        result={visibleResult}
      />
    </>
  );
}

export function CustomPanel({
  tabs,
  ...props
}: CollectionPanelProps & { readonly tabs: readonly CustomMediaTab[] }) {
  const [tabId, setTabId] = useState(tabs[0]?.id ?? "");
  const selected = tabs.find(({ id }) => id === tabId) ?? tabs[0];
  if (selected === undefined)
    return (
      <div className="mp-empty" role="status">
        No custom providers configured.
      </div>
    );
  return (
    <CustomProviderPanel
      {...props}
      provider={selected.provider}
      selectedId={selected.id}
      tabs={tabs}
      onTabChange={setTabId}
    />
  );
}

function CustomProviderPanel({
  provider,
  tabs,
  selectedId,
  onTabChange,
  ...props
}: CollectionPanelProps & {
  readonly provider: MediaProvider<CustomMediaItem>;
  readonly tabs: readonly CustomMediaTab[];
  readonly selectedId: string;
  readonly onTabChange: (id: string) => void;
}) {
  const loadTrending = useCallback(
    (options: SearchOptions) =>
      provider.trending?.(options) ??
      Promise.resolve({ items: [], hasMore: false }),
    [provider],
  );
  const result = useProviderResults(
    provider,
    props.query,
    "custom",
    props.analytics,
    loadTrending,
  );
  return (
    <>
      {tabs.length > 1 ? (
        <nav aria-label="Custom media providers" className="mp-pack-nav">
          {tabs.map((tab) => (
            <button
              aria-pressed={tab.id === selectedId}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      ) : null}
      <ResultState
        {...props}
        emptyMessage="No custom media found."
        label={`${tabs.find(({ id }) => id === selectedId)?.label ?? "Custom"} media`}
        provider={provider}
        result={result}
      />
    </>
  );
}

export function StaticMediaPanel({
  items,
  label,
  ...props
}: Omit<CollectionPanelProps, "analytics" | "query"> & {
  readonly items: readonly MediaItem[];
  readonly label: string;
}) {
  const favoriteIds = useMemo(() => props.favoriteIds, [props.favoriteIds]);
  return (
    <MediaResultsGrid
      {...props}
      emptyMessage={`No ${label.toLocaleLowerCase()} configured.`}
      favoriteIds={favoriteIds}
      items={items}
      label={label}
    />
  );
}
