import { useSyncExternalStore } from "react";

import type { PickerDisplayMode } from "@company/media-core";

type ResolvedDisplayMode = Exclude<PickerDisplayMode, "auto">;

const mobilePickerQuery = "(max-width: 30rem), (max-height: 36rem)";

function isCompactViewport(): boolean {
  return (
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia(mobilePickerQuery).matches
  );
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribeToViewport(onStoreChange: () => void): () => void {
  if (typeof globalThis.matchMedia !== "function") return () => undefined;
  const query = globalThis.matchMedia(mobilePickerQuery);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function doNotSubscribe(): () => void {
  return () => undefined;
}

/** Resolves auto mode reactively and cleans up its media-query listener. */
export function useResolvedDisplayMode(
  mode: PickerDisplayMode,
): ResolvedDisplayMode {
  const auto = mode === "auto";
  const compact = useSyncExternalStore(
    auto ? subscribeToViewport : doNotSubscribe,
    auto ? isCompactViewport : getServerSnapshot,
    getServerSnapshot,
  );

  return auto ? (compact ? "bottom-sheet" : "popover") : mode;
}
