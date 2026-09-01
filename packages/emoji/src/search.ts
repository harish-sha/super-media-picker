import { emojiData } from "./data/emoji-data.generated";
import type { EmojiCategory, EmojiRecord } from "./types";

const punctuationPattern = /[^\p{L}\p{N}\s+_-]+/gu;
const whitespacePattern = /[\s_-]+/g;

/** Normalizes user and metadata text without discarding non-Latin letters. */
export function normalizeEmojiSearch(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(punctuationPattern, " ")
    .replace(whitespacePattern, " ")
    .trim();
}

interface EmojiSearchEntry {
  readonly emoji: EmojiRecord;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly category: string;
  readonly searchable: readonly string[];
}

const emojiSearchIndex: readonly EmojiSearchEntry[] = emojiData.map((emoji) => {
  const name = normalizeEmojiSearch(emoji.name);
  const aliases = emoji.aliases.map(normalizeEmojiSearch);
  const category = normalizeEmojiSearch(emoji.category);
  return {
    emoji,
    name,
    aliases,
    category,
    searchable: [name, ...aliases, category],
  };
});

const emojiById = new Map(emojiData.map((emoji) => [emoji.id, emoji]));

function scoreEmoji(
  entry: EmojiSearchEntry,
  query: string,
  terms: readonly string[],
): number {
  const { name, aliases, searchable } = entry;

  if (name === query) return 120;
  if (aliases.includes(query)) return 100;
  if (
    name.startsWith(query) ||
    aliases.some((alias) => alias.startsWith(query))
  )
    return 75;
  if (!terms.every((term) => searchable.some((field) => field.includes(term))))
    return 0;

  return terms.reduce((score, term) => {
    if (name.split(" ").includes(term)) return score + 10;
    if (aliases.some((alias) => alias.split(" ").includes(term)))
      return score + 8;
    return score + 2;
  }, 1);
}

export interface EmojiSearchOptions {
  readonly category?: EmojiCategory;
  readonly limit?: number;
  readonly maxUnicodeVersion?: number;
}

export function supportsUnicodeVersion(
  emoji: EmojiRecord,
  maxUnicodeVersion: number,
): boolean {
  return emoji.version <= maxUnicodeVersion;
}

/** Searches canonical labels, aliases/tags, and category metadata. */
export function searchEmoji(
  query: string,
  options: EmojiSearchOptions = {},
): readonly EmojiRecord[] {
  const normalizedQuery = normalizeEmojiSearch(query);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  const source =
    options.category === undefined
      ? emojiSearchIndex
      : emojiSearchIndex.filter(
          ({ emoji }) => emoji.category === options.category,
        );
  const maxUnicodeVersion = options.maxUnicodeVersion;
  const compatibleSource =
    maxUnicodeVersion === undefined
      ? source
      : source.filter(({ emoji }) =>
          supportsUnicodeVersion(emoji, maxUnicodeVersion),
        );

  const results =
    normalizedQuery === ""
      ? compatibleSource.map(({ emoji }) => emoji)
      : compatibleSource
          .map((entry) => ({
            emoji: entry.emoji,
            score: scoreEmoji(entry, normalizedQuery, terms),
          }))
          .filter(({ score }) => score > 0)
          .sort(
            (left, right) =>
              right.score - left.score ||
              left.emoji.name.localeCompare(right.emoji.name),
          )
          .map(({ emoji }) => emoji);

  return options.limit === undefined
    ? results
    : results.slice(0, Math.max(0, options.limit));
}

export function getEmojiByCategory(
  category: EmojiCategory,
  options: Pick<EmojiSearchOptions, "maxUnicodeVersion"> = {},
): readonly EmojiRecord[] {
  return emojiData.filter(
    (emoji) =>
      emoji.category === category &&
      (options.maxUnicodeVersion === undefined ||
        supportsUnicodeVersion(emoji, options.maxUnicodeVersion)),
  );
}

export function getEmojiById(id: string): EmojiRecord | undefined {
  return emojiById.get(id);
}
