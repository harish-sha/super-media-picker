import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AnyEmojiMediaItem,
  type AnimatedMediaConfig,
  type CustomMediaItem,
  type GifMediaItem,
  type MediaItem,
  type MediaProvider,
  type ProviderAttribution,
  type RequestState,
  type SearchResult,
  type StickerPack,
  type StickerProvider,
} from "@super-media-picker/core";

import type { CustomMediaTab, MediaPickerRenderers } from "../types";
import type { AnimationConcurrencyManager } from "./AnimatedMediaRenderer";
import { MediaResultsGrid } from "./MediaResultsGrid";

interface CollectionPanelProps {
  readonly animation: AnimatedMediaConfig;
  readonly animationManager: AnimationConcurrencyManager;
  readonly favoriteIds: ReadonlySet<string>;
  readonly favoritesEnabled: boolean;
  readonly onFavoriteToggle: (item: MediaItem) => void;
  readonly onSelect: (item: MediaItem) => void;
  readonly query: string;
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
  loadEmpty: (options: {
    readonly cursor?: string;
    readonly limit: number;
    readonly signal: AbortSignal;
  }) => Promise<SearchResult<T>>,
): ProviderResult<T> {
  const [items, setItems] = useState<readonly T[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState<Error>();
  const [revision, setRevision] = useState(0);
  const normalized = query.trim();

  const load = useCallback(
    async (
      nextCursor: string | undefined,
      append: boolean,
      signal: AbortSignal,
    ) => {
      setState(append ? "loading-more" : "loading");
      setError(undefined);
      try {
        const options = {
          limit: 18,
          signal,
          ...(nextCursor === undefined ? {} : { cursor: nextCursor }),
        };
        const result =
          normalized === ""
            ? await loadEmpty(options)
            : provider.search === undefined
              ? { items: [] as readonly T[], hasMore: false }
              : await provider.search(normalized, options);
        if (signal.aborted) return;
        setItems((current) =>
          append ? [...current, ...result.items] : result.items,
        );
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setState(result.items.length === 0 && !append ? "empty" : "success");
      } catch (caught) {
        if (signal.aborted) return;
        setError(
          caught instanceof Error
            ? caught
            : new Error("Provider request failed"),
        );
        setState("error");
      }
    },
    [loadEmpty, normalized, provider],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => void load(undefined, false, controller.signal),
      normalized === "" ? 0 : 250,
    );
    return () => {
      clearTimeout(timeout);
      controller.abort(new DOMException("Stale request", "AbortError"));
    };
  }, [load, normalized, revision]);

  return {
    items,
    hasMore,
    state,
    ...(error === undefined ? {} : { error }),
    loadMore: () => {
      if (!hasMore || cursor === undefined || state === "loading-more") return;
      void load(cursor, true, new AbortController().signal);
    },
    retry: () => setRevision((current) => current + 1),
  };
}

function Attribution({ value }: { readonly value?: ProviderAttribution }) {
  if (value === undefined) return null;
  return (
    <div className="mp-attribution">
      {value.logoUrl === undefined ? null : <img alt="" src={value.logoUrl} />}
      {value.url === undefined ? (
        value.label
      ) : (
        <a href={value.url} rel="noreferrer" target="_blank">
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
        emptyMessage={emptyMessage}
        items={result.items}
        label={label}
      />
      <LoadMoreControl result={result} />
      {provider.attribution === undefined ? null : (
        <Attribution value={provider.attribution} />
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
  const result = useProviderResults(provider, props.query, loadTrending);
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
  readonly provider: MediaProvider<AnyEmojiMediaItem>;
}) {
  const loadTrending = useCallback(
    (options: {
      readonly cursor?: string;
      readonly limit: number;
      readonly signal: AbortSignal;
    }) =>
      provider.trending?.(options) ??
      Promise.resolve({ items: [], hasMore: false }),
    [provider],
  );
  const result = useProviderResults(provider, props.query, loadTrending);
  const visibleResult: ProviderResult<AnyEmojiMediaItem> = {
    ...result,
    items: result.items.filter(
      (item) =>
        (item.kind !== "animated" || allowAnimated) &&
        (item.kind !== "custom" || allowCustom),
    ),
  };
  return (
    <ResultState
      {...props}
      emptyMessage={`No emoji available from ${provider.id}.`}
      label={`${provider.id} emoji`}
      provider={provider}
      result={visibleResult}
    />
  );
}

export function EmojiProviderPanels({
  providers,
  ...props
}: CollectionPanelProps & {
  readonly allowAnimated: boolean;
  readonly allowCustom: boolean;
  readonly providers: readonly MediaProvider<AnyEmojiMediaItem>[];
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
  useEffect(() => {
    let active = true;
    void provider
      .packs()
      .then((next) => {
        if (!active) return;
        setPacks(next);
        setPackId((current) => current || next[0]?.id || "");
      })
      .catch(() => {
        if (active) setPacks([]);
      });
    return () => {
      active = false;
    };
  }, [provider]);
  const loadPack = useCallback(
    (options: {
      readonly cursor?: string;
      readonly limit: number;
      readonly signal: AbortSignal;
    }) =>
      provider.packItems?.(packId, options) ??
      provider.trending?.(options) ??
      Promise.resolve({ items: [], hasMore: false }),
    [packId, provider],
  );
  const result = useProviderResults(provider, props.query, loadPack);
  const visibleResult = {
    ...result,
    items: allowAnimated
      ? result.items
      : result.items.filter((item) => !item.animated),
  };
  return (
    <>
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
    (options: {
      readonly cursor?: string;
      readonly limit: number;
      readonly signal: AbortSignal;
    }) =>
      provider.trending?.(options) ??
      Promise.resolve({ items: [], hasMore: false }),
    [provider],
  );
  const result = useProviderResults(provider, props.query, loadTrending);
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
}: Omit<CollectionPanelProps, "query"> & {
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
