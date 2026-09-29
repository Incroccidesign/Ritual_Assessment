import { expect, test } from "@playwright/test";
import { getCurrentLiveActivity, getLiveExportData, getNextLiveActivity, liveTimerRemaining, subscribeToLiveSession } from "../../lib/live/repository";
import { toLiveActivityInputs } from "../../lib/live/setup-adapter";
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
