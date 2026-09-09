const root = await import("../dist/index.js");
const headless = await import("../dist/headless.js");
const providers = await import("../dist/providers.js");
const web = await import("../dist/browser/super-media-picker.esm.js");
const element = await import("../dist/browser/super-media-picker.element.js");

for (const name of [
  "MediaPicker",
  "EmojiPicker",
  "GifPicker",
  "StickerPicker",
  "ReactionPicker",
]) {
  if (typeof root[name] !== "function") {
    throw new TypeError(`Missing public component export: ${name}`);
  }
}

for (const name of [
  "useMediaPicker",
  "useEmojiSearch",
  "useGifSearch",
  "useStickerSearch",
  "useRecents",
  "useFavorites",
]) {
  if (typeof headless[name] !== "function") {
    throw new TypeError(`Missing public headless export: ${name}`);
  }
}

if (
  typeof providers.HttpGifProvider !== "function" ||
  typeof providers.HttpStickerProvider !== "function"
) {
  throw new TypeError("Missing public provider adapter exports");
}

for (const browserApi of [web, element]) {
  for (const name of [
    "create",
    "defineCustomElement",
    "SuperMediaPickerElement",
  ]) {
    if (typeof browserApi[name] !== "function")
      throw new TypeError(`Missing SSR-safe browser export: ${name}`);
  }
}
if ("SuperMediaPicker" in globalThis)
  throw new TypeError("Module browser imports unexpectedly created a global");
console.log("SSR-safe public imports passed");
