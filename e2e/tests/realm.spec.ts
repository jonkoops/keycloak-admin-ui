import { test } from "@playwright/test";

test("fail creating 'master' realm", async ({ page }) => {
  await page.goto("/#/master");
});
