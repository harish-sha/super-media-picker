import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { useMediaPickerPortalTarget } from "../portalTarget";

const sliceCount = 6;

interface GenieTransitionProps {
  readonly anchorRef?: RefObject<HTMLElement | null>;
  readonly duration: number;
  readonly easing?: string;
  readonly gestureLayerRef: RefObject<HTMLDivElement | null>;
  readonly motionState: "opening" | "closing";
  readonly origin?: DOMRect;
  readonly positionerRef: RefObject<HTMLDivElement | null>;
  readonly surfaceRef: RefObject<HTMLElement | null>;
}

interface GenieGeometry {
  readonly style: CSSProperties;
  readonly slices: readonly CSSProperties[];
}

function finiteRect(
  value: Pick<DOMRect, "height" | "left" | "top" | "width">,
): boolean {
  return (
    value.width > 0 &&
    value.height > 0 &&
    [value.left, value.top, value.width, value.height].every(Number.isFinite)
  );
}

/** Experimental decorative proxy; the real picker remains the only interactive DOM. */
export default function GenieTransition({
  anchorRef,
  duration,
  easing,
  gestureLayerRef,
  motionState,
  origin,
  positionerRef,
  surfaceRef,
}: GenieTransitionProps) {
  const [geometry, setGeometry] = useState<GenieGeometry>();
  const preferredPortalTarget = useMediaPickerPortalTarget();

  useLayoutEffect(() => {
    const positioner = positionerRef.current;
    const gestureLayer = gestureLayerRef.current;
    const surface = surfaceRef.current;
    const source = origin ?? anchorRef?.current?.getBoundingClientRect();
    if (
      positioner === null ||
      gestureLayer === null ||
      surface === null ||
      source === undefined
    ) {
      positioner?.setAttribute("data-genie-ready", "false");
      setGeometry(undefined);
      return;
    }
    positioner.setAttribute("data-genie-ready", "false");
    setGeometry(undefined);
    const schedule =
      typeof requestAnimationFrame === "function"
        ? (callback: FrameRequestCallback) => requestAnimationFrame(callback)
        : (callback: FrameRequestCallback) =>
            window.setTimeout(() => callback(performance.now()), 0);
    const cancel = (handle: number) => {
      if (typeof cancelAnimationFrame === "function")
        cancelAnimationFrame(handle);
      else window.clearTimeout(handle);
    };
    let measurementFrame: number | undefined;
    const placementFrame = schedule(() => {
      // Let popover collision positioning commit after a compact/full resize,
      // then read the destination exactly once on the following frame.
      measurementFrame = schedule(() => {
        const gestureBounds = gestureLayer.getBoundingClientRect();
        const needsSizeFallback =
          surface.offsetWidth === 0 || surface.offsetHeight === 0;
        const transformedBounds = needsSizeFallback
          ? surface.getBoundingClientRect()
          : undefined;
        const destination = {
          height: surface.offsetHeight || transformedBounds?.height || 0,
          left: gestureBounds.left + surface.offsetLeft,
          top: gestureBounds.top + surface.offsetTop,
          width: surface.offsetWidth || transformedBounds?.width || 0,
        };
        if (!finiteRect(source) || !finiteRect(destination)) return;
        const appearance = getComputedStyle(surface);
        const sourceCenterX = source.left + source.width / 2;
        const sourceCenterY = source.top + source.height / 2;
        const destinationCenterX = destination.left + destination.width / 2;
        const destinationCenterY = destination.top + destination.height / 2;
        const deltaX = sourceCenterX - destinationCenterX;
        const scaleY = Math.max(0.06, source.height / destination.height);
        const sourceBelow = sourceCenterY >= destinationCenterY;
        const slices = Array.from({ length: sliceCount }, (_, index) => {
          const progress = (index + 0.5) / sliceCount;
          const sliceCenter = destination.top + progress * destination.height;
          const sourceSliceCenter = source.top + progress * source.height;
          const deltaY = sourceSliceCenter - sliceCenter;
          const towardTrigger = sourceBelow ? progress : 1 - progress;
          const delayOrder = sourceBelow ? sliceCount - 1 - index : index;
          const compression = Math.max(
            0.06,
            Math.min(
              2.5,
              (source.width / destination.width) *
                (0.52 + towardTrigger * 0.48),
            ),
          );
          const overshootX =
            -Math.sign(deltaX) * Math.min(3, Math.abs(deltaX) * 0.012);
          const overshootY =
            -Math.sign(deltaY) * Math.min(4, Math.abs(deltaY) * 0.014);
          return {
            "--mp-genie-delay": `${delayOrder * 5}ms`,
            "--mp-genie-from-x": `${deltaX}px`,
            "--mp-genie-from-y": `${deltaY}px`,
            "--mp-genie-from-scale-x": String(compression),
            "--mp-genie-from-scale-y": String(scaleY),
            "--mp-genie-mid-x": `${overshootX}px`,
            "--mp-genie-mid-y": `${overshootY}px`,
            "--mp-genie-mid-scale-x": String(1 + (towardTrigger - 0.5) * 0.018),
          } as CSSProperties;
        });
        setGeometry({
          slices,
          style: {
            "--mp-genie-background": appearance.backgroundColor,
            "--mp-genie-border": appearance.borderColor,
            "--mp-genie-duration": `${duration}ms`,
            "--mp-genie-easing": easing ?? "cubic-bezier(0.2, 0.74, 0.16, 1)",
            "--mp-genie-radius": appearance.borderRadius,
            "--mp-genie-shadow": appearance.boxShadow,
            "--mp-genie-left": `${destination.left}px`,
            "--mp-genie-top": `${destination.top}px`,
            "--mp-genie-width": `${destination.width}px`,
            "--mp-genie-height": `${destination.height}px`,
          } as CSSProperties,
        });
        positioner.setAttribute("data-genie-ready", "true");
      });
    });
    return () => {
      cancel(placementFrame);
      if (measurementFrame !== undefined) cancel(measurementFrame);
      positioner.setAttribute("data-genie-ready", "false");
    };
  }, [
    anchorRef,
    duration,
    easing,
    gestureLayerRef,
    origin,
    positionerRef,
    surfaceRef,
  ]);

  if (geometry === undefined || typeof document === "undefined") return null;

  const portalTarget = preferredPortalTarget ?? document.body;

  return createPortal(
    <div
      aria-hidden="true"
      className="mp-genie-proxy"
      data-motion-state={motionState}
      data-testid="genie-transition-proxy"
      inert
      style={geometry.style}
    >
      <div className="mp-genie-proxy__surface">
        {geometry.slices.map((style, index) => (
          <span
            aria-hidden="true"
            className="mp-genie-proxy__slice"
            key={index}
            style={{ ...style, "--mp-genie-slice": index } as CSSProperties}
          />
        ))}
      </div>
    </div>,
    portalTarget,
  );
}
