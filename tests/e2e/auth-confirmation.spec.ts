import { expect, test } from "@playwright/test";

test.skip(
  process.env.PLAYWRIGHT_AUTH_MOCKED !== "true",
  "Run against a local server configured with test-only.supabase.co and a test Turnstile site key."
);

test.use({
  launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}
});

test("confirmation resend requires a fresh CAPTCHA token", async ({ page }) => {
  test.setTimeout(45_000);
  const requests: { path: string; token?: string }[] = [];

  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js**", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        window.__testTurnstileCallbacks = [];
        window.turnstile = {
          render: (_element, options) => {
            window.__testTurnstileCallbacks.push(options.callback);
            return 'test-widget';
          },
          reset: () => {},
          remove: () => {}
        };
        window.onloadTurnstileCallback?.();
      `
    });
  });

  await page.route("**/auth/v1/**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.hostname).toBe("test-only.supabase.co");
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const body = route.request().postDataJSON() as { gotrue_meta_security?: { captcha_token?: string } } | null;
    requests.push({ path: url.pathname, token: body?.gotrue_meta_security?.captcha_token });
    if (url.pathname.endsWith("/signup")) {
      await route.fulfill({ headers, json: { user: { id: "00000000-0000-0000-0000-000000000001", email: "test@example.invalid" }, session: null } });
    } else {
      await route.fulfill({ headers, json: {} });
    }
  });

  await page.goto("/login?mode=sign-up&locale=en", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill("Test user");
  await page.getByLabel("Email", { exact: true }).fill("test@example.invalid");
  await page.locator('input[type="password"]').fill("StrongPassword123");
  await page.getByRole("checkbox").check();

  await page.locator("form").getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByText("Complete the security check before continuing.")).toBeVisible();
  expect(requests.filter((request) => request.path.endsWith("/signup"))).toHaveLength(0);

  await expect.poll(() => page.evaluate(() => (window as unknown as { __testTurnstileCallbacks?: unknown[] }).__testTurnstileCallbacks?.length ?? 0)).toBe(1);
  await page.evaluate(() => (window as unknown as { __testTurnstileCallbacks: ((token: string) => void)[] }).__testTurnstileCallbacks[0]("signup-token"));
  await page.locator("form").getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText("If you receive a confirmation email, follow the link to activate your account.")).toBeVisible();
  expect(requests.find((request) => request.path.endsWith("/signup"))?.token).toBe("signup-token");

  const resend = page.getByRole("button", { name: "Resend confirmation email" });
  await resend.click();
  await expect(resend).toBeDisabled();
  expect(requests.filter((request) => request.path.endsWith("/resend"))).toHaveLength(0);

  await expect.poll(() => page.evaluate(() => (window as unknown as { __testTurnstileCallbacks?: unknown[] }).__testTurnstileCallbacks?.length ?? 0)).toBe(2);
  await page.evaluate(() => (window as unknown as { __testTurnstileCallbacks: ((token: string) => void)[] }).__testTurnstileCallbacks[1]("resend-token"));
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect(page.getByText("If your account still needs confirmation, check your email for a new link.")).toBeVisible();
  expect(requests.filter((request) => request.path.endsWith("/resend"))).toEqual([
    { path: "/auth/v1/resend", token: "resend-token" }
  ]);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("test@example.invalid");
  await expect(page.locator('input[type="password"]')).toHaveValue("");
});

test("an existing-account signup has the same screen and offers a protected password reset", async ({ page }) => {
  test.setTimeout(45_000);
  const requests: string[] = [];
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js**", async (route) => {
    await route.fulfill({ contentType: "application/javascript", body: `
      window.__testTurnstileCallbacks = [];
      window.turnstile = {
        render: (_element, options) => { window.__testTurnstileCallbacks.push(options.callback); return 'test-widget'; },
        reset: () => {}, remove: () => {}
      };
      window.onloadTurnstileCallback?.();
    ` });
  });
  await page.route("**/auth/v1/**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.hostname).toBe("test-only.supabase.co");
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    requests.push(url.pathname);
    await route.fulfill({ headers, json: url.pathname.endsWith("/signup")
      ? { user: { id: "00000000-0000-0000-0000-000000000002", email: "test@example.invalid", identities: [] }, session: null }
      : {} });
  });

  await page.goto("/login?mode=sign-up&locale=en", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill("Test user");
  await page.getByLabel("Email", { exact: true }).fill("test@example.invalid");
  await page.locator('input[type="password"]').fill("StrongPassword123");
  await page.getByRole("checkbox").check();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __testTurnstileCallbacks?: unknown[] }).__testTurnstileCallbacks?.length ?? 0)).toBe(1);
  await page.evaluate(() => (window as unknown as { __testTurnstileCallbacks: ((token: string) => void)[] }).__testTurnstileCallbacks[0]("signup-token"));
  await page.locator("form").getByRole("button", { name: "Sign up", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText("If you receive a confirmation email, follow the link to activate your account.")).toBeVisible();
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("test@example.invalid");
  await page.locator("form").getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByText("Complete the security check before continuing.")).toBeVisible();
  expect(requests.filter((path) => path.endsWith("/recover"))).toHaveLength(0);
});
