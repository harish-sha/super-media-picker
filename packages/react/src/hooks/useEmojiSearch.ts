import { useMemo, useState } from "react";

import type {
  RequestState,
  SkinTone,
  UnicodeEmojiMediaItem,
} from "@super-media-picker/core";
import {
  getEmojiByCategory,
  searchEmoji,
  toEmojiMediaItem,
  type EmojiPickerCategory,
} from "@super-media-picker/emoji";

export interface UseEmojiSearchOptions {
  readonly initialQuery?: string;
  readonly category?: Exclude<EmojiPickerCategory, "Recent" | "Favorites">;
  readonly skinTone?: SkinTone;
  readonly limit?: number;
}

export interface UseEmojiSearchResult {
  readonly query: string;
  readonly results: readonly UnicodeEmojiMediaItem[];
  readonly state: Extract<RequestState, "success" | "empty">;
  readonly search: (query: string) => void;
}

/** Headless local Unicode search using the same generated data and resolver. */
export function useEmojiSearch({
  initialQuery = "",
  category = "Smileys & Emotion",
  skinTone = "default",
  limit,
}: UseEmojiSearchOptions = {}): UseEmojiSearchResult {
  const [query, setQuery] = useState(initialQuery);
  const results = useMemo(() => {
    const records =
      query.trim() === "" ? getEmojiByCategory(category) : searchEmoji(query);
    const bounded = limit === undefined ? records : records.slice(0, limit);
    return bounded.map((emoji) => toEmojiMediaItem(emoji, skinTone));
  }, [category, limit, query, skinTone]);
  return {
    query,
    results,
    state: results.length === 0 ? "empty" : "success",
    search: setQuery,
  };
}
