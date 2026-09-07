import { expect, test, type Page } from "@playwright/test";

async function animatedStyle(page: Page) {
  return page
    .locator(".mp-motion-layer")
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      const animation = element.getAnimations()[0] as
        (Animation & { animationName?: string }) | undefined;
      return {
        animationName: animation?.animationName ?? null,
        opacity: Number(style.opacity),
        transform: style.transform,
      };
    });
}

test("exercises dimensions, drag, resize, motion, and sheet swipe", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Full picker" }).click();
  await page.getByLabel("Width").fill("480");
  await page.getByLabel("Height").fill("520");
  const picker = page.getByRole("region", { name: "Media picker" });
  await expect(picker).toHaveCSS("width", "480px");
  await expect(picker).toHaveCSS("height", "520px");

  await page.getByLabel("Display").selectOption("popover");
  await page.getByLabel("Placement").selectOption("bottom-start");
  await page.getByLabel("Draggable").check();
  const dragHandle = page.getByRole("button", { name: /Move picker/ });
  await expect(dragHandle).toBeVisible();
  await dragHandle.hover();
  const start = await dragHandle.boundingBox();
  expect(start).not.toBeNull();
  const dragStartX = start!.x + start!.width / 2;
  const dragStartY = start!.y + start!.height / 2;
  await page.mouse.move(dragStartX, dragStartY);
  await page.mouse.down();
  await page.mouse.move(dragStartX + 80, dragStartY + 90, { steps: 4 });
  await expect(page.locator(".mp-positioner")).toHaveAttribute(
    "data-active-gesture",
    "dragging",
  );
  await page.mouse.up();
  await expect(page.getByTestId("presentation-position")).not.toHaveText(
    "automatic",
  );

  await page.getByLabel("Display").selectOption("inline");
  await page.getByLabel("Resizable").check();
  const resizeHandle = page.getByRole("button", {
    name: /Resize picker bottom-right/,
  });
  await resizeHandle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("presentation-dimensions")).not.toHaveText(
    "480 × 520",
  );

  await page
    .locator(".playground-controls label")
    .filter({ hasText: /^Motion/u })
    .locator("select")
    .selectOption("spring");
  await page.getByLabel("Simulate reduced motion").check();
  await expect(page.locator(".mp-positioner")).toHaveAttribute(
    "data-motion-preset",
    "none",
  );

  await page.getByLabel("Swipe dismiss").check();
  await page.getByLabel("Display").selectOption("bottom-sheet");
  await expect(
    page.getByRole("dialog", { name: "Media picker" }),
  ).toBeVisible();
  const swipeHandle = page.getByRole("button", {
    name: "Drag down to close picker",
  });
  const sheetStart = await swipeHandle.boundingBox();
  expect(sheetStart).not.toBeNull();
  await page.mouse.move(
    sheetStart!.x + sheetStart!.width / 2,
    sheetStart!.y + sheetStart!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(sheetStart!.x + 10, sheetStart!.y + 150, { steps: 5 });
  await page.mouse.up();
  await expect(
    page.getByRole("searchbox", { name: "Search emoji" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("toolbar", { name: "Quick reactions" }),
  ).toBeVisible();
});

test("runs visible preset properties through enter and exit lifecycles", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Full picker" }).click();
  const positioner = page.locator(".mp-positioner").first();
  const motionSelect = page
    .locator(".playground-controls label")
    .filter({ hasText: /^Motion/u })
    .locator("select");

  for (const preset of ["fade", "spring"] as const) {
    await motionSelect.selectOption(preset);
    await expect(positioner).toHaveAttribute("data-motion-state", "opening");
    const before = await animatedStyle(page);
    expect(before.animationName).toBe(`mp-motion-${preset}`);
    await page.waitForTimeout(55);
    const during = await animatedStyle(page);
    expect(
      Math.abs(before.opacity - during.opacity) > 0.01 ||
        before.transform !== during.transform,
    ).toBe(true);
    await expect(positioner).toHaveAttribute("data-motion-state", "open");
  }

  await motionSelect.selectOption("fade");
  await expect(positioner).toHaveAttribute("data-motion-state", "open");
  await page.getByRole("searchbox", { name: "Search emoji" }).focus();
  await page.keyboard.press("Escape");
  await expect(positioner).toHaveAttribute("data-mode", "compact");
  await expect(positioner).toHaveAttribute("data-motion-state", "opening");
  expect((await animatedStyle(page)).animationName).toBe("mp-motion-fade");
  await expect(positioner).toHaveAttribute(
    "data-transition-direction",
    "collapse",
  );

  await motionSelect.selectOption("none");
  await expect(positioner).toHaveAttribute("data-motion-state", "open");
  expect((await animatedStyle(page)).animationName).toBeNull();
});

test("renders the experimental genie as a temporary sliced deformation", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const metrics = {
      cumulativeLayoutShift: 0,
      externalLayoutShift: 0,
      layoutShiftSources: [] as string[],
      longTasks: [] as number[],
    };
    Object.assign(window, { __genieMetrics: metrics });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          sources?: readonly { readonly node?: Node }[];
          value?: number;
        };
        if (!shift.hadRecentInput) {
          metrics.cumulativeLayoutShift += shift.value ?? 0;
          const external = (shift.sources ?? []).some(({ node }) => {
            const element =
              node instanceof Element ? node : node?.parentElement;
            const selector =
              element?.className || element?.nodeName || "unknown";
            metrics.layoutShiftSources.push(String(selector));
            return element?.closest(".mp-positioner, .mp-genie-proxy") === null;
          });
          if (external) metrics.externalLayoutShift += shift.value ?? 0;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      metrics.longTasks.push(
        ...list.getEntries().map((entry) => entry.duration),
      );
    }).observe({ type: "longtask", buffered: true });
  });
  await page.getByLabel("Display").selectOption("popover");
  const motionSelect = page
    .locator(".playground-controls label")
    .filter({ hasText: /^Motion/u })
    .locator("select");
  await motionSelect.selectOption("genie");
  const positioner = page.locator(".mp-positioner").first();
  await expect(positioner).toHaveAttribute("data-mode", "compact");
  await expect
    .poll(() =>
      positioner.evaluate((element) => element.parentElement === document.body),
    )
    .toBe(true);
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.dataset.genieScrollFixture = "true";
    spacer.style.height = "160vh";
    document.body.append(spacer);
    window.scrollTo(0, 160);
  });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    const metrics = (
      window as typeof window & {
        __genieMetrics: {
          cumulativeLayoutShift: number;
          externalLayoutShift: number;
          layoutShiftSources: string[];
          longTasks: number[];
        };
      }
    ).__genieMetrics;
    metrics.cumulativeLayoutShift = 0;
    metrics.externalLayoutShift = 0;
    metrics.layoutShiftSources.length = 0;
    metrics.longTasks.length = 0;
  });
  const pageGeometry = async () =>
    page.evaluate(() => ({
      bodyHeight: document.body.getBoundingClientRect().height,
      documentHeight: document.documentElement.scrollHeight,
      documentWidth: document.documentElement.scrollWidth,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    }));
  const before = await pageGeometry();
  await page
    .getByRole("button", { name: "Open full media picker" })
    .evaluate((element: HTMLButtonElement) => element.click());
  await expect(positioner).toHaveAttribute("data-mode", "full");
  await expect(positioner).toHaveAttribute("data-genie-ready", "true");
  const proxy = page.getByTestId("genie-transition-proxy");
  await expect(proxy.locator(".mp-genie-proxy__slice")).toHaveCount(6);
  await expect(proxy).toHaveAttribute("aria-hidden", "true");
  await expect(proxy).toHaveAttribute("inert", "");
  await expect(proxy).toHaveCSS("position", "fixed");
  expect(
    await proxy.evaluate((element) => element.parentElement === document.body),
  ).toBe(true);
  expect(await pageGeometry()).toEqual(before);
  const firstGeometry = await proxy.evaluate((element) => {
    const style = element.getAttribute("style") ?? "";
    return [
      "--mp-genie-left",
      "--mp-genie-top",
      "--mp-genie-width",
      "--mp-genie-height",
    ].map((name) =>
      style.match(new RegExp(`${name}:\\s*([^;]+)`, "u"))?.[1]?.trim(),
    );
  });
  const slice = proxy.locator(".mp-genie-proxy__slice").first();
  const changed = await slice.evaluate((element) => {
    const animation = element.getAnimations()[0];
    if (animation === undefined) return false;
    animation.pause();
    animation.currentTime = 0;
    const before = getComputedStyle(element).transform;
    animation.currentTime = 80;
    const during = getComputedStyle(element).transform;
    animation.play();
    return before !== during;
  });
  expect(changed).toBe(true);
  await expect(proxy).toHaveCount(0);

  await page
    .getByRole("button", { name: "Return to compact reactions" })
    .click();
  await expect(positioner).toHaveAttribute("data-mode", "compact");
  await expect(page.getByTestId("genie-transition-proxy")).toHaveCount(1);
  await expect(page.getByTestId("genie-transition-proxy")).toHaveCount(0);
  expect(await pageGeometry()).toEqual(before);

  await page.getByRole("button", { name: "Open full media picker" }).click();
  const repeatedProxy = page.getByTestId("genie-transition-proxy");
  await expect(repeatedProxy).toHaveCount(1);
  expect(
    await repeatedProxy.evaluate((element) => {
      const style = element.getAttribute("style") ?? "";
      return [
        "--mp-genie-left",
        "--mp-genie-top",
        "--mp-genie-width",
        "--mp-genie-height",
      ].map((name) =>
        style.match(new RegExp(`${name}:\\s*([^;]+)`, "u"))?.[1]?.trim(),
      );
    }),
  ).toEqual(firstGeometry);
  await expect(repeatedProxy).toHaveCount(0);
  await page.waitForTimeout(50);
  const performance = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __genieMetrics: {
            cumulativeLayoutShift: number;
            externalLayoutShift: number;
            layoutShiftSources: string[];
            longTasks: number[];
          };
        }
      ).__genieMetrics,
  );
  console.info("genie-performance", JSON.stringify(performance));
  expect(performance.externalLayoutShift).toBe(0);
  expect(
    performance.layoutShiftSources.some((source) => source.includes("genie")),
  ).toBe(false);
  expect(performance.longTasks.filter((duration) => duration >= 50)).toEqual(
    [],
  );
  expect(await pageGeometry()).toEqual(before);
});

test("keeps visited media panels, queries, and scroll state ready", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Full picker" }).click();
  const picker = page.getByRole("region", { name: "Media picker" });
  const emojiScroller = page.locator('[data-media-panel="emoji"] .mp-content');
  await emojiScroller.evaluate((element) => {
    element.scrollTop = 80;
  });
  expect(await emojiScroller.evaluate((element) => element.scrollTop)).toBe(80);
  await page.getByRole("tab", { name: "GIF" }).click();
  await expect(picker).toHaveAttribute("data-active-media-type", "gif");
  const gifPanel = page.locator('[data-media-panel="gif"]');
  const originalGifPanel = await gifPanel.elementHandle();
  await page.getByRole("searchbox", { name: "Search GIFs" }).fill("party");
  await page.waitForTimeout(300);
  await page.getByRole("tab", { name: "Stickers" }).click();
  await expect(gifPanel).toBeHidden();
  await page.getByRole("tab", { name: "GIF" }).click();
  await expect(gifPanel).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Search GIFs" }),
  ).toHaveValue("party");
  expect(
    await originalGifPanel?.evaluate((element) => element.isConnected),
  ).toBe(true);
  await expect(picker).toHaveAttribute(
    "data-loaded-media-types",
    /emoji.*gif.*stickers/u,
  );
  await page.getByRole("tab", { name: "Emoji" }).click();
  expect(await emojiScroller.evaluate((element) => element.scrollTop)).toBe(80);
});
