import { readFile, unlink, writeFile } from "node:fs/promises";

const source = new URL("../../react/src/styles.css", import.meta.url);
const tokensSource = new URL("../../themes/src/tokens.css", import.meta.url);
const destination = new URL("../dist/styles.css", import.meta.url);
const css = await readFile(source, "utf8");
const tokens = await readFile(tokensSource, "utf8");

await writeFile(
  destination,
  `${tokens.trim()}\n\n${css
    .replace(
      /^@import\s+["']@super-media-picker\/themes\/tokens\.css["'];\s*/u,
      "",
    )
    .replace(/\n?\/\*# sourceMappingURL=.*?\*\/\s*$/u, "\n")}`,
  "utf8",
);

try {
  await unlink(new URL("../dist/index.css", import.meta.url));
} catch (error) {
  if (
    !(error instanceof Error) ||
    !("code" in error) ||
    error.code !== "ENOENT"
  )
    throw error;
}
