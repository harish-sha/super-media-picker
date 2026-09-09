import {
  configureBrowserAssetBase,
  createSuperMediaPicker,
  defineSuperMediaPicker,
  SUPER_MEDIA_PICKER_TAG,
  SuperMediaPickerElement,
} from "../../react/src/browser";

configureBrowserAssetBase(import.meta.url);

export {
  createSuperMediaPicker as create,
  defineSuperMediaPicker as defineCustomElement,
  SUPER_MEDIA_PICKER_TAG,
  SuperMediaPickerElement,
};
export type {
  SuperMediaPickerController,
  SuperMediaPickerErrorDetail,
  SuperMediaPickerEventMap,
  SuperMediaPickerEvent,
  SuperMediaPickerInteractions,
  SuperMediaPickerOptions,
  SuperMediaPickerPresentationDetail,
} from "../../react/src/browser";

export * from "./providers";
