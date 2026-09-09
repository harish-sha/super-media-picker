import { expect, test } from "@playwright/test";

const fixtureUrl = "http://127.0.0.1:4174/";

test("preserves Shadow DOM Escape, focus restoration, and instance state", async ({
  page,
}) => {
  await page.goto(fixtureUrl);
  await expect(page.locator("#fixture-status")).toHaveText("Browser SDK ready");
  const declarative = page.locator("#declarative-picker");
  const esm = page.locator("#esm-target super-media-picker");

  await declarative.evaluate((element) => {
    element.setAttribute("display-mode", "modal");
  });
  const expand = declarative.getByRole("button", {
    name: "Open full media picker",
  });
  await expand.click();
  await expect(
    declarative.getByRole("dialog", { name: "Media picker" }),
  ).toBeVisible();

  const declarativeSearch = declarative.getByRole("searchbox", {
    name: "Search emoji",
  });
  await declarativeSearch.fill("thumb");
  const esmSearch = esm.getByRole("searchbox", { name: "Search emoji" });
  await esmSearch.fill("rocket");
  await expect(declarativeSearch).toHaveValue("thumb");
  await expect(esmSearch).toHaveValue("rocket");

  await declarativeSearch.focus();
  await page.keyboard.press("Escape");
  await expect(
    declarative.getByRole("toolbar", { name: "Quick reactions" }),
  ).toBeVisible();
  await expect(expand).toBeFocused();
  await expect(esmSearch).toHaveValue("rocket");
});
