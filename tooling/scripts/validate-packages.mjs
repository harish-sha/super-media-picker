import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const outputDirectory = mkdtempSync(join(tmpdir(), "media-picker-pack-"));
const packageDirectories = [
  "core",
  "emoji",
  "themes",
  "react",
  "super-media-picker",
];

function collectExportTargets(value, targets = []) {
  if (typeof value === "string" && value.startsWith("./")) {
    targets.push(value.slice(2));
    return targets;
  }

  if (value && typeof value === "object") {
    for (const child of Object.values(value)) {
      collectExportTargets(child, targets);
    }
  }

  return targets;
}

function readArchiveFile(archive, path) {
  const result = spawnSync("tar", ["-xOf", archive, `package/${path}`], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `Could not inspect packed ${path}`);
  }
  return result.stdout;
}

try {
  for (const packageDirectory of packageDirectories) {
    const workingDirectory = join(repositoryRoot, "packages", packageDirectory);
    const result = spawnSync(
      "pnpm",
      ["pack", "--json", "--pack-destination", outputDirectory],
      {
        cwd: workingDirectory,
        encoding: "utf8",
      },
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "pnpm pack failed");
    }

    const packResult = JSON.parse(result.stdout);
    const archiveFiles = new Set(packResult.files.map(({ path }) => path));
    const sourceFiles = [...archiveFiles].filter(
      (path) => path.startsWith("src/") || path.includes(".test."),
    );
    if (sourceFiles.length > 0) {
      throw new Error(
        `${packResult.name} unexpectedly contains source/test files: ${sourceFiles.join(", ")}`,
      );
    }

    const packedManifest = JSON.parse(
      readArchiveFile(packResult.filename, "package.json"),
    );
    const packedManifestText = JSON.stringify(packedManifest);
    if (packedManifestText.includes("workspace:")) {
      throw new Error(
        `${packResult.name} contains an unresolved workspace range`,
      );
    }

    for (const target of collectExportTargets(packedManifest.exports)) {
      if (!archiveFiles.has(target)) {
        throw new Error(
          `${packResult.name} export target ${target} is missing from its tarball`,
        );
      }
    }

    for (const javascriptFile of [...archiveFiles].filter((path) =>
      path.endsWith(".js"),
    )) {
      const source = readArchiveFile(packResult.filename, javascriptFile);
      const relativeImportPattern =
        /(?:from\s*|import\s*\()\s*["'](\.[^"']+)["']/g;
      for (const match of source.matchAll(relativeImportPattern)) {
        const specifier = match[1];
        if (specifier === undefined) continue;
        const dependency = posix.normalize(
          posix.join(posix.dirname(javascriptFile), specifier),
        );
        if (!archiveFiles.has(dependency)) {
          throw new Error(
            `${packResult.name} internal import ${specifier} from ${javascriptFile} is missing from its tarball`,
          );
        }
      }
    }

    const packedBytes = statSync(packResult.filename).size;
    console.log(
      `${packResult.name}: ${archiveFiles.size} files, ${packedBytes} packed bytes, package graph valid`,
    );
  }
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
