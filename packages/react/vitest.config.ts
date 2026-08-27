import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(`../../${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@company/media-core": fromRoot("packages/core/src/index.ts"),
      "@company/media-emoji": fromRoot("packages/emoji/src/index.ts"),
      "@company/media-themes": fromRoot("packages/themes/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
