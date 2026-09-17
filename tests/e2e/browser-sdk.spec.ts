import { expect, test, type Page } from "@playwright/test";

const fixtureUrl = "http://127.0.0.1:4174/";

interface BrowserPickerElement extends HTMLElement {
  animatedMedia: {
    maxActiveAnimations?: number;
    playback?: string;
  };
  dimensions: { width: number; height: number; applyToCompact?: boolean };
  displayMode: string;
  emojiPacks: readonly unknown[];
  features: { animatedEmoji?: boolean };
  mode: string;
  motion: string;
  theme: string;
}

async function waitForFixture(page: Page) {
  await page.goto(fixtureUrl);
  await expect(page.locator("#fixture-status")).toHaveText("Browser SDK ready");
}

test("loads global and ESM browser builds without React or a bundler", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await waitForFixture(page);

  expect(
    await page.evaluate(() => ({
      hasReactGlobal: "React" in globalThis || "ReactDOM" in globalThis,
      pickerGlobal: typeof window.SuperMediaPicker?.create,
      registration: customElements.get("super-media-picker") !== undefined,
    })),
  ).toEqual({
    hasReactGlobal: false,
    pickerGlobal: "function",
    registration: true,
  });

  const declarative = page.locator("#declarative-picker");
  await expect(
    declarative.getByRole("toolbar", { name: "Quick reactions" }),
  ).toBeVisible();
  const styleUrl = await declarative.evaluate((element) =>
    element.shadowRoot
      ?.querySelector("link[data-smp-styles]")
      ?.getAttribute("href"),
  );
  expect(styleUrl).toContain(
    "/npm/super-media-picker@candidate/dist/browser/styles.css",
  );

  const shadowIsolation = await declarative.evaluate((element) => {
    const button = element.shadowRoot?.querySelector("button");
    const picker = element.shadowRoot?.querySelector(".mp-picker");
    if (!(button instanceof HTMLElement) || !(picker instanceof HTMLElement))
      return null;
    return {
      buttonDisplay: getComputedStyle(button).display,
      pickerBoxSizing: getComputedStyle(picker).boxSizing,
      pickerFontSize: getComputedStyle(picker).fontSize,
    };
  });
  expect(shadowIsolation?.buttonDisplay).not.toBe("inline");
  expect(shadowIsolation?.pickerBoxSizing).toBe("border-box");
  expect(shadowIsolation?.pickerFontSize).not.toBe("40px");

  await expect(
    page
      .locator("#esm-target super-media-picker")
      .getByRole("region", { name: "Media picker" }),
  ).toBeVisible();
  await expect(
    page
      .locator("#global-target super-media-picker")
      .getByRole("toolbar", { name: "Quick reactions" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("updates, selects, persists tone, and keeps portals instance-local", async ({
  page,
}) => {
  await waitForFixture(page);
  const picker = page.locator("#declarative-picker");
  await picker.evaluate((element) => {
    const mount =
      element.shadowRoot?.querySelector<HTMLElement>("[data-smp-mount]");
    if (mount !== undefined && mount !== null)
      mount.dataset.rootIdentity = "stable";
  });

  await picker.evaluate((element) => {
    const browserPicker = element as BrowserPickerElement;
    browserPicker.dimensions = {
      width: 410,
      height: 500,
      applyToCompact: true,
    };
    browserPicker.theme = "light";
  });
  await expect(picker.locator(".mp-picker")).toHaveAttribute(
    "data-theme",
    "light",
  );
  await expect(picker.locator(".mp-picker")).toHaveCSS(
    "--mp-picker-width",
    "410px",
  );
  expect(
    await picker.evaluate(
      (element) =>
        element.shadowRoot?.querySelector<HTMLElement>("[data-smp-mount]")
          ?.dataset.rootIdentity,
    ),
  ).toBe("stable");

  await picker
    .getByRole("button", { name: "Emoji skin tone: Default" })
    .click();
  const toneMenu = picker.getByRole("listbox", { name: "Emoji skin tone" });
  await expect(toneMenu).toBeVisible();
  expect(
    await toneMenu.evaluate((element) =>
      element.parentElement?.hasAttribute("data-smp-overlay"),
    ),
  ).toBe(true);
  await toneMenu.getByRole("option", { name: "Medium", exact: true }).click();
  const mediumThumb = picker.getByRole("button", {
    name: "thumbs up: medium skin tone",
  });
  await expect(mediumThumb).toHaveText("👍🏽");
  await mediumThumb.click();
  await expect(page.locator("#event-log")).toContainText("media-select");
  await expect(page.locator("#event-log")).toContainText('"value":"👍🏽"');
  expect(
    await page.evaluate(() =>
      localStorage.getItem("browser-declarative:emoji.skin-tone"),
    ),
  ).not.toBeNull();
});

test("uses provider contracts and preserves lifecycle cleanup", async ({
  page,
}) => {
  await waitForFixture(page);
  const picker = page.locator("#declarative-picker");
  await picker.getByRole("button", { name: "Open full media picker" }).click();
  await expect(
    picker.getByRole("toolbar", { name: "Quick reactions" }),
  ).toHaveCount(0);
  await picker.getByRole("tab", { name: "GIF" }).click();
  await expect(
    picker.getByRole("button", { name: "Browser provider wave", exact: true }),
  ).toBeVisible();
  await picker.getByRole("searchbox", { name: "Search GIFs" }).fill("missing");
  await expect(picker.getByText("No GIFs found for “missing”.")).toBeVisible();
  await picker.getByRole("searchbox", { name: "Search GIFs" }).fill("wave");
  await expect(
    picker.getByRole("button", { name: "Browser provider wave", exact: true }),
  ).toBeVisible();
  await picker
    .getByRole("button", { name: "Browser provider wave", exact: true })
    .click();
  await expect(page.locator("#event-log")).toContainText('"type":"gif"');

  const lifecycle = await page.evaluate(async () => {
    const fixture = window.browserFixture;
    const controller = fixture.globalController;
    controller.update({
      dimensions: { width: 330, height: 400 },
      theme: "dark",
    });
    controller.close();
    const closed = controller.element.isOpen === false;
    controller.open();
    const reopened = controller.element.isOpen === true;
    const oldElement = controller.element;
    const replacement = fixture.recreateGlobal().element;
    await Promise.resolve();
    return {
      closed,
      oldConnected: oldElement.isConnected,
      reopened,
      replacementConnected: replacement.isConnected,
      roots: document.querySelectorAll("#global-target super-media-picker")
        .length,
    };
  });
  expect(lifecycle).toEqual({
    closed: true,
    oldConnected: false,
    reopened: true,
    replacementConnected: true,
    roots: 1,
  });
});

test("renders animated emoji equivalently inside the Web Component Shadow DOM", async ({
  page,
}) => {
  await waitForFixture(page);
  const picker = page.locator("#declarative-picker");
  await picker.getByRole("button", { name: "Open full media picker" }).click();

  const animated = picker.getByRole("button", {
    name: "Browser animated wave",
    exact: true,
  });
  await expect(
    animated.locator(".mp-animated-media__poster img"),
  ).toHaveAttribute("src", "/fixture/media/demo.svg");
  const before = await animated.boundingBox();
  await animated.hover();
  const video = animated.locator("video");
  await expect(video).toBeVisible();
  expect(
    await video.evaluate((element: HTMLVideoElement) => ({
      controls: element.controls,
      muted: element.muted,
      playsInline: element.playsInline,
    })),
  ).toEqual({ controls: false, muted: true, playsInline: true });
  const after = await animated.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);
  expect(
    await animated.evaluate(
      (element) =>
        element.getRootNode() instanceof ShadowRoot &&
        element.closest("super-media-picker") === null,
    ),
  ).toBe(true);

  const lottie = picker.getByRole("button", {
    name: "Browser Lottie sparkle",
    exact: true,
  });
  await lottie.focus();
  await expect(lottie.locator("[data-browser-lottie='true']")).toHaveText("✨");

  await animated.click();
  await expect(page.locator("#event-log")).toContainText(
    '"id":"browser-animated-wave"',
  );
  await expect(page.locator("#event-log")).toContainText(
    '"fallbackEmoji":"👋"',
  );

  const broken = picker.getByRole("button", {
    name: "Browser broken wave",
    exact: true,
  });
  await broken.hover();
  await expect(broken.locator("[data-media-fallback='unicode']")).toHaveText(
    "👋",
  );
  expect(await page.locator("body > .mp-animated-media").count()).toBe(0);
});

test("keeps animated emoji state isolated across multiple browser SDK instances", async ({
  page,
}) => {
  await waitForFixture(page);
  await page.evaluate(() => {
    for (const id of ["animated-instance-a", "animated-instance-b"]) {
      const element = document.createElement(
        "super-media-picker",
      ) as BrowserPickerElement;
      element.id = id;
      element.mode = "full";
      element.displayMode = "inline";
      element.features = { animatedEmoji: true };
      element.animatedMedia = {
        maxActiveAnimations: 1,
        playback: "on-intent",
      };
      element.emojiPacks = window.browserFixture.animatedEmojiPacks;
      document.body.append(element);
    }
  });

  const first = page
    .locator("#animated-instance-a")
    .getByRole("button", { name: "Browser animated wave", exact: true });
  const second = page
    .locator("#animated-instance-b")
    .getByRole("button", { name: "Browser animated wave", exact: true });
  await expect(first.locator(".mp-animated-media__poster img")).toBeVisible();
  await expect(second.locator(".mp-animated-media__poster img")).toBeVisible();

  await first.hover();
  await expect(first.locator("video")).toBeVisible();
  await expect(second.locator("video")).toHaveCount(0);

  await second.hover();
  await expect(second.locator("video")).toBeVisible();
  await expect(first.locator("video")).toHaveCount(0);

  await page.evaluate(() => {
    document.querySelector("#animated-instance-a")?.remove();
    document.querySelector("#animated-instance-b")?.remove();
  });
  expect(await page.locator("body > .mp-animated-media").count()).toBe(0);
});

test("keeps Genie inside the ShadowRoot overlay and respects reduced motion", async ({
  page,
}) => {
  await waitForFixture(page);
  const picker = page.locator("#declarative-picker");
  await picker.evaluate((element) => {
    (element as BrowserPickerElement).motion = "genie";
    const overlay = element.shadowRoot?.querySelector("[data-smp-overlay]");
    if (overlay === null || overlay === undefined) return;
    element.dataset.genieMountCount = "0";
    new MutationObserver((records) => {
      for (const node of records.flatMap((record) => [...record.addedNodes])) {
        if (!(node instanceof Element)) continue;
        const proxy = node.matches(".mp-genie-proxy")
          ? node
          : node.querySelector(".mp-genie-proxy");
        if (proxy === null) continue;
        element.dataset.genieMountCount = String(
          Number(element.dataset.genieMountCount ?? 0) + 1,
        );
        element.dataset.genieInsideOverlay = String(
          proxy.parentElement === overlay,
        );
      }
    }).observe(overlay, { childList: true, subtree: true });
  });
  await expect(picker.locator(".mp-positioner")).toHaveAttribute(
    "data-motion-preset",
    "genie",
  );
  await expect(picker.locator(".mp-positioner")).toHaveAttribute(
    "data-genie-module-ready",
    "true",
  );
  await picker.getByRole("button", { name: "Open full media picker" }).click();
  await expect(picker).toHaveAttribute("data-genie-mount-count", "1");
  await expect(picker).toHaveAttribute("data-genie-inside-overlay", "true");
  await picker
    .getByRole("button", { name: "Return to compact reactions" })
    .click();

  await expect(picker).toHaveAttribute("data-genie-mount-count", "2");
  expect(await page.locator("body > .mp-genie-proxy").count()).toBe(0);
  await expect(picker.getByTestId("genie-transition-proxy")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await picker.getByRole("button", { name: "Open full media picker" }).click();
  await expect(picker.getByTestId("genie-transition-proxy")).toHaveCount(0);
  await expect(picker.locator(".mp-positioner")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
});

declare global {
  interface Window {
    SuperMediaPicker?: {
      create: (options?: unknown) => unknown;
    };
    browserFixture: {
      animatedEmojiPacks: readonly unknown[];
      declarative: HTMLElement;
      globalController: {
        element: HTMLElement & { isOpen: boolean };
        close(): void;
        open(): void;
        update(options: unknown): void;
      };
      recreateGlobal(): {
        element: HTMLElement & { isOpen: boolean };
      };
    };
  }
}
