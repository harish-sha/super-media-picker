import {
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
const temporaryDirectory = mkdtempSync(join(tmpdir(), "smp-beta-install-"));
const tarballDirectory = join(temporaryDirectory, "tarball");
const sampleDirectory = join(temporaryDirectory, "sample-app");

function run(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${arguments_.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout.trim();
}

function installedVersion(packageName) {
  const relativeManifest = join(
    "node_modules",
    ...packageName.split("/"),
    "package.json",
  );
  for (const base of [packageDirectory, repositoryRoot]) {
    try {
      return JSON.parse(readFileSync(join(base, relativeManifest), "utf8"))
        .version;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw error;
    }
  }
  throw new Error(`Could not resolve installed version of ${packageName}`);
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
        name: "super-media-picker-external-install-test",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies: {
          react: installedVersion("react"),
          "react-dom": installedVersion("react-dom"),
          "super-media-picker": `file:${packed.filename}`,
        },
        devDependencies: {
          "@types/react": installedVersion("@types/react"),
          "@types/react-dom": installedVersion("@types/react-dom"),
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
          exactOptionalPropertyTypes: true,
          jsx: "react-jsx",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        include: ["index.tsx"],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(sampleDirectory, "index.tsx"),
    `import {
  EmojiPicker,
  GifPicker,
  MediaPicker,
  ReactionPicker,
  StickerPicker,
  type GifMediaItem,
  type MediaItem,
  type StickerMediaItem,
} from "super-media-picker";
import {
  useEmojiSearch,
  useFavorites,
  useGifSearch,
  useMediaPicker,
  useRecents,
  useStickerSearch,
} from "super-media-picker/headless";
import {
  HttpCustomMediaProvider,
  HttpEmojiProvider,
  HttpGifProvider,
  HttpStickerProvider,
  type GifProvider,
  type StickerProvider,
} from "super-media-picker/providers";
import "super-media-picker/styles.css";

declare const gifProvider: GifProvider;
declare const stickerProvider: StickerProvider;
declare const handleMedia: (item: MediaItem) => void;
declare const handleGif: (item: GifMediaItem) => void;
declare const handleSticker: (item: StickerMediaItem) => void;

new HttpGifProvider({ endpoint: "/api/media/gifs" });
new HttpStickerProvider({ endpoint: "/api/media/stickers" });
const emojiProvider = new HttpEmojiProvider({ endpoint: "/api/media/emoji" });
const customProvider = new HttpCustomMediaProvider({
  endpoint: "/api/media/custom",
  displayName: "Company media",
});
void useMediaPicker;
void useEmojiSearch;
void useGifSearch;
void useStickerSearch;
void useRecents;
void useFavorites;

export const surfaces = (
  <>
    <MediaPicker
      features={{ animatedEmoji: true, customMedia: true }}
      onSelect={handleMedia}
      providers={{ animatedEmoji: emojiProvider, custom: customProvider }}
    />
    <EmojiPicker onSelect={handleMedia} />
    <GifPicker provider={gifProvider} onSelect={handleGif} />
    <StickerPicker provider={stickerProvider} onSelect={handleSticker} />
    <ReactionPicker source="frequent" onSelect={handleMedia} />
  </>
);
`,
  );
  writeFileSync(
    join(sampleDirectory, "verify.mjs"),
    `import { readFile } from "node:fs/promises";

const root = await import("super-media-picker");
const headless = await import("super-media-picker/headless");
const providers = await import("super-media-picker/providers");

for (const name of ["MediaPicker", "EmojiPicker", "GifPicker", "StickerPicker", "ReactionPicker"]) {
  if (typeof root[name] !== "function") throw new TypeError(\`Missing component: \${name}\`);
}
for (const name of ["useMediaPicker", "useEmojiSearch", "useGifSearch", "useStickerSearch", "useRecents", "useFavorites"]) {
  if (typeof headless[name] !== "function") throw new TypeError(\`Missing hook: \${name}\`);
}
for (const name of ["HttpGifProvider", "HttpStickerProvider", "HttpEmojiProvider", "HttpCustomMediaProvider", "HttpProviderTransport", "MockGifProvider", "MockStickerProvider"]) {
  if (typeof providers[name] !== "function") throw new TypeError(\`Missing provider: \${name}\`);
}

const stylePath = import.meta.resolve("super-media-picker/styles.css");
const styles = await readFile(new URL(stylePath), "utf8");
if (!styles.includes(".mp-picker") || styles.includes("@super-media-picker/")) {
  throw new TypeError("Published stylesheet is incomplete or has internal imports");
}

const manifest = JSON.parse(
  await readFile(new URL("./node_modules/super-media-picker/package.json", import.meta.url), "utf8"),
);
for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
  if (Object.keys(manifest[section] ?? {}).some((name) => name.startsWith("@super-media-picker/"))) {
    throw new TypeError("Published package has an internal workspace package in " + section);
  }
}
console.log("External tarball install, exports, SSR imports, styles, and types passed");
`,
  );

  run(
    "pnpm",
    ["install", "--offline", "--ignore-scripts", "--no-frozen-lockfile"],
    sampleDirectory,
  );
  run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], sampleDirectory);
  const verification = run("node", ["verify.mjs"], sampleDirectory);
  console.log(verification);
  console.log(
    `Installed ${packed.name}@${packed.version} from ${packed.filename}`,
  );
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
