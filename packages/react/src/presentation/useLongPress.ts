import { useEffect, useRef, type HTMLAttributes } from "react";

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
  "onPointerCancel" | "onPointerDown" | "onPointerMove" | "onPointerUp"
> {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | undefined>(undefined);
  const callback = useRef(onLongPress);
  useEffect(() => {
    callback.current = onLongPress;
  }, [onLongPress]);
  const cancel = () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    origin.current = undefined;
  };
  useEffect(() => cancel, []);
  return {
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      cancel();
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        timer.current = undefined;
        callback.current();
      }, delay);
    },
    onPointerMove: (event) => {
      const start = origin.current;
      if (
        start !== undefined &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) >
          movementTolerance
      )
        cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
  };
}
