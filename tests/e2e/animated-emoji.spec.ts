import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.getByRole("button", { name: "Full picker" }).click();
});

test("uses poster-first playback for mouse, keyboard, and touch intent without layout shift", async ({
  page,
}) => {
  const item = page.getByRole("button", {
    name: "Animated party",
    exact: true,
  });
  const visual = item.locator(".mp-animated-media");
  await expect(item.locator(".mp-animated-media__poster img")).toHaveAttribute(
    "src",
    "/media/animated-emoji/party.webp",
  );
  const idleBox = await item.boundingBox();

  await item.hover();
  await expect(
    item.locator(".mp-animated-media__animation img"),
  ).toHaveAttribute("src", "/media/animated-emoji/party.gif");
  await expect(visual).toHaveAttribute("data-active", "true");
  const activeBox = await item.boundingBox();
  expect(activeBox?.width).toBe(idleBox?.width);
  expect(activeBox?.height).toBe(idleBox?.height);

  await page.getByRole("heading", { level: 1 }).hover();
  await expect(item.locator(".mp-animated-media__poster img")).toHaveAttribute(
    "src",
    "/media/animated-emoji/party.webp",
  );
  await item.focus();
  await expect(visual).toHaveAttribute("data-active", "true");

  await page.getByRole("searchbox", { name: "Search emoji" }).focus();
  await visual.dispatchEvent("pointerdown", {
    bubbles: true,
    pointerId: 42,
    pointerType: "touch",
  });
  await expect(visual).toHaveAttribute("data-active", "true");
  await visual.dispatchEvent("pointerup", {
    bubbles: true,
    pointerId: 42,
    pointerType: "touch",
  });

  await item.click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"id": "animated-party"',
  );
  await expect(page.getByTestId("selection-output")).toContainText(
    '"fallbackEmoji": "🥳"',
  );
});

test("searches pack aliases and keywords and uses deterministic renderer fallbacks", async ({
  page,
}) => {
  const packButton = page.getByRole("button", {
    name: /Choose emoji pack/,
  });
  await packButton.click();
  await page
    .getByRole("listbox", { name: "Emoji packs" })
    .getByRole("option", { name: "Demo reactions" })
    .click();

  const search = page.getByRole("searchbox", { name: "Search emoji" });
  await search.fill("confetti");
  await expect(
    page.getByRole("button", { name: "Animated party", exact: true }),
  ).toBeVisible();
  await search.fill("party-video");
  await expect(
    page.getByRole("button", { name: "Animated party WebM", exact: true }),
  ).toBeVisible();

  await search.fill("love");
  const heart = page.getByRole("button", {
    name: "Animated heart",
    exact: true,
  });
  await heart.hover();
  await expect(
    heart.locator(".mp-animated-media__animation img"),
  ).toHaveAttribute("src", "/media/animated-emoji/heart-animated.webp");

  await search.fill("hello");
  await expect(
    page.getByRole("button", { name: "Animated wave", exact: true }),
  ).toBeVisible();

  await search.fill("sparkle");
  const lottie = page.getByRole("button", {
    name: "Animated sparkle Lottie",
    exact: true,
  });
  await lottie.focus();
  await expect(lottie.locator(".demo-lottie-glyph")).toHaveText("✨");

  await search.fill("broken-wave");
  const broken = page.getByRole("button", {
    name: "Broken wave fallback",
    exact: true,
  });
  await broken.hover();
  await expect(broken.locator("[data-media-fallback='unicode']")).toHaveText(
    "👋",
  );
});

test("bounds active animations and reduced motion keeps every item static", async ({
  page,
}) => {
  await page.getByLabel("Playback policy").selectOption("always");
  await page
    .getByRole("button", { name: "Animated party WebM", exact: true })
    .scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.locator('.mp-animated-media[data-active="true"]').count())
    .toBeGreaterThan(0);
  expect(
    await page.locator('.mp-animated-media[data-active="true"]').count(),
  ).toBeLessThanOrEqual(3);

  await page.getByLabel("Simulate reduced motion").check();
  await expect(
    page.locator('.mp-animated-media[data-active="true"]'),
  ).toHaveCount(0);
  await expect(page.getByTestId("resolved-reduced-motion")).toContainText(
    "reduced",
  );
  const party = page.getByRole("button", {
    name: "Animated party",
    exact: true,
  });
  await party.hover();
  await expect(party.locator(".mp-animated-media__poster img")).toHaveAttribute(
    "src",
    "/media/animated-emoji/party.webp",
  );
});
