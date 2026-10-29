// Saves the demo account session for the live demo script.
//
// Cloudflare Turnstile (correctly) rejects automated browsers, so you sign in
// in a normal Edge window and this script only reads the session from it.
//
// 1. Open Edge with a separate demo profile and remote debugging (PowerShell):
//    & "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\ritual-demo-profile" "http://localhost:3000/login?locale=en"
// 2. Sign in with the DEMO account in that window and wait for the dashboard.
// 3. From the project root:  node scripts/demo/login-demo.mjs
//
// The session is saved to scripts/demo/.auth/demo.json (git-ignored).
// Your password is never read or stored.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const DEBUG_URL = process.env.DEMO_CHROME_DEBUG_URL ?? "http://127.0.0.1:9222";
const AUTH_FILE = path.resolve("scripts/demo/.auth/demo.json");

fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

let browser;
try {
  browser = await chromium.connectOverCDP(DEBUG_URL);
} catch {
  console.error(`Edge is not reachable on ${DEBUG_URL}. Open it first with --remote-debugging-port=9222 (see the top of this file).`);
  process.exit(1);
}

const context = browser.contexts()[0];
const page = context.pages().find((item) => item.url().startsWith(BASE_URL));
if (!page) {
  console.error(`No tab open on ${BASE_URL}. Open the site in that Edge window and sign in.`);
  process.exit(1);
}

if (!/\/dashboard/.test(page.url())) {
  console.log("Waiting for you to sign in and reach the dashboard (up to 5 minutes)...");
  await page.waitForURL(/\/dashboard/, { timeout: 5 * 60 * 1000 });
}
await page.waitForLoadState("networkidle").catch(() => {});

// Over a CDP connection Playwright does not collect localStorage, where the
// Supabase session lives, so it is read directly from the signed-in tab.
const origin = new URL(page.url()).origin;
const localStorageItems = await page.evaluate(() => Object.entries(window.localStorage).map(([name, value]) => ({ name, value })));
if (!localStorageItems.some((item) => item.name.includes("auth-token"))) {
  console.error("No Supabase session found in that tab. Make sure you are signed in on localhost:3000, then run again.");
  process.exit(1);
}
const { hostname } = new URL(origin);
const cookies = (await context.cookies()).filter((cookie) => cookie.domain.replace(/^\./, "") === hostname);
fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies, origins: [{ origin, localStorage: localStorageItems }] }, null, 2));
console.log(`Session saved to ${path.relative(process.cwd(), AUTH_FILE)}. You can close that Edge window.`);
// Disconnect without closing the user's Edge window.
await browser.close().catch(() => {});
