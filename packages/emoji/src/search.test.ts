import { describe, expect, it } from "vitest";

import {
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
});

describe("normalizeEmojiSearch", () => {
  it("normalizes case, punctuation, separators, and whitespace", () => {
    expect(normalizeEmojiSearch("  Face_With--JOY!!! ")).toBe("face with joy");
  });
});

describe("searchEmoji", () => {
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
});
