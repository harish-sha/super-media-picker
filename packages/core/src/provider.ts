import type {
  AnyEmojiMediaItem,
  CustomMediaItem,
  MediaItemAttribution,
  MediaItem,
  StickerMediaItem,
} from "./media";

export interface SearchOptions {
  readonly cursor?: string;
  readonly limit?: number;
  /** Optional provider-neutral pack filter. */
  readonly packId?: string;
  readonly locale?: string;
  readonly signal?: AbortSignal;
}

export interface ProviderOptions {
  readonly locale?: string;
  readonly signal?: AbortSignal;
}

export interface SearchResult<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

export interface ProviderAttribution extends MediaItemAttribution {
  /** Whether the integration contract requires attribution to be displayed. */
  readonly required?: boolean;
}

export interface EmojiPackCapabilities {
  readonly animated?: boolean;
  readonly custom?: boolean;
  readonly pagination?: boolean;
  readonly search?: boolean;
  readonly variants?: boolean;
}

export type ProviderMediaType = "emoji" | "gif" | "sticker" | "custom";

/** Declarative discovery metadata; methods remain the executable contract. */
export interface MediaProviderCapabilities {
  readonly mediaType?: ProviderMediaType;
  readonly search?: boolean;
  readonly trending?: boolean;
  readonly packs?: boolean;
  readonly pagination?: boolean;
  readonly animatedMedia?: boolean;
}

export type MediaProviderOperation = "search" | "trending" | "packs";

export interface MediaProvider<T extends MediaItem> {
  readonly id: string;
  readonly displayName?: string;
  readonly attribution?: ProviderAttribution;
  readonly capabilities?: MediaProviderCapabilities;
  search?(query: string, options?: SearchOptions): Promise<SearchResult<T>>;
  trending?(options?: SearchOptions): Promise<SearchResult<T>>;
}

export type ProviderRegistration<T> = T | readonly T[];

/** Resolves explicit capability metadata while still requiring an implemented method. */
export function supportsProviderOperation(
  provider: MediaProvider<MediaItem>,
  operation: MediaProviderOperation,
): boolean {
  if (provider.capabilities?.[operation] === false) return false;
  const candidate = provider as unknown as Readonly<Record<string, unknown>>;
  return typeof candidate[operation] === "function";
}

/** A host/tenant media source registered directly through `providers.custom`. */
export type CustomMediaProvider = MediaProvider<CustomMediaItem>;

export interface EmojiPack {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly posterUrl?: string;
  readonly icon?: string;
  readonly version?: string;
  readonly revision?: string;
  readonly provider?: string;
  readonly attribution?: ProviderAttribution;
  readonly capabilities?: EmojiPackCapabilities;
  readonly itemCount?: number;
  readonly animated?: boolean;
  readonly searchable?: boolean;
  readonly paginated?: boolean;
  readonly locales?: readonly string[];
  /** Inline items are optional so remote providers can return metadata only. */
  readonly items?: readonly AnyEmojiMediaItem[];
}

/** Optional pack-aware extension for large animated/custom emoji catalogs. */
export interface EmojiProvider extends MediaProvider<AnyEmojiMediaItem> {
  packs?(options?: ProviderOptions): Promise<readonly EmojiPack[]>;
  packItems?(
    packId: string,
    options?: SearchOptions,
  ): Promise<SearchResult<AnyEmojiMediaItem>>;
}

/** Explicit name for provider registrations dedicated to animated emoji. */
export type AnimatedEmojiProvider = EmojiProvider;

export interface StickerPack {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Preferred image URL for pack navigation; subject to MediaUrlPolicy. */
  readonly iconUrl?: string;
  /** Legacy text icon or URL. Non-URL values may use the built-in fallback. */
  readonly icon?: string;
  readonly provider?: string;
  readonly itemCount?: number;
  readonly animated?: boolean;
  readonly stickers?: readonly StickerMediaItem[];
}

export interface StickerProvider extends MediaProvider<StickerMediaItem> {
  packs(options?: ProviderOptions): Promise<readonly StickerPack[]>;
  packItems(
    packId: string,
    options?: SearchOptions,
  ): Promise<SearchResult<StickerMediaItem>>;
}

export type RequestState =
  "idle" | "loading" | "success" | "empty" | "error" | "loading-more";
