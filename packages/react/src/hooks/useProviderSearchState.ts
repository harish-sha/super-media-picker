import { useCallback, useEffect, useRef, useState } from "react";

import type {
  MediaItem,
  MediaProvider,
  RequestState,
  SearchOptions,
  SearchResult,
} from "@super-media-picker/core";

export interface ProviderSearchState<T extends MediaItem> {
  readonly results: readonly T[];
  readonly state: RequestState;
  readonly error?: Error;
  readonly hasMore: boolean;
  readonly loadMore: () => void;
  readonly retry: () => void;
}

interface ProviderSearchStateOptions<T extends MediaItem> {
  readonly provider: MediaProvider<T> | undefined;
  readonly query: string;
  readonly pageSize?: number;
  readonly debounceMs?: number;
  readonly loadEmpty: (options: SearchOptions) => Promise<SearchResult<T>>;
  readonly onCompleted?: (count: number) => void;
  readonly onError?: (error: Error) => void;
  readonly onLoadMore?: () => void;
}

/** Shared abortable provider state used by visual panels and public hooks. */
export function useProviderSearchState<T extends MediaItem>({
  provider,
  query,
  pageSize = 18,
  debounceMs = 250,
  loadEmpty,
  onCompleted,
  onError,
  onLoadMore,
}: ProviderSearchStateOptions<T>): ProviderSearchState<T> {
  const [results, setResults] = useState<readonly T[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState<Error>();
  const [revision, setRevision] = useState(0);
  const loadMoreController = useRef<AbortController | undefined>(undefined);
  const normalized = query.trim();

  const load = useCallback(
    async (
      nextCursor: string | undefined,
      append: boolean,
      signal: AbortSignal,
    ) => {
      if (provider === undefined) {
        setResults([]);
        setHasMore(false);
        setCursor(undefined);
        setState("idle");
        return;
      }
      setState(append ? "loading-more" : "loading");
      setError(undefined);
      try {
        const options: SearchOptions = {
          limit: Math.max(1, pageSize),
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
        setResults((current) =>
          append ? [...current, ...result.items] : result.items,
        );
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setState(result.items.length === 0 && !append ? "empty" : "success");
        onCompleted?.(result.items.length);
      } catch (caught) {
        if (signal.aborted) return;
        const nextError =
          caught instanceof Error
            ? caught
            : new Error("Provider request failed");
        setError(nextError);
        setState("error");
        onError?.(nextError);
      }
    },
    [loadEmpty, normalized, onCompleted, onError, pageSize, provider],
  );

  useEffect(() => {
    loadMoreController.current?.abort(
      new DOMException("New provider request", "AbortError"),
    );
    loadMoreController.current = undefined;
    if (provider === undefined) return;
    const controller = new AbortController();
    const resetTimeout = setTimeout(() => {
      setResults([]);
      setHasMore(false);
      setCursor(undefined);
      setError(undefined);
      setState("loading");
    }, 0);
    const requestTimeout = setTimeout(
      () => void load(undefined, false, controller.signal),
      normalized === "" ? 0 : Math.max(0, debounceMs),
    );
    return () => {
      clearTimeout(resetTimeout);
      clearTimeout(requestTimeout);
      controller.abort(new DOMException("Stale request", "AbortError"));
    };
  }, [debounceMs, load, normalized, provider, revision]);

  useEffect(
    () => () =>
      loadMoreController.current?.abort(
        new DOMException("Search unmounted", "AbortError"),
      ),
    [],
  );

  return {
    results: provider === undefined ? [] : results,
    state: provider === undefined ? "idle" : state,
    ...(provider === undefined || error === undefined ? {} : { error }),
    hasMore: provider === undefined ? false : hasMore,
    loadMore: () => {
      if (!hasMore || cursor === undefined || state === "loading-more") return;
      onLoadMore?.();
      loadMoreController.current?.abort(
        new DOMException("Superseded page", "AbortError"),
      );
      const controller = new AbortController();
      loadMoreController.current = controller;
      void load(cursor, true, controller.signal);
    },
    retry: () => setRevision((current) => current + 1),
  };
}
