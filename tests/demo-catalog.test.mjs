import test from "node:test";
import assert from "node:assert/strict";
import { catalog, individuals, collectives } from "../scripts/demo/screenshot-catalog.mjs";
import { buildDemoAnswers, demoId, seedScreenshotDemo, DEMO_EMAIL } from "../scripts/demo/seed-screenshot-catalog.mjs";

const user = { id: "demo-owner", email: DEMO_EMAIL, user_metadata: { full_name: "Luca" } };
function database(failTable) {
  const tables = { accounts: [{ id: "demo-account", owner_user_id: user.id }] };
  const writes = [];
  return { tables, writes, from(table) {
    const filters = [];
    let operation = "select", payload, single = false;
    const query = {
      select() { return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      single() { single = true; return query; },
      maybeSingle() { single = true; return query; },
      insert(value) { operation = "insert"; payload = value; return query; },
      update(value) { operation = "update"; payload = value; return query; },
      delete() { operation = "delete"; return query; },
      then(resolve, reject) {
        try {
          tables[table] ??= [];
          const matches = row => filters.every(([key, value]) => row[key] === value);
          if (operation !== "select") writes.push({ table, operation, filters: [...filters] });
          if (table === failTable && operation === "insert") return Promise.resolve({ error: { message: "Injected write failure" } }).then(resolve, reject);
          if (operation === "insert") tables[table].push(...structuredClone(Array.isArray(payload) ? payload : [payload]));
          if (operation === "update") tables[table].filter(matches).forEach(row => Object.assign(row, payload));
          if (operation === "delete") tables[table] = tables[table].filter(row => !matches(row));
          const rows = tables[table].filter(matches);
          return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
        } catch (error) { return Promise.reject(error).then(resolve, reject); }
      }
    };
    return query;
  } };
}

test("six distinct individual paths and six distinct collaborative paths", () => {
  assert.equal(individuals.length, 6);
  assert.equal(collectives.length, 6);
  assert.equal(new Set(catalog.map(demo => demoId(demo.key))).size, 12);
  for (const group of [individuals, collectives]) {
    assert.equal(new Set(group.map(demo => demo.activities.map(a => a.type ?? a.activity_type).join(","))).size, 6);
  }
});

test("imports every example with linked responses, ranks, votes and pact totals", async () => {
  const db = database();
  for (const demo of catalog) await seedScreenshotDemo(db, user, demo.key);
  assert.equal(db.tables.assessments.length, 6);
  assert.equal(db.tables.live_sessions.length, 6);
  assert.equal(db.tables.responses.length, individuals.reduce((n, demo) => n + demo.count, 0));
  assert.equal(db.tables.live_participants.length, collectives.reduce((n, demo) => n + demo.count, 0));
  for (const demo of individuals) {
    const id = demoId(demo.key);
    const activities = db.tables.activities.filter(a => a.assessment_id === id);
    const ids = new Set(activities.map(a => a.id));
    for (const a of activities) {
      if (a.config_json.sourceActivityId) assert.ok(ids.has(a.config_json.sourceActivityId));
      for (const section of a.config_json.sections ?? []) for (const item of section.items ?? []) assert.ok(ids.has(item.activityId));
    }
    for (let index = 0; index < Math.max(1, demo.count); index++) {
      const answers = buildDemoAnswers(demo, activities, index);
      assert.equal(answers.length, activities.length);
      for (const a of answers) {
        if (a.activity_type === "prioritization") assert.ok(a.answer_json.rankedItems.length > 0);
        if (a.activity_type === "framing") assert.ok(a.answer_json.sourceRanking.length > 0);
        if (a.activity_type === "scheduling") assert.ok(a.answer_json.slotIds.length > 0);
      }
    }
  }
  for (const activity of db.tables.live_activities) {
    assert.ok(activity.votes_per_participant >= 1);
    const session = db.tables.live_sessions.find(s => s.id === activity.live_session_id);
    assert.equal(activity.state, session.status === "closed" ? "completed" : "pending");
  }
  for (const pact of db.tables.live_pacts) {
    const votes = db.tables.live_pact_votes.filter(v => v.live_activity_id === pact.live_activity_id);
    const counts = pact.pact_rounds[0].agreementCounts;
    assert.equal(votes.filter(v => v.adhesion_level === "Concordo").length, counts.agree);
    assert.equal(votes.filter(v => v.adhesion_level === "Parzialmente").length, counts.partial);
    assert.equal(votes.filter(v => v.adhesion_level === "Non concordo").length, counts.disagree);
  }
  const writeCount = db.writes.length;
  for (const demo of catalog) assert.equal((await seedScreenshotDemo(db, user, demo.key)).skipped, true);
  assert.equal(db.writes.length, writeCount, "repeated imports must not write");
});

test("rejects another account before database access", async () => {
  const db = database();
  await assert.rejects(seedScreenshotDemo(db, { ...user, email: "other@example.com" }, catalog[0].key), /restricted/);
  assert.equal(db.writes.length, 0);
});

test("refuses deterministic IDs belonging to another owner", async () => {
  const db = database();
  db.tables.assessments = [{ id: demoId(catalog[0].key), owner_id: "someone-else", status: "closed" }];
  await assert.rejects(seedScreenshotDemo(db, user, catalog[0].key), /another account/);
  assert.equal(db.writes.length, 0);
});

test("write failure rolls back only the new record with an owner filter", async () => {
  const db = database("activities");
  db.tables.assessments = [{ id: "existing-content", owner_id: user.id }];
  await assert.rejects(seedScreenshotDemo(db, user, catalog[0].key), /Injected write failure/);
  assert.deepEqual(db.tables.assessments.map(a => a.id), ["existing-content"]);
  assert.deepEqual(db.writes.at(-1).filters, [["id", demoId(catalog[0].key)], ["owner_id", user.id]]);
});
