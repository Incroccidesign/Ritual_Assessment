// Fills the individual demo assessment in a smartphone-sized browser window,
// stopping on every screen so you can take screenshots.
//
// Run from the project root, with `npm run dev` running and after
// `node scripts/demo/create-individual-demo.mjs`:
//   node scripts/demo/fill-individual-demo.mjs
//
// At each stop the terminal says which screen is shown: take your screenshot,
// then press Enter to continue. A copy of every screen is also saved in
// demo-output/individual/. The participant is anonymous: the answers come from
// project-kickoff.individual.json and are fictional.
//
// Options:
//   DEMO_LINK=<url>     use another participant link instead of the saved one
//   DEMO_NO_PAUSE=1     run straight through, saving the screenshots only
//   DEMO_INTROS=1       also stop on each activity's intro screen
//   DEMO_VIDEO=1        video mode for OBS: countdown, no stops, text typed
//                       letter by letter, a natural pace and a longer pause
//                       between activities to make cutting easier. Nothing is
//                       saved; record the window with OBS (crop the toolbar).
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

const LINK_FILE = path.resolve("scripts/demo/.auth/individual-demo-link.txt");
const OUTPUT_DIR = path.resolve("demo-output/individual");
const content = JSON.parse(fs.readFileSync(path.resolve("scripts/demo/project-kickoff.individual.json"), "utf8"));
const messages = JSON.parse(fs.readFileSync(path.resolve("messages/en.json"), "utf8"));
const link = process.env.DEMO_LINK ?? (fs.existsSync(LINK_FILE) ? fs.readFileSync(LINK_FILE, "utf8").trim() : "");
if (!link) {
  console.error("No participant link. Run first:  node scripts/demo/create-individual-demo.mjs");
  process.exit(1);
}
const NO_PAUSE = process.env.DEMO_NO_PAUSE === "1";
const STOP_ON_INTROS = process.env.DEMO_INTROS === "1";
const VIDEO = process.env.DEMO_VIDEO === "1";
// ---------- Video pace, in seconds (adjust freely) ----------
const PACE = {
  countdown: 10,      // time to start OBS recording
  screenHold: 3,      // pause on each screen before acting
  filledHold: 3,      // pause on each filled activity
  summaryHold: 3,     // pause on each activity summary
  activityGap: 2,     // extra pause between activities, to make cuts easier
  betweenActions: 0.6,
  typingDelayMs: 35,
  scrollMs: 700,      // duration of each scroll movement
  scrollMargin: 110   // keep elements this far (px) from the screen edges
};
// -------------------------------------------------------------
const sleep = (seconds) => page.waitForTimeout(seconds * 1000);
const label = {
  startAssessment: messages.participant.welcome.cta,
  startActivity: messages.participant.startActivity,
  completeActivity: messages.common.completeActivity,
  finalSubmit: messages.planningReport.finalSubmit.submit,
  next: messages.common.next,
  submitAssessment: messages.common.submitAssessment
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
// Keep the window rendering even when the terminal or OBS covers it:
// otherwise Windows pauses it and clicks never reach the page.
const KEEP_RENDERING = [
  "--disable-features=CalculateNativeWinOcclusion",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-background-timer-throttling"
];
const browser = await chromium.launch({
  headless: false,
  args: [...KEEP_RENDERING, ...(VIDEO ? ["--window-size=430,960"] : [])]
});
const { defaultBrowserType: _ignored, ...phone } = devices["iPhone 14"];
const context = await browser.newContext({ ...phone, locale: "en-GB" });
const page = await context.newPage();
let shot = 0;

async function stop(name, hold = PACE.screenHold) {
  if (VIDEO) {
    await sleep(hold);
    return;
  }
  await page.waitForTimeout(700);
  shot += 1;
  const file = path.join(OUTPUT_DIR, `${String(shot).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  if (NO_PAUSE) {
    console.log(`✓ ${path.basename(file)}`);
    return;
  }
  await terminal.question(`[${String(shot).padStart(2, "0")}] ${name}: take your screenshot, then press Enter `);
}

// In video mode, scroll only when the element is about to leave the screen,
// and only by the distance needed, with an eased movement of fixed duration.
async function reveal(locator) {
  if (!VIDEO) return;
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  const distance = await locator.evaluate((element, margin) => {
    const rect = element.getBoundingClientRect();
    const view = window.innerHeight;
    if (rect.top >= margin && rect.bottom <= view - margin) return 0;
    if (rect.bottom > view - margin) return Math.min(rect.bottom - (view - margin), rect.top - margin);
    return rect.top - margin;
  }, PACE.scrollMargin);
  if (Math.abs(distance) < 4) return;
  await page.evaluate(({ distance, duration }) => new Promise((resolve) => {
    const start = window.scrollY;
    const startedAt = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - startedAt) / duration);
      window.scrollTo(0, start + distance * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  }), { distance, duration: PACE.scrollMs });
  await sleep(0.2);
}

async function press(locator) {
  await reveal(locator);
  if (VIDEO) {
    await locator.hover();
    await sleep(0.25);
  }
  try {
    await locator.click({ timeout: 8_000 });
  } catch {
    // Fallback: dispatch the click on the element itself.
    await locator.dispatchEvent("click");
  }
  if (VIDEO) await sleep(PACE.betweenActions);
}

async function type(locator, value) {
  await reveal(locator);
  if (VIDEO) {
    await locator.click();
    await locator.pressSequentially(value, { delay: PACE.typingDelayMs });
    await sleep(PACE.betweenActions);
  } else {
    await locator.fill(value);
  }
}

async function click(name) {
  const button = page.getByRole("button", { name, exact: true }).first();
  await button.waitFor({ state: "visible", timeout: 30_000 });
  if (!VIDEO) await button.scrollIntoViewIfNeeded();
  await press(button);
}

async function fillActivity(activity) {
  const answers = content.answers[activity.clientId];
  if (activity.type === "profiling") {
    for (const field of activity.configJson.fields) {
      const value = answers[field.label];
      if (!value) continue;
      // A select inside its label gets the option texts in its accessible name,
      // so it is found through the label text instead.
      const control = field.fieldType === "select"
        ? page.locator("label").filter({ hasText: field.label }).locator("select").first()
        : page.getByLabel(field.label, { exact: true });
      if (field.fieldType === "select") {
        await reveal(control);
        await control.selectOption(value);
        await sleep(VIDEO ? PACE.betweenActions : 0.25);
      } else {
        await type(control, value);
      }
    }
  }
  if (activity.type === "exploration" || activity.type === "prioritization") {
    for (const item of answers) {
      await press(page.getByRole("button", { name: item, exact: true }).first());
      if (!VIDEO) await sleep(0.35);
    }
  }
  if (activity.type === "framing") {
    for (const question of activity.configJson.questions) {
      const value = answers[question.title];
      if (value) await type(page.getByLabel(question.title, { exact: true }), value);
    }
  }
  if (activity.type === "scheduling") {
    const slots = page.locator("label").filter({ has: page.locator('input[type="checkbox"]') });
    for (const index of answers) {
      await press(slots.nth(index));
      if (!VIDEO) await sleep(0.3);
    }
  }
}

try {
  await page.goto(link, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: label.startAssessment, exact: true }).waitFor({ timeout: 30_000 });
  if (VIDEO) {
    for (let left = PACE.countdown; left > 0; left -= 1) {
      process.stdout.write(`\rStart OBS recording now: ${left}s `);
      await sleep(1);
    }
    process.stdout.write("\rRecording...                    \n");
  }
  await stop("welcome");
  await click(label.startAssessment);

  const activities = content.assessment.activities;
  for (let index = 0; index < activities.length; index += 1) {
    const activity = activities[index];
    const slug = `${index + 1}-${activity.clientId}`;
    const isLast = index === activities.length - 1;

    await page.getByRole("button", { name: label.startActivity, exact: true }).waitFor({ timeout: 30_000 });
    if (STOP_ON_INTROS) await stop(`${slug}-intro`);
    await click(label.startActivity);

    if (VIDEO) await sleep(PACE.screenHold);
    await fillActivity(activity);
    await stop(`${slug}-filled`, PACE.filledHold);
    await click(isLast && activity.type === "planning_report" ? label.finalSubmit : label.completeActivity);

    if (isLast && activity.type === "planning_report") break;
    const nextName = isLast ? label.submitAssessment : label.next;
    await page.getByRole("button", { name: nextName, exact: true }).waitFor({ timeout: 30_000 });
    await stop(`${slug}-summary`, PACE.summaryHold);
    await click(nextName);
    if (VIDEO) await sleep(PACE.activityGap);
  }

  await page.waitForLoadState("networkidle").catch(() => {});
  await stop("completed", VIDEO ? 5 : PACE.screenHold);
  console.log("");
  console.log(VIDEO ? "Done. You can stop the OBS recording." : `Done. A copy of every screen is in ${path.relative(process.cwd(), OUTPUT_DIR)}`);
} catch (error) {
  await page.screenshot({ path: path.join(OUTPUT_DIR, "error.png"), fullPage: true }).catch(() => {});
  console.error(`Stopped: ${error.message}`);
  console.error("The current screen is saved as demo-output/individual/error.png.");
  process.exitCode = 1;
} finally {
  terminal.close();
  await browser.close();
}
