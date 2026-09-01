import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAX_UNICODE_VERSION,
  emojiCategories,
  emojiData,
  getEmojiByCategory,
  getEmojiById,
  normalizeEmojiSearch,
  searchEmoji,
  resolveEmojiVariant,
  supportsSkinTone,
  toEmojiMediaItem,
} from "./index";

describe("emoji dataset", () => {
  it("contains broad CLDR-derived coverage", () => {
    expect(emojiData.length).toBeGreaterThan(1_000);
    expect(new Set(emojiData.map(({ category }) => category))).toEqual(
      new Set(emojiCategories),
    );
  });

  it.each([
    ["grinning face", "😀"],
    ["red heart", "❤️"],
    ["thumbs up", "👍️"],
    ["family: man, woman, girl", "👨‍👩‍👧"],
    ["woman health worker", "👩‍⚕️"],
    ["flag: United States", "🇺🇸"],
    ["keycap: #", "#️⃣"],
    ["face with bags under eyes", "🫩"],
  ])("stores %s as one valid grapheme", (name, value) => {
    const emoji = emojiData.find((candidate) => candidate.name === name);
    expect(emoji?.value).toBe(value);
    expect([
      ...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(
        emoji?.value ?? "",
      ),
    ]).toHaveLength(1);
  });
});

describe("normalizeEmojiSearch", () => {
  it("normalizes case, punctuation, separators, and whitespace", () => {
    expect(normalizeEmojiSearch("  Face_With--JOY!!! ")).toBe("face with joy");
  });
});

describe("searchEmoji", () => {
  it("supports an explicit native Unicode compatibility boundary", () => {
    expect(DEFAULT_MAX_UNICODE_VERSION).toBe(15);
    expect(
      searchEmoji("face with bags under eyes", { maxUnicodeVersion: 15 }),
    ).toHaveLength(0);
    expect(
      searchEmoji("face with bags under eyes", { maxUnicodeVersion: 16 })[0]
        ?.version,
    ).toBe(16);
  });

  it.each([
    "joy",
    "laugh",
    "happy",
    "love",
    "heart",
    "thumb",
    "fire",
    "party",
    "rocket",
    "sad",
    "cry",
    "food",
    "dog",
    "cat",
    "flag",
  ])("finds expected results for %s", (query) => {
    expect(searchEmoji(query).length).toBeGreaterThan(0);
  });

  it("ranks exact canonical names first", () => {
    expect(searchEmoji("rocket")[0]?.name).toBe("rocket");
  });

  it("filters by category and respects limits", () => {
    const result = searchEmoji("", { category: "Animals & Nature", limit: 3 });
    expect(result).toHaveLength(3);
    expect(
      result.every(({ category }) => category === "Animals & Nature"),
    ).toBe(true);
    expect(
      getEmojiByCategory("Flags").every(({ category }) => category === "Flags"),
    ).toBe(true);
  });

  it("uses the precomputed ID index", () => {
    const rocket = searchEmoji("rocket")[0];
    expect(rocket).toBeDefined();
    expect(getEmojiById(rocket!.id)).toBe(rocket);
  });
});

describe("toEmojiMediaItem", () => {
  it("returns a normalized discriminated item", () => {
    const emoji = searchEmoji("rocket")[0];
    expect(emoji).toBeDefined();
    expect(toEmojiMediaItem(emoji!)).toEqual({
      type: "emoji",
      kind: "unicode",
      id: emoji!.id,
      value: "🚀",
      name: "rocket",
      category: "Travel & Places",
    });
  });
});

describe("emoji variants", () => {
  it("resolves a supported skin tone and normalized output", () => {
    const thumbsUp = searchEmoji("thumbs up")[0];
    expect(thumbsUp).toBeDefined();
    expect(supportsSkinTone(thumbsUp!)).toBe(true);
    expect(resolveEmojiVariant(thumbsUp!, "medium")).toMatchObject({
      value: "👍🏽",
      skinTone: "medium",
    });
    expect(toEmojiMediaItem(thumbsUp!, "medium")).toMatchObject({
      type: "emoji",
      value: "👍🏽",
      skinTone: "medium",
    });
  });

  it("leaves non-tone emoji intact", () => {
    const rocket = searchEmoji("rocket")[0];
    expect(rocket).toBeDefined();
    expect(supportsSkinTone(rocket!)).toBe(false);
    expect(resolveEmojiVariant(rocket!, "dark")).toEqual({
      id: rocket!.id,
      value: "🚀",
      name: "rocket",
    });
    expect(toEmojiMediaItem(rocket!, "dark")).not.toHaveProperty("skinTone");
  });

  it.each([
    ["medium", "👍🏽", "1f44d-1f3fd"],
    ["dark", "👍🏿", "1f44d-1f3ff"],
  ] as const)("resolves thumbs up with %s tone", (tone, value, id) => {
    const thumbsUp = searchEmoji("thumbs up")[0]!;
    expect(resolveEmojiVariant(thumbsUp, tone)).toEqual({
      id,
      value,
      name: `thumbs up: ${tone} skin tone`,
      skinTone: tone,
    });
  });

  it.each([
    ["red heart", "medium", "❤️"],
    ["face with tears of joy", "dark", "😂"],
    ["rocket", "medium", "🚀"],
  ] as const)("does not modify unsupported %s", (query, tone, value) => {
    const emoji = searchEmoji(query)[0]!;
    expect(resolveEmojiVariant(emoji, tone)).toEqual({
      id: emoji.id,
      value,
      name: emoji.name,
    });
  });

  it("uses exact dataset sequences for hands and ZWJ person emoji", () => {
    const hand = searchEmoji("waving hand")[0]!;
    const technologist = searchEmoji("woman technologist")[0]!;
    expect(resolveEmojiVariant(hand, "medium").value).toBe("👋🏽");
    expect(resolveEmojiVariant(technologist, "dark")).toMatchObject({
      id: "1f469-1f3ff-200d-1f4bb",
      value: "👩🏿‍💻",
      skinTone: "dark",
    });
  });
});
