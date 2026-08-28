import type { SkinTone } from "@super-media-picker/core";
import {
  resolveEmojiVariant,
  type EmojiRecord,
} from "@super-media-picker/emoji";

export interface EmojiPreviewProps {
  readonly emoji: EmojiRecord | undefined;
  readonly skinTone: SkinTone;
}

export function EmojiPreview({ emoji, skinTone }: EmojiPreviewProps) {
  if (emoji === undefined) return null;
  const resolved = resolveEmojiVariant(emoji, skinTone);
  return (
    <div aria-live="polite" className="mp-preview">
      <span aria-hidden="true" className="mp-preview__glyph">
        {resolved.value}
      </span>
      <span className="mp-preview__name">{resolved.name}</span>
    </div>
  );
}
