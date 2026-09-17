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

// `rem` inside a shadow tree still resolves against the host document root.
// Compile the browser-only defaults to pixels so hostile page typography cannot
// inflate or clip an otherwise isolated custom element. Browser zoom and
// consumer-provided CSS custom-property overrides continue to work normally.
function isolateRootRelativeUnits(value) {
  return value.replace(/(-?(?:\d+\.?\d*|\.\d+))rem\b/gu, (_, amount) => {
    const pixels = Number(amount) * 16;
    return `${Number(pixels.toFixed(4))}px`;
  });
}

function compactBrowserCss(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

await writeFile(destination, combinedCss, "utf8");
await mkdir(new URL("../dist/browser/", import.meta.url), { recursive: true });
await writeFile(
  browserDestination,
  compactBrowserCss(
    isolateRootRelativeUnits(`${browserCss.trim()}\n\n${combinedCss}`),
  ),
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
