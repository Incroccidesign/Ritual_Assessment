import { expect, test } from "@playwright/test";

test.use({
  launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}
});

test("activity previews open on hover and load only on demand", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/video/activity-previews/")) requested.push(request.url());
  });
  await page.goto("/?locale=en");
  expect(requested).toHaveLength(0);

  for (const name of ["Explore", "Reflect", "Prioritize", "Agree"]) {
    const article = page.getByRole("heading", { name, exact: true }).locator("xpath=ancestor::article");
    await article.hover();
    await expect(article.getByRole("button", { name, exact: true })).toHaveAttribute("aria-expanded", "true");
    const video = article.locator("video");
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute("src", `/video/activity-previews/${name.toLowerCase()}.webm`);
    await expect(video).not.toHaveAttribute("controls");
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => {
      const { width, height } = element.getBoundingClientRect();
      return Math.abs(height - width * element.videoHeight / element.videoWidth);
    })).toBeLessThan(1);
    await page.mouse.move(0, 0);
    await expect(article.getByRole("button", { name, exact: true })).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => article.locator(`#activity-preview-${name.toLowerCase()}`).evaluate((element) => element.getBoundingClientRect().height)).toBe(0);
  }
  const plan = page.getByRole("heading", { name: "Plan", exact: true }).locator("xpath=ancestor::article");
  await plan.hover();
  const planImage = plan.getByRole("img", { name: "Plan" });
  await expect(planImage).toBeVisible();
  await expect(planImage).toHaveAttribute("src", /plan\.webp/);
  await expect(planImage).toHaveAttribute("width", "1917");
  await expect(planImage).toHaveAttribute("height", "833");
  await expect(plan.locator("video")).toHaveCount(0);
  await page.mouse.move(0, 0);
  await expect(plan.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-expanded", "false");
});

test("hover opens deliberately and stays open across brief pointer exits", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?locale=en");
  const explore = page.getByRole("button", { name: "Explore", exact: true });
  await explore.hover();
  await page.waitForTimeout(180);
  await expect(explore).toHaveAttribute("aria-expanded", "false");
  await expect(explore).toHaveAttribute("aria-expanded", "true");
  const video = page.locator("#activity-preview-explore video");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);

  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await expect(explore).toHaveAttribute("aria-expanded", "true");
  await explore.hover();
  await page.waitForTimeout(650);
  await expect(explore).toHaveAttribute("aria-expanded", "true");
  await page.mouse.move(0, 0);
  await expect(explore).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
});

test.describe("touch and reduced motion", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

  test("previews can be opened and closed without hover or autoplay", async ({ page }) => {
    await page.goto("/?locale=en");
    const explore = page.getByRole("button", { name: "Explore", exact: true });
    await explore.scrollIntoViewIfNeeded();
    await explore.tap();
    await expect(explore).toHaveAttribute("aria-expanded", "true");
    const video = page.locator('#activity-preview-explore video');
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => {
      const { width, height } = element.getBoundingClientRect();
      return Math.abs(height - width * element.videoHeight / element.videoWidth);
    })).toBeLessThan(1);
    expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await expect(video).not.toHaveAttribute("controls");
    await page.getByRole("button", { name: "Play preview: Explore" }).tap();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
    await page.getByRole("button", { name: "Pause preview: Explore" }).tap();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await explore.tap();
    await expect(explore).toHaveAttribute("aria-expanded", "false");
    await explore.focus();
    await page.keyboard.press("Enter");
    await expect(explore).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(explore).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
