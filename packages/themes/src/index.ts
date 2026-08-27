export type MediaPickerThemeMode = "light" | "dark" | "system";

export interface MediaPickerThemeTokens {
  readonly background?: string;
  readonly surface?: string;
  readonly surfaceHover?: string;
  readonly text?: string;
  readonly textMuted?: string;
  readonly border?: string;
  readonly accent?: string;
  readonly focusRing?: string;
  readonly shadow?: string;
  readonly radiusSmall?: string;
  readonly radiusMedium?: string;
  readonly radiusLarge?: string;
  readonly fontFamily?: string;
  readonly fontSize?: string;
  readonly spacingSmall?: string;
  readonly spacingMedium?: string;
  readonly spacingLarge?: string;
  readonly cellSize?: string;
}

export interface MediaPickerCustomTheme {
  readonly mode: MediaPickerThemeMode;
  readonly tokens?: MediaPickerThemeTokens;
}

export type MediaPickerTheme = MediaPickerThemeMode | MediaPickerCustomTheme;

export interface ResolvedMediaPickerTheme {
  readonly mode: MediaPickerThemeMode;
  readonly tokens: MediaPickerThemeTokens;
}

export function resolveMediaPickerTheme(
  theme: MediaPickerTheme = "system",
): ResolvedMediaPickerTheme {
  return typeof theme === "string"
    ? { mode: theme, tokens: {} }
    : { mode: theme.mode, tokens: theme.tokens ?? {} };
}

const tokenVariables = {
  background: "--mp-background",
  surface: "--mp-surface",
  surfaceHover: "--mp-surface-hover",
  text: "--mp-text",
  textMuted: "--mp-text-muted",
  border: "--mp-border",
  accent: "--mp-accent",
  focusRing: "--mp-focus-ring",
  shadow: "--mp-shadow",
  radiusSmall: "--mp-radius-sm",
  radiusMedium: "--mp-radius-md",
  radiusLarge: "--mp-radius-lg",
  fontFamily: "--mp-font-family",
  fontSize: "--mp-font-size",
  spacingSmall: "--mp-spacing-sm",
  spacingMedium: "--mp-spacing-md",
  spacingLarge: "--mp-spacing-lg",
  cellSize: "--mp-cell-size",
} as const satisfies Record<keyof MediaPickerThemeTokens, `--mp-${string}`>;

export function themeTokensToCssVariables(
  tokens: MediaPickerThemeTokens,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(tokens).flatMap(([key, value]) =>
      value === undefined
        ? []
        : [[tokenVariables[key as keyof MediaPickerThemeTokens], value]],
    ),
  );
}
