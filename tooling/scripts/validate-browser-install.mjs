import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const packageDirectory = join(repositoryRoot, "packages", "super-media-picker");
const temporaryDirectory = mkdtempSync(join(tmpdir(), "smp-browser-install-"));
const tarballDirectory = join(temporaryDirectory, "tarball");
const sampleDirectory = join(temporaryDirectory, "browser-only");

function run(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  if (result.status !== 0)
    throw new Error(
      `${command} ${arguments_.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
    );
  return result.stdout.trim();
}

function installedVersion(packageName) {
  return JSON.parse(
    readFileSync(
      join(repositoryRoot, "node_modules", packageName, "package.json"),
      "utf8",
    ),
  ).version;
}

try {
  mkdirSync(tarballDirectory, { recursive: true });
  mkdirSync(sampleDirectory, { recursive: true });
  const packed = JSON.parse(
    run(
      "pnpm",
      ["pack", "--json", "--pack-destination", tarballDirectory],
      packageDirectory,
    ),
  );

  writeFileSync(
    join(sampleDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "super-media-picker-browser-only-install-test",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies: {
          "super-media-picker": `file:${packed.filename}`,
        },
        devDependencies: {
          typescript: installedVersion("typescript"),
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(sampleDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        include: ["index.ts"],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(sampleDirectory, "index.ts"),
    `import {
  create,
  defineCustomElement,
  HttpGifProvider,
  SUPER_MEDIA_PICKER_TAG,
  SuperMediaPickerElement,
  type SuperMediaPickerOptions,
  type SuperMediaPickerEvent,
} from "super-media-picker/web";
import "super-media-picker/element";

const options: SuperMediaPickerOptions = {
  mode: "compact",
  motion: "spring",
  providers: {
    gifs: new HttpGifProvider({ endpoint: "/api/media/gifs" }),
  },
};
const element = document.createElement(SUPER_MEDIA_PICKER_TAG);
const handleMediaSelect = (event: SuperMediaPickerEvent<"media-select">) => {
  void event.detail.type;
};
element.addEventListener("media-select", handleMediaSelect as EventListener);
void create;
void defineCustomElement;
void SUPER_MEDIA_PICKER_TAG;
void SuperMediaPickerElement;
void options;
`,
  );
  writeFileSync(
    join(sampleDirectory, "verify.mjs"),
    `import { readFile } from "node:fs/promises";

const web = await import("super-media-picker/web");
const element = await import("super-media-picker/element");
for (const api of [web, element]) {
  for (const name of ["create", "defineCustomElement", "SuperMediaPickerElement"]) {
    if (typeof api[name] !== "function") throw new TypeError("Missing browser API: " + name);
  }
}
if ("React" in globalThis || "ReactDOM" in globalThis) {
  throw new TypeError("Standalone browser build leaked a React global");
}
const manifestUrl = new URL("./node_modules/super-media-picker/package.json", import.meta.url);
const packageRoot = new URL("./", manifestUrl);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
for (const path of [manifest.unpkg, manifest.jsdelivr, manifest.exports["./web"].import, manifest.exports["./element"].import]) {
  await readFile(new URL(path.startsWith("./") ? path.slice(2) : path, packageRoot));
}
const globalPath = manifest.unpkg.startsWith("./")
  ? manifest.unpkg.slice(2)
  : manifest.unpkg;
const globalSource = await readFile(new URL(globalPath, packageRoot), "utf8");
if (!globalSource.includes("SuperMediaPicker") || /\\bnew\\s+Function\\b|\\beval\\s*\\(/u.test(globalSource)) {
  throw new TypeError("Global browser build is missing or CSP-incompatible");
}
console.log("Browser-only tarball imports, declarations, global build, and metadata passed");
`,
  );

  run(
    "pnpm",
    [
      "install",
      "--offline",
      "--ignore-scripts",
      "--config.strict-peer-dependencies=false",
      "--no-frozen-lockfile",
      "--config.auto-install-peers=false",
    ],
    sampleDirectory,
  );
  if (existsSync(join(sampleDirectory, "node_modules", "react")))
    throw new Error("Browser-only install unexpectedly installed React");
  run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], sampleDirectory);
  console.log(run("node", ["verify.mjs"], sampleDirectory));
  console.log(
    `Installed standalone ${packed.name}@${packed.version} without React or a bundler`,
  );
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
