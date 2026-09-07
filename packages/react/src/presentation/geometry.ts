import type {
  MediaPickerPlacement,
  MediaPickerPoint,
  MediaPickerSnap,
} from "../types";

export interface GeometryRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export type ViewportGeometry = GeometryRect;

export interface FloatingGeometry {
  readonly position: MediaPickerPoint;
  readonly placement: Exclude<MediaPickerPlacement, "auto">;
}

const opposite: Readonly<
  Record<
    Exclude<MediaPickerPlacement, "auto">,
    Exclude<MediaPickerPlacement, "auto">
  >
> = {
  top: "bottom",
  "top-start": "bottom-start",
  "top-end": "bottom-end",
  bottom: "top",
  "bottom-start": "top-start",
  "bottom-end": "top-end",
  left: "right",
  right: "left",
};

function rawPosition(
  anchor: GeometryRect,
  picker: Pick<GeometryRect, "width" | "height">,
  placement: Exclude<MediaPickerPlacement, "auto">,
  gap: number,
): MediaPickerPoint {
  const centerX = anchor.left + (anchor.width - picker.width) / 2;
  const centerY = anchor.top + (anchor.height - picker.height) / 2;
  switch (placement) {
    case "top":
      return { x: centerX, y: anchor.top - picker.height - gap };
    case "top-start":
      return { x: anchor.left, y: anchor.top - picker.height - gap };
    case "top-end":
      return {
        x: anchor.left + anchor.width - picker.width,
        y: anchor.top - picker.height - gap,
      };
    case "bottom":
      return { x: centerX, y: anchor.top + anchor.height + gap };
    case "bottom-start":
      return { x: anchor.left, y: anchor.top + anchor.height + gap };
    case "bottom-end":
      return {
        x: anchor.left + anchor.width - picker.width,
        y: anchor.top + anchor.height + gap,
      };
    case "left":
      return { x: anchor.left - picker.width - gap, y: centerY };
    case "right":
      return { x: anchor.left + anchor.width + gap, y: centerY };
  }
}

export function clampPosition(
  position: MediaPickerPoint,
  picker: Pick<GeometryRect, "width" | "height">,
  viewport: ViewportGeometry,
  padding = 8,
): MediaPickerPoint {
  const minX = viewport.left + padding;
  const minY = viewport.top + padding;
  const maxX = Math.max(
    minX,
    viewport.left + viewport.width - picker.width - padding,
  );
  const maxY = Math.max(
    minY,
    viewport.top + viewport.height - picker.height - padding,
  );
  return {
    x: Math.min(Math.max(position.x, minX), maxX),
    y: Math.min(Math.max(position.y, minY), maxY),
  };
}

function fits(
  position: MediaPickerPoint,
  picker: Pick<GeometryRect, "width" | "height">,
  viewport: ViewportGeometry,
  padding: number,
): boolean {
  return (
    position.x >= viewport.left + padding &&
    position.y >= viewport.top + padding &&
    position.x + picker.width <= viewport.left + viewport.width - padding &&
    position.y + picker.height <= viewport.top + viewport.height - padding
  );
}

export function resolveFloatingGeometry(
  anchor: GeometryRect,
  picker: Pick<GeometryRect, "width" | "height">,
  viewport: ViewportGeometry,
  preferred: MediaPickerPlacement = "auto",
  gap = 8,
  padding = 8,
): FloatingGeometry {
  const requested = preferred === "auto" ? "bottom-start" : preferred;
  const candidates: readonly Exclude<MediaPickerPlacement, "auto">[] =
    preferred === "auto"
      ? ["bottom-start", "top-start", "bottom-end", "top-end", "right", "left"]
      : [requested, opposite[requested]];
  for (const placement of candidates) {
    const position = rawPosition(anchor, picker, placement, gap);
    if (fits(position, picker, viewport, padding))
      return { placement, position };
  }
  return {
    placement: requested,
    position: clampPosition(
      rawPosition(anchor, picker, requested, gap),
      picker,
      viewport,
      padding,
    ),
  };
}

export function snapPosition(
  position: MediaPickerPoint,
  picker: Pick<GeometryRect, "width" | "height">,
  viewport: ViewportGeometry,
  snap: MediaPickerSnap,
  threshold = 24,
  padding = 8,
): MediaPickerPoint {
  const bounded = clampPosition(position, picker, viewport, padding);
  if (snap === "none") return bounded;
  const edges = {
    left: viewport.left + padding,
    right: Math.max(
      viewport.left + padding,
      viewport.left + viewport.width - picker.width - padding,
    ),
    top: viewport.top + padding,
    bottom: Math.max(
      viewport.top + padding,
      viewport.top + viewport.height - picker.height - padding,
    ),
  };
  const distances = {
    left: Math.abs(bounded.x - edges.left),
    right: Math.abs(edges.right - bounded.x),
    top: Math.abs(bounded.y - edges.top),
    bottom: Math.abs(edges.bottom - bounded.y),
  };
  if (snap === "corners") {
    const horizontal = distances.left <= distances.right ? "left" : "right";
    const vertical = distances.top <= distances.bottom ? "top" : "bottom";
    return {
      x: distances[horizontal] <= threshold ? edges[horizontal] : bounded.x,
      y: distances[vertical] <= threshold ? edges[vertical] : bounded.y,
    };
  }
  const edge =
    snap === "nearest-edge"
      ? (Object.entries(distances).sort(
          (left, right) => left[1] - right[1],
        )[0]?.[0] as keyof typeof distances | undefined)
      : snap;
  if (edge === undefined || distances[edge] > threshold) return bounded;
  return edge === "left" || edge === "right"
    ? { x: edges[edge], y: bounded.y }
    : { x: bounded.x, y: edges[edge] };
}

export function visualViewportGeometry(view: Window): ViewportGeometry {
  const visual = view.visualViewport;
  return {
    left: visual?.offsetLeft ?? 0,
    top: visual?.offsetTop ?? 0,
    width: visual?.width ?? view.innerWidth,
    height: visual?.height ?? view.innerHeight,
  };
}
