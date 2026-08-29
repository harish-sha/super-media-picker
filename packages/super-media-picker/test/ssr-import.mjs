const root = await import("../dist/index.js");
const headless = await import("../dist/headless.js");
const providers = await import("../dist/providers.js");

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
  if (
    typeof root[name] !== "function" ||
    typeof headless[name] !== "function"
  ) {
    throw new TypeError(`Missing public headless export: ${name}`);
  }
}

if (
  typeof providers.HttpGifProvider !== "function" ||
  typeof providers.HttpStickerProvider !== "function"
) {
  throw new TypeError("Missing public provider adapter exports");
}

console.log("SSR-safe public imports passed");
