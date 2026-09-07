import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import type { MediaPickerPlacement, MediaPickerPoint } from "../types";
import { resolveFloatingGeometry, visualViewportGeometry } from "./geometry";

interface FloatingPositionOptions {
  readonly anchorRef?: RefObject<HTMLElement | null>;
  readonly enabled: boolean;
  readonly placement: MediaPickerPlacement;
  readonly surfaceRef: RefObject<HTMLElement | null>;
  readonly onPlacementChange?: (
    placement: Exclude<MediaPickerPlacement, "auto">,
  ) => void;
}

export interface FloatingPositionState {
  readonly positioned: boolean;
  readonly position?: MediaPickerPoint;
  readonly resolvedPlacement: Exclude<MediaPickerPlacement, "auto">;
  readonly update: () => void;
}

export function useFloatingPosition({
  anchorRef,
  enabled,
  placement,
  surfaceRef,
  onPlacementChange,
}: FloatingPositionOptions): FloatingPositionState {
  const [state, setState] = useState<{
    position?: MediaPickerPoint;
    placement: Exclude<MediaPickerPlacement, "auto">;
  }>({ placement: placement === "auto" ? "bottom-start" : placement });
  const callbackRef = useRef(onPlacementChange);
  useEffect(() => {
    callbackRef.current = onPlacementChange;
  }, [onPlacementChange]);

  const update = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;
    const anchor = anchorRef?.current;
    const surface = surfaceRef.current;
    if (anchor === null || anchor === undefined || surface === null) return;
    const anchorRect = anchor.getBoundingClientRect();
    const needsSizeFallback =
      surface.offsetWidth === 0 || surface.offsetHeight === 0;
    const transformedRect = needsSizeFallback
      ? surface.getBoundingClientRect()
      : undefined;
    const pickerRect = {
      height: surface.offsetHeight || transformedRect?.height || 0,
      width: surface.offsetWidth || transformedRect?.width || 0,
    };
    const result = resolveFloatingGeometry(
      anchorRect,
      pickerRect,
      visualViewportGeometry(window),
      placement,
    );
    setState((current) =>
      current.placement === result.placement &&
      current.position?.x === result.position.x &&
      current.position.y === result.position.y
        ? current
        : { placement: result.placement, position: result.position },
    );
  }, [anchorRef, enabled, placement, surfaceRef]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    update();
    const anchor = anchorRef?.current;
    const surface = surfaceRef.current;
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(update);
    if (anchor !== null && anchor !== undefined) observer?.observe(anchor);
    if (surface !== null) observer?.observe(surface);
    const visual = window.visualViewport;
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    visual?.addEventListener("resize", update);
    visual?.addEventListener("scroll", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      visual?.removeEventListener("resize", update);
      visual?.removeEventListener("scroll", update);
    };
  }, [anchorRef, enabled, surfaceRef, update]);

  useEffect(() => {
    if (!enabled) return;
    callbackRef.current?.(state.placement);
  }, [enabled, state.placement]);

  return {
    positioned: !enabled || state.position !== undefined,
    ...(!enabled || state.position === undefined
      ? {}
      : { position: state.position }),
    resolvedPlacement: state.placement,
    update,
  };
}
