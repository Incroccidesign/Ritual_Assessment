"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { generateLiveToken, liveClient, storeLiveJoinToken, storeLiveParticipantAccess } from "@/lib/live/access";
import type { CreateLiveActivityInput, CreateLiveSessionInput, LiveActivity, LiveAdhesionLevel, LiveJoinAccess, LiveParticipant, LiveParticipantAccess, LiveSessionSnapshot } from "@/types/live";

type Client = ReturnType<typeof liveClient>;
const fail = (stage: string, error: unknown) => { throw new Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`); };
const now = () => new Date().toISOString();
const liveSessionColumns = "id,title,facilitator_name,context_label,participant_details_mode,status,ritual_started_at,ritual_ended_at,export_docx_count,export_excel_count,error_count,created_at,updated_at";

export async function createLiveSession(input: CreateLiveSessionInput) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Authentication required.");
  const response = await fetch("/api/live-sessions", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(input) });
  const payload = await response.json().catch(() => null) as { id?: string; joinToken?: string; error?: string } | null;
  if (!response.ok || !payload?.id || !payload.joinToken) throw new Error(payload?.error ?? "Unable to create Live Session.");
  storeLiveJoinToken(payload.id, payload.joinToken);
  return payload;
}

export async function generateLiveJoinLink(sessionId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Authentication required.");
  const response = await fetch(`/api/live-sessions/${encodeURIComponent(sessionId)}/join-link`, {
    method: "POST",
    headers: { authorization: `Bearer ${data.session.access_token}` }
  });
  const payload = await response.json().catch(() => null) as { joinToken?: string; error?: string } | null;
  if (!response.ok || !payload?.joinToken) throw new Error(payload?.error ?? "Unable to generate a participant link.");
  storeLiveJoinToken(sessionId, payload.joinToken);
  return payload.joinToken;
}

export async function listLiveSessions() {
  const client = liveClient();
  const { data, error } = await client.from("live_sessions").select(liveSessionColumns).order("created_at", { ascending: false });
  if (error) fail("live_sessions:list", error);
  return data ?? [];
}

export async function fetchLiveSnapshot(sessionId: string, access?: LiveParticipantAccess | LiveJoinAccess | null): Promise<LiveSessionSnapshot | null> {
  const client = liveClient(access);
  const [session, activities, roles, participants, responses, priorityItems, priorityVotes, pacts, pactVotes] = await Promise.all([
    client.from("live_sessions").select(liveSessionColumns).eq("id", sessionId).maybeSingle(),
    client.from("live_activities").select("*").eq("live_session_id", sessionId).order("order_index"),
    client.from("live_session_roles").select("*").eq("live_session_id", sessionId).order("role_name"),
    client.from("live_participants").select("*").eq("live_session_id", sessionId).order("joined_at"),
    client.from("live_responses").select("*").eq("live_session_id", sessionId).order("created_at"),
    client.from("live_priority_items").select("*").eq("live_session_id", sessionId).order("created_at"),
    client.from("live_priority_votes").select("*").eq("live_session_id", sessionId).order("created_at"),
    client.from("live_pacts").select("*").eq("live_session_id", sessionId).order("created_at"),
    client.from("live_pact_votes").select("*").eq("live_session_id", sessionId).order("created_at")
  ]);
  if (session.error || !session.data) return null;
  const errors = [activities, roles, participants, responses, priorityItems, priorityVotes, pacts, pactVotes].find((result) => result.error)?.error;
  if (errors) fail("live_sessions:read", errors);
  return { session: session.data, activities: activities.data ?? [], roles: roles.data ?? [], participants: participants.data ?? [], responses: responses.data ?? [], priorityItems: priorityItems.data ?? [], priorityVotes: priorityVotes.data ?? [], pacts: pacts.data ?? [], pactVotes: pactVotes.data ?? [] } as LiveSessionSnapshot;
}

export function getCurrentLiveActivity(snapshot: LiveSessionSnapshot) { return snapshot.activities.find((item) => item.state === "live" || item.state === "paused") ?? null; }
export function getNextLiveActivity(snapshot: LiveSessionSnapshot) { return snapshot.activities.find((item) => item.state === "pending") ?? null; }
export function liveTimerRemaining(activity: LiveActivity, at = Date.now()) {
  if (!activity.timer_enabled || !activity.timer_duration) return null;
  if (activity.state === "paused") return Math.max(0, activity.paused_remaining_seconds ?? 0);
  const anchor = activity.timer_anchor_at ? new Date(activity.timer_anchor_at).getTime() : at;
  return Math.max(0, activity.timer_duration * 60 - Math.floor((at - anchor) / 1000));
}
const timerAnchor = (activity: LiveActivity, remaining: number, at = Date.now()) => new Date(at - ((activity.timer_duration ?? 0) * 60 - remaining) * 1000).toISOString();

async function update(client: Client, table: string, values: Record<string, unknown>, id: string) { const { error } = await client.from(table).update(values).eq("id", id); if (error) fail(`${table}:update`, error); }
export async function updateLiveSession(sessionId: string, values: Record<string, unknown>) { await update(liveClient(), "live_sessions", values, sessionId); }
export async function replaceLiveRoles(sessionId: string, roles: string[]) { const client = liveClient(); const { error: removeError } = await client.from("live_session_roles").delete().eq("live_session_id", sessionId); if (removeError) fail("live_session_roles:delete", removeError); const clean = Array.from(new Set(roles.map((role) => role.trim()).filter(Boolean))); if (clean.length) { const { error } = await client.from("live_session_roles").insert(clean.map((role_name) => ({ live_session_id: sessionId, role_name }))); if (error) fail("live_session_roles:insert", error); } }
export async function replaceLiveActivities(sessionId: string, activities: CreateLiveActivityInput[]) {
  const client = liveClient();
  const { error: removeError } = await client.from("live_activities").delete().eq("live_session_id", sessionId).eq("state", "pending");
  if (removeError) fail("live_activities:delete", removeError);

  const rows = activities.map((activity, order_index) => ({
    live_session_id: sessionId,
    activity_type: activity.activity_type,
    prompt: activity.prompt,
    timer_enabled: activity.timer_enabled,
    show_live_results: activity.show_live_results,
    order_index,
    instance_index: activities.slice(0, order_index + 1).filter((item) => item.activity_type === activity.activity_type).length,
    instance_label: activity.instance_label ?? null,
    timer_duration: activity.timer_duration ?? null,
    surface_input_types: activity.surface_input_types ?? null,
    priority_source: activity.priority_source ?? null,
    votes_per_participant: activity.votes_per_participant ?? 1,
    pact_statement_mode: activity.pact_statement_mode ?? null,
    facilitator_note: activity.facilitator_note ?? null,
    pact_text: activity.pact_text ?? null
  }));
  const { data: created, error } = await client.from("live_activities").insert(rows).select("id,order_index");
  if (error || !created) fail("live_activities:insert", error ?? new Error("No activities were created."));
  const createdActivities = created ?? [];

  const priorityItems = createdActivities.flatMap((activity) =>
    (activities[activity.order_index]?.priority_manual_items ?? [])
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label) => ({
        live_session_id: sessionId,
        live_activity_id: activity.id,
        source_type: "manual" as const,
        label
      }))
  );
  if (priorityItems.length) {
    const { error: priorityItemsError } = await client.from("live_priority_items").insert(priorityItems);
    if (priorityItemsError) fail("live_priority_items:insert", priorityItemsError);
  }
}
export async function addLivePriorityItem(sessionId: string, activityId: string, label: string) { const { error } = await liveClient().from("live_priority_items").insert({ live_session_id: sessionId, live_activity_id: activityId, source_type: "manual", label: label.trim() }); if (error) fail("live_priority_items:insert", error); }
export async function enterLiveLobby(sessionId: string) { await updateLiveSession(sessionId, { status: "lobby" }); }
export async function startNextLiveActivity(sessionId: string) {
  const client = liveClient(); const snapshot = await fetchLiveSnapshot(sessionId); const next = snapshot && getNextLiveActivity(snapshot); if (!snapshot || !next) return;
  const timestamp = now();
  if (next.activity_type === "priorita" && next.priority_source?.startsWith("previous:")) {
    const order = Number(next.priority_source.slice("previous:".length));
    const source = snapshot.activities.find((item) => item.order_index === order);
    if (source) {
      const labels = Array.from(new Set(snapshot.responses.filter((item) => item.live_activity_id === source.id).map((item) => item.response_text.trim()).filter(Boolean)));
      if (labels.length) { const { error } = await client.from("live_priority_items").insert(labels.map((label) => ({ live_session_id: sessionId, live_activity_id: next.id, source_type: "previous_activity", label }))); if (error) fail("live_priority_items:insert", error); }
    }
  }
  await update(client, "live_activities", { state: "live", started_at: next.started_at ?? timestamp, timer_anchor_at: timestamp, paused_remaining_seconds: null }, next.id);
  await update(client, "live_sessions", { status: "live", ritual_started_at: snapshot.session.ritual_started_at ?? timestamp }, sessionId);
}
export async function completeLiveActivity(sessionId: string) {
  const client = liveClient(); const snapshot = await fetchLiveSnapshot(sessionId); const current = snapshot && getCurrentLiveActivity(snapshot); if (!snapshot || !current) return;
  const timestamp = now(); await update(client, "live_activities", { state: "completed", ended_at: timestamp }, current.id);
  await update(client, "live_sessions", getNextLiveActivity({ ...snapshot, activities: snapshot.activities.map((item) => item.id === current.id ? { ...item, state: "completed" as const } : item) }) ? { status: "intermission" } : { status: "closed", ritual_ended_at: timestamp }, sessionId);
}
export async function toggleLiveActivityPause(sessionId: string) {
  const client = liveClient(); const snapshot = await fetchLiveSnapshot(sessionId); const current = snapshot && getCurrentLiveActivity(snapshot); if (!current) return;
  const remaining = liveTimerRemaining(current) ?? 0;
  await update(client, "live_activities", current.state === "paused" ? { state: "live", timer_anchor_at: timerAnchor(current, current.paused_remaining_seconds ?? remaining), paused_remaining_seconds: null } : { state: "paused", paused_remaining_seconds: remaining }, current.id);
  await update(client, "live_sessions", { status: "live" }, sessionId);
}
export async function extendLiveTimer(sessionId: string, minutes: number) { const snapshot = await fetchLiveSnapshot(sessionId); const current = snapshot && getCurrentLiveActivity(snapshot); if (!current?.timer_enabled) return; await update(liveClient(), "live_activities", { state: "live", timer_anchor_at: timerAnchor(current, (liveTimerRemaining(current) ?? 0) + Math.max(1, Math.trunc(minutes)) * 60), paused_remaining_seconds: null }, current.id); }
export async function closeLiveSession(sessionId: string) { const snapshot = await fetchLiveSnapshot(sessionId); const current = snapshot && getCurrentLiveActivity(snapshot); const timestamp = now(); if (current) await update(liveClient(), "live_activities", { state: "completed", ended_at: timestamp }, current.id); await updateLiveSession(sessionId, { status: "closed", ritual_ended_at: timestamp }); }

export async function joinLiveSession(sessionId: string, joinToken: string, roleName: string, identity: Partial<Omit<LiveParticipant, "id" | "live_session_id" | "role_name" | "joined_at">>) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const participantToken = generateLiveToken();
  const { data, error } = await supabase.rpc("live_join_session", { target_live_session_id: sessionId, target_join_token: joinToken, target_participant_token: participantToken, target_role_name: roleName, target_nickname: identity.nickname ?? null, target_first_name: identity.first_name ?? null, target_last_name: identity.last_name ?? null, target_organization: identity.organization ?? null, target_contact: identity.contact ?? null, target_display_name: identity.display_name ?? null });
  if (error || !data) fail("live_join_session", error ?? new Error("No participant returned."));
  const access = { participantId: (data as LiveParticipant).id, participantToken, joinToken };
  storeLiveParticipantAccess(sessionId, access); return { participant: data as LiveParticipant, access };
}
export async function submitLiveResponse(sessionId: string, access: LiveParticipantAccess, activityId: string, activityType: LiveActivity["activity_type"], text: string, category: string | null = null) { const { error } = await liveClient(access).from("live_responses").insert({ live_session_id: sessionId, live_activity_id: activityId, participant_id: access.participantId, activity_type: activityType, response_text: text, response_category: category }); if (error) fail("live_responses:insert", error); }
export async function submitLivePriorityVotes(sessionId: string, access: LiveParticipantAccess, activityId: string, itemIds: string[]) { const client = liveClient(access); const { error: removeError } = await client.from("live_priority_votes").delete().eq("live_session_id", sessionId).eq("live_activity_id", activityId).eq("participant_id", access.participantId); if (removeError) fail("live_priority_votes:delete", removeError); if (itemIds.length) { const { error } = await client.from("live_priority_votes").insert(itemIds.map((live_priority_item_id) => ({ live_session_id: sessionId, live_activity_id: activityId, participant_id: access.participantId, live_priority_item_id }))); if (error) fail("live_priority_votes:insert", error); } }
export async function submitLivePactVote(sessionId: string, access: LiveParticipantAccess, activityId: string, level: LiveAdhesionLevel) { const snapshot = await fetchLiveSnapshot(sessionId, access); const pact = snapshot?.pacts.find((item) => item.live_activity_id === activityId); if (!pact?.current_round_number) return; const client = liveClient(access); await client.from("live_pact_votes").delete().eq("live_session_id", sessionId).eq("live_activity_id", activityId).eq("participant_id", access.participantId).eq("round_number", pact.current_round_number); const { error } = await client.from("live_pact_votes").insert({ live_session_id: sessionId, live_activity_id: activityId, participant_id: access.participantId, round_number: pact.current_round_number, adhesion_level: level }); if (error) fail("live_pact_votes:insert", error); }
const pactCounts = (votes: LiveSessionSnapshot["pactVotes"]) => votes.reduce((counts, vote) => ({ ...counts, [vote.adhesion_level === "Concordo" ? "agree" : vote.adhesion_level === "Parzialmente" ? "partial" : "disagree"]: counts[vote.adhesion_level === "Concordo" ? "agree" : vote.adhesion_level === "Parzialmente" ? "partial" : "disagree"] + 1 }), { agree: 0, partial: 0, disagree: 0 });
export async function startLivePactRound(sessionId: string, activityId: string, proposal: string, mode: "build_live" | "predefined", note: string | null = null) { const snapshot = await fetchLiveSnapshot(sessionId); const current = snapshot?.pacts.find((item) => item.live_activity_id === activityId); const round = Math.max(0, ...(current?.pact_rounds ?? []).map((item) => item.roundNumber)) + 1; const rounds = [...(current?.pact_rounds ?? []), { roundNumber: round, proposalText: proposal.trim(), agreementCounts: { agree: 0, partial: 0, disagree: 0 }, confirmed: false }]; const values = { live_session_id: sessionId, live_activity_id: activityId, pact_text: proposal.trim(), pact_statement_mode: mode, facilitator_note: note, pact_rounds: rounds, current_round_number: round, confirmed_pact_proposal: current?.confirmed_pact_proposal ?? null, confirmed_round_number: current?.confirmed_round_number ?? null, resolved_final_statement: current?.resolved_final_statement ?? proposal.trim() }; const client = liveClient(); if (current) { const { error } = await client.from("live_pacts").update(values).eq("id", current.id); if (error) fail("live_pacts:update", error); } else { const { error } = await client.from("live_pacts").insert(values); if (error) fail("live_pacts:insert", error); } }
export async function refreshLivePactResults(sessionId: string, activityId: string) { const snapshot = await fetchLiveSnapshot(sessionId); const pact = snapshot?.pacts.find((item) => item.live_activity_id === activityId); if (!snapshot || !pact?.current_round_number) return; const counts = pactCounts(snapshot.pactVotes.filter((vote) => vote.live_activity_id === activityId && vote.round_number === pact.current_round_number)); const rounds = pact.pact_rounds.map((round) => round.roundNumber === pact.current_round_number ? { ...round, agreementCounts: counts } : round); await update(liveClient(), "live_pacts", { pact_rounds: rounds }, pact.id); }
export async function confirmLivePact(sessionId: string, activityId: string) { const snapshot = await fetchLiveSnapshot(sessionId); const pact = snapshot?.pacts.find((item) => item.live_activity_id === activityId); const round = pact?.pact_rounds.find((item) => item.roundNumber === pact.current_round_number); if (!pact || !round) return; await update(liveClient(), "live_pacts", { pact_rounds: pact.pact_rounds.map((item) => ({ ...item, confirmed: item.roundNumber === round.roundNumber })), confirmed_pact_proposal: round.proposalText, confirmed_round_number: round.roundNumber, resolved_final_statement: round.proposalText }, pact.id); }
export function getLiveResults(snapshot: LiveSessionSnapshot) { return { participantCount: snapshot.participants.length, responseCount: snapshot.responses.length, priorityRanking: snapshot.priorityItems.map((item) => ({ ...item, votes: snapshot.priorityVotes.filter((vote) => vote.live_priority_item_id === item.id).length })).sort((a, b) => b.votes - a.votes), pacts: snapshot.pacts.map((pact) => ({ ...pact, votes: snapshot.pactVotes.filter((vote) => vote.live_activity_id === pact.live_activity_id) })) }; }
export function getLiveExportData(snapshot: LiveSessionSnapshot) { return { generatedAt: now(), session: snapshot.session, activities: snapshot.activities, roles: snapshot.roles, participants: snapshot.participants, responses: snapshot.responses, priorityItems: snapshot.priorityItems, priorityVotes: snapshot.priorityVotes, pacts: snapshot.pacts, pactVotes: snapshot.pactVotes, results: getLiveResults(snapshot) }; }
export async function recordLiveExport(sessionId: string, kind: "docx" | "excel") { const snapshot = await fetchLiveSnapshot(sessionId); if (!snapshot) return; await updateLiveSession(sessionId, { [kind === "docx" ? "export_docx_count" : "export_excel_count"]: (kind === "docx" ? snapshot.session.export_docx_count : snapshot.session.export_excel_count) + 1 }); }

export function subscribeToLiveSession(client: Client, sessionId: string, refresh: () => void): RealtimeChannel { let channel = client.channel(`live:${sessionId}`); for (const table of ["live_sessions", "live_activities", "live_session_roles", "live_participants", "live_responses", "live_priority_items", "live_priority_votes", "live_pacts", "live_pact_votes"]) channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `${table === "live_sessions" ? "id" : "live_session_id"}=eq.${sessionId}` }, refresh); return channel.subscribe(); }
export function useLiveSessionSnapshot(sessionId: string | null, access?: LiveParticipantAccess | LiveJoinAccess | null) {
  const client = useMemo(() => access ? liveClient(access) : supabase, [access]);
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const refresh = useCallback(async () => {
    if (!sessionId) return null;
    const next = await fetchLiveSnapshot(sessionId, access);
    setSnapshot(next);
    setLoading(false);
    return next;
  }, [sessionId, access]);

  useEffect(() => {
    if (!sessionId || !client) return;
    const reload = () => { void refresh().catch(() => undefined); };
    queueMicrotask(reload);
    const channel = subscribeToLiveSession(client, sessionId, reload);
    return () => { client.removeChannel(channel); };
  }, [client, sessionId, refresh]);

  // Participant credentials are transported in REST request headers. Realtime
  // does not consistently carry those headers on mobile, so this is the
  // reliable fallback that moves participants out of the lobby after a start.
  useEffect(() => {
    if (!sessionId || !access || snapshot?.session.status === "closed") return;
    const poll = () => {
      if (document.visibilityState === "visible") void refresh().catch(() => undefined);
    };
    const interval = window.setInterval(poll, 2000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [access, refresh, sessionId, snapshot?.session.status]);

  return { snapshot, loading, refresh };
}

export async function deleteLiveSession(sessionId: string) {
  const { data, error } = await liveClient().from("live_sessions").delete().eq("id", sessionId).select("id");
  if (error || !data?.length) fail("live_sessions:delete", error ?? new Error("You cannot delete this Live Session."));
}
