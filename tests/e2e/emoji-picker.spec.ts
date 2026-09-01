import { expect, test } from "@playwright/test";

test("renders sticker pack image and fallback icons in full and standalone pickers", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Full picker" }).click();
  await page.getByRole("tab", { name: "Stickers" }).click();

  let bears = page.getByRole("button", { name: "Bears" });
  let cats = page.getByRole("button", { name: "Cats" });
  await expect(bears.locator(".mp-pack-icon__image")).toHaveAttribute(
    "src",
    "/media/stickers/bear.webp",
  );
  await expect(cats.locator("[data-pack-icon-fallback]")).toBeVisible();
  await expect(cats).not.toContainText("□");

  await page.getByLabel("Theme").selectOption("dark");
  await expect(cats.locator("[data-pack-icon-fallback]")).toBeVisible();

  await page.getByLabel("SDK surface").selectOption("sticker");
  bears = page.getByRole("button", { name: "Bears" });
  cats = page.getByRole("button", { name: "Cats" });
  await expect(bears.locator(".mp-pack-icon__image")).toBeVisible();
  await expect(cats.locator("[data-pack-icon-fallback]")).toBeVisible();
});

test("portals the tone menu beyond clipped compact content and flips in a bottom sheet", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Theme").selectOption("dark");
  const preview = page.locator(".playground-preview");
  await preview.evaluate((element) => {
    element.style.height = "48px";
    element.style.overflow = "hidden";
  });

  let trigger = page.getByRole("button", {
    name: "Emoji skin tone: Default",
  });
  await trigger.click();
  let menu = page.getByRole("listbox", { name: "Emoji skin tone" });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("data-placement", /above|below/);
  expect(
    await menu.evaluate((element) => element.parentElement === document.body),
  ).toBe(true);
  const inlineBoxes = await Promise.all([
    preview.boundingBox(),
    menu.boundingBox(),
  ]);
  expect(inlineBoxes[0]).not.toBeNull();
  expect(inlineBoxes[1]).not.toBeNull();
  const menuEscapesClippedPreview =
    inlineBoxes[1]!.y < inlineBoxes[0]!.y ||
    inlineBoxes[1]!.y + inlineBoxes[1]!.height >
      inlineBoxes[0]!.y + inlineBoxes[0]!.height;
  expect(menuEscapesClippedPreview).toBe(true);
  await expect(menu).toHaveCSS("position", "fixed");
  await expect(menu).toHaveCSS("z-index", "1100");
  await expect(menu).toHaveCSS("background-color", "rgb(25, 27, 31)");
  await expect(
    menu.getByRole("option", { name: "Default", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  trigger = page.getByRole("button", {
    name: "Emoji skin tone: Default",
  });
  await trigger.click();
  menu = page.getByRole("listbox", { name: "Emoji skin tone" });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("data-placement", "above");
  const bottomSheetBoxes = await Promise.all([
    trigger.boundingBox(),
    menu.boundingBox(),
  ]);
  expect(bottomSheetBoxes[0]).not.toBeNull();
  expect(bottomSheetBoxes[1]).not.toBeNull();
  expect(bottomSheetBoxes[1]!.y + bottomSheetBoxes[1]!.height).toBeLessThan(
    bottomSheetBoxes[0]!.y,
  );
});

test("keyboard-selects a reaction, expands, selects from search, and collapses", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const thumbsUp = page.getByRole("button", { name: "thumbs up" });
  await thumbsUp.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("selection-output")).toContainText(
    '"value": "❤️"',
  );

  await page.getByRole("button", { name: "Open full media picker" }).click();
  const search = page.getByRole("searchbox", { name: "Search emoji" });
  await expect(search).toBeVisible();
  await search.fill("rocket");
  await page.getByRole("button", { name: "rocket", exact: true }).click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"value": "🚀"',
  );

  await page
    .getByRole("button", { name: "Return to compact reactions" })
    .click();
  await expect(
    page.getByRole("toolbar", { name: "Quick reactions" }),
  ).toBeVisible();
});

test("retains toned recents and favorites across compact/full reloads", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page.getByRole("button", { name: "Emoji skin tone: Default" }).click();
  const compactToneMenu = page.getByRole("listbox", {
    name: "Emoji skin tone",
  });
  await expect(compactToneMenu).toBeVisible();
  await compactToneMenu
    .getByRole("option", { name: "Medium", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "thumbs up: medium skin tone" }),
  ).toHaveText("👍🏽");
  await page.getByRole("button", { name: "Open full media picker" }).click();
  await expect(
    page.getByRole("button", { name: "Emoji skin tone: Medium" }),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Search emoji" }).fill("thumbs up");
  const mediumThumb = page.getByRole("button", {
    name: "thumbs up: medium skin tone",
    exact: true,
  });
  await expect(mediumThumb).toHaveText("👍🏽");
  await mediumThumb.click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"value": "👍🏽"',
  );
  await page
    .getByRole("button", { name: "Add thumbs up to favorites" })
    .click();
  await page.getByRole("tab", { name: "Favorites" }).click();
  await expect(
    page.getByRole("button", {
      name: "thumbs up: medium skin tone",
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Emoji skin tone: Medium" }).click();
  await page
    .getByRole("listbox", { name: "Emoji skin tone" })
    .getByRole("option", { name: "Dark", exact: true })
    .click();
  const darkThumb = page.getByRole("button", {
    name: "thumbs up: dark skin tone",
    exact: true,
  });
  await expect(darkThumb).toHaveText("👍🏿");
  await expect(darkThumb).not.toContainText("🏽");
  await darkThumb.click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"value": "👍🏿"',
  );

  await page.reload();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page.getByRole("button", { name: "Open full media picker" }).click();
  await expect(
    page.getByRole("button", { name: "Emoji skin tone: Dark" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Favorites" }).click();
  await expect(
    page.getByRole("button", {
      name: "thumbs up: dark skin tone",
      exact: true,
    }),
  ).toBeVisible();
});

test("navigates GIF, sticker, custom, capability, and provider-error flows", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.getByRole("button", { name: "Full picker" }).click();

  const animatedEmoji = page.getByRole("button", {
    name: "Animated party",
    exact: true,
  });
  await expect(animatedEmoji.locator("img")).toHaveAttribute(
    "src",
    "/media/animated-emoji/party.webp",
  );
  await animatedEmoji.hover();
  await expect(animatedEmoji.locator("img")).toHaveAttribute(
    "src",
    "/media/animated-emoji/party.gif",
  );

  await page.getByRole("tab", { name: "GIF" }).click();
  const party = page
    .getByRole("button", { name: "Colorful party animation" })
    .first();
  await expect(party).toBeVisible();
  await expect(party.locator("img")).toHaveAttribute(
    "src",
    "/media/gifs/celebration-poster.webp",
  );
  await party.hover();
  await expect(party.locator("img")).toHaveAttribute(
    "src",
    "/media/gifs/celebration.gif",
  );
  await party.click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"type": "gif"',
  );

  await page.getByRole("tab", { name: "Stickers" }).click();
  await expect(
    page.getByRole("button", { name: "Bear sticker 1", exact: true }),
  ).toBeVisible();
  const animatedSticker = page.getByRole("button", {
    name: "Bear sticker 1",
    exact: true,
  });
  await expect(animatedSticker.locator("img")).toHaveAttribute(
    "src",
    "/media/stickers/bear.webp",
  );
  await animatedSticker.hover();
  await expect(animatedSticker.locator("img")).toHaveAttribute(
    "src",
    "/media/stickers/bear-wave.gif",
  );
  await page.getByRole("button", { name: "Cats" }).click();
  await page
    .getByRole("button", { name: "Cat sticker 1", exact: true })
    .click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"type": "sticker"',
  );

  await page.getByRole("tab", { name: "Custom" }).click();
  const launch = page.getByRole("button", {
    name: "Launch card",
    exact: true,
  });
  await expect(launch.locator("img")).toHaveAttribute(
    "src",
    "/media/custom/launch.webp",
  );
  await launch.click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"type": "custom"',
  );

  await page.getByLabel("Capabilities").selectOption("emoji-only");
  await expect(page.getByRole("tab", { name: "Emoji" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "GIF" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Stickers" })).toHaveCount(0);

  await page.getByLabel("Capabilities").selectOption("all");
  await page.getByLabel("Mock network").selectOption("error");
  await page.getByRole("tab", { name: "GIF" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Mock GIF request failed",
  );
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("uses standalone and headless SDK surfaces with normalized output", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());

  const surface = page.getByLabel("SDK surface");

  await surface.selectOption("emoji");
  await page.getByRole("searchbox", { name: "Search emoji" }).fill("rocket");
  await page.getByRole("button", { name: "rocket", exact: true }).click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"type": "emoji"',
  );

  await surface.selectOption("gif");
  await page
    .getByRole("button", { name: "Colorful party animation" })
    .first()
    .click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"type": "gif"',
  );

  await surface.selectOption("sticker");
  await page
    .getByRole("button", { name: "Bear sticker 1", exact: true })
    .click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"type": "sticker"',
  );

  await surface.selectOption("reaction");
  await page.getByRole("button", { name: "thumbs up", exact: true }).click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"id": "1f44d"',
  );

  await surface.selectOption("headless");
  await page.getByLabel("Search GIFs").fill("party");
  await page
    .getByRole("button", { name: /Party 1/u })
    .first()
    .click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"provider": "mock-gif"',
  );
});

test("emits one intact composite grapheme from one click in StrictMode", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.getByRole("button", { name: "Full picker" }).click();
  await page
    .getByRole("searchbox", { name: "Search emoji" })
    .fill("family man woman girl");
  await page
    .getByRole("button", { name: "family: man, woman, girl", exact: true })
    .click();

  const output = page.getByTestId("selection-output");
  await expect(output).toContainText('"value": "👨‍👩‍👧"');
  expect((await output.textContent())?.match(/👨‍👩‍👧/gu)).toHaveLength(1);
});

test("keeps frequent reactions fixed until remount while persisting counts", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Frequent reactions" }).click();
  const toolbar = page.getByRole("toolbar", { name: "Quick reactions" });
  const labels = async () =>
    toolbar
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute("aria-label")),
      );
  const initialOrder = await labels();
  const foldedHands = page.getByRole("button", { name: "folded hands" });

  for (let index = 0; index < 5; index += 1) {
    await foldedHands.click();
    await expect(foldedHands).toBeFocused();
    expect(await labels()).toEqual(initialOrder);
  }

  await page.reload();
  await page.getByRole("button", { name: "Frequent reactions" }).click();
  await expect(toolbar.getByRole("button").first()).toHaveAttribute(
    "aria-label",
    "folded hands",
  );
});
