// Ritual live demo for screen recording (OBS).
//
// What it does, against your local dev server (npm run dev):
//   1. A hidden facilitator loads project-kickoff.ritual.json, opens the lobby
//      and gets the participant link.
//   2. 12 hidden "phones" join with a nickname.
//   3. A VISIBLE full-screen window shows the facilitator screen. Nothing is
//      clicked there; header and buttons are hidden with CSS for a clean video.
//   4. The hidden facilitator runs the 4 activities while the phones answer.
//      After every step the script checks the activity states in the database
//      and, if Ritual started more than one activity, puts it back in order:
//      Explore (word cloud) -> Reflect (clusters) -> Prioritize -> Agree.
//
// Run from the project root, after `node scripts/demo/login-demo.mjs`:
//   node scripts/demo/run-live-demo.mjs
//
// Everything is written under the demo account only (one live session).
// To remove it afterwards, delete the session from the dashboard.
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "../test-data/load-env.mjs";
import fs from "node:fs";
import path from "node:path";

// ---------- Settings (adjust freely) ----------
const BASE_URL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const PACE = {
  recordingCountdown: 10, // seconds to start OBS before answers begin
  triggerSeconds: 30,     // word cloud: how long words keep arriving (steady rhythm)
  activitySeconds: 20,    // how long answers keep arriving in the other activities
  resultHold: 6,          // pause on the full result before moving on
  intermissionHold: 3,    // pause on the "Up next" screen
  pactRevealHold: 5,      // pause after revealing the agreement results
  finalHold: 10           // pause on the confirmed pact before closing
};
// ----------------------------------------------

const AUTH_FILE = path.resolve("scripts/demo/.auth/demo.json");
const OUTPUT_DIR = path.resolve("demo-output");
const demo = JSON.parse(fs.readFileSync(path.resolve("scripts/demo/ritual-demo-data.json"), "utf8"));
const ritualFile = JSON.parse(fs.readFileSync(path.resolve("scripts/demo/project-kickoff.ritual.json"), "utf8"));
// DEMO_ONLY=pact records only the Agree step: the session contains just the pact.
const ONLY_PACT = process.env.DEMO_ONLY === "pact";
if (ONLY_PACT) {
  ritualFile.activities = ritualFile.activities.filter((item) => item.type === "patto").map((item) => ({ ...item, order: 1 }));
} else {
  // Full cycle without the pact: Explore -> Reflect -> Prioritize.
  ritualFile.activities = ritualFile.activities.filter((item) => item.type !== "patto");
}
const session = demo.languages.en.collective;
const [trigger, surface, priority, pact] = session.activities;
// Ritual allows 8 joins per session from the same network every 10 minutes.
// DEMO_PARTICIPANTS=16 joins 8 now and 8 more when the next 10-minute window
// opens (the script waits; nothing is bypassed).
const EXTRA_NAMES = ["Inès", "Luca", "Maya", "Karim", "Elena", "Omar", "Sofia", "Jonas"];
const PARTICIPANTS = Math.max(1, Math.min(16, Number(process.env.DEMO_PARTICIPANTS ?? demo.participants.length)));
const names = demo.participants.slice(0, Math.min(PARTICIPANTS, demo.participants.length));
const allNames = [...demo.participants, ...EXTRA_NAMES].slice(0, PARTICIPANTS);

if (!fs.existsSync(AUTH_FILE)) {
  console.error("Missing demo session. Run first:  node scripts/demo/login-demo.mjs");
  process.exit(1);
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));
const withLocale = (url) => `${url}${url.includes("?") ? "&" : "?"}locale=en`;
const log = (message) => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

// Deterministic shuffle so repeated words are spread out, same order every run.
function shuffle(items, seed = 7) {
  const result = [...items];
  let state = seed;
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const j = Math.floor((state / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Spread actions over the activity duration with a little natural variation.
async function paced(actions, totalSeconds) {
  const gap = totalSeconds / Math.max(actions.length, 1);
  for (const action of actions) {
    await action();
    await sleep(gap * (0.6 + Math.random() * 0.8));
  }
}

// Steady rhythm: one action every (totalSeconds / actions) seconds,
// compensating for the time each action takes.
async function steady(actions, totalSeconds) {
  const interval = (totalSeconds * 1000) / Math.max(actions.length, 1);
  for (const action of actions) {
    const started = Date.now();
    await action();
    const wait = interval - (Date.now() - started);
    if (wait > 0) await sleep(wait / 1000);
  }
}

// Facilitator controls: dispatch the click on the button itself, so it also
// works while the Presentation-mode toolbar is hidden (no cursor, no toolbar).
async function facilitatorClick(name) {
  const button = facilitator.getByRole("button", { name }).first();
  await button.waitFor({ state: "visible", timeout: 60_000 });
  await button.click();
}

async function clickButton(page, name, options = {}) {
  const button = page.getByRole("button", { name, ...options }).first();
  await button.waitFor({ state: "visible", timeout: 60_000 });
  await button.click();
}

const hidden = await chromium.launch({ headless: true });
let visible;
let facilitator;
let screen;
let phones = {};
let sessionId = null;

// Read-only diagnostic: lists the session activities and their state from the
// database, using the facilitator's own signed-in session (RLS applies).
loadLocalEnv();
async function dbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = await facilitator.evaluate(() => {
    const name = Object.keys(localStorage).find((item) => item.includes("auth-token"));
    return name ? JSON.parse(localStorage.getItem(name)).access_token : null;
  });
  if (!url || !key || !token || !sessionId) return null;
  return createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
}

async function getActivities() {
  const client = await dbClient();
  if (!client) return null;
  const { data, error } = await client.from("live_activities").select("id,order_index,activity_type,state").eq("live_session_id", sessionId).order("order_index");
  if (error) throw error;
  return data;
}

// Keeps exactly one activity live (the expected one) and the session "live",
// the same way Ritual's own Start/Complete actions write these fields.
async function ensureSingleLive(expectedOrder, label) {
  const client = await dbClient();
  if (!client) return;
  const { data: activities, error } = await client.from("live_activities").select("id,order_index,state").eq("live_session_id", sessionId).order("order_index");
  if (error) throw error;
  const extras = activities.filter((item) => item.state === "live" && item.order_index !== expectedOrder);
  for (const extra of extras) {
    const { error: revertError } = await client.from("live_activities").update({ state: "pending", started_at: null, timer_anchor_at: null, paused_remaining_seconds: null }).eq("id", extra.id);
    if (revertError) throw revertError;
    log(`  [repair ${label}] activity ${extra.order_index} was started too early: set back to pending`);
  }
  const expected = activities.find((item) => item.order_index === expectedOrder);
  if (expected && expected.state !== "live") {
    const stamp = new Date().toISOString();
    const { error: startError } = await client.from("live_activities").update({ state: "live", started_at: stamp, timer_anchor_at: stamp }).eq("id", expected.id);
    if (startError) throw startError;
    log(`  [repair ${label}] activity ${expectedOrder} set live`);
  }
  const { data: sessionRow, error: sessionError } = await client.from("live_sessions").select("status").eq("id", sessionId).maybeSingle();
  if (sessionError) throw sessionError;
  if (sessionRow && sessionRow.status !== "live") {
    const { error: statusError } = await client.from("live_sessions").update({ status: "live" }).eq("id", sessionId);
    if (statusError) throw statusError;
    log(`  [repair ${label}] session status was "${sessionRow.status}": set to live`);
  }
}

async function logActivities(label) {
  try {
    const data = await getActivities();
    if (data) log(`  [db ${label}] ${data.map((item) => `${item.order_index}:${item.activity_type}=${item.state}`).join(" | ")}`);
  } catch (cause) {
    log(`  [db ${label}] unavailable: ${cause instanceof Error ? cause.message : cause}`);
  }
}

// Logs what the facilitator controls show, to diagnose activity transitions.
async function logFacilitatorState(label) {
  const heading = await facilitator.locator("h1").first().textContent({ timeout: 2_000 }).catch(() => "");
  const buttons = await facilitator.getByRole("button").allTextContents().catch(() => []);
  const primary = buttons.map((item) => item.trim()).filter((item) => /Complete activity|Start activity|Close ritual|Confirm pact/.test(item));
  log(`  [state ${label}] heading: "${(heading ?? "").trim().slice(0, 60)}" | controls: ${primary.join(", ") || "none"}`);
}

try {
  // 1. Hidden facilitator: load the ritual file and open the lobby.
  log("Creating the live session from the ritual file...");
  const facilitatorContext = await hidden.newContext({ storageState: AUTH_FILE, viewport: { width: 1440, height: 900 } });
  facilitator = await facilitatorContext.newPage();
  await facilitator.goto(withLocale(`${BASE_URL}/dashboard`));
  await facilitator.evaluate((file) => window.sessionStorage.setItem("ritual-file-pending", JSON.stringify(file)), ritualFile);
  await facilitator.goto(withLocale(`${BASE_URL}/live/setup`));
  const openLobby = facilitator.getByRole("button", { name: /Open lobby/ });
  await openLobby.waitFor({ state: "visible", timeout: 30_000 });
  await facilitator.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Open lobby"));
    return button && !button.disabled;
  }, null, { timeout: 30_000 });
  await openLobby.click();
  await facilitator.waitForURL(/\/live\/lobby\?/, { waitUntil: "commit", timeout: 90_000 });
  sessionId = new URL(facilitator.url()).searchParams.get("id");
  log(`Session created: ${sessionId}`);
  await logActivities("after lobby");

  // 2. Participant link (join token kept by the facilitator browser).
  const joinKey = `ritual-live-join:${sessionId}`;
  let joinToken = await facilitator.evaluate((key) => localStorage.getItem(key), joinKey);
  if (!joinToken) {
    await clickButton(facilitator, /Generate participant link/);
    await facilitator.waitForFunction((key) => Boolean(localStorage.getItem(key)), joinKey, { timeout: 30_000 });
    joinToken = await facilitator.evaluate((key) => localStorage.getItem(key), joinKey);
  }
  const joinUrl = withLocale(`${BASE_URL}/live/join?id=${encodeURIComponent(sessionId)}&join=${encodeURIComponent(joinToken)}`);

  // 3. Twelve hidden phones join.
  log("Participants joining...");
  phones = {};
  const joinAs = async (page, name) => {
    await page.goto(joinUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByLabel("Nickname").fill(name, { timeout: 60_000 });
    await clickButton(page, /^Join/);
    // Client-side navigation: wait for the URL change, not for a full page load.
    await page.waitForURL(/participant=/, { waitUntil: "commit", timeout: 90_000 });
  };
  for (const [index, name] of allNames.entries()) {
    if (index > 0 && index % 8 === 0) {
      const windowMs = 10 * 60 * 1000;
      const waitMs = windowMs - (Date.now() % windowMs) + 5_000;
      log(`Join limit reached (8 per 10 minutes). Waiting ${Math.ceil(waitMs / 1000)} s for the next window...`);
      await sleep(waitMs / 1000);
    }
    const context = await hidden.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await context.newPage();
    try {
      await joinAs(page, name);
    } catch (firstError) {
      const message = await page.locator("p.text-orange, p.text-sm.text-orange").first().textContent({ timeout: 2_000 }).catch(() => null);
      log(`Join retry for ${name}${message ? ` (page says: ${message.trim()})` : ""}`);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `join-${name}.png`) }).catch(() => {});
      await joinAs(page, name);
    }
    phones[name] = page;
    log(`  ${name} joined (${Object.keys(phones).length}/${allNames.length})`);
  }

  // 4. Start the ritual (first activity goes live).
  await clickButton(facilitator, /Start ritual/);
  await facilitator.waitForURL(/\/live\?id=/, { waitUntil: "commit", timeout: 90_000 });
  await sleep(1);
  await logActivities("after Start ritual");

  // 5. Visible full-screen window in Presentation mode.
  // DEMO_NO_SCREEN=1 runs the same session without the visible window (for tests).
  const showScreen = process.env.DEMO_NO_SCREEN !== "1";
  if (showScreen) {
    visible = await chromium.launch({ headless: false, args: ["--start-fullscreen"], ignoreDefaultArgs: ["--enable-automation"] });
    const visibleContext = await visible.newContext({ storageState: AUTH_FILE, viewport: null });
    screen = await visibleContext.newPage();
    // Cosmetic only, in this recording window: hide site header, footer and
    // every button so the shared screen looks like a clean presentation.
    await screen.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "header, footer, button, nextjs-portal { display: none !important; } body { cursor: none !important; }";
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
    });
    await screen.goto(withLocale(`${BASE_URL}/live?id=${encodeURIComponent(sessionId)}`));
    await screen.mouse.move(4, 4);
    log(`Screen ready. Start OBS now: answers begin in ${PACE.recordingCountdown} seconds.`);
  } else {
    log("Test mode (DEMO_NO_SCREEN=1): no visible window.");
  }
  await sleep(PACE.recordingCountdown);

  const waitForPrompt = (text) => Promise.all(Object.values(phones).map((page) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 60_000 })));
  let currentOrder = 0;
  const nextActivity = async (label) => {
    await sleep(PACE.resultHold);
    await logFacilitatorState(`before leaving ${label}`);
    await facilitatorClick(/Complete activity/);
    const deadline = Date.now() + PACE.intermissionHold * 1000;
    let liveCount = 0;
    do {
      await sleep(0.5);
      const activities = await getActivities().catch(() => null);
      liveCount = activities ? activities.filter((item) => item.state === "live").length : 0;
    } while (liveCount === 0 && Date.now() < deadline);
    await logActivities(`after completing ${label}`);
    if (liveCount === 0) {
      await facilitatorClick(/Start activity/);
      await sleep(1);
    } else {
      log(`  (next activity started automatically after ${label})`);
    }
    currentOrder += 1;
    await ensureSingleLive(currentOrder, label);
    await sleep(1);
    await ensureSingleLive(currentOrder, label);
    await facilitator.reload();
    await logFacilitatorState(`after starting the activity after ${label}`);
    await logActivities(`after ${label}`);
  };
  const submitText = async (page, text) => {
    await page.locator("textarea").first().fill(text);
    await clickButton(page, /Submit response/);
    await page.waitForFunction(() => !document.querySelector("textarea")?.value, null, { timeout: 15_000 }).catch(() => {});
  };

  if (!ONLY_PACT) {
    // Explore: word cloud.
    log("Explore: word cloud");
    await waitForPrompt(trigger.prompt);
    await steady(shuffle(trigger.responses).map((item) => () => submitText(phones[item.participant], item.text)), PACE.triggerSeconds);
    await nextActivity("Explore");

    // Reflect: barriers and opportunities clusters.
    log("Reflect: clusters");
    await waitForPrompt(surface.prompt);
    const categoryLabel = Object.fromEntries(surface.categories.map((item) => [item.id, item.label]));
    const surfaceOrder = surface.responses.flatMap((item, index, all) => index < all.length / 2 ? [item, all[index + all.length / 2]] : []);
    await paced(surfaceOrder.map((item) => async () => {
      const page = phones[item.participant];
      await clickButton(page, categoryLabel[item.category], { exact: true });
      await submitText(page, item.text);
    }), PACE.activitySeconds);
    await nextActivity("Reflect");

    // Prioritize: 3 votes each, distribution taken from the data file.
    log("Prioritize: ranking");
    await waitForPrompt(priority.prompt);
    const remaining = priority.items.map((item) => item.targetVotes);
    const ballots = names.map((name) => {
      const picks = remaining.map((count, index) => ({ count, index })).sort((a, b) => b.count - a.count).slice(0, priority.votesPerParticipant).map((item) => item.index);
      picks.forEach((index) => { remaining[index] -= 1; });
      return { name, labels: picks.map((index) => priority.items[index].label) };
    });
    await paced(ballots.map((ballot) => async () => {
      const page = phones[ballot.name];
      for (const label of ballot.labels) await clickButton(page, label, { exact: true });
      await clickButton(page, /Submit votes/);
    }), PACE.activitySeconds);
    await sleep(PACE.finalHold);
  }

  if (ONLY_PACT) {
    // Agree: votes on the statement, then reveal and confirm.
    log("Agree: statement vote");
    await waitForPrompt(pact.statement);
    const voters = Object.keys(phones);
    const targets = voters.length === pact.targetVotes.agree + pact.targetVotes.partial + pact.targetVotes.disagree
      ? pact.targetVotes
      : { agree: Math.round(voters.length * 0.65), disagree: 1, partial: voters.length - Math.round(voters.length * 0.65) - 1 };
    const levels = [
      ...Array(targets.agree).fill("Agree"),
      ...Array(Math.max(0, targets.partial)).fill("Partially"),
      ...Array(targets.disagree).fill("Disagree")
    ];
    const adhesions = shuffle(voters.map((name, index) => ({ name, level: levels[index] ?? "Agree" })), 11);
    let sent = 0;
    await paced(adhesions.map((item) => async () => {
      const page = phones[item.name];
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        await clickButton(page, item.level, { exact: true });
        await clickButton(page, /Submit response/);
        const ok = await page.getByText("Response sent.").first().waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
        if (ok) { sent += 1; return; }
        const message = await page.locator("p.text-orange").first().textContent({ timeout: 1_000 }).catch(() => null);
        log(`  vote not confirmed for ${item.name}${message ? ` (${message.trim()})` : ""}, attempt ${attempt}`);
      }
    }), PACE.activitySeconds);
    log(`  votes confirmed on the phones: ${sent}/${voters.length}`);
    // Wait until the facilitator view counts every vote before revealing.
    await facilitator.getByText(new RegExp(`^${sent} responses`)).first().waitFor({ timeout: 20_000 }).catch(() => log("  (facilitator count not confirmed, revealing anyway)"));
    await sleep(2);
    await facilitatorClick(/Reveal responses/);
    await sleep(PACE.pactRevealHold);
    await facilitatorClick(/Confirm pact/);
    log("Pact confirmed.");
    await sleep(PACE.finalHold);
  }

  log(`Done. You can stop the OBS recording. Session id: ${sessionId}`);
} catch (error) {
  console.error("\nThe demo stopped:", error instanceof Error ? error.message : error);
  if (facilitator) await logActivities("at stop");
  if (facilitator) await facilitator.screenshot({ path: path.join(OUTPUT_DIR, "error-facilitator.png"), fullPage: true }).catch(() => {});
  if (screen) await screen.screenshot({ path: path.join(OUTPUT_DIR, "error-screen.png") }).catch(() => {});
  const firstPhone = Object.values(phones)[0];
  if (firstPhone) await firstPhone.screenshot({ path: path.join(OUTPUT_DIR, "error-phone.png"), fullPage: true }).catch(() => {});
  console.error(`Screenshots (facilitator, screen, phone) were saved in ${path.relative(process.cwd(), OUTPUT_DIR)}.`);
  process.exitCode = 1;
} finally {
  await visible?.close().catch(() => {});
  await hidden.close().catch(() => {});
}
