import { useSyncExternalStore } from "react";

import type { PickerDisplayMode } from "@super-media-picker/core";

type ResolvedDisplayMode = Exclude<PickerDisplayMode, "auto">;

const mobilePickerQuery = "(max-width: 30rem), (max-height: 36rem)";
const fullscreenViewportHeight = 26 * 16;

function resolveAutoDisplayMode(): ResolvedDisplayMode {
  if (typeof globalThis.window === "undefined") return "popover";
  const viewport = globalThis.window.visualViewport;
  const width = viewport?.width ?? globalThis.window.innerWidth;
  const height = viewport?.height ?? globalThis.window.innerHeight;
  const compactQuery =
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia(mobilePickerQuery).matches;
  if (
    Number.isFinite(height) &&
    height > 0 &&
    height <= fullscreenViewportHeight
  )
    return "fullscreen";
  if (
    compactQuery ||
    (Number.isFinite(width) && width > 0 && width <= 30 * 16) ||
    (Number.isFinite(height) && height > 0 && height <= 36 * 16)
  )
    return "bottom-sheet";
  return "popover";
}

function getServerSnapshot(): ResolvedDisplayMode {
  return "popover";
}

function subscribeToViewport(onStoreChange: () => void): () => void {
  if (typeof globalThis.window === "undefined") return () => undefined;
  const query = globalThis.matchMedia?.(mobilePickerQuery);
  query?.addEventListener("change", onStoreChange);
  globalThis.window.addEventListener("resize", onStoreChange);
  globalThis.window.visualViewport?.addEventListener("resize", onStoreChange);
  globalThis.window.visualViewport?.addEventListener("scroll", onStoreChange);
  return () => {
    query?.removeEventListener("change", onStoreChange);
    globalThis.window.removeEventListener("resize", onStoreChange);
    globalThis.window.visualViewport?.removeEventListener(
      "resize",
      onStoreChange,
    );
    globalThis.window.visualViewport?.removeEventListener(
      "scroll",
      onStoreChange,
    );
  };
}

function doNotSubscribe(): () => void {
  return () => undefined;
}

/** Resolves auto mode reactively and cleans up its media-query listener. */
export function useResolvedDisplayMode(
  mode: PickerDisplayMode,
): ResolvedDisplayMode {
  const auto = mode === "auto";
  const resolved = useSyncExternalStore(
    auto ? subscribeToViewport : doNotSubscribe,
    auto ? resolveAutoDisplayMode : getServerSnapshot,
    getServerSnapshot,
  );

  return auto ? resolved : mode;
}
