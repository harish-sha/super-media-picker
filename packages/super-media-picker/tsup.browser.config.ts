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
    "browser/super-media-picker.esm": "src/web.ts",
    "browser/super-media-picker.element": "src/element.ts",
  },
  clean: false,
  dts: { resolve: [/^@super-media-picker\//u] },
  external: [],
  format: ["esm"],
  minify: true,
  noExternal: bundledPackages,
  outDir: "dist",
  platform: "browser",
  skipNodeModulesBundle: false,
  sourcemap: false,
  splitting: true,
  target: "es2022",
  esbuildOptions(options) {
    options.chunkNames = "browser/chunks/[name]-[hash]";
  },
});
