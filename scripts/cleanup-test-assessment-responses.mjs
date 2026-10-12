import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./test-data/load-env.mjs";
import { parseArgs } from "./test-data/simulated-assessment-data.mjs";

loadLocalEnv();

const args = parseArgs(process.argv.slice(2));
const assessmentId = args.assessmentId;
const batchId = args.batchId;

if (!assessmentId) fail("Missing --assessmentId=<id>.");
if (!batchId) fail("Missing --batchId=<id>.");
if (process.env.NODE_ENV === "production" && args.allowProduction !== "true") {
  fail("Refusing to cleanup test responses in production. Pass --allowProduction=true only for an explicit staging workflow.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  fail("Cleanup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const responseIds = await findResponseIdsByBatch();
if (!responseIds.length) {
  console.log(`No test responses found for batch ${batchId}.`);
  process.exit(0);
}

const participantIds = await findParticipantIds(responseIds);

await deleteRows("activity_responses", "response_id", responseIds);
await deleteRows("responses", "id", responseIds);
if (participantIds.length) await deleteRows("participants", "id", participantIds);

console.log(`Deleted ${responseIds.length} responses and ${participantIds.length} participants for batch ${batchId}.`);

async function findResponseIdsByBatch() {
  const { data: responses, error: responsesError } = await supabase
    .from("responses")
    .select("id")
    .eq("assessment_id", assessmentId);
  if (responsesError) throw responsesError;

  const ids = (responses ?? []).map((row) => row.id);
  if (!ids.length) return [];

  const { data: activityResponses, error } = await supabase
    .from("activity_responses")
    .select("response_id, answer_json")
    .in("response_id", ids);
  if (error) throw error;

  return Array.from(
    new Set(
      (activityResponses ?? [])
        .filter((row) => JSON.stringify(row.answer_json ?? {}).includes(batchId))
        .map((row) => row.response_id)
    )
  );
}

async function findParticipantIds(responseIds) {
  const { data, error } = await supabase
    .from("responses")
    .select("participant_id")
    .in("id", responseIds);
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => row.participant_id).filter(Boolean)));
}

async function deleteRows(table, column, ids) {
  const { error } = await supabase.from(table).delete().in(column, ids);
  if (error) throw error;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
