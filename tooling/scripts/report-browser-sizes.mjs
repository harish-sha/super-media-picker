import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const distributionRoot = join(
  repositoryRoot,
  "packages/super-media-picker/dist/browser",
);

const files = readdirSync(distributionRoot, { recursive: true })
  .filter((file) => typeof file === "string")
  .map((file) => join(distributionRoot, file))
  .filter((file) => statSync(file).isFile());

function matchOne(pattern, label) {
  const matches = files.filter((file) => pattern.test(basename(file)));
  if (matches.length !== 1)
    throw new Error(`${label} expected one artifact, found ${matches.length}`);
  return matches[0];
}

function staticGraph(entry) {
  const visited = new Set();
  const visit = (file) => {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    const imports = source.matchAll(/\b(?:from|import)\s*["'](\.[^"']+)["']/gu);
    for (const match of imports) {
      const specifier = match[1];
      if (specifier !== undefined) visit(resolve(dirname(file), specifier));
    }
  };
  visit(entry);
  return [...visited];
}

function metrics(artifactFiles) {
  return artifactFiles.reduce(
    (total, file) => {
      const content = readFileSync(file);
      total.raw += content.byteLength;
      total.gzip += gzipSync(content, { level: 9 }).byteLength;
      total.brotli += brotliCompressSync(content).byteLength;
      return total;
    },
    { raw: 0, gzip: 0, brotli: 0 },
  );
}

const esmEntry = join(distributionRoot, "super-media-picker.esm.js");
const elementEntry = join(distributionRoot, "super-media-picker.element.js");
const measurements = [
  {
    name: "Browser ESM initial graph",
    files: staticGraph(esmEntry),
    budget: { raw: 280_000, gzip: 90_000, brotli: 80_000 },
  },
  {
    name: "Web Component initial graph",
    files: staticGraph(elementEntry),
    budget: { raw: 280_000, gzip: 90_000, brotli: 80_000 },
  },
  {
    name: "Global JS standalone",
    files: [join(distributionRoot, "super-media-picker.global.js")],
    budget: { raw: 830_000, gzip: 180_000, brotli: 150_000 },
  },
  {
    name: "Browser stylesheet",
    files: [join(distributionRoot, "styles.css")],
    budget: { raw: 35_000, gzip: 6_000, brotli: 5_500 },
  },
  {
    name: "Lazy presentation chunk",
    files: [matchOne(/^AdvancedPresentation-.*\.js$/u, "presentation")],
    budget: { raw: 15_000, gzip: 5_000, brotli: 4_500 },
  },
  {
    name: "Lazy Genie chunk",
    files: [matchOne(/^GenieTransition-.*\.js$/u, "Genie")],
    budget: { raw: 4_000, gzip: 1_700, brotli: 1_500 },
  },
];

function format(bytes) {
  return `${(bytes / 1_000).toFixed(2)} kB`;
}

let failed = false;
console.log("Browser SDK bundle budgets (raw / gzip / Brotli)");
for (const measurement of measurements) {
  const size = metrics(measurement.files);
  const exceeded = Object.entries(measurement.budget).filter(
    ([encoding, limit]) => size[encoding] > limit,
  );
  console.log(
    `${measurement.name}: ${format(size.raw)} / ${format(size.gzip)} / ${format(size.brotli)} (${measurement.files.length} file${measurement.files.length === 1 ? "" : "s"})`,
  );
  for (const [encoding, limit] of exceeded) {
    failed = true;
    console.error(
      `  ${encoding} exceeds ${format(limit)} by ${format(size[encoding] - limit)}`,
    );
  }
}

const total = metrics(files);
console.log(
  `Complete browser distribution: ${format(total.raw)} / ${format(total.gzip)} / ${format(total.brotli)} (${files.length} files)`,
);
console.log(`Distribution root: ${relative(repositoryRoot, distributionRoot)}`);

if (failed) process.exitCode = 1;
