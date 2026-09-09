import { expect, test } from "@playwright/test";

const fixtureUrl = "http://127.0.0.1:4174/";

test("persists browser-element tone, recents, and favorites across reload", async ({
  page,
}) => {
  await page.goto(fixtureUrl);
  await expect(page.locator("#fixture-status")).toHaveText("Browser SDK ready");
  const picker = page.locator("#declarative-picker");

  await picker
    .getByRole("button", { name: "Emoji skin tone: Default" })
    .click();
  await picker
    .getByRole("listbox", { name: "Emoji skin tone" })
    .getByRole("option", { name: "Medium", exact: true })
    .click();
  await picker
    .getByRole("button", { name: "thumbs up: medium skin tone" })
    .click();

  await expect
    .poll(() =>
      page.evaluate(() => ({
        recents: localStorage.getItem("browser-declarative:emoji.recents"),
        tone: localStorage.getItem("browser-declarative:emoji.skin-tone"),
      })),
    )
    .toMatchObject({ recents: expect.any(String), tone: expect.any(String) });

  await picker.getByRole("button", { name: "Open full media picker" }).click();
  await picker.getByRole("tab", { name: "Recent", exact: true }).click();
  await expect(
    picker.getByRole("button", {
      name: "thumbs up: medium skin tone",
      exact: true,
    }),
  ).toBeVisible();
  await picker
    .getByRole("button", { name: "Add thumbs up to favorites" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("browser-declarative:emoji.favorites"),
      ),
    )
    .not.toBeNull();

  await page.reload();
  await expect(page.locator("#fixture-status")).toHaveText("Browser SDK ready");
  const reloaded = page.locator("#declarative-picker");
  await expect(
    reloaded.getByRole("button", { name: "Emoji skin tone: Medium" }),
  ).toBeVisible();
  await expect(
    reloaded.getByRole("button", { name: "thumbs up: medium skin tone" }),
  ).toHaveText("👍🏽");
  await reloaded
    .getByRole("button", { name: "Open full media picker" })
    .click();
  await reloaded.getByRole("tab", { name: "Favorites", exact: true }).click();
  await expect(
    reloaded.getByRole("button", {
      name: "thumbs up: medium skin tone",
      exact: true,
    }),
  ).toBeVisible();
});
