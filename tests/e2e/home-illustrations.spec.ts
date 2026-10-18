import { expect, test } from "@playwright/test";

test.use({
  launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`homepage illustrations load at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/?locale=en");
    const intro = page.getByText("Bring people together to share ideas, make decisions, and plan next steps.");
    await expect(intro).toBeVisible();
    expect(await intro.evaluate((element) => element.closest("section")?.nextElementSibling?.querySelector("h3")?.textContent)).toBe("Explore");
    await expect(page.getByText("Choose what you want to achieve.")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Create. Share. Explore." })).toHaveCount(0);
    const modesTitle = page.getByRole("heading", { name: "Choose the rhythm that fits your ritual." });
    await expect(modesTitle).toBeVisible();
    if (viewport.width >= 1440) {
      expect(await modesTitle.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getClientRects().length;
      })).toBe(1);
    }
    for (const name of ["Collective", "Individual", "Explore", "Reflect", "Prioritize", "Agree", "Plan", "Word", "Excel", "Json"]) {
      const illustration = page.locator(`img[src="/illustrations/${name}.svg"]`);
      await illustration.scrollIntoViewIfNeeded();
      await expect(illustration).toBeVisible();
      await expect.poll(() => illustration.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    const firstActivity = page.getByRole("heading", { name: "Explore", exact: true }).locator("..");
    await expect(firstActivity).toHaveCSS("border-bottom-color", "rgb(48, 54, 65)");
    const introBox = await intro.boundingBox();
    const illustrationBox = await firstActivity.locator("img").boundingBox();
    expect(introBox && illustrationBox && Math.abs(introBox.x - illustrationBox.x) < 2).toBeTruthy();
    expect(await firstActivity.evaluate((element) => {
      const section = element.closest("section");
      if (!section) return false;
      const style = getComputedStyle(section);
      const contentWidth = section.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      return Math.abs(element.getBoundingClientRect().width - contentWidth) < 2;
    })).toBe(true);
    await expect(page.locator('img[src="/illustrations/Collective.svg"]')).toHaveCSS("width", "288px");
    await expect(page.locator('img[src="/illustrations/Individual.svg"]')).toHaveCSS("width", "288px");
    for (const [name, left, right] of [["Collective", 103.03, 903], ["Individual", 266.78, 733.22]] as const) {
      const image = page.locator(`img[src="/illustrations/${name}.svg"]`);
      expect(await image.evaluate((element, bounds) => {
        const imageBox = element.getBoundingClientRect();
        const frame = element.parentElement?.getBoundingClientRect();
        if (!frame) return false;
        return imageBox.left + imageBox.width * bounds[0] / 1000 >= frame.left
          && imageBox.left + imageBox.width * bounds[1] / 1000 <= frame.right
          && imageBox.top + imageBox.height * 266.78 / 1000 >= frame.top
          && imageBox.top + imageBox.height * 733.22 / 1000 <= frame.bottom;
      }, [left, right])).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true });
  });
}
