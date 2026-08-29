import { useState } from "react";

import {
  isAnimatedMedia,
  isSafeMediaUrl,
  isUnicodeEmoji,
  type AnimatedMediaConfig,
  type MediaItem,
  type MediaUrlPolicy,
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
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly renderers?: MediaPickerRenderers;
}

export function MediaItemVisual({
  item,
  animation,
  manager,
  mediaSecurity,
  renderers,
}: MediaItemVisualProps) {
  if (isUnicodeEmoji(item)) return <span aria-hidden="true">{item.value}</span>;
  if (isAnimatedMedia(item)) {
    return (
      <AnimatedMediaRenderer
        config={animation}
        item={item}
        manager={manager}
        {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
        {...(renderers === undefined ? {} : { renderers })}
      />
    );
  }
  if (item.type === "custom" && renderers?.custom !== undefined)
    return renderers.custom(item);
  const url = item.previewUrl ?? item.url;
  return (
    <StaticMediaVisual
      url={url}
      {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
    />
  );
}

function StaticMediaVisual({
  url,
  mediaSecurity,
}: {
  readonly url: string;
  readonly mediaSecurity?: MediaUrlPolicy;
}) {
  const [failed, setFailed] = useState(false);
  return !failed && isSafeMediaUrl(url, mediaSecurity) ? (
    <img
      alt=""
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
      src={url}
    />
  ) : (
    <span aria-hidden="true" data-media-fallback="">
      ◌
    </span>
  );
}
