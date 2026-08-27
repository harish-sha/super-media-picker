import { useEffect, useState } from "react";

import type { PickerDisplayMode } from "@company/media-core";

type ResolvedDisplayMode = Exclude<PickerDisplayMode, "auto">;

const mobilePickerQuery = "(max-width: 30rem), (max-height: 36rem)";

function isCompactViewport(): boolean {
  return typeof globalThis.matchMedia === "function" && globalThis.matchMedia(mobilePickerQuery).matches;
}

/** Resolves auto mode reactively and cleans up its media-query listener. */
export function useResolvedDisplayMode(mode: PickerDisplayMode): ResolvedDisplayMode {
  const [compact, setCompact] = useState(isCompactViewport);

  useEffect(() => {
    if (mode !== "auto" || typeof globalThis.matchMedia !== "function") return;
    const query = globalThis.matchMedia(mobilePickerQuery);
    const handleChange = (event: MediaQueryListEvent): void => setCompact(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [mode]);

  return mode === "auto" ? (compact ? "bottom-sheet" : "popover") : mode;
}
