import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import type {
  MediaPickerActiveGesture,
  MediaPickerDraggableConfig,
  MediaPickerPlacement,
  MediaPickerResizableConfig,
  MediaPickerResolvedDimensions,
  MediaPickerSwipeToDismissConfig,
} from "../types";
import { useFloatingPosition } from "./useFloatingPosition";
import { usePickerInteractions } from "./usePickerInteractions";

export interface AdvancedPresentationState {
  readonly activeGesture: MediaPickerActiveGesture;
  readonly positionerStyle?: CSSProperties;
  readonly presentationControls?: ReactNode;
  readonly resizeControls?: ReactNode;
  readonly resizedDimensions?: MediaPickerResolvedDimensions;
  readonly resolvedPlacement: Exclude<MediaPickerPlacement, "auto">;
}

interface AdvancedPresentationProps {
  readonly anchorRef?: RefObject<HTMLElement | null>;
  readonly children: (state: AdvancedPresentationState) => ReactNode;
  readonly displayMode: string;
  readonly draggable?: boolean | MediaPickerDraggableConfig;
  readonly onDismiss: () => void;
  readonly onInteractionChange?: (gesture: MediaPickerActiveGesture) => void;
  readonly onResolvedPlacementChange?: (
    placement: Exclude<MediaPickerPlacement, "auto">,
  ) => void;
  readonly placement: MediaPickerPlacement;
  readonly portal?: boolean | HTMLElement;
  readonly gestureLayerRef: RefObject<HTMLDivElement | null>;
  readonly layoutKey: string;
  readonly resizable?: boolean | MediaPickerResizableConfig;
  readonly surfaceRef: RefObject<HTMLElement | null>;
  readonly swipeToDismiss?: boolean | MediaPickerSwipeToDismissConfig;
}

export function AdvancedPresentation({
  anchorRef,
  children,
  displayMode,
  draggable,
  gestureLayerRef,
  layoutKey,
  onDismiss,
  onInteractionChange,
  onResolvedPlacementChange,
  placement,
  portal,
  resizable,
  surfaceRef,
  swipeToDismiss,
}: AdvancedPresentationProps) {
  const shouldPortal =
    typeof portal === "object" ||
    portal === true ||
    (portal !== false && displayMode === "popover" && anchorRef !== undefined);
  const [portalTarget, setPortalTarget] = useState<HTMLElement>();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!shouldPortal || typeof document === "undefined") {
        setPortalTarget(undefined);
        return;
      }
      setPortalTarget(typeof portal === "object" ? portal : document.body);
    }, 0);
    return () => clearTimeout(timer);
  }, [portal, shouldPortal]);
  const floating = useFloatingPosition({
    ...(anchorRef === undefined ? {} : { anchorRef }),
    enabled: displayMode === "popover" && anchorRef !== undefined,
    placement,
    // The wrapper survives compact/full swaps and is not presentation-
    // transformed, so its ResizeObserver and dimensions stay authoritative.
    surfaceRef: gestureLayerRef,
    ...(onResolvedPlacementChange === undefined
      ? {}
      : { onPlacementChange: onResolvedPlacementChange }),
  });
  const updateFloating = floating.update;
  useLayoutEffect(() => {
    updateFloating();
  }, [layoutKey, updateFloating]);
  const interactions = usePickerInteractions({
    ...(floating.position === undefined
      ? {}
      : { basePosition: floating.position }),
    displayMode,
    ...(draggable === undefined ? {} : { draggable }),
    onDismiss,
    ...(onInteractionChange === undefined ? {} : { onInteractionChange }),
    gestureLayerRef,
    ...(resizable === undefined ? {} : { resizable }),
    surfaceRef,
    ...(swipeToDismiss === undefined ? {} : { swipeToDismiss }),
  });
  const position = interactions.position ?? floating.position;
  const positionerStyle: CSSProperties | undefined =
    position === undefined
      ? undefined
      : {
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 1000,
          ...(floating.positioned ? {} : { visibility: "hidden" }),
        };
  const presentationControls =
    interactions.dragEnabled || interactions.swipeEnabled ? (
      <button
        {...interactions.dragHandleProps}
        aria-label={
          interactions.swipeEnabled
            ? "Drag down to close picker"
            : "Move picker; use arrow keys to reposition"
        }
        className="mp-spatial-handle"
        data-interaction-handle={
          interactions.swipeEnabled ? "sheet-swipe" : "drag"
        }
        type="button"
      >
        <span aria-hidden="true" />
      </button>
    ) : undefined;
  const resizeControls = interactions.resizeEnabled ? (
    <div aria-label="Resize picker" className="mp-resize-controls" role="group">
      {interactions.resizeDirections.map((direction) => (
        <button
          {...interactions.resizeHandleProps(direction)}
          aria-label={`Resize picker ${direction}; use arrows, Alt to shrink, Home to reset`}
          className="mp-resize-handle"
          data-direction={direction}
          key={direction}
          type="button"
        />
      ))}
    </div>
  ) : undefined;
  const content = children({
    activeGesture: interactions.activeGesture,
    ...(positionerStyle === undefined ? {} : { positionerStyle }),
    ...(presentationControls === undefined ? {} : { presentationControls }),
    ...(resizeControls === undefined ? {} : { resizeControls }),
    ...(interactions.resizedDimensions === undefined
      ? {}
      : { resizedDimensions: interactions.resizedDimensions }),
    resolvedPlacement: floating.resolvedPlacement,
  });
  return shouldPortal && portalTarget !== undefined
    ? createPortal(content, portalTarget)
    : content;
}
