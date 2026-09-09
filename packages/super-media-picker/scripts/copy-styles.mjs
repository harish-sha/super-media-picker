import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";

const source = new URL("../../react/src/styles.css", import.meta.url);
const browserSource = new URL(
  "../../react/src/browser-styles.css",
  import.meta.url,
);
const tokensSource = new URL("../../themes/src/tokens.css", import.meta.url);
const destination = new URL("../dist/styles.css", import.meta.url);
const browserDestination = new URL(
  "../dist/browser/styles.css",
  import.meta.url,
);
const css = await readFile(source, "utf8");
const browserCss = await readFile(browserSource, "utf8");
const tokens = await readFile(tokensSource, "utf8");
const combinedCss = `${tokens.trim()}\n\n${css
  .replace(
    /^@import\s+["']@super-media-picker\/themes\/tokens\.css["'];\s*/u,
    "",
  )
  .replace(/\n?\/\*# sourceMappingURL=.*?\*\/\s*$/u, "\n")}`;

await writeFile(destination, combinedCss, "utf8");
await mkdir(new URL("../dist/browser/", import.meta.url), { recursive: true });
await writeFile(
  browserDestination,
  `${browserCss.trim()}\n\n${combinedCss}`,
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
