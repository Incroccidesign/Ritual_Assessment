import { expect, test } from "@playwright/test";

test.skip(process.env.PLAYWRIGHT_AUTH_MOCKED !== "true", "Requires a server configured with test-only Supabase credentials.");
test.use({
  launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`empty dashboard creation menu works at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.setItem("sb-test-only-auth-token", JSON.stringify({
        access_token: "test-token",
        refresh_token: "test-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: { id: "00000000-0000-0000-0000-000000000001", email: "test@example.invalid", aud: "authenticated" }
      }));
    });
    await page.route("**/auth/v1/**", async (route) => {
      expect(new URL(route.request().url()).hostname).toBe("test-only.supabase.co");
      const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      await route.fulfill({ json: { id: "00000000-0000-0000-0000-000000000001", email: "test@example.invalid", aud: "authenticated" }, headers });
    });
    await page.route("**/rest/v1/**", async (route) => {
      expect(new URL(route.request().url()).hostname).toBe("test-only.supabase.co");
      const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      await route.fulfill({ json: [], headers });
    });
    await page.route("**/api/legal/acceptance", (route) => route.fulfill({ json: { accepted: true } }));
    await page.route("**/api/admin/bootstrap", (route) => route.fulfill({ status: 200, json: {} }));

    await page.goto("/dashboard?locale=en");
    await expect(page.getByRole("heading", { name: "No rituals yet." })).toBeVisible();
    await expect(page.getByText("Bring ideas and perspectives together.")).toBeVisible();
    const buttons = page.getByRole("button", { name: "New ritual", exact: true });
    await expect(buttons).toHaveCount(2);
    for (let index = 0; index < 2; index++) {
      await buttons.nth(index).click();
      await expect(page.getByRole("button", { name: /Collective/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /Individual/ })).toBeVisible();
      const trigger = await buttons.nth(index).boundingBox();
      const menu = await page.getByRole("button", { name: /Collective/ }).boundingBox();
      expect(trigger && menu && menu.y > trigger.y).toBeTruthy();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: /Collective/ })).toBeHidden();
    }
    await buttons.first().click();
    await page.getByRole("button", { name: /Collective/ }).click();
    const dialog = page.getByRole("dialog");
    for (const name of ["Explore", "Reflect", "Prioritize", "Agree"]) {
      const illustration = dialog.locator(`img[src="/illustrations/${name}.svg"]`);
      await illustration.scrollIntoViewIfNeeded();
      await expect(illustration).toBeVisible();
      await expect.poll(() => illustration.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
  });
}
