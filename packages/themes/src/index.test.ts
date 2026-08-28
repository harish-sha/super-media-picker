import { describe, expect, it } from "vitest";

import { resolveMediaPickerTheme, themeTokensToCssVariables } from "./index";

describe("theme utilities", () => {
  it("resolves named and custom themes", () => {
    expect(resolveMediaPickerTheme("dark")).toEqual({
      mode: "dark",
      tokens: {},
    });
    expect(
      resolveMediaPickerTheme({ mode: "light", tokens: { accent: "purple" } }),
    ).toEqual({ mode: "light", tokens: { accent: "purple" } });
  });

  it("maps only supplied tokens to the public CSS variable contract", () => {
    expect(
      themeTokensToCssVariables({
        accent: "purple",
        radiusLarge: "2rem",
      }),
    ).toEqual({ "--mp-accent": "purple", "--mp-radius-lg": "2rem" });
  });
});
