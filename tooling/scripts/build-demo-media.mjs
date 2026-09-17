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
    .modulate({ brightness: options.brightness ?? 1 })
    .rotate(options.angle ?? 0, { background: transparent })
    .png()
    .toBuffer();
  const metadata = await sharp(input).metadata();
  const left =
    Math.round((width - (metadata.width ?? targetWidth)) / 2) +
    Math.round(options.offsetX ?? 0);
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

function conceptSource(accent, markup) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="surface" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${accent}" stop-opacity=".96"/>
        <stop offset="1" stop-color="#111827" stop-opacity=".92"/>
      </linearGradient>
    </defs>
    <circle cx="80" cy="80" r="70" fill="url(#surface)"/>
    <g fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${markup}</g>
  </svg>`);
}

function motionFrame(motion, phase, progress) {
  switch (motion) {
    case "wave":
      return { angle: Math.sin(phase) * 11, offsetX: Math.sin(phase) * 3 };
    case "pulse":
      return { scale: 0.91 + (1 + Math.sin(phase)) * 0.055 };
    case "bounce":
      return {
        offsetY: -Math.abs(Math.sin(phase)) * 10,
        scale: 0.96 + Math.abs(Math.sin(phase)) * 0.035,
      };
    case "burst":
      return {
        angle: Math.sin(phase) * 3,
        scale: 0.8 + Math.sin(progress * Math.PI) * 0.2,
      };
    case "flicker":
      return { brightness: 0.78 + (1 + Math.sin(phase * 2)) * 0.18 };
    case "clap":
      return {
        angle: Math.sin(phase) * 7,
        scale: 0.93 + Math.abs(Math.sin(phase)) * 0.06,
      };
    case "launch":
      return {
        offsetY: -Math.abs(Math.sin(phase)) * 12,
        scale: 0.94 + Math.sin(phase) * 0.025,
      };
    case "pop":
      return { scale: 0.78 + Math.abs(Math.sin(phase / 2)) * 0.22 };
    default:
      return {
        angle: Math.sin(phase) * 3,
        scale: 0.97 + Math.sin(phase) * 0.025,
      };
  }
}

const animatedConcepts = [
  {
    id: "wave",
    accent: "#2563eb",
    motion: "wave",
    markup:
      '<path d="M48 92c16 22 44 28 61 8 12-14 8-34-3-48"/><path d="M55 82 44 62M71 72 64 45M88 70 89 42M103 77l10-24"/>',
  },
  {
    id: "heart",
    accent: "#e11d48",
    motion: "pulse",
    markup: '<path d="M80 119 39 78c-24-28 17-58 41-28 24-30 65 0 41 28Z"/>',
  },
  {
    id: "laugh",
    accent: "#f59e0b",
    motion: "bounce",
    markup:
      '<path d="M48 65c7-8 14-8 21 0M91 65c7-8 14-8 21 0M47 88c20 29 46 29 66 0Z"/>',
  },
  {
    id: "fire",
    accent: "#ea580c",
    motion: "flicker",
    markup:
      '<path d="M81 125c-27 0-43-20-34-45 5-13 17-20 16-39 19 9 31 24 29 42 8-7 12-15 12-25 23 23 18 67-23 67Z"/><path d="M80 118c-12-5-15-20-4-31 1 9 8 11 11 19 2 6-1 10-7 12Z"/>',
  },
  {
    id: "clap",
    accent: "#7c3aed",
    motion: "clap",
    markup:
      '<path d="m48 99 26-54c4-8 16-2 12 7l-9 20 17-30c5-8 16-1 11 8L88 81l18-25c6-8 16 1 10 9l-19 27 13-13c8-8 17 3 10 11l-22 22c-18 18-40 12-50-13Z"/><path d="m38 51-9-9M47 38l-3-14M31 67l-15-2"/>',
  },
  {
    id: "celebrate",
    accent: "#db2777",
    motion: "burst",
    markup:
      '<path d="m64 70-24 52 53-23Z"/><path d="m91 37 2 16M118 51l-13 10M125 82l-17-1M63 30l8 14M37 46l14 9"/>',
  },
  {
    id: "thanks",
    accent: "#0891b2",
    motion: "pulse",
    markup:
      '<path d="M43 105c7-29 13-50 20-64 4-8 15-3 12 5l-8 29 13-38c3-9 15-5 12 4L80 79l17-31c4-8 15-2 11 6L94 85l14-17c6-7 15 2 10 10l-18 28c-13 20-42 26-57-1Z"/>',
  },
  {
    id: "wow",
    accent: "#4f46e5",
    motion: "pop",
    markup:
      '<circle cx="80" cy="80" r="43"/><path d="M58 67h1M101 67h1"/><ellipse cx="80" cy="96" rx="12" ry="17"/>',
  },
  {
    id: "sad",
    accent: "#0284c7",
    motion: "bounce",
    markup:
      '<circle cx="80" cy="80" r="43"/><path d="M58 68h1M101 68h1M59 105c13-16 29-16 42 0M106 80c8 11 7 18 0 22-7-4-8-11 0-22Z"/>',
  },
  {
    id: "angry",
    accent: "#dc2626",
    motion: "wave",
    markup:
      '<circle cx="80" cy="80" r="43"/><path d="m51 61 19 8M109 61l-19 8M59 103c14-11 28-11 42 0"/>',
  },
  {
    id: "rocket",
    accent: "#0f766e",
    motion: "launch",
    markup:
      '<path d="M66 94c-6-29 10-51 39-62 5 30-6 54-32 68Z"/><circle cx="88" cy="59" r="8"/><path d="m65 82-20 5 13 13-3 20 20-20M67 105c-10 2-17 9-20 20 11-3 18-9 20-20Z"/>',
  },
  {
    id: "coffee",
    accent: "#92400e",
    motion: "pulse",
    markup:
      '<path d="M45 66h59v31c0 18-12 27-30 27s-29-9-29-27ZM104 75h8c18 0 18 25 0 25h-8M61 51c-8-10 8-13 0-24M83 51c-8-10 8-13 0-24"/>',
  },
  {
    id: "yes",
    accent: "#16a34a",
    motion: "pop",
    markup: '<path d="m42 82 25 25 52-57"/>',
  },
  {
    id: "no",
    accent: "#be123c",
    motion: "wave",
    markup: '<path d="m48 48 64 64M112 48l-64 64"/>',
  },
  {
    id: "love",
    accent: "#c026d3",
    motion: "pulse",
    markup:
      '<path d="M62 117 35 90c-18-21 13-43 27-21 14-22 45 0 27 21ZM105 78 88 61c-12-14 8-28 17-14 9-14 29 0 17 14Z"/>',
  },
];

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
for (const concept of animatedConcepts) {
  const source = conceptSource(concept.accent, concept.markup);
  const posterPath = resolve(output, `animated-emoji/${concept.id}.webp`);
  const animationPath = resolve(output, `animated-emoji/${concept.id}.gif`);
  await writeWebp(source, posterPath, 160, 160);
  const frames = await Promise.all(
    Array.from({ length: 10 }, (_, index) => {
      const progress = index / 9;
      const phase = progress * Math.PI * 2;
      const motion = motionFrame(concept.motion, phase, progress);
      return cutoutFrame(source, 160, 160, {
        ...motion,
        scale: (motion.scale ?? 1) * 0.98,
      });
    }),
  );
  await writeGif(animationPath, 160, 160, frames, {
    colors: 64,
    delay: 85,
    transparent: true,
  });
}

await sharp(resolve(output, "animated-emoji/heart.gif"), { animated: true })
  .webp({ effort: 4, loop: 0, quality: 72 })
  .toFile(resolve(output, "animated-emoji/heart-animated.webp"));
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
