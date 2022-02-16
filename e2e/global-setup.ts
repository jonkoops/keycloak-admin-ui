import { chromium } from "@playwright/test";

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:8080");
  await page.fill("#username", "admin");
  await page.fill("#password", "admin");
  await page.click("#kc-login");
  await page.context().storageState({ path: "session.json" });
  await browser.close();
}

export default globalSetup;
