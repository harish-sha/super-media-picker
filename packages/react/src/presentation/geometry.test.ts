import { describe, expect, it } from "vitest";

import {
  clampPosition,
  resolveFloatingGeometry,
  snapPosition,
} from "./geometry";

const viewport = { left: 0, top: 0, width: 500, height: 400 };

describe("presentation geometry", () => {
  it("keeps a preferred placement when it fits", () => {
    expect(
      resolveFloatingGeometry(
        { left: 100, top: 80, width: 50, height: 30 },
        { width: 200, height: 100 },
        viewport,
        "bottom-start",
      ),
    ).toEqual({ placement: "bottom-start", position: { x: 100, y: 118 } });
  });

  it("flips before clamping when the preferred side collides", () => {
    expect(
      resolveFloatingGeometry(
        { left: 120, top: 365, width: 50, height: 24 },
        { width: 200, height: 120 },
        viewport,
        "bottom-start",
      ),
    ).toEqual({ placement: "top-start", position: { x: 120, y: 237 } });
  });

  it("clamps oversized edge positions into the visual viewport", () => {
    expect(
      clampPosition({ x: -40, y: 390 }, { width: 220, height: 100 }, viewport),
    ).toEqual({ x: 8, y: 292 });
  });

  it("snaps only inside the configured threshold", () => {
    expect(
      snapPosition(
        { x: 14, y: 140 },
        { width: 200, height: 100 },
        viewport,
        "nearest-edge",
        12,
      ),
    ).toEqual({ x: 8, y: 140 });
    expect(
      snapPosition(
        { x: 80, y: 140 },
        { width: 200, height: 100 },
        viewport,
        "nearest-edge",
        12,
      ),
    ).toEqual({ x: 80, y: 140 });
  });
});
