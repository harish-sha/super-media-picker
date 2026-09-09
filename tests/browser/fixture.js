const eventLog = document.querySelector("#event-log");
const declarative = document.querySelector("#declarative-picker");

const gifProvider = new globalThis.SuperMediaPicker.HttpGifProvider({
  endpoint: "/fixture/api/gifs",
  attribution: {
    label: "Browser fixture media",
    url: "https://example.test/fixture-attribution",
  },
});

declarative.features = {
  favorites: true,
  gifs: true,
  recents: true,
};
declarative.providers = { gifs: gifProvider };

for (const eventName of [
  "media-select",
  "picker-open",
  "picker-close",
  "presentation-change",
  "error",
]) {
  document.addEventListener(eventName, (event) => {
    eventLog.textContent = `${eventName}:${JSON.stringify(event.detail)}`;
  });
}

const browserModule =
  await import("/npm/super-media-picker@candidate/dist/browser/super-media-picker.esm.js");
browserModule.defineCustomElement();
const elementModule =
  await import("/npm/super-media-picker@candidate/dist/browser/super-media-picker.element.js");
elementModule.defineCustomElement();

let esmController = browserModule.create({
  target: "#esm-target",
  dimensions: { width: 360, height: 440 },
  displayMode: "inline",
  mode: "full",
  motion: "none",
  storageNamespace: "browser-esm",
  theme: "light",
});

let globalController = globalThis.SuperMediaPicker.create({
  target: "#global-target",
  allowExpand: true,
  mode: "compact",
  motion: "none",
  storageNamespace: "browser-global",
  theme: "system",
});

globalThis.browserFixture = {
  browserModule,
  declarative,
  gifProvider,
  get esmController() {
    return esmController;
  },
  get globalController() {
    return globalController;
  },
  recreateEsm() {
    esmController.destroy();
    esmController = browserModule.create({
      target: "#esm-target",
      mode: "compact",
      motion: "none",
      storageNamespace: "browser-esm",
    });
    return esmController;
  },
  recreateGlobal() {
    globalController.destroy();
    globalController = globalThis.SuperMediaPicker.create({
      target: "#global-target",
      mode: "compact",
      motion: "none",
      storageNamespace: "browser-global",
    });
    return globalController;
  },
};

document.querySelector("#fixture-status").textContent = "Browser SDK ready";
globalThis.dispatchEvent(new Event("browser-fixture-ready"));
