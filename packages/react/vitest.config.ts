import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(`../../${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@super-media-picker/core": fromRoot("packages/core/src/index.ts"),
      "@super-media-picker/emoji/compact": fromRoot(
        "packages/emoji/src/compact.ts",
      ),
      "@super-media-picker/emoji": fromRoot("packages/emoji/src/index.ts"),
      "@super-media-picker/themes": fromRoot("packages/themes/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
