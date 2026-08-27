import { expect, test } from "@playwright/test";

test("searches and selects a normalized emoji", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search emoji" }).fill("rocket");
  await page.getByRole("gridcell", { name: /rocket/i }).click();
  await expect(page.getByTestId("selection-output")).toContainText(
    '"type": "emoji"',
  );
});
