import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";

test.skip(process.env.PLAYWRIGHT_AUTH_MOCKED !== "true", "Requires intercepted Supabase requests.");
test.use({ launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {} });

const date = "2026-10-26T12:00:00.000Z";
const token = "report-regression-token";
const host = process.env.PLAYWRIGHT_MOCK_SUPABASE_HOST ?? "test-only.supabase.co";
const appHost = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").hostname;
const activities = [
  { id: "memory", type: "framing", title: "I remember", prompt: "Describe a memory", order_index: 0, config_json: { mode: "standard", maxLength: 250, questions: [], sourceActivityId: "" } },
  { id: "future", type: "framing", title: "I would like", prompt: "Describe the future", order_index: 1, config_json: { mode: "standard", maxLength: 250, questions: [], sourceActivityId: "" } },
  { id: "report", type: "planning_report", title: "Area Value Perspectives", prompt: "Review your answers", order_index: 2, config_json: { reportTitle: "Area Value Perspectives", reportSubtitle: "", sections: [] } }
].map(activity => ({ ...activity, assessment_id: "assessment", created_at: date, updated_at: date }));

function documentXml(zip: Buffer) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  for (let offset = zip.readUInt32LE(end + 16); zip.readUInt32LE(offset) === 0x02014b50;) {
    const nameLength = zip.readUInt16LE(offset + 28);
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString();
    if (name === "word/document.xml") {
      const local = zip.readUInt32LE(offset + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const compressed = zip.subarray(start, start + zip.readUInt32LE(offset + 20));
      return (zip.readUInt16LE(offset + 10) === 8 ? inflateRawSync(compressed) : compressed).toString();
    }
    offset += 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
  }
  throw new Error("DOCX document.xml is missing");
}

async function mockParticipant(page: Page, hideActivitySummaries: boolean, failFirstSave = false) {
  const state = { saves: 0, submits: 0, answers: [] as Array<Record<string, unknown>> };
  const response = () => ({
    id: "response", assessmentId: "assessment", participantId: "participant",
    status: state.submits ? "submitted" : "in_progress", activityResponses: state.answers,
    createdAt: date, updatedAt: date, submittedAt: state.submits ? date : null
  });
  await page.route("**/*", route => ["localhost", "127.0.0.1", appHost].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.route("**/rest/v1/rpc/**", async route => {
    expect(new URL(route.request().url()).hostname).toBe(host);
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const rpc = new URL(route.request().url()).pathname.split("/").pop();
    if (rpc === "get_public_assessment") return route.fulfill({ headers, json: {
      id: "assessment", title: "Report regression", language: "en", status: "published",
      public_token: token, owner_id: "", created_at: date, updated_at: date,
      hide_activity_summaries: hideActivitySummaries, activities
    } });
    if (rpc === "save_public_activity_response") {
      state.saves++;
      if (failFirstSave && state.saves === 1) return route.fulfill({ headers, status: 503, json: { message: "Save unavailable" } });
      const payload = route.request().postDataJSON();
      state.answers = state.answers.filter(answer => answer.activityId !== payload.target_activity_id);
      state.answers.push({
        id: payload.target_activity_id, responseId: "response", activityId: payload.target_activity_id,
        activityType: payload.target_activity_type, answer: payload.target_answer_json, createdAt: date, updatedAt: date
      });
    }
    if (rpc === "submit_public_response") state.submits++;
    return route.fulfill({ headers, json: rpc === "get_public_scheduling_results" ? null : response() });
  });
  return state;
}

for (const hideSummaries of [true, false]) {
  test(`participant navigation and Word export retain answers with summaries hidden=${hideSummaries}`, async ({ page }) => {
    const state = await mockParticipant(page, hideSummaries);
    await page.goto(`/participate/${token}?locale=en`);
    await page.getByRole("button", { name: "Start assessment", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("textbox", { name: "Describe a memory" }).fill("Original memory");
    await page.getByRole("button", { name: "Complete activity", exact: true }).click();
    if (!hideSummaries) await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("heading", { name: "I would like", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    if (!hideSummaries) await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Describe a memory" })).toHaveValue("Original memory");
    await page.getByRole("textbox", { name: "Describe a memory" }).fill("A revised memory");
    await page.getByRole("button", { name: "Complete activity", exact: true }).click();
    if (!hideSummaries) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("textbox", { name: "Describe the future" }).fill("A greener future");
    await page.getByRole("button", { name: "Complete activity", exact: true }).click();
    if (!hideSummaries) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Submit answers", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Assessment submitted", exact: true })).toBeVisible();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download report", exact: true }).click();
    const download = await downloaded;
    const path = test.info().outputPath("report.docx");
    await download.saveAs(path);
    const xml = documentXml(await readFile(path));
    expect(xml).toContain("A revised memory");
    expect(xml).toContain("A greener future");
    expect(xml).not.toContain("No answer provided.");
    expect(state.answers).toHaveLength(3);
    expect(state.submits).toBe(1);
  });
}

test("a failed save retains the answer and allows a retry before advancing", async ({ page }) => {
  const state = await mockParticipant(page, true, true);
  await page.goto(`/participate/${token}?locale=en`);
  await page.getByRole("button", { name: "Start assessment", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Describe a memory" });
  await input.fill("Keep this answer");
  await page.getByRole("button", { name: "Complete activity", exact: true }).click();
  await expect(page.getByText("Save unavailable", { exact: true })).toBeVisible();
  await expect(input).toHaveValue("Keep this answer");
  expect(state.answers).toHaveLength(0);
  await page.getByRole("button", { name: "Complete activity", exact: true }).click();
  await expect(page.getByRole("heading", { name: "I would like", exact: true })).toBeVisible();
  expect(state.answers).toHaveLength(1);
});

