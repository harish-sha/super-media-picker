import { expect, test } from "@playwright/test";

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
