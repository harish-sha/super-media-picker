import { defineConfig } from "tsup";

const bundledPackages = [
  "@super-media-picker/core",
  "@super-media-picker/emoji",
  "@super-media-picker/gif",
  "@super-media-picker/react",
  "@super-media-picker/stickers",
  "@super-media-picker/themes",
  "react",
  "react-dom",
  "react/jsx-runtime",
];

export default defineConfig({
  entry: {
    "browser/super-media-picker.global": "src/browser-global.ts",
  },
  clean: false,
  dts: false,
  external: [],
  format: ["iife"],
  minify: true,
  noExternal: bundledPackages,
  outDir: "dist",
  outExtension() {
    return { js: ".js" };
  },
  platform: "browser",
  skipNodeModulesBundle: false,
  sourcemap: false,
  splitting: false,
  target: "es2022",
});
