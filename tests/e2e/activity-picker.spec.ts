import { expect, test } from "@playwright/test";

test.skip(process.env.PLAYWRIGHT_AUTH_MOCKED !== "true", "Requires test-only Supabase credentials.");
test.use({ launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {} });

const host = "test-only.supabase.co";
const owner = "00000000-0000-0000-0000-000000000001";
const assessmentId = "00000000-0000-0000-0000-000000000010";
const date = "2026-10-01T10:00:00.000Z";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ id }) => localStorage.setItem("sb-test-only-auth-token", JSON.stringify({ access_token: "test-token", refresh_token: "test-refresh-token", expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id, email: "test@example.invalid", aud: "authenticated" } })), { id: owner });
  await page.route("**/*", (route) => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.route("**/auth/v1/**", (route) => {
    expect(new URL(route.request().url()).hostname).toBe(host);
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    return route.request().method() === "OPTIONS" ? route.fulfill({ status: 204, headers }) : route.fulfill({ json: { id: owner, email: "test@example.invalid", aud: "authenticated" }, headers });
  });
  await page.route("**/rest/v1/**", (route) => {
    const url = new URL(route.request().url());
    expect(url.hostname).toBe(host);
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (url.pathname.endsWith("/assessments") && route.request().headers().accept?.includes("application/vnd.pgrst.object")) {
      return route.fulfill({ json: { id: assessmentId, owner_id: owner, title: "Test ritual", description: null, data_controller_name: null, data_controller_contact: null, estimated_duration: null, hide_activity_summaries: false, language: "en", status: "draft", created_at: date, updated_at: date }, headers });
    }
    if (url.pathname.endsWith("/activities") && route.request().method() === "POST") {
      return route.fulfill({ json: { ...route.request().postDataJSON(), id: "created-activity", created_at: date, updated_at: date }, headers });
    }
    return route.fulfill({ json: [], headers });
  });
  await page.route("**/api/legal/acceptance", (route) => route.fulfill({ json: { accepted: true } }));
  await page.route("**/api/admin/bootstrap", (route) => route.fulfill({ status: 200, json: {} }));
  await page.route("**/api/live-sessions", (route) => route.fulfill({ status: 201, json: { id: "test-session", joinToken: "test-join-token" } }));
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`individual activity picker dismisses and adds an activity at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`/assessments/${assessmentId}/builder?locale=en`);
    const trigger = page.getByRole("button", { name: "Add activity", exact: true });
    await trigger.click();
    const option = page.getByRole("button", { name: /Exploration.*Gather ideas/ });
    await expect(option).toBeVisible();
    const panel = page.locator("#" + (await trigger.getAttribute("aria-controls"))!.replaceAll(":", "\\:"));
    for (const name of ["Profiling", "Explore", "Prioritize", "Reflect", "Plan", "Planning-report"]) {
      const icon = panel.locator(`img[src="/illustrations/${name}-small.svg"]`);
      await expect(icon).toBeAttached();
      await icon.scrollIntoViewIfNeeded();
      await expect.poll(() => icon.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    }
    expect(await panel.evaluate((element) => getComputedStyle(element).scrollbarWidth)).toBe("none");
    await page.keyboard.press("Escape");
    await expect(option).toBeHidden();
    await trigger.click();
    await page.getByRole("heading", { name: "Activities", exact: true }).click();
    await expect(option).toBeHidden();
    await trigger.click();
    await option.click();
    await expect(option).toBeHidden();
    await expect(page.getByText("1 activity added")).toBeVisible();
    await expect(page.locator("article").filter({ hasText: "Exploration" })).toBeVisible();
  });

  test(`collective activity picker dismisses and configures activities at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard?locale=en");
    await page.getByRole("button", { name: "New ritual", exact: true }).first().click();
    await page.getByRole("button", { name: /Collective/ }).click();
    const dialog = page.getByRole("dialog");
    const trigger = dialog.getByRole("button", { name: "Add activity", exact: true });
    await trigger.click();
    const option = dialog.getByRole("button", { name: /Surface.*Collect and group/ });
    await expect(option).toBeVisible();
    for (const name of ["Trigger", "Explore", "Reflect", "Prioritize", "Agree"]) {
      const icon = dialog.locator(`img[src="/illustrations/${name}-small.svg"]`);
      await expect(icon).toBeAttached();
      await icon.scrollIntoViewIfNeeded();
      await expect.poll(() => icon.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    }
    await dialog.getByRole("heading", { name: "Activities", exact: true }).click();
    await expect(option).toBeHidden();
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(option).toBeHidden();
    await trigger.click();
    await option.click();
    await expect(option).toBeHidden();
    const activity = dialog.locator("article").filter({ hasText: "Surface" });
    await expect(activity).toBeVisible();
    await activity.getByRole("button", { name: "Configure activity" }).click();
    await expect(activity.locator("textarea").first()).toBeVisible();
    await trigger.click();
    await expect(dialog.getByRole("button", { name: /Surface.*× 1/ })).toBeVisible();
    await dialog.getByRole("button", { name: /Focus.*Explore a question/ }).click();
    await expect(dialog.getByText("2 activities added")).toBeVisible();
    const activities = dialog.locator("article");
    await expect(activities.nth(0)).toContainText("Surface");
    await dialog.getByRole("button", { name: "Move Focus up" }).click();
    await expect(activities.nth(0)).toContainText("Focus");
    await dialog.getByRole("button", { name: "Remove Focus" }).click();
    await expect(dialog.getByText("1 activity added")).toBeVisible();
  });
}

test("collective setup is translated in French, including the activity picker", async ({ page }) => {
  await page.goto("/live/setup?locale=fr");
  await expect(page.getByRole("heading", { name: "Rituel collectif" })).toBeVisible();
  await expect(page.getByLabel("Nom du rituel")).toHaveValue("Rituel de décision");
  await expect(page.getByRole("heading", { name: "Participants" })).toBeVisible();
  await page.getByRole("button", { name: "Ajouter une activité" }).click();
  const trigger = page.getByRole("button", { name: /Déclencheur.*réponse courte/ });
  await expect(trigger.locator('img[src="/illustrations/Trigger-small.svg"]')).toBeVisible();
  await page.getByRole("button", { name: /Émergence.*contributions/ }).click();
  const activity = page.locator("article").filter({ hasText: "Émergence" });
  await activity.getByRole("button", { name: "Configurer l'activité" }).click();
  await expect(activity.getByLabel("Question ou consigne")).toHaveValue("Quelle difficulté ou opportunité mérite notre attention ?");
  await expect(activity.getByLabel("Nom de la catégorie 1")).toHaveValue("Difficultés");
});

test("collective settings save on close, not automatically while editing", async ({ page }) => {
  const writes: string[] = [];
  await page.route("**/api/live-sessions", (route) => {
    writes.push(route.request().postDataJSON().title);
    return route.fulfill({ status: 201, json: { id: "test-session", joinToken: "test-join-token" } });
  });
  await page.goto("/live/setup?locale=en");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ritual name").fill("Edited ritual");
  await dialog.getByRole("button", { name: "Add activity", exact: true }).click();
  await dialog.getByRole("button", { name: /Surface.*Collect and group/ }).click();
  await page.waitForTimeout(2800);
  expect(writes).toEqual([]);
  await expect(dialog.getByRole("status", { name: "Saved automatically" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  expect(writes).toEqual(["Edited ritual"]);
});

test("a failed individual autosave never reports success", async ({ page }) => {
  await page.route("**/rest/v1/assessments?**", (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    return route.fulfill({ status: 500, json: { message: "Test save failure" }, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
  });
  await page.goto(`/assessments/${assessmentId}/builder?locale=en`);
  await page.getByLabel("Assessment title").fill("Unsaved ritual");
  await expect(page.getByRole("status", { name: "Some changes could not be saved" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Saved automatically" })).toHaveCount(0);
});

test("closing untouched collective settings does not create a draft", async ({ page }) => {
  let created = 0;
  await page.route("**/api/live-sessions", (route) => { created += 1; return route.fulfill({ status: 201, json: { id: "test-session", joinToken: "test-join-token" } }); });
  await page.goto("/live/setup?locale=en");
  await page.waitForTimeout(2800);
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect(created).toBe(0);
});

test("collective settings remain usable and can retry after close-save failure", async ({ page }) => {
  let allowSave = false;
  await page.route("**/api/live-sessions", (route) => allowSave
    ? route.fulfill({ status: 201, json: { id: "test-session", joinToken: "test-join-token" } })
    : route.fulfill({ status: 500, json: { error: "Test save failure" } }));
  await page.goto("/dashboard?locale=en");
  await page.getByRole("button", { name: "New ritual", exact: true }).first().click();
  await page.getByRole("button", { name: /Collective/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ritual name").fill("Edited ritual");
  await dialog.getByRole("button", { name: "Add activity", exact: true }).click();
  await dialog.getByRole("button", { name: /Surface.*Collect and group/ }).click();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog.getByText("Test save failure")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeEnabled();
  allowSave = true;
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("an individual direct link opens the dashboard dialog and survives reload", async ({ page }) => {
  await page.goto(`/assessments/${assessmentId}/builder?locale=en&template=1`);
  await expect(page).toHaveURL(/\/dashboard\?.*setup=individual/);
  await expect(page.getByRole("heading", { name: "Your rituals, in one place" })).toBeAttached();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Individual ritual" })).toBeVisible();
  await expect(dialog.getByLabel("Assessment title")).toHaveValue("Test ritual");
  const savedIcon = dialog.getByRole("status", { name: "Saved automatically" }).locator('img[src="/illustrations/saved.svg"]');
  await expect(savedIcon).toBeVisible();
  await expect.poll(() => savedIcon.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.reload();
  await expect(dialog.getByLabel("Assessment title")).toHaveValue("Test ritual");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/dashboard\?locale=en$/);
});

test("a collective direct link opens the existing session over the dashboard", async ({ page }) => {
  const sessionId = "00000000-0000-0000-0000-000000000020";
  await page.route("**/rest/v1/live_sessions?**", (route) => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const row = { id: sessionId, title: "Existing collective", status: "draft", participant_details_mode: "nickname_only", facilitator_name: null, context_label: null, created_at: date, updated_at: date };
    return route.fulfill({ json: [row], headers });
  });
  await page.goto(`/live/setup?id=${sessionId}&locale=fr`);
  await expect(page).toHaveURL(/\/dashboard\?.*setup=collective/);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Nom du rituel")).toHaveValue("Existing collective");
  await expect(dialog.getByRole("status", { name: /enregistré automatiquement/i })).toHaveCount(0);
  await page.reload();
  await expect(dialog.getByLabel("Nom du rituel")).toHaveValue("Existing collective");
});

test("closing a collective session before it loads never writes default settings", async ({ page }) => {
  const sessionId = "00000000-0000-0000-0000-000000000020";
  let releaseLoad!: () => void;
  const loading = new Promise<void>((resolve) => { releaseLoad = resolve; });
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/rest/v1/") && !["GET", "OPTIONS"].includes(request.method())) writes.push(request.method());
  });
  await page.route("**/rest/v1/live_sessions?**", async (route) => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    await loading;
    return route.fulfill({ json: [{ id: sessionId, title: "Existing collective", status: "draft", participant_details_mode: "nickname_only", created_at: date, updated_at: date }], headers });
  });
  try {
    await page.goto(`/live/setup?id=${sessionId}&locale=en`);
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    expect(writes).toEqual([]);
  } finally { releaseLoad(); }
});

test("a draft individual card opens the same dashboard dialog", async ({ page }) => {
  await page.route("**/rest/v1/assessments?**", (route) => {
    if (route.request().method() !== "GET" || route.request().headers().accept?.includes("application/vnd.pgrst.object")) return route.fallback();
    return route.fulfill({ json: [{ id: assessmentId, owner_id: owner, title: "Test ritual", description: null, data_controller_name: null, data_controller_contact: null, estimated_duration: null, hide_activity_summaries: false, language: "en", status: "draft", created_at: date, updated_at: date }], headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
  });
  await page.goto("/dashboard?locale=en");
  await page.getByRole("link", { name: "Continue building" }).click();
  await expect(page).toHaveURL(/\/dashboard\?.*setup=individual/);
  await expect(page.getByRole("dialog").getByLabel("Assessment title")).toHaveValue("Test ritual");
});

test("editing a published individual ritual still asks to pause collection", async ({ page }) => {
  const row = { id: assessmentId, owner_id: owner, title: "Published ritual", description: null, data_controller_name: null, data_controller_contact: null, estimated_duration: null, hide_activity_summaries: false, language: "en", status: "published", created_at: date, updated_at: date };
  await page.route("**/rest/v1/assessments?**", (route) => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({ json: route.request().headers().accept?.includes("application/vnd.pgrst.object") ? row : [row], headers });
  });
  await page.goto("/dashboard?locale=en");
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("link", { name: "Edit structure" }).click();
  await expect(page).toHaveURL(/\/dashboard\?.*setup=individual/);
  await expect(page.getByRole("heading", { name: "Pause collection to edit?" })).toBeVisible();
});

test("a draft collective card opens the same dashboard dialog", async ({ page }) => {
  const sessionId = "00000000-0000-0000-0000-000000000020";
  await page.route("**/rest/v1/live_sessions?**", (route) => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    return route.fulfill({ json: [{ id: sessionId, title: "Existing collective", status: "draft", participant_details_mode: "nickname_only", facilitator_name: null, context_label: null, created_at: date, updated_at: date }], headers });
  });
  await page.goto("/dashboard?locale=en");
  await page.getByRole("link", { name: "Continue setup" }).click();
  await expect(page).toHaveURL(/\/dashboard\?.*setup=collective/);
  await expect(page.getByRole("dialog").getByLabel("Ritual name")).toHaveValue("Existing collective");
});

test("duplicating a collective ritual opens its settings over the dashboard", async ({ page }) => {
  const originalId = "00000000-0000-0000-0000-000000000020";
  const duplicateId = "00000000-0000-0000-0000-000000000021";
  await page.route("**/api/live-sessions/*/duplicate", (route) => route.fulfill({ json: { id: duplicateId, joinToken: "test-join-token" } }));
  await page.route("**/rest/v1/live_sessions?**", (route) => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const requestedId = new URL(route.request().url()).searchParams.get("id");
    const id = requestedId === `eq.${duplicateId}` ? duplicateId : originalId;
    return route.fulfill({ json: [{ id, title: id === duplicateId ? "Copied collective" : "Existing collective", status: "draft", participant_details_mode: "nickname_only", facilitator_name: null, context_label: null, created_at: date, updated_at: date }], headers });
  });
  await page.goto("/dashboard?locale=en");
  await page.getByRole("button", { name: "Live session settings" }).click();
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByRole("dialog").getByLabel("Ritual name")).toHaveValue("Copied collective");
});

test("importing a collective ritual opens its settings over the dashboard", async ({ page }) => {
  await page.goto("/dashboard?locale=en");
  await page.locator('input[type="file"]').setInputFiles({ name: "ritual.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ version: "1.0", ritual_name: "Imported ritual", activities: [{ type: "focus", question_or_instruction: "Imported question" }] })) });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Ritual name")).toHaveValue("Imported ritual");
  await expect(dialog.getByText("1 activity added")).toBeVisible();
});

test("an inaccessible collective link does not expose settings", async ({ page }) => {
  await page.goto("/live/setup?id=00000000-0000-0000-0000-000000000099&locale=en");
  await expect(page.getByRole("dialog").getByText("Session not found")).toBeVisible();
  await expect(page.getByLabel("Ritual name")).toHaveCount(0);
});

test("direct settings links still require an authenticated designer", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/*", (route) => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  try {
    await page.goto(`/assessments/${assessmentId}/builder?locale=en`);
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally { await context.close(); }
});
