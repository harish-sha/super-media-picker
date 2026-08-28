import type { SkinTone } from "@super-media-picker/core";

import type { EmojiRecord, ResolvedEmojiVariant } from "./types";

const skinToneLabels: Readonly<Record<Exclude<SkinTone, "default">, string>> = {
  light: "light",
  "medium-light": "medium-light",
  medium: "medium",
  "medium-dark": "medium-dark",
  dark: "dark",
};

/** Resolves a requested variant without modifying emoji that do not support it. */
export function resolveEmojiVariant(
  emoji: EmojiRecord,
  skinTone: SkinTone = "default",
): ResolvedEmojiVariant {
  if (skinTone !== "default") {
    const variant = emoji.variants.find(
      (candidate) => candidate.skinTone === skinTone,
    );
    if (variant !== undefined) {
      return {
        id: variant.id,
        value: variant.value,
        name:
          variant.name ??
          `${emoji.name}: ${skinToneLabels[skinTone]} skin tone`,
        skinTone,
      };
    }
  }
  return { id: emoji.id, value: emoji.value, name: emoji.name };
}

export function supportsSkinTone(emoji: EmojiRecord): boolean {
  return emoji.variants.some(({ kind }) => kind === "skin-tone");
}
