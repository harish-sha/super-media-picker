import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useLongPress } from "./useLongPress";

function pointer(
  target: Element,
  type: string,
  values: Partial<{
    button: number;
    clientX: number;
    clientY: number;
    isPrimary: boolean;
    pointerId: number;
    pointerType: string;
  }>,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [name, value] of Object.entries(values))
    Object.defineProperty(event, name, { value });
  fireEvent(target, event);
}

function Harness({ onLongPress }: { readonly onLongPress: () => void }) {
  const handlers = useLongPress({
    delay: 500,
    movementTolerance: 10,
    onLongPress,
  });
  return <div data-testid="press-target" {...handlers} />;
}

const start = {
  button: 0,
  clientX: 20,
  clientY: 20,
  isPrimary: true,
  pointerId: 7,
  pointerType: "touch",
} as const;

afterEach(() => vi.useRealTimers());

describe("useLongPress", () => {
  it("keeps short taps as taps and commits only after the hold delay", async () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    render(<Harness onLongPress={onLongPress} />);
    const target = screen.getByTestId("press-target");
    pointer(target, "pointerdown", start);
    await act(() => vi.advanceTimersByTime(200));
    pointer(target, "pointerup", start);
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();

    pointer(target, "pointerdown", start);
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  it("cancels on touch slop, pointer cancellation, a second pointer, and window blur", async () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    render(<Harness onLongPress={onLongPress} />);
    const target = screen.getByTestId("press-target");

    pointer(target, "pointerdown", start);
    pointer(target, "pointermove", { ...start, clientY: 32 });
    await act(() => vi.advanceTimersByTime(500));

    pointer(target, "pointerdown", start);
    pointer(target, "pointercancel", start);
    await act(() => vi.advanceTimersByTime(500));

    pointer(target, "pointerdown", start);
    pointer(target, "pointerdown", {
      ...start,
      isPrimary: false,
      pointerId: 8,
    });
    await act(() => vi.advanceTimersByTime(500));

    pointer(target, "pointerdown", start);
    fireEvent(window, new Event("blur"));
    await act(() => vi.advanceTimersByTime(500));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cleans pending timers across StrictMode remounts", async () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const view = render(
      <StrictMode>
        <Harness onLongPress={onLongPress} />
      </StrictMode>,
    );
    pointer(screen.getByTestId("press-target"), "pointerdown", start);
    view.unmount();
    await act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
