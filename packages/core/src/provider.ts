export interface SearchOptions {
  readonly cursor?: string;
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

export interface SearchResult<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

export interface MediaProvider<T> {
  readonly id: string;
  search?(query: string, options?: SearchOptions): Promise<SearchResult<T>>;
  trending?(options?: SearchOptions): Promise<SearchResult<T>>;
}

export type RequestState =
  "idle" | "loading" | "success" | "empty" | "error" | "loading-more";
