import {
  HttpCustomMediaProvider,
  HttpEmojiProvider,
  HttpGifProvider,
  HttpStickerProvider,
  MediaProviderError,
} from "./providers";
import {
  configureBrowserAssetBase,
  createSuperMediaPicker,
  defineSuperMediaPicker,
  SUPER_MEDIA_PICKER_TAG,
} from "../../react/src/browser";

const scriptUrl =
  typeof document === "undefined"
    ? undefined
    : document.currentScript instanceof HTMLScriptElement
      ? document.currentScript.src
      : undefined;
if (scriptUrl !== undefined && scriptUrl !== "")
  configureBrowserAssetBase(scriptUrl);

defineSuperMediaPicker();

const browserApi = Object.freeze({
  create: createSuperMediaPicker,
  defineCustomElement: defineSuperMediaPicker,
  elementName: SUPER_MEDIA_PICKER_TAG,
  HttpCustomMediaProvider,
  HttpEmojiProvider,
  HttpGifProvider,
  HttpStickerProvider,
  MediaProviderError,
});

if (typeof globalThis !== "undefined" && !("SuperMediaPicker" in globalThis))
  Object.defineProperty(globalThis, "SuperMediaPicker", {
    configurable: true,
    enumerable: true,
    value: browserApi,
    writable: false,
  });
