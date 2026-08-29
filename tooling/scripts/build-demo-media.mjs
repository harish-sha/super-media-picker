import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import gifencModule from "gifenc";
import sharp from "sharp";

const { GIFEncoder, applyPalette, quantize } = gifencModule;
const root = resolve(import.meta.dirname, "../..");
const sources = resolve(root, "tooling/assets/demo-media-sources");
const output = resolve(root, "apps/playground/public/media");

async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true });
}

async function writeWebp(source, path, width, height, background) {
  await ensureParent(path);
  const image = sharp(source).resize(width, height, {
    fit: "contain",
    background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });
  await image.webp({ effort: 6, quality: 78 }).toFile(path);
}

async function cutoutFrame(source, width, height, options = {}) {
  const scale = options.scale ?? 1;
  const targetWidth = Math.max(1, Math.round(width * 0.84 * scale));
  const targetHeight = Math.max(1, Math.round(height * 0.84 * scale));
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const input = await sharp(source)
    .resize(targetWidth, targetHeight, {
      fit: "contain",
      background: transparent,
    })
    .rotate(options.angle ?? 0, { background: transparent })
    .png()
    .toBuffer();
  const metadata = await sharp(input).metadata();
  const left = Math.round((width - (metadata.width ?? targetWidth)) / 2);
  const top =
    Math.round((height - (metadata.height ?? targetHeight)) / 2) +
    Math.round(options.offsetY ?? 0);
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: options.background ?? transparent,
    },
  })
    .composite([{ input, left, top }])
    .raw()
    .toBuffer();
}

async function sceneFrame(source, width, height, scale, brightness) {
  const resizedWidth = Math.ceil(width * scale);
  const resizedHeight = Math.ceil(height * scale);
  return sharp(source)
    .resize(resizedWidth, resizedHeight, { fit: "cover" })
    .extract({
      left: Math.floor((resizedWidth - width) / 2),
      top: Math.floor((resizedHeight - height) / 2),
      width,
      height,
    })
    .modulate({ brightness })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

async function writeGif(path, width, height, frames, options = {}) {
  await ensureParent(path);
  const encoder = GIFEncoder();
  const format = options.transparent ? "rgba4444" : "rgb565";
  for (const frame of frames) {
    const palette = quantize(frame, options.colors ?? 128, {
      format,
      ...(options.transparent ? { clearAlpha: true, oneBitAlpha: true } : {}),
    });
    const indexed = applyPalette(frame, palette, format);
    const transparentIndex = options.transparent
      ? palette.findIndex((color) => color[3] === 0)
      : -1;
    encoder.writeFrame(indexed, width, height, {
      palette,
      delay: options.delay ?? 90,
      repeat: 0,
      ...(transparentIndex < 0
        ? {}
        : { dispose: 2, transparent: true, transparentIndex }),
    });
  }
  encoder.finish();
  await writeFile(path, encoder.bytes());
}

const partySource = resolve(sources, "party.png");
const bearSource = resolve(sources, "bear.png");
const catSource = resolve(sources, "cat.png");
const celebrationSource = resolve(sources, "celebration.png");

await writeWebp(
  partySource,
  resolve(output, "animated-emoji/party.webp"),
  160,
  160,
);
await writeWebp(bearSource, resolve(output, "stickers/bear.webp"), 192, 192);
await writeWebp(catSource, resolve(output, "stickers/cat.webp"), 192, 192);
await writeWebp(
  celebrationSource,
  resolve(output, "gifs/celebration-poster.webp"),
  240,
  180,
);
await writeWebp(
  bearSource,
  resolve(output, "gifs/hello-poster.webp"),
  240,
  180,
  "#ccfbf1",
);
await writeWebp(
  celebrationSource,
  resolve(output, "custom/launch.webp"),
  320,
  180,
);
await writeWebp(
  catSource,
  resolve(output, "custom/support.webp"),
  320,
  180,
  "#f3e8ff",
);

const partyFrames = await Promise.all(
  Array.from({ length: 12 }, (_, index) => {
    const phase = (index / 12) * Math.PI * 2;
    return cutoutFrame(partySource, 160, 160, {
      angle: Math.sin(phase) * 4,
      offsetY: Math.sin(phase * 2) * 3,
      scale: 0.96 + Math.sin(phase) * 0.035,
    });
  }),
);
await writeGif(
  resolve(output, "animated-emoji/party.gif"),
  160,
  160,
  partyFrames,
  { colors: 96, delay: 80, transparent: true },
);

const bearFrames = await Promise.all(
  Array.from({ length: 12 }, (_, index) => {
    const phase = (index / 12) * Math.PI * 2;
    return cutoutFrame(bearSource, 192, 192, {
      angle: Math.sin(phase) * 5,
      offsetY: -Math.abs(Math.sin(phase)) * 5,
      scale: 0.97 + Math.cos(phase) * 0.025,
    });
  }),
);
await writeGif(
  resolve(output, "stickers/bear-wave.gif"),
  192,
  192,
  bearFrames,
  { colors: 96, delay: 85, transparent: true },
);

const celebrationFrames = await Promise.all(
  Array.from({ length: 14 }, (_, index) => {
    const phase = (index / 14) * Math.PI * 2;
    return sceneFrame(
      celebrationSource,
      240,
      180,
      1.03 + (1 + Math.sin(phase)) * 0.025,
      0.97 + (1 + Math.cos(phase)) * 0.025,
    );
  }),
);
await writeGif(
  resolve(output, "gifs/celebration.gif"),
  240,
  180,
  celebrationFrames,
  { colors: 128, delay: 90 },
);

const helloFrames = await Promise.all(
  Array.from({ length: 12 }, (_, index) => {
    const phase = (index / 12) * Math.PI * 2;
    return cutoutFrame(bearSource, 240, 180, {
      angle: Math.sin(phase) * 4,
      background: "#0f766e",
      offsetY: Math.sin(phase * 2) * 4,
      scale: 0.92 + Math.cos(phase) * 0.025,
    });
  }),
);
await writeGif(resolve(output, "gifs/hello.gif"), 240, 180, helloFrames, {
  colors: 96,
  delay: 90,
});

console.log("Built the bounded local demo-media fixture set.");
