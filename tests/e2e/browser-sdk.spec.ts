import { expect, test, type Page } from "@playwright/test";

const fixtureUrl = "http://127.0.0.1:4174/";

interface BrowserPickerElement extends HTMLElement {
  dimensions: { width: number; height: number; applyToCompact?: boolean };
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

test("keeps Genie inside the ShadowRoot overlay and respects reduced motion", async ({
  page,
}) => {
  await waitForFixture(page);
  const picker = page.locator("#declarative-picker");
  await picker.evaluate((element) => {
    (element as BrowserPickerElement).motion = "genie";
  });
  await picker.getByRole("button", { name: "Open full media picker" }).click();
  const proxy = picker.getByTestId("genie-transition-proxy");
  await picker
    .getByRole("button", { name: "Return to compact reactions" })
    .click();

  await expect(proxy).toHaveCount(1);
  expect(
    await proxy.evaluate((element) =>
      element.parentElement?.hasAttribute("data-smp-overlay"),
    ),
  ).toBe(true);
  expect(await page.locator("body > .mp-genie-proxy").count()).toBe(0);
  await expect(proxy).toHaveCount(0);

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
