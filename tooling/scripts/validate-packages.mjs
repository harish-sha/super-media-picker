import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const outputDirectory = mkdtempSync(join(tmpdir(), "media-picker-pack-"));
const packageDirectories = [
  "core",
  "emoji",
  "gif",
  "stickers",
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

    const forbiddenFiles = [...archiveFiles].filter((path) =>
      /(?:^|\/)(?:\.env(?:\.|$)|test-results|playwright-report|storybook-static|public\/media)(?:\/|$)/u.test(
        path,
      ),
    );
    if (forbiddenFiles.length > 0) {
      throw new Error(
        `${packResult.name} contains development artifacts: ${forbiddenFiles.join(", ")}`,
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

    if (packResult.name === "super-media-picker") {
      if (packedManifest.version !== "0.1.0-beta.1") {
        throw new Error(
          `Public package has unexpected beta version ${packedManifest.version}`,
        );
      }
      if (packedManifest.license !== "MIT") {
        throw new Error(
          `Public package has unexpected license ${packedManifest.license}`,
        );
      }
      const packedLicense = readArchiveFile(packResult.filename, "LICENSE");
      if (
        !packedLicense.startsWith("MIT License\n") ||
        !packedLicense.includes("Copyright (c) 2026 Harish Sharma")
      ) {
        throw new Error(
          "Public package does not contain the expected MIT LICENSE",
        );
      }
      const internalDependencies = Object.keys({
        ...(packedManifest.dependencies ?? {}),
        ...(packedManifest.devDependencies ?? {}),
        ...(packedManifest.optionalDependencies ?? {}),
        ...(packedManifest.peerDependencies ?? {}),
      }).filter((name) => name.startsWith("@super-media-picker/"));
      if (internalDependencies.length > 0) {
        throw new Error(
          `Public package depends on unpublished internal packages: ${internalDependencies.join(", ")}`,
        );
      }
      const unexpectedFiles = [...archiveFiles].filter(
        (path) =>
          path !== "LICENSE" &&
          path !== "README.md" &&
          path !== "package.json" &&
          !path.startsWith("dist/"),
      );
      if (unexpectedFiles.length > 0) {
        throw new Error(
          `Public package contains non-release files: ${unexpectedFiles.join(", ")}`,
        );
      }
      const leakedMaps = [...archiveFiles].filter((path) =>
        path.endsWith(".map"),
      );
      if (leakedMaps.length > 0) {
        throw new Error(
          `Public package contains source maps: ${leakedMaps.join(", ")}`,
        );
      }
      for (const emittedFile of [...archiveFiles].filter(
        (path) =>
          path.endsWith(".js") ||
          path.endsWith(".d.ts") ||
          path.endsWith(".css"),
      )) {
        const source = readArchiveFile(packResult.filename, emittedFile);
        if (source.includes("@super-media-picker/")) {
          throw new Error(
            `Public ${emittedFile} references an unpublished internal package`,
          );
        }
      }
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

    for (const emittedFile of [...archiveFiles].filter(
      (path) => path.endsWith(".js") || path.endsWith(".css"),
    )) {
      const source = readArchiveFile(packResult.filename, emittedFile);
      const sourceMapPattern = /sourceMappingURL=([^\s*]+)/gu;
      for (const match of source.matchAll(sourceMapPattern)) {
        const specifier = match[1];
        if (specifier === undefined || specifier.startsWith("data:")) continue;
        const sourceMap = posix.normalize(
          posix.join(posix.dirname(emittedFile), specifier),
        );
        if (!archiveFiles.has(sourceMap)) {
          throw new Error(
            `${packResult.name} source map ${specifier} from ${emittedFile} is missing from its tarball`,
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
