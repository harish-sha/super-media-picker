import { useCallback, useState } from "react";

import type {
  GifMediaItem,
  MediaProvider,
  RequestState,
  SearchOptions,
} from "@super-media-picker/core";

import { useProviderSearchState } from "./useProviderSearchState";

export interface UseGifSearchOptions {
  readonly provider?: MediaProvider<GifMediaItem> | undefined;
  readonly initialQuery?: string;
  readonly pageSize?: number;
  readonly debounceMs?: number;
}

export interface UseGifSearchResult {
  readonly query: string;
  readonly results: readonly GifMediaItem[];
  readonly state: RequestState;
  readonly loading: boolean;
  readonly error?: Error;
  readonly hasMore: boolean;
  readonly search: (query: string) => void;
  readonly loadMore: () => void;
  readonly retry: () => void;
}

export function useGifSearch({
  provider,
  initialQuery = "",
  pageSize,
  debounceMs,
}: UseGifSearchOptions): UseGifSearchResult {
  const [query, setQuery] = useState(initialQuery);
  const loadTrending = useCallback(
    (options: SearchOptions) =>
      provider?.trending?.(options) ??
      Promise.resolve({ items: [], hasMore: false }),
    [provider],
  );
  const result = useProviderSearchState({
    provider,
    query,
    loadEmpty: loadTrending,
    ...(pageSize === undefined ? {} : { pageSize }),
    ...(debounceMs === undefined ? {} : { debounceMs }),
  });
  return {
    query,
    ...result,
    loading: result.state === "loading" || result.state === "loading-more",
    search: setQuery,
  };
}
