# @super-media-picker/themes

Framework-neutral light, dark, system, and custom theme contracts for the media picker. The token API maps intentional theme properties to the public `--mp-*` CSS custom-property namespace.

```ts
import {
  resolveMediaPickerTheme,
  themeTokensToCssVariables,
} from "@super-media-picker/themes";

const theme = resolveMediaPickerTheme({
  mode: "dark",
  tokens: { accent: "#8aa4ff", radiusLarge: "0.75rem" },
});

themeTokensToCssVariables(theme.tokens);
```

Import `@super-media-picker/themes/tokens.css` when consuming the token defaults without the public package.
