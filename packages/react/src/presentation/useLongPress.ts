import { useCallback, useEffect, useRef, type HTMLAttributes } from "react";

export interface LongPressOptions {
  readonly delay?: number;
  readonly movementTolerance?: number;
  readonly onLongPress: () => void;
}

/**
 * Internal, input-neutral long-press primitive reserved for future previews and
 * variants. It is intentionally not wired to a discoverable control or public API.
 */
export function useLongPress({
  delay = 500,
  movementTolerance = 8,
  onLongPress,
}: LongPressOptions): Pick<
  HTMLAttributes<HTMLElement>,
  | "onLostPointerCapture"
  | "onPointerCancel"
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
> {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const session = useRef<
    | {
        committed: boolean;
        pointerId: number;
        target: HTMLElement;
        x: number;
        y: number;
      }
    | undefined
  >(undefined);
  const callback = useRef(onLongPress);
  useEffect(() => {
    callback.current = onLongPress;
  }, [onLongPress]);
  const cancel = useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    const active = session.current;
    session.current = undefined;
    if (
      active?.committed &&
      active.target.hasPointerCapture?.(active.pointerId)
    )
      active.target.releasePointerCapture(active.pointerId);
  }, []);
  useEffect(() => {
    const ownerWindow = globalThis.window;
    ownerWindow?.addEventListener("blur", cancel);
    return () => {
      ownerWindow?.removeEventListener("blur", cancel);
      cancel();
    };
  }, [cancel]);
  return {
    onPointerDown: (event) => {
      if (event.button !== 0 || !event.isPrimary) {
        if (session.current !== undefined) cancel();
        return;
      }
      cancel();
      session.current = {
        committed: false,
        pointerId: event.pointerId,
        target: event.currentTarget,
        x: event.clientX,
        y: event.clientY,
      };
      timer.current = setTimeout(() => {
        const active = session.current;
        if (active === undefined) return;
        timer.current = undefined;
        active.committed = true;
        try {
          active.target.setPointerCapture?.(active.pointerId);
        } catch {
          // A disconnected target or ended native pointer is a safe no-capture.
        }
        callback.current();
      }, delay);
    },
    onPointerMove: (event) => {
      const start = session.current;
      if (
        start !== undefined &&
        start.pointerId === event.pointerId &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) >
          movementTolerance
      )
        cancel();
    },
    onPointerUp: (event) => {
      if (session.current?.pointerId === event.pointerId) cancel();
    },
    onPointerCancel: (event) => {
      if (session.current?.pointerId === event.pointerId) cancel();
    },
    onLostPointerCapture: (event) => {
      if (session.current?.pointerId === event.pointerId) cancel();
    },
  };
}
