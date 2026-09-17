/* global Image, MediaRecorder, document */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "../..");
const source = await readFile(
  resolve(root, "tooling/assets/demo-media-sources/party.png"),
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const bytes = await page.evaluate(async (base64) => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("Canvas is unavailable");
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const stream = canvas.captureStream(15);
    const mimeType = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
    if (mimeType === undefined)
      throw new Error("WebM recording is unavailable");
    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 180_000,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const complete = new Promise((resolveRecording) => {
      recorder.onstop = resolveRecording;
    });
    recorder.start();
    for (let index = 0; index < 18; index += 1) {
      const phase = (index / 18) * Math.PI * 2;
      context.clearRect(0, 0, 160, 160);
      context.save();
      context.translate(80, 80 + Math.sin(phase * 2) * 3);
      context.rotate((Math.sin(phase) * 4 * Math.PI) / 180);
      const scale = 0.93 + Math.sin(phase) * 0.025;
      context.scale(scale, scale);
      context.drawImage(image, -72, -72, 144, 144);
      context.restore();
      await new Promise((resolveFrame) => setTimeout(resolveFrame, 67));
    }
    recorder.stop();
    await complete;
    for (const track of stream.getTracks()) track.stop();
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  }, source.toString("base64"));
  await writeFile(
    resolve(root, "apps/playground/public/media/animated-emoji/party.webm"),
    Uint8Array.from(bytes),
  );
} finally {
  await browser.close();
}

console.log("Built the bounded animated-emoji WebM fixture.");
