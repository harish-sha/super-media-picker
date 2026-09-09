import {
  configureBrowserAssetBase,
  defineSuperMediaPicker,
} from "../../react/src/browser";

configureBrowserAssetBase(import.meta.url);
defineSuperMediaPicker();

export {
  createSuperMediaPicker as create,
  defineSuperMediaPicker as defineCustomElement,
  SUPER_MEDIA_PICKER_TAG,
  SuperMediaPickerElement,
} from "../../react/src/browser";
export type {
  SuperMediaPickerController,
  SuperMediaPickerErrorDetail,
  SuperMediaPickerEventMap,
  SuperMediaPickerEvent,
  SuperMediaPickerInteractions,
  SuperMediaPickerOptions,
  SuperMediaPickerPresentationDetail,
} from "../../react/src/browser";
