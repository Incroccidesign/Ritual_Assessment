import { expect, test } from "@playwright/test";

test.skip(process.env.PLAYWRIGHT_AUTH_MOCKED !== "true", "Requires a server configured with test-only Supabase credentials.");
test.use({ launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {} });

const mockHost = process.env.PLAYWRIGHT_MOCK_SUPABASE_HOST ?? "test-only.supabase.co";
const appHost = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").hostname;
const owner = "00000000-0000-0000-0000-000000000001";
const assessmentId = "00000000-0000-0000-0000-000000000010";
const draftId = "00000000-0000-0000-0000-000000000011";
const date = "2026-10-01T10:00:00.000Z";
const assessment = { id: assessmentId, owner_id: owner, title: "Community ritual", description: null, data_controller_name: null, data_controller_contact: null, estimated_duration: null, hide_activity_summaries: false, language: "en", status: "published", public_token: "test-token", created_at: date, updated_at: date, published_at: date };
const activities = [
  { id: "profile", assessment_id: assessmentId, type: "profiling", title: "Organisation", prompt: "", order_index: 0, config_json: { fields: [{ id: "organization", label: "Organization", fieldType: "text", required: true }] }, created_at: date, updated_at: date },
  { id: "explore", assessment_id: assessmentId, type: "exploration", title: "Ideas", prompt: "", order_index: 1, config_json: { options: ["Shared idea"] }, created_at: date, updated_at: date },
  { id: "report", assessment_id: assessmentId, type: "planning_report", title: "Report", prompt: "", order_index: 2, config_json: { reportTitle: "Individual report", reportSubtitle: "", sections: [] }, created_at: date, updated_at: date }
];
const participants = [
  { id: "participant-a", assessment_id: assessmentId, company_name: "First organisation", status: "submitted", created_at: date, submitted_at: date },
  { id: "participant-b", assessment_id: assessmentId, company_name: "Second organisation", status: "submitted", created_at: "2026-10-02T10:00:00.000Z", submitted_at: date },
  { id: "participant-c", assessment_id: assessmentId, company_name: "Unfinished organisation", status: "started", created_at: "2026-10-03T10:00:00.000Z", submitted_at: null }
];
const responses = participants.map((participant, index) => ({ id: `response-${index}`, assessment_id: assessmentId, participant_id: participant.id, status: index === 2 ? "in_progress" : "submitted", created_at: date, updated_at: date, submitted_at: index === 2 ? null : date }));
const answers = participants.flatMap((participant, index) => [
  { id: `profile-${index}`, response_id: `response-${index}`, activity_id: "profile", activity_type: "profiling", answer_json: { fields: { organization: participant.company_name } }, created_at: date, updated_at: date },
  { id: `idea-${index}`, response_id: `response-${index}`, activity_id: "explore", activity_type: "exploration", answer_json: { items: [{ id: `item-${index}`, label: index === 2 ? "Unfinished idea" : `Idea ${index + 1}`, source: "custom" }] }, created_at: date, updated_at: date }
]);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ id, host }) => localStorage.setItem(`sb-${host.split(".")[0]}-auth-token`, JSON.stringify({ access_token: "test-token", refresh_token: "test-refresh-token", expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id, email: "test@example.invalid", aud: "authenticated" } })), { id: owner, host: mockHost });
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async (value: string) => { sessionStorage.setItem("test-copied-link", value); } } }));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return ["localhost", "127.0.0.1", appHost].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.route("**/auth/v1/**", async (route) => {
    expect(new URL(route.request().url()).hostname).toBe(mockHost);
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    return route.fulfill({ json: { id: owner, email: "test@example.invalid", aud: "authenticated" }, headers });
  });
  await page.route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.hostname).toBe(mockHost);
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const table = url.pathname.split("/").pop();
    let json: unknown = [];
    if (table === "assessments") json = route.request().headers().accept?.includes("application/vnd.pgrst.object") ? assessment : [assessment, { ...assessment, id: draftId, title: "Draft ritual", status: "draft" }];
    else if (table === "activities") json = activities;
    else if (table === "participants") json = participants;
    else if (table === "responses") json = responses;
    else if (table === "activity_responses") json = answers;
    return route.fulfill({ json, headers });
  });
  await page.route("**/api/legal/acceptance", (route) => route.fulfill({ json: { accepted: true } }));
  await page.route("**/api/admin/bootstrap", (route) => route.fulfill({ status: 200, json: {} }));
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`completed results and both report paths remain available at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard?locale=en");
    const published = page.getByRole("link", { name: "Community ritual" });
    await expect(published).toHaveAttribute("href", new RegExp(`/assessments/${assessmentId}/results`));
    await expect(page.getByRole("link", { name: "Draft ritual" })).toHaveAttribute("href", new RegExp(`/dashboard\\?setup=individual&assessment=${draftId}`));
    const card = published.locator("xpath=ancestor::div[contains(@class,'min-h-')]");
    await card.getByRole("button", { name: "More actions" }).click();
    await expect(card.getByRole("link", { name: "Results", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/dashboard/);
    await card.getByRole("link", { name: "Results", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/assessments/${assessmentId}/results`));
    await expect(page.getByText("Completed responses", { exact: true })).toBeVisible();
    await expect(page.getByText("Participants who completed")).toBeVisible();
    await expect(page.locator("dt", { hasText: "Completed responses" }).locator("..").locator("dd")).toHaveText("2");
    await expect(page.locator("dt", { hasText: "Participants who completed" }).locator("..").locator("dd")).toHaveText("2");
    await test.info().attach("results-overview", { body: await page.screenshot(), contentType: "image/png" });
    await expect(page.getByRole("button", { name: "Copy participant link" })).toBeVisible();
    await page.getByRole("button", { name: "Copy participant link" }).click();
    await expect(page.getByRole("button", { name: "Public link copied" })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("test-copied-link"))).toContain("/participate/test-token");
    await expect(page.getByText("Idea 1", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Ideas.*Exploration/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Organisation.*Profiling/ })).toBeVisible();
    await page.getByRole("button", { name: /Ideas/ }).click();
    await expect(page.getByText("Idea 1", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Unfinished idea")).toHaveCount(0);
    await expect(page.getByText("Unfinished organisation")).toHaveCount(0);
    await page.getByRole("button", { name: "Participants", exact: true }).click();
    await expect(page.getByText("First organisation")).toBeVisible();
    await expect(page.getByText("Unfinished organisation")).toHaveCount(0);
    await page.getByRole("button", { name: "Individual reports" }).click();
    await expect(page.getByRole("button", { name: "View report" })).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Individual report", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "View report" }).nth(1).click();
    const dialog = page.getByRole("dialog", { name: "View report" });
    await expect(dialog.getByRole("heading", { name: "Individual report", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "View report" }).nth(1).click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "View report" }).nth(1).click();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("P02 · Second organisation", { exact: true })).toBeVisible();
    const individualDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download report" }).nth(1).click();
    expect((await individualDownload).suggestedFilename()).toMatch(/\.docx$/);
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const generalDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export Excel" }).click();
    expect((await generalDownload).suggestedFilename()).toMatch(/\.xlsx$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("long lists are paginated and incomplete data stays excluded", async ({ page }) => {
  const moreParticipants = Array.from({ length: 11 }, (_, index) => ({ id: `extra-${index}`, assessment_id: assessmentId, company_name: `Organisation ${index + 3}`, status: "submitted", created_at: `2026-10-${String(index + 4).padStart(2, "0")}T10:00:00.000Z`, submitted_at: date }));
  const moreResponses = moreParticipants.map((participant, index) => ({ id: `extra-response-${index}`, assessment_id: assessmentId, participant_id: participant.id, status: "submitted", created_at: date, updated_at: date, submitted_at: date }));
  const moreAnswers = moreResponses.map((response, index) => ({ id: `extra-idea-${index}`, response_id: response.id, activity_id: "explore", activity_type: "exploration", answer_json: { items: [{ id: `extra-item-${index}`, label: `Extra idea ${index + 1}`, source: "custom" }] }, created_at: date, updated_at: date }));
  await page.route("**/rest/v1/**", async (route) => {
    const table = new URL(route.request().url()).pathname.split("/").pop();
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (table === "participants") return route.fulfill({ json: [...participants, ...moreParticipants], headers });
    if (table === "responses") return route.fulfill({ json: [...responses, ...moreResponses], headers });
    if (table === "activity_responses") return route.fulfill({ json: [...answers, ...moreAnswers], headers });
    return route.fallback();
  });
  await page.goto(`/assessments/${assessmentId}/results?locale=en`);
  await expect(page.getByText("Participants who completed")).toBeVisible();
  await expect(page.locator("dt", { hasText: "Participants who completed" }).locator("..").locator("dd")).toHaveText("13");
  await expect(page.getByText("Extra idea 1", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Ideas/ }).click();
  await expect(page.getByText("Extra idea 1", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Extra idea 11", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Extra idea 11", { exact: true })).toBeVisible();
  await expect(page.getByText("Unfinished idea")).toHaveCount(0);
  await page.getByRole("button", { name: "Individual reports" }).click();
  await expect(page.getByRole("button", { name: "View report" })).toHaveCount(8);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("button", { name: "View report" })).toHaveCount(5);
});

test("closed assessment does not offer a participant link", async ({ page }) => {
  await page.route("**/rest/v1/assessments?**", (route) => route.fulfill({ json: { ...assessment, status: "closed" }, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } }));
  await page.goto(`/assessments/${assessmentId}/results?locale=en`);
  await expect(page.getByRole("heading", { name: "Community ritual" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy participant link" })).toHaveCount(0);
});

test("denied access does not expose results or export actions", async ({ page }) => {
  await page.route("**/rest/v1/assessments?**", (route) => route.fulfill({ status: 403, json: { message: "Access denied" }, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } }));
  await page.goto(`/assessments/${assessmentId}/results?locale=en`);
  await expect(page.getByRole("heading", { name: "Community ritual" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy participant link" })).toHaveCount(0);
});
