# @company/media-themes

Framework-neutral light, dark, system, and custom theme contracts for the media picker. The token API maps intentional theme properties to the public `--mp-*` CSS custom-property namespace.

```ts
import {
  resolveMediaPickerTheme,
  themeTokensToCssVariables,
} from "@company/media-themes";

const theme = resolveMediaPickerTheme({
  mode: "dark",
  tokens: { accent: "#8aa4ff", radiusLarge: "0.75rem" },
});

themeTokensToCssVariables(theme.tokens);
```

Import `@company/media-themes/tokens.css` when consuming the token defaults without the React package.
