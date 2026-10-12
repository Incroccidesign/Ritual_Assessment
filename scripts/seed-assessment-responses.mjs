import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./test-data/load-env.mjs";
import {
  buildAnswerForActivity,
  makeBatchId,
  parseArgs,
  profileForIndex
} from "./test-data/simulated-assessment-data.mjs";

loadLocalEnv();

const args = parseArgs(process.argv.slice(2));
const assessmentId = args.assessmentId;
const count = Number(args.count ?? 10);
const language = args.language;
const batchId = args.batchId || makeBatchId();

if (!assessmentId) {
  fail("Missing --assessmentId=<id>.");
}
if (!Number.isFinite(count) || count <= 0) {
  fail("--count must be a positive number.");
}
if (process.env.NODE_ENV === "production" && args.allowProduction !== "true") {
  fail("Refusing to seed test responses in production. Pass --allowProduction=true only for an explicit staging workflow.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const assessment = await fetchPublishedAssessment(assessmentId);
const activities = await fetchActivities(assessmentId);

if (language && assessment.language !== language) {
  console.warn(`Assessment language is "${assessment.language}", requested "${language}". Continuing because --language is used as a test label only.`);
}

console.log(`Seeding ${count} submitted responses for assessment ${assessmentId}`);
console.log(`Batch ID: ${batchId}`);

for (let index = 0; index < count; index += 1) {
  const profile = profileForIndex(index, batchId);
  await submitProfileResponse(assessment.public_token, activities, profile);
  console.log(`✓ ${index + 1}/${count} ${profile.organizationName}`);
}

console.log("");
console.log("Done.");
console.log(`Cleanup command: npm run cleanup:test-assessment-responses -- --assessmentId=${assessmentId} --batchId=${batchId}`);

async function fetchPublishedAssessment(id) {
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!data?.public_token || data.status !== "published") {
    fail("Assessment must be published and have a public token before seeding participant responses.");
  }
  return data;
}

async function fetchActivities(targetAssessmentId) {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("assessment_id", targetAssessmentId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToActivity);
}

function rowToActivity(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    prompt: row.prompt,
    orderIndex: row.order_index,
    ...(row.config_json ?? {})
  };
}

async function submitProfileResponse(publicToken, orderedActivities, profile) {
  const participantToken = `TEST_${profile.testBatchId}_${profile.sequence}`;
  const previousAnswers = new Map();

  await rpc("start_public_response", {
    target_public_token: publicToken,
    target_participant_token: participantToken
  });

  for (const activity of orderedActivities) {
    const answer = buildAnswerForActivity(activity, profile, previousAnswers);
    previousAnswers.set(activity.id, answer);
    await rpc("save_public_activity_response", {
      target_public_token: publicToken,
      target_participant_token: participantToken,
      target_activity_id: activity.id,
      target_activity_type: activity.type,
      target_answer_json: answer
    });
  }

  await rpc("submit_public_response", {
    target_public_token: publicToken,
    target_participant_token: participantToken
  });
}

async function rpc(fn, params) {
  const { error } = await supabase.rpc(fn, params);
  if (error) throw error;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
