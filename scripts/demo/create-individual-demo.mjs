// Creates and publishes the individual demo assessment ("Project kick-off:
// partner assessment") under the DEMO account, for screenshots.
//
// Run from the project root, with `npm run dev` running and after
// `node scripts/demo/login-demo.mjs`:
//   node scripts/demo/create-individual-demo.mjs
//
// It uses the same creation endpoint as the dashboard, then publishes the
// assessment and prints its public link. Content: project-kickoff.individual.json.
// To remove it afterwards, delete the assessment from the dashboard.
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "../test-data/load-env.mjs";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const AUTH_FILE = path.resolve("scripts/demo/.auth/demo.json");
const CONTENT_FILE = path.resolve("scripts/demo/project-kickoff.individual.json");
const LINK_FILE = path.resolve("scripts/demo/.auth/individual-demo-link.txt");

loadLocalEnv();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) fail("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
if (!fs.existsSync(AUTH_FILE)) fail("Missing demo session. Run first:  node scripts/demo/login-demo.mjs");

// Read the saved demo session (never printed).
const storage = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
const authItem = storage.origins?.flatMap((origin) => origin.localStorage ?? []).find((item) => item.name.includes("auth-token"));
if (!authItem) fail("No Supabase session in the saved demo file. Run login-demo.mjs again.");
const saved = JSON.parse(authItem.value);

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
  access_token: saved.access_token,
  refresh_token: saved.refresh_token
});
if (sessionError || !sessionData.session) fail("The demo session has expired. Run login-demo.mjs again.");
const accessToken = sessionData.session.access_token;
const user = sessionData.session.user;

const { assessment: content } = JSON.parse(fs.readFileSync(CONTENT_FILE, "utf8"));
const body = {
  language: content.language,
  title: content.title,
  description: content.description,
  estimatedDuration: content.estimatedDuration,
  hideActivitySummaries: content.hideActivitySummaries,
  activities: content.activities.map((activity, orderIndex) => ({ ...activity, orderIndex }))
};

console.log(`Creating "${content.title}" on ${BASE_URL} ...`);
let response;
try {
  response = await fetch(`${BASE_URL}/api/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body)
  });
} catch {
  fail(`${BASE_URL} is not reachable. Start the dev server first:  npm run dev`);
}
if (!response.ok) fail(`Creation failed (${response.status}): ${await response.text()}`);
const created = await response.json();
const assessmentId = created.assessment.id;
console.log(`✓ Draft created with ${created.activities.length} activities.`);

const profileName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
const publicToken = randomBytes(24).toString("hex");
const { error: publishError } = await supabase
  .from("assessments")
  .update({
    status: "published",
    public_token: publicToken,
    data_controller_name: profileName || user.email,
    data_controller_contact: user.email,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq("id", assessmentId);
if (publishError) fail(`Created as draft (id ${assessmentId}) but publishing failed: ${publishError.message}. You can publish it from the dashboard.`);

const link = `${BASE_URL}/participate/${publicToken}?locale=en`;
fs.writeFileSync(LINK_FILE, `${link}\n`);
console.log("✓ Published.");
console.log("");
console.log(`Participant link: ${link}`);
console.log("Next:  node scripts/demo/fill-individual-demo.mjs");

function fail(message) {
  console.error(message);
  process.exit(1);
}
