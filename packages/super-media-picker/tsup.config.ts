import { defineConfig } from "tsup";

const internalPackages = [
  "@super-media-picker/core",
  "@super-media-picker/emoji",
  "@super-media-picker/gif",
  "@super-media-picker/react",
  "@super-media-picker/stickers",
  "@super-media-picker/themes",
];

export default defineConfig({
  entry: {
    index: "src/index.ts",
    headless: "src/headless.ts",
    providers: "src/providers.ts",
  },
  clean: true,
  dts: { resolve: [/^@super-media-picker\//u] },
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
  ],
  format: ["esm"],
  noExternal: internalPackages,
  platform: "browser",
  sourcemap: false,
  splitting: true,
  target: "es2022",
});
