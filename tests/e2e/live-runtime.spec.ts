import { expect, test } from "@playwright/test";
import { getCurrentLiveActivity, getLiveExportData, getLiveResults, getNextLiveActivity, liveTimerRemaining, subscribeToLiveSession } from "../../lib/live/repository";
import { toLiveActivityInputs } from "../../lib/live/setup-adapter";
import { activityDisplayName, currentLiveActivity, liveActivityItems, liveActivityRemainingSeconds, livePactForActivity, nextPendingLiveActivity } from "../../lib/live/ui-adapter";
import { liveDashboardDestination } from "../../components/dashboard/LiveSessionCard";
import type { LiveActivity, LiveSessionSnapshot } from "../../types/live";

const item = (state: LiveActivity["state"], index: number): LiveActivity => ({ id: `a-${index}`, live_session_id: "s", activity_type: "focus", order_index: index, instance_index: index + 1, instance_label: null, prompt: "p", timer_enabled: true, timer_duration: 5, show_live_results: true, surface_input_types: null, state, priority_source: null, votes_per_participant: 1, pact_statement_mode: null, facilitator_note: null, pact_text: null, started_at: null, ended_at: null, timer_anchor_at: "2026-01-01T00:00:00.000Z", paused_remaining_seconds: null, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" });
test("lifecycle preserves completed data and selects current/next", () => { const live = item("live", 0), next = item("pending", 1); const state = { activities: [live, next] } as LiveSessionSnapshot; expect(getCurrentLiveActivity(state)?.id).toBe(live.id); expect(getNextLiveActivity(state)?.id).toBe(next.id); expect(getNextLiveActivity({ activities: [item("completed", 0)] } as LiveSessionSnapshot)).toBeNull(); });
test("timer preserves paused seconds", () => { expect(liveTimerRemaining({ ...item("paused", 0), paused_remaining_seconds: 87 }, Date.UTC(2026, 0, 1))).toBe(87); expect(liveTimerRemaining(item("live", 0), Date.UTC(2026, 0, 1, 0, 1))).toBe(240); });
test("realtime subscribes to operational Live tables", () => { const tables: string[] = []; const channel = { on: (_: string, config: { table: string }) => { tables.push(config.table); return channel; }, subscribe: () => channel }; const client = { channel: () => channel }; subscribeToLiveSession(client as never, "s", () => {}); expect(tables).toEqual(["live_sessions", "live_activities", "live_session_roles", "live_participants", "live_responses", "live_priority_items", "live_priority_votes", "live_pacts", "live_pact_votes"]); });
test("export preparation retains closed-session source data", () => { const data = getLiveExportData({ session: { status: "closed", id: "s" }, activities: [item("completed", 0)], roles: [], participants: [], responses: [], priorityItems: [], priorityVotes: [], pacts: [], pactVotes: [] } as LiveSessionSnapshot); expect(data.session.status).toBe("closed"); expect(data.activities).toHaveLength(1); });
test("setup adapter maps the Facilitation draft to dedicated Live fields", () => {
  const activities = toLiveActivityInputs([
    { activity_type: "focus", prompt: "Raccogli", timer_enabled: true, timer_duration: 8, show_live_results: true },
    { activity_type: "priorita", prompt: "Scegli", timer_enabled: true, timer_duration: 5, show_live_results: true, priority_source_type: "previous_activity", priority_source_activity_order: 0, votes_per_participant: 3 },
    { activity_type: "patto", prompt: "Accordo", timer_enabled: false, timer_duration: null, show_live_results: false, pact_statement_mode: "predefined", pact_text: "Impegno comune", facilitator_note: "Nota" }
  ]);
  expect(activities[1]).toMatchObject({ priority_source: "previous:0", votes_per_participant: 3 });
  expect(activities[2]).toMatchObject({ pact_statement_mode: "predefined", pact_text: "Impegno comune", facilitator_note: "Nota" });
});
test("Live UI adapter scopes activity records and preserves timer/lifecycle semantics", () => {
  const live = item("live", 0), next = item("pending", 1);
  const snapshot = { activities: [live, next], priorityItems: [{ id: "item", live_activity_id: live.id }], pacts: [{ live_activity_id: live.id, pact_text: "Agreement" }] } as unknown as LiveSessionSnapshot;
  expect(currentLiveActivity(snapshot)?.id).toBe(live.id);
  expect(nextPendingLiveActivity(snapshot)?.id).toBe(next.id);
  expect(liveActivityItems(snapshot, live.id)).toHaveLength(1);
  expect(livePactForActivity(snapshot, live.id)?.pact_text).toBe("Agreement");
  expect(liveActivityRemainingSeconds({ ...live, state: "paused", paused_remaining_seconds: 42 })).toBe(42);
  expect(activityDisplayName({ ...live, prompt: "", instance_label: "#1" }, { activities: { focus: { name: "Focus" } } } as never)).toBe("Focus #1");
});
test("results aggregation keeps persisted priority votes for a closed session", () => {
  const activity = item("completed", 0);
  const snapshot = { session: { id: "s", status: "closed" }, activities: [activity], participants: [{ id: "p" }], responses: [], priorityItems: [{ id: "priority", live_activity_id: activity.id, label: "Important" }], priorityVotes: [{ live_activity_id: activity.id, live_priority_item_id: "priority" }, { live_activity_id: activity.id, live_priority_item_id: "priority" }], pacts: [], pactVotes: [] } as unknown as LiveSessionSnapshot;
  expect(getLiveResults(snapshot)).toMatchObject({ participantCount: 1, priorityRanking: [{ id: "priority", votes: 2 }] });
});
test("dashboard routes each Live lifecycle state to its own surface", () => {
  const session = (status: string) => ({ id: "same-id", status }) as never;
  expect(liveDashboardDestination(session("setup"))).toContain("/live/setup");
  expect(liveDashboardDestination(session("lobby"))).toContain("/live/lobby");
  expect(liveDashboardDestination(session("live"))).toContain("/live?id=");
  expect(liveDashboardDestination(session("closed"))).toContain("/live/results");
});
