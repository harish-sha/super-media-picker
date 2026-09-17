import { useMemo, useState } from "react";

import {
  isAnimatedMedia,
  isSafeMediaAsset,
  isUnicodeEmoji,
  resolveMediaItemAssets,
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
  readonly activationToken?: number;
  readonly manager: AnimationConcurrencyManager;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly renderers?: MediaPickerRenderers;
}

export function MediaItemVisual({
  item,
  animation,
  activationToken,
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
        {...(activationToken === undefined ? {} : { activationToken })}
        {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
        {...(renderers === undefined ? {} : { renderers })}
      />
    );
  }
  if (item.type === "custom" && renderers?.custom !== undefined)
    return renderers.custom(item);
  return (
    <StaticMediaVisual
      item={item}
      {...(mediaSecurity === undefined ? {} : { mediaSecurity })}
    />
  );
}

function StaticMediaVisual({
  item,
  mediaSecurity,
}: {
  readonly item: MediaItem;
  readonly mediaSecurity?: MediaUrlPolicy;
}) {
  const assets = useMemo(() => resolveMediaItemAssets(item), [item]);
  const urls = useMemo(
    () =>
      [...assets.posterUrls, assets.originalUrl].filter(
        (url): url is string =>
          url !== undefined && isSafeMediaAsset(url, undefined, mediaSecurity),
      ),
    [assets.originalUrl, assets.posterUrls, mediaSecurity],
  );
  const [index, setIndex] = useState(0);
  const url = urls[index];
  const dimensions = "width" in item ? item : undefined;
  return url !== undefined ? (
    <img
      alt=""
      decoding="async"
      draggable={false}
      {...(dimensions?.height === undefined
        ? {}
        : { height: dimensions.height })}
      loading="lazy"
      onError={() => setIndex((current) => current + 1)}
      src={url}
      {...(dimensions?.width === undefined ? {} : { width: dimensions.width })}
    />
  ) : (
    <span aria-hidden="true" data-media-fallback="text">
      {assets.fallbackText}
    </span>
  );
}
