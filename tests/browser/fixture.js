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
  animatedEmoji: true,
  favorites: true,
  gifs: true,
  recents: true,
};
declarative.animatedMedia = {
  maxActiveAnimations: 1,
  playback: "on-intent",
  playOnSelect: true,
};
declarative.renderers = {
  animatedMedia: {
    lottie: {
      mount(target, { setState }) {
        const glyph = document.createElement("span");
        glyph.dataset.browserLottie = "true";
        glyph.textContent = "✨";
        target.append(glyph);
        return {
          play() {
            setState("playing");
          },
          pause() {
            setState("paused");
          },
          destroy() {
            glyph.remove();
          },
        };
      },
    },
  },
};
const animatedEmojiPacks = [
  {
    id: "browser-animated",
    name: "Browser animated",
    description: "Self-owned browser parity fixtures",
    iconUrl: "/fixture/media/demo.svg",
    itemCount: 3,
    animated: true,
    searchable: true,
    paginated: false,
    locales: ["en"],
    items: [
      {
        type: "emoji",
        kind: "animated",
        id: "browser-lottie-sparkle",
        name: "Browser Lottie sparkle",
        fallbackEmoji: "✨",
        aliases: ["sparkle-browser"],
        keywords: ["shine"],
        packId: "browser-animated",
        posterUrl: "/fixture/media/demo.svg",
        animationUrl: "/fixture/media/sparkle.lottie.json",
        format: "lottie",
      },
      {
        type: "emoji",
        kind: "animated",
        id: "browser-animated-wave",
        name: "Browser animated wave",
        fallbackEmoji: "👋",
        aliases: ["wave-browser"],
        keywords: ["hello", "browser"],
        packId: "browser-animated",
        posterUrl: "/fixture/media/demo.svg",
        animationUrl: "/demo-media/animated-emoji/party.webm",
        format: "webm",
        width: 160,
        height: 160,
      },
      {
        type: "emoji",
        kind: "animated",
        id: "browser-broken-wave",
        name: "Browser broken wave",
        fallbackEmoji: "👋",
        aliases: ["broken-browser"],
        keywords: ["fallback"],
        packId: "browser-animated",
        posterUrl: "/fixture/media/missing.webp",
        animationUrl: "/fixture/media/missing.webm",
        format: "webm",
      },
    ],
  },
];
declarative.emojiPacks = animatedEmojiPacks;
declarative.providers = { gifs: gifProvider };

for (const eventName of [
  "media-select",
  "picker-open",
  "picker-close",
  "presentation-change",
  "error",
]) {
  document.addEventListener(eventName, (event) => {
    eventLog.textContent =
      `${eventLog.textContent}\n${eventName}:${JSON.stringify(event.detail)}`.trim();
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
  animatedEmojiPacks,
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
