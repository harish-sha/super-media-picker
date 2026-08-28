import {
  isAnimatedMedia,
  isSafeMediaUrl,
  isUnicodeEmoji,
  type AnimatedMediaConfig,
  type MediaItem,
} from "@super-media-picker/core";

import type { MediaPickerRenderers } from "../types";
import {
  AnimatedMediaRenderer,
  type AnimationConcurrencyManager,
} from "./AnimatedMediaRenderer";

export function mediaItemLabel(item: MediaItem): string {
  if (isUnicodeEmoji(item)) return item.name;
  if (item.type === "emoji") return item.name;
  if (item.type === "gif") return item.alt ?? item.name ?? "GIF";
  if (item.type === "sticker") return item.alt ?? item.name ?? "Sticker";
  return item.alt ?? item.name;
}

export interface MediaItemVisualProps {
  readonly item: MediaItem;
  readonly animation: AnimatedMediaConfig;
  readonly manager: AnimationConcurrencyManager;
  readonly renderers?: MediaPickerRenderers;
}

export function MediaItemVisual({
  item,
  animation,
  manager,
  renderers,
}: MediaItemVisualProps) {
  if (isUnicodeEmoji(item)) return <span aria-hidden="true">{item.value}</span>;
  if (isAnimatedMedia(item)) {
    return (
      <AnimatedMediaRenderer
        config={animation}
        item={item}
        manager={manager}
        {...(renderers === undefined ? {} : { renderers })}
      />
    );
  }
  if (item.type === "custom" && renderers?.custom !== undefined)
    return renderers.custom(item);
  const url =
    item.type === "emoji"
      ? (item.previewUrl ?? item.url)
      : item.type === "gif"
        ? item.previewUrl
        : (item.previewUrl ?? item.url);
  return isSafeMediaUrl(url) ? (
    <img alt="" draggable={false} loading="lazy" src={url} />
  ) : (
    <span aria-hidden="true">◌</span>
  );
}
