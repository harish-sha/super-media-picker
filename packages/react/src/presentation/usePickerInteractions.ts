import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import type {
  MediaPickerActiveGesture,
  MediaPickerDraggableConfig,
  MediaPickerPoint,
  MediaPickerResizableConfig,
  MediaPickerResizeDirection,
  MediaPickerResolvedDimensions,
  MediaPickerSwipeToDismissConfig,
} from "../types";
import {
  clampPosition,
  snapPosition,
  visualViewportGeometry,
} from "./geometry";

interface InteractionOptions {
  readonly basePosition?: MediaPickerPoint;
  readonly displayMode: string;
  readonly draggable?: boolean | MediaPickerDraggableConfig;
  readonly gestureLayerRef: RefObject<HTMLDivElement | null>;
  readonly onDismiss: () => void;
  readonly onInteractionChange?: (gesture: MediaPickerActiveGesture) => void;
  readonly resizable?: boolean | MediaPickerResizableConfig;
  readonly surfaceRef: RefObject<HTMLElement | null>;
  readonly swipeToDismiss?: boolean | MediaPickerSwipeToDismissConfig;
}

interface PointerSession {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly kind: "dragging" | "resizing" | "swiping";
  readonly target: HTMLElement;
  readonly startX: number;
  readonly startY: number;
  readonly startTime: number;
  readonly startPosition: MediaPickerPoint;
  readonly startDimensions: MediaPickerResolvedDimensions;
  readonly direction?: MediaPickerResizeDirection;
  readonly bounds?: InteractionBounds;
  active: boolean;
  lastX: number;
  lastY: number;
  lastTime: number;
}

interface InteractionBounds {
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly minHeight: number;
  readonly maxHeight: number;
}

interface PendingPointerFrame {
  readonly clientX: number;
  readonly clientY: number;
  readonly timeStamp: number;
}

type HandleProps = Pick<
  HTMLAttributes<HTMLElement>,
  | "onKeyDown"
  | "onLostPointerCapture"
  | "onPointerCancel"
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
>;

function config<T extends object>(
  value: boolean | T | undefined,
): T | undefined {
  if (value === true) return {} as T;
  if (value === false || value === undefined) return undefined;
  return value;
}

function finite(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function computedBounds(surface: HTMLElement): InteractionBounds {
  const style = getComputedStyle(surface);
  const viewport = visualViewportGeometry(window);
  const parse = (value: string, fallback: number) => {
    const result = Number.parseFloat(value);
    return Number.isFinite(result) ? result : fallback;
  };
  return {
    minWidth: parse(style.minWidth, 240),
    maxWidth: Math.min(
      parse(style.maxWidth, viewport.width - 16),
      viewport.width - 16,
    ),
    minHeight: parse(style.minHeight, 280),
    maxHeight: Math.min(
      parse(style.maxHeight, viewport.height - 16),
      viewport.height - 16,
    ),
  };
}

export interface PickerInteractions {
  readonly activeGesture: MediaPickerActiveGesture;
  readonly dragEnabled: boolean;
  readonly dragHandleProps: HandleProps;
  readonly position?: MediaPickerPoint;
  readonly resizeDirections: readonly MediaPickerResizeDirection[];
  readonly resizedDimensions?: MediaPickerResolvedDimensions;
  readonly resizeEnabled: boolean;
  readonly resizeHandleProps: (
    direction: MediaPickerResizeDirection,
  ) => HandleProps;
  readonly swipeEnabled: boolean;
}

export function usePickerInteractions({
  basePosition,
  displayMode,
  draggable,
  gestureLayerRef,
  onDismiss,
  onInteractionChange,
  resizable,
  surfaceRef,
  swipeToDismiss,
}: InteractionOptions): PickerInteractions {
  const dragConfig = config<MediaPickerDraggableConfig>(draggable);
  const resizeConfig = config<MediaPickerResizableConfig>(resizable);
  const swipeConfig = config<MediaPickerSwipeToDismissConfig>(swipeToDismiss);
  const dragEnabled =
    dragConfig !== undefined &&
    dragConfig.enabled !== false &&
    displayMode === "popover";
  const resizeEnabled =
    resizeConfig !== undefined &&
    resizeConfig?.enabled !== false &&
    (displayMode === "popover" ||
      displayMode === "inline" ||
      displayMode === "modal");
  const swipeEnabled =
    swipeConfig !== undefined &&
    swipeConfig?.enabled !== false &&
    displayMode === "bottom-sheet";
  const resizeDirections = resizeConfig?.directions ?? ["bottom-right"];
  const [internalPosition, setInternalPosition] = useState<
    MediaPickerPoint | undefined
  >(dragConfig?.defaultPosition);
  const position = dragEnabled
    ? (dragConfig?.position ?? internalPosition ?? basePosition)
    : undefined;
  const [activeGesture, setActiveGesture] =
    useState<MediaPickerActiveGesture>("idle");
  const [resizedDimensions, setResizedDimensions] =
    useState<MediaPickerResolvedDimensions>();
  const session = useRef<PointerSession | undefined>(undefined);
  const pendingFrame = useRef<PendingPointerFrame | undefined>(undefined);
  const animationFrame = useRef<number | undefined>(undefined);
  const callbacks = useRef({
    dragConfig,
    onDismiss,
    onInteractionChange,
    resizeConfig,
    swipeConfig,
  });
  useEffect(() => {
    callbacks.current = {
      dragConfig,
      onDismiss,
      onInteractionChange,
      resizeConfig,
      swipeConfig,
    };
  }, [dragConfig, onDismiss, onInteractionChange, resizeConfig, swipeConfig]);

  function changeGesture(next: MediaPickerActiveGesture): void {
    setActiveGesture(next);
    callbacks.current.onInteractionChange?.(next);
  }

  function clearDirectStyles(): void {
    if (gestureLayerRef.current !== null)
      gestureLayerRef.current.style.translate = "";
    if (surfaceRef.current !== null) {
      surfaceRef.current.style.translate = "";
      surfaceRef.current.style.width = "";
      surfaceRef.current.style.height = "";
    }
  }

  function begin(
    event: ReactPointerEvent<HTMLElement>,
    kind: PointerSession["kind"],
    direction?: MediaPickerResizeDirection,
  ): void {
    if (event.button !== 0 || session.current !== undefined) return;
    const surface = surfaceRef.current;
    if (surface === null) return;
    const rect = surface.getBoundingClientRect();
    const now = performance.now();
    pendingFrame.current = undefined;
    if (animationFrame.current !== undefined) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = undefined;
    }
    session.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      kind,
      target: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      startTime: now,
      startPosition: { x: rect.left, y: rect.top },
      startDimensions: { width: rect.width, height: rect.height },
      ...(direction === undefined ? {} : { direction }),
      ...(kind === "resizing" ? { bounds: computedBounds(surface) } : {}),
      active: false,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: now,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    changeGesture("pressing");
  }

  function applyPendingFrame(): void {
    const current = session.current;
    const pending = pendingFrame.current;
    pendingFrame.current = undefined;
    animationFrame.current = undefined;
    if (current === undefined || pending === undefined || !current.active)
      return;
    const dx = pending.clientX - current.startX;
    const dy = pending.clientY - current.startY;
    const elapsed = Math.max(1, pending.timeStamp - current.lastTime);
    const velocity = {
      x: (pending.clientX - current.lastX) / elapsed,
      y: (pending.clientY - current.lastY) / elapsed,
    };
    current.lastX = pending.clientX;
    current.lastY = pending.clientY;
    current.lastTime = pending.timeStamp;
    if (current.kind === "dragging") {
      gestureLayerRef.current?.style.setProperty(
        "translate",
        `${dx}px ${dy}px`,
      );
      callbacks.current.dragConfig?.onDrag?.({
        position: {
          x: current.startPosition.x + dx,
          y: current.startPosition.y + dy,
        },
        pointerType: current.pointerType,
        velocity,
      });
      return;
    }
    if (current.kind === "swiping") {
      gestureLayerRef.current?.style.setProperty(
        "translate",
        `0 ${Math.max(0, dy)}px`,
      );
      return;
    }
    const bounds = current.bounds;
    if (bounds === undefined) return;
    const changesWidth = current.direction !== "bottom";
    const changesHeight = current.direction !== "right";
    const dimensions = {
      width: changesWidth
        ? Math.min(
            Math.max(current.startDimensions.width + dx, bounds.minWidth),
            bounds.maxWidth,
          )
        : current.startDimensions.width,
      height: changesHeight
        ? Math.min(
            Math.max(current.startDimensions.height + dy, bounds.minHeight),
            bounds.maxHeight,
          )
        : current.startDimensions.height,
    };
    surfaceRef.current?.style.setProperty("width", `${dimensions.width}px`);
    surfaceRef.current?.style.setProperty("height", `${dimensions.height}px`);
    callbacks.current.resizeConfig?.onResize?.({
      dimensions,
      pointerType: current.pointerType,
    });
  }

  function move(event: ReactPointerEvent<HTMLElement>): void {
    const current = session.current;
    if (current === undefined || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    const threshold = current.pointerType === "mouse" ? 4 : 7;
    if (!current.active && Math.hypot(dx, dy) < threshold) return;
    if (!current.active) {
      current.active = true;
      changeGesture(current.kind);
      if (current.kind === "dragging") {
        callbacks.current.dragConfig?.onDragStart?.({
          position: current.startPosition,
          pointerType: current.pointerType,
          velocity: { x: 0, y: 0 },
        });
      } else if (current.kind === "resizing") {
        callbacks.current.resizeConfig?.onResizeStart?.({
          dimensions: current.startDimensions,
          pointerType: current.pointerType,
        });
      }
    }
    event.preventDefault();
    pendingFrame.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      timeStamp: event.timeStamp,
    };
    if (animationFrame.current === undefined)
      animationFrame.current = requestAnimationFrame(applyPendingFrame);
  }

  function finish(
    event: ReactPointerEvent<HTMLElement>,
    cancelled = false,
  ): void {
    const current = session.current;
    if (current === undefined || current.pointerId !== event.pointerId) return;
    if (animationFrame.current !== undefined) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = undefined;
    }
    if (current.active) {
      pendingFrame.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        timeStamp: event.timeStamp,
      };
      applyPendingFrame();
    }
    session.current = undefined;
    const dx = current.lastX - current.startX;
    const dy = current.lastY - current.startY;
    const elapsed = Math.max(1, current.lastTime - current.startTime);
    const velocity = { x: dx / elapsed, y: dy / elapsed };
    const surface = surfaceRef.current;
    if (!cancelled && current.active && surface !== null) {
      if (current.kind === "dragging") {
        const viewport = visualViewportGeometry(window);
        const surfaceBounds = surface.getBoundingClientRect();
        const next = snapPosition(
          clampPosition(
            {
              x: current.startPosition.x + dx,
              y: current.startPosition.y + dy,
            },
            surfaceBounds,
            viewport,
          ),
          surfaceBounds,
          viewport,
          callbacks.current.dragConfig?.snap ?? "none",
          finite(callbacks.current.dragConfig?.snapThreshold, 24),
        );
        if (callbacks.current.dragConfig?.position === undefined)
          setInternalPosition(next);
        callbacks.current.dragConfig?.onPositionChange?.(next);
        callbacks.current.dragConfig?.onDragEnd?.({
          position: next,
          pointerType: current.pointerType,
          velocity,
        });
      } else if (current.kind === "resizing") {
        const rect = surface.getBoundingClientRect();
        const dimensions = { width: rect.width, height: rect.height };
        setResizedDimensions(dimensions);
        callbacks.current.resizeConfig?.onDimensionsChange?.(dimensions);
        callbacks.current.resizeConfig?.onResizeEnd?.({
          dimensions,
          pointerType: current.pointerType,
        });
      } else {
        const threshold = finite(
          callbacks.current.swipeConfig?.distanceThreshold,
          96,
        );
        const velocityThreshold = finite(
          callbacks.current.swipeConfig?.velocityThreshold,
          0.65,
        );
        if (dy >= threshold || velocity.y >= velocityThreshold)
          callbacks.current.onDismiss();
      }
    }
    queueMicrotask(clearDirectStyles);
    changeGesture("idle");
    if (current.target.hasPointerCapture?.(current.pointerId))
      current.target.releasePointerCapture?.(current.pointerId);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const gestureLayer = gestureLayerRef.current;
    const surface = surfaceRef.current;
    const cancelActive = () => {
      if (animationFrame.current !== undefined) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = undefined;
      }
      pendingFrame.current = undefined;
      session.current = undefined;
      if (gestureLayerRef.current !== null)
        gestureLayerRef.current.style.translate = "";
      if (surfaceRef.current !== null) {
        surfaceRef.current.style.width = "";
        surfaceRef.current.style.height = "";
      }
      setActiveGesture("idle");
      callbacks.current.onInteractionChange?.("idle");
    };
    window.addEventListener("blur", cancelActive);
    return () => {
      window.removeEventListener("blur", cancelActive);
      if (animationFrame.current !== undefined)
        cancelAnimationFrame(animationFrame.current);
      animationFrame.current = undefined;
      pendingFrame.current = undefined;
      session.current = undefined;
      if (gestureLayer !== null) gestureLayer.style.translate = "";
      if (surface !== null) {
        surface.style.width = "";
        surface.style.height = "";
      }
    };
  }, [gestureLayerRef, surfaceRef]);

  function keyboardMove(event: React.KeyboardEvent<HTMLElement>): void {
    if (!dragEnabled || typeof window === "undefined") return;
    const movement: Partial<Record<string, MediaPickerPoint>> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const direction = movement[event.key];
    if (direction === undefined) return;
    event.preventDefault();
    const surface = surfaceRef.current;
    if (surface === null) return;
    const rect = surface.getBoundingClientRect();
    const step = event.shiftKey ? 40 : 10;
    const next = clampPosition(
      { x: rect.left + direction.x * step, y: rect.top + direction.y * step },
      rect,
      visualViewportGeometry(window),
    );
    if (dragConfig?.position === undefined) setInternalPosition(next);
    dragConfig?.onPositionChange?.(next);
  }

  function keyboardResize(
    event: React.KeyboardEvent<HTMLElement>,
    direction: MediaPickerResizeDirection,
  ): void {
    if (!resizeEnabled) return;
    const delta = event.shiftKey ? 40 : 10;
    const sign = event.altKey ? -1 : 1;
    const surface = surfaceRef.current;
    if (surface === null) return;
    if (event.key === "Home") {
      event.preventDefault();
      surface.style.width = "";
      surface.style.height = "";
      const rect = surface.getBoundingClientRect();
      setResizedDimensions(undefined);
      resizeConfig?.onDimensionsChange?.({
        width: rect.width,
        height: rect.height,
      });
      return;
    }
    if (event.key !== "ArrowRight" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const rect = surface.getBoundingClientRect();
    const bounds = computedBounds(surface);
    const dimensions = {
      width:
        direction === "bottom"
          ? rect.width
          : Math.min(
              Math.max(rect.width + delta * sign, bounds.minWidth),
              bounds.maxWidth,
            ),
      height:
        direction === "right"
          ? rect.height
          : Math.min(
              Math.max(rect.height + delta * sign, bounds.minHeight),
              bounds.maxHeight,
            ),
    };
    surface.style.width = `${dimensions.width}px`;
    surface.style.height = `${dimensions.height}px`;
    setResizedDimensions(dimensions);
    resizeConfig?.onDimensionsChange?.(dimensions);
  }

  const dragHandleProps: HandleProps = {
    onKeyDown: keyboardMove,
    onPointerDown: (event) => {
      if (swipeEnabled) begin(event, "swiping");
      else if (dragEnabled) begin(event, "dragging");
    },
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: (event) => finish(event, true),
    onLostPointerCapture: (event) => finish(event, true),
  };

  return {
    activeGesture,
    dragEnabled,
    dragHandleProps,
    ...(position === undefined ? {} : { position }),
    resizeDirections,
    resizeEnabled,
    ...(resizedDimensions === undefined ? {} : { resizedDimensions }),
    resizeHandleProps: (direction) => ({
      onKeyDown: (event) => keyboardResize(event, direction),
      onPointerDown: (event) => begin(event, "resizing", direction),
      onPointerMove: move,
      onPointerUp: finish,
      onPointerCancel: (event) => finish(event, true),
      onLostPointerCapture: (event) => finish(event, true),
    }),
    swipeEnabled,
  };
}
