import { useCallback, useEffect, useState } from "react";

import type {
  RequestState,
  SearchOptions,
  StickerMediaItem,
  StickerPack,
  StickerProvider,
} from "@super-media-picker/core";

import { useProviderSearchState } from "./useProviderSearchState";

export interface UseStickerSearchOptions {
  readonly provider?: StickerProvider | undefined;
  readonly initialQuery?: string;
  readonly initialPackId?: string;
  readonly pageSize?: number;
  readonly debounceMs?: number;
}

export interface UseStickerSearchResult {
  readonly query: string;
  readonly results: readonly StickerMediaItem[];
  readonly state: RequestState;
  readonly loading: boolean;
  readonly error?: Error;
  readonly hasMore: boolean;
  readonly packs: readonly StickerPack[];
  readonly activePackId: string;
  readonly search: (query: string) => void;
  readonly setActivePackId: (packId: string) => void;
  readonly loadMore: () => void;
  readonly retry: () => void;
}

export function useStickerSearch({
  provider,
  initialQuery = "",
  initialPackId = "",
  pageSize,
  debounceMs,
}: UseStickerSearchOptions): UseStickerSearchResult {
  const [query, setQuery] = useState(initialQuery);
  const [packs, setPacks] = useState<readonly StickerPack[]>([]);
  const [activePackId, setActivePackId] = useState(initialPackId);
  const [packState, setPackState] = useState<RequestState>("idle");
  const [packError, setPackError] = useState<Error>();
  const [packRevision, setPackRevision] = useState(0);

  useEffect(() => {
    if (provider === undefined) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setPackState("loading");
      setPackError(undefined);
      void provider
        .packs({ signal: controller.signal })
        .then((next) => {
          if (controller.signal.aborted) return;
          setPacks(next);
          setActivePackId((current) =>
            next.some(({ id }) => id === current)
              ? current
              : (next[0]?.id ?? ""),
          );
          setPackState(next.length === 0 ? "empty" : "success");
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return;
          setPacks([]);
          setPackState("error");
          setPackError(
            caught instanceof Error
              ? caught
              : new Error("Sticker packs could not be loaded"),
          );
        });
    }, 0);
    return () => {
      clearTimeout(timeout);
      controller.abort(new DOMException("Stale packs", "AbortError"));
    };
  }, [packRevision, provider]);

  const loadPack = useCallback(
    (options: SearchOptions) =>
      provider === undefined || activePackId === ""
        ? Promise.resolve({ items: [], hasMore: false })
        : provider.packItems(activePackId, options),
    [activePackId, provider],
  );
  const result = useProviderSearchState({
    provider,
    query,
    loadEmpty: loadPack,
    ...(pageSize === undefined ? {} : { pageSize }),
    ...(debounceMs === undefined ? {} : { debounceMs }),
  });
  const error =
    provider === undefined ? undefined : (packError ?? result.error);
  const state =
    provider === undefined
      ? "idle"
      : packState === "error"
        ? "error"
        : query.trim() === "" && packState === "loading"
          ? "loading"
          : result.state;

  return {
    query,
    ...result,
    state,
    ...(error === undefined ? {} : { error }),
    loading: state === "loading" || state === "loading-more",
    packs: provider === undefined ? [] : packs,
    activePackId: provider === undefined ? "" : activePackId,
    search: setQuery,
    setActivePackId,
    retry: () => {
      if (packState === "error") setPackRevision((current) => current + 1);
      else result.retry();
    },
  };
}
