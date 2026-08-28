import type { AnyEmojiMediaItem, MediaItem, StickerMediaItem } from "./media";

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

export interface ProviderAttribution {
  readonly label: string;
  readonly url?: string;
  readonly logoUrl?: string;
}

export interface MediaProvider<T extends MediaItem> {
  readonly id: string;
  readonly attribution?: ProviderAttribution;
  search?(query: string, options?: SearchOptions): Promise<SearchResult<T>>;
  trending?(options?: SearchOptions): Promise<SearchResult<T>>;
}

export interface EmojiPack {
  readonly id: string;
  readonly name: string;
  readonly icon?: string;
  readonly provider?: string;
  readonly items: readonly AnyEmojiMediaItem[];
}

export interface StickerPack {
  readonly id: string;
  readonly name: string;
  readonly icon?: string;
  readonly provider?: string;
  readonly stickers?: readonly StickerMediaItem[];
}

export interface StickerProvider extends MediaProvider<StickerMediaItem> {
  packs(): Promise<readonly StickerPack[]>;
  packItems?(
    packId: string,
    options?: SearchOptions,
  ): Promise<SearchResult<StickerMediaItem>>;
}

export type RequestState =
  "idle" | "loading" | "success" | "empty" | "error" | "loading-more";
