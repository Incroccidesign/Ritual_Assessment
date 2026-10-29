import { randomBytes, randomUUID, createHash } from "node:crypto";
import { catalog } from "./screenshot-catalog.mjs";

export const DEMO_EMAIL = "incrocci98@gmail.com";
// Stable IDs isolate these records and make repeated imports skip completed items.
export function demoId(key) {
  const hex = createHash("sha256").update(`ritual-screenshots-v1:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
async function checked(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
function rewrite(config, ids) {
  const result = structuredClone(config);
  if (result.sourceActivityId) result.sourceActivityId = ids[result.sourceActivityId];
  for (const section of result.sections ?? []) {
    for (const item of section.items ?? []) item.activityId = ids[item.activityId];
  }
  return result;
}
const organizations = ["Cedar Community Lab", "Open Horizons Collective", "Northbridge Learning Hub", "Riverbank Association", "Common Ground Studio", "Bright Path Network", "Willow Research Centre", "Neighbourhood Futures"];
const countries = ["Italy", "France", "Spain", "Belgium", "Portugal", "Germany"];
const names = ["Alex", "Sam", "Taylor", "Robin", "Jamie", "Morgan", "Casey", "Jordan", "Riley", "Avery", "Charlie", "Drew", "Rowan", "Quinn", "Skyler", "Emery", "Reese", "Finley", "Sage", "Blair", "Ellis", "Parker", "Cameron", "Hayden"];
function stamp(index, count) { return new Date(Date.now() - (count - index) * 3_600_000).toISOString(); }

export function buildDemoAnswers(demo, activities, index) {
  const answers = new Map();
  return activities.map(activity => {
    const config = activity.config_json;
    const source = answers.get(config.sourceActivityId);
    let answer;
    if (activity.type === "profiling") {
      answer = { fields: { organization: organizations[index % organizations.length], country: countries[index % countries.length], role: config.fields[2].options[index % 4] } };
    } else if (activity.type === "exploration") {
      // Most respondents choose the leading option; smaller groups favour other items.
      const choices = index % 4 === 0 ? [1, 2] : index % 5 === 0 ? [2, 3] : [0, 1 + index % (config.options.length - 1)];
      answer = { items: [...new Set(choices)].map(option => ({ id: `${activity.id}-option-${option}`, label: config.options[option], source: "predefined" })) };
    } else if (activity.type === "prioritization") {
      const selected = [...(source?.items ?? [])];
      if (index % 3 === 0) selected.reverse();
      answer = { rankedItems: selected.map((item, rank) => ({ sourceItemId: item.id, label: item.label, rank: rank + 1 })) };
    } else if (activity.type === "framing") {
      const text = demo.responses[index % demo.responses.length];
      const support = ["A coordinator and two community representatives can lead a small pilot.", "Our team can contribute practical experience; a local partner can provide a meeting space.", "We need a clear owner, time to test the idea and feedback from the people affected.", "A peer mentor and a short shared guide would help the team get started."][index % 4];
      answer = { sourceRanking: (source?.rankedItems ?? source?.items ?? []).map(item => item.label), answer: text, questionAnswers: { action: text, support }, ...(config.mode === "per_exploration_item" ? { itemAnswers: (source?.items ?? []).map((item, position) => ({ itemId: item.id, label: item.label, answer: demo.responses[(index + position) % demo.responses.length] })) } : {}) };
    } else if (activity.type === "scheduling") {
      answer = { slotIds: config.slots.filter((_, slot) => (index + slot) % 3 !== 0).map(slot => slot.id) };
    } else if (activity.type === "planning_report") {
      answer = { viewedAt: stamp(index, demo.count) };
    } else throw new Error(`Unsupported activity ${activity.type}`);
    answers.set(activity.id, answer);
    return { activity_id: activity.id, activity_type: activity.type, answer_json: answer };
  });
}

async function seedIndividual(db, demo, id, user, onCreated) {
  const ids = Object.fromEntries(demo.activities.map(a => [a.clientId, randomUUID()]));
  await checked(db.from("assessments").insert({ id, owner_id: user.id, title: demo.title, description: demo.description, language: "en", status: "draft", estimated_duration: demo.estimatedDuration, hide_activity_summaries: false }));
  onCreated();
  const activities = demo.activities.map(a => ({ id: ids[a.clientId], assessment_id: id, type: a.type, title: a.title, prompt: a.prompt, order_index: a.orderIndex, config_json: rewrite(a.configJson, ids) }));
  await checked(db.from("activities").insert(activities));
  if (demo.count) {
    const participants = Array.from({ length: demo.count }, (_, index) => ({ id: randomUUID(), assessment_id: id, participant_token: `DEMO_${demo.key}_${index}`, status: "submitted", created_at: stamp(index, demo.count), started_at: stamp(index, demo.count), submitted_at: stamp(index, demo.count) }));
    await checked(db.from("participants").insert(participants));
    const responses = participants.map(p => ({ id: randomUUID(), assessment_id: id, participant_id: p.id, status: "submitted", created_at: p.created_at, updated_at: p.submitted_at, submitted_at: p.submitted_at }));
    await checked(db.from("responses").insert(responses));
    const answers = responses.flatMap((response, index) => buildDemoAnswers(demo, activities, index).map(answer => ({ ...answer, response_id: response.id, created_at: response.created_at, updated_at: response.updated_at })));
    await checked(db.from("activity_responses").insert(answers));
  }
  await checked(db.from("assessments").update({ status: demo.status, ...(demo.status !== "draft" ? { public_token: randomBytes(24).toString("hex"), data_controller_name: user.user_metadata?.full_name || "Demo account", data_controller_contact: user.email, published_at: new Date().toISOString() } : {}) }).eq("id", id).eq("owner_id", user.id));
}

async function seedCollective(db, demo, id, user, onCreated) {
  const account = await checked(db.from("accounts").select("id").eq("owner_user_id", user.id).single());
  await checked(db.from("live_sessions").insert({ id, account_id: account.id, owner_id: user.id, title: demo.title, facilitator_name: demo.facilitator_name, context_label: demo.context_label, participant_details_mode: demo.participant_details_mode, status: "draft" }));
  onCreated();
  const token = randomBytes(32).toString("base64url");
  await checked(db.from("live_session_access_tokens").insert({ live_session_id: id, participant_join_token_hash: createHash("sha256").update(token).digest("hex") }));
  await checked(db.from("live_session_roles").insert(demo.roles.map(role_name => ({ live_session_id: id, role_name }))));
  const activities = demo.activities.map((a, index) => {
    const fields = { ...a };
    delete fields.priority_manual_items;
    return { surface_input_types: null, priority_source: null, votes_per_participant: 1, pact_statement_mode: null, pact_text: null, ...fields, id: randomUUID(), live_session_id: id, order_index: index, instance_index: demo.activities.slice(0, index + 1).filter(x => x.activity_type === a.activity_type).length, state: "pending" };
  });
  await checked(db.from("live_activities").insert(activities));
  const priorityItems = demo.activities.flatMap((a, index) => (a.priority_manual_items ?? []).map(label => ({ id: randomUUID(), live_session_id: id, live_activity_id: activities[index].id, source_type: "manual", label })));
  if (priorityItems.length) await checked(db.from("live_priority_items").insert(priorityItems));
  if (demo.count) {
    const participants = Array.from({ length: demo.count }, (_, index) => ({ id: randomUUID(), live_session_id: id, nickname: names[index], display_name: names[index], role_name: index % 3 ? "Partner" : "Community representative" }));
    await checked(db.from("live_participants").insert(participants));
    for (const [activityIndex, activity] of activities.entries()) {
      if (["innesco", "traccia", "focus"].includes(activity.activity_type)) {
        const pool = activity.activity_type === "innesco" ? ["Curious", "Hopeful", "Curious", "Motivated", "Connected", "Hopeful", "Inspired", "Ready"] : activity.activity_type === "focus" ? demo.actions : activityIndex > 1 ? demo.actions : demo.contributions;
        await checked(db.from("live_responses").insert(participants.map((participant, index) => ({ live_session_id: id, live_activity_id: activity.id, participant_id: participant.id, activity_type: activity.activity_type, response_text: pool[index % pool.length], response_category: activity.activity_type === "traccia" ? index % 2 ? "opportunities" : "barriers" : null }))));
      } else if (activity.activity_type === "priorita") {
        const items = priorityItems.filter(item => item.live_activity_id === activity.id);
        const votes = participants.flatMap((participant, index) => {
          const choices = index % 4 === 0 ? [1, 2] : [0, 1 + index % (items.length - 1)];
          return [...new Set(choices)].map(choice => ({ live_session_id: id, live_activity_id: activity.id, participant_id: participant.id, live_priority_item_id: items[choice].id }));
        });
        await checked(db.from("live_priority_votes").insert(votes));
      } else if (activity.activity_type === "patto") {
        const agree = Math.ceil(demo.count * 0.75), partial = demo.count - agree - 1;
        await checked(db.from("live_pacts").insert({ live_session_id: id, live_activity_id: activity.id, pact_text: demo.commitment, pact_statement_mode: "predefined", pact_rounds: [{ roundNumber: 1, proposalText: demo.commitment, agreementCounts: { agree, partial, disagree: 1 }, confirmed: true }], current_round_number: 1, confirmed_pact_proposal: demo.commitment, confirmed_round_number: 1, resolved_final_statement: demo.commitment }));
        await checked(db.from("live_pact_votes").insert(participants.map((participant, index) => ({ live_session_id: id, live_activity_id: activity.id, participant_id: participant.id, round_number: 1, adhesion_level: index < agree ? "Concordo" : index < agree + partial ? "Parzialmente" : "Non concordo" }))));
      }
    }
    for (const [index, activity] of activities.entries()) {
      await checked(db.from("live_activities").update({ state: "completed", started_at: stamp(index, activities.length + 2), ended_at: stamp(index + 1, activities.length + 2) }).eq("id", activity.id).eq("live_session_id", id));
    }
  }
  await checked(db.from("live_sessions").update({ status: demo.status, ...(demo.status === "closed" ? { ritual_started_at: stamp(0, activities.length + 2), ritual_ended_at: new Date().toISOString() } : {}) }).eq("id", id).eq("owner_id", user.id));
}

export function listScreenshotDemos() { return catalog.map(({ key, kind, title, status, count, activities }) => ({ key, kind, title, status, count, activityCount: activities.length })); }
async function verifyExisting(db, demo, id) {
  const individual = demo.kind === "individual";
  const activities = await checked(db.from(individual ? "activities" : "live_activities").select("id").eq(individual ? "assessment_id" : "live_session_id", id));
  const contributions = await checked(db.from(individual ? "responses" : "live_participants").select("id").eq(individual ? "assessment_id" : "live_session_id", id));
  if (activities.length !== demo.activities.length || contributions.length !== demo.count) throw new Error("An incomplete or modified demo exists. Inspect it before retrying.");
}
export async function seedScreenshotDemo(db, user, key) {
  if (user.email?.toLowerCase() !== DEMO_EMAIL) throw new Error("This importer is restricted to the configured demo account.");
  const demo = catalog.find(item => item.key === key);
  if (!demo) throw new Error("Unknown demo key.");
  const id = demoId(key), table = demo.kind === "individual" ? "assessments" : "live_sessions";
  const existing = await checked(db.from(table).select("id,owner_id,status").eq("id", id).maybeSingle());
  if (existing) {
    if (existing.owner_id !== user.id) throw new Error("Demo ID already belongs to another account.");
    if (existing.status !== demo.status) throw new Error("A demo with this ID exists in a different state. Inspect it before retrying.");
    await verifyExisting(db, demo, id);
    return { key, id, title: demo.title, skipped: true };
  }
  let created = false;
  try {
    const onCreated = () => { created = true; };
    if (demo.kind === "individual") await seedIndividual(db, demo, id, user, onCreated);
    else await seedCollective(db, demo, id, user, onCreated);
    await verifyExisting(db, demo, id);
  } catch (error) {
    // Roll back only the newly created, deterministic record owned by this account.
    if (created) {
      const cleanup = await db.from(table).delete().eq("id", id).eq("owner_id", user.id);
      if (cleanup.error) throw new Error(`${error.message} Rollback failed: ${cleanup.error.message}`);
    }
    throw error;
  }
  return { key, id, title: demo.title, skipped: false };
}
