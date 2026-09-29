export type LiveActivityType = "innesco" | "traccia" | "focus" | "priorita" | "patto";
export type ActivityType = LiveActivityType;
export type ParticipantDetailsMode = LiveParticipantDetailsMode;
export type SurfaceColorKey = "orange" | "mint" | "violet" | "blue" | "yellow" | "rose" | "gray";
export type SurfaceInputType = { id: string; label: { it: string; en: string }; color: SurfaceColorKey };
export type PrioritySourceType = "previous_activity" | "manual" | null;
export type LiveSessionStatus = "draft" | "setup" | "lobby" | "live" | "intermission" | "closed";
export type LiveActivityStatus = "pending" | "live" | "paused" | "completed";
export type LiveCollaboratorRole = "editor" | "co_owner";
export type LiveParticipantDetailsMode = "nickname_only" | "identified";
export type LivePactStatementMode = "build_live" | "predefined";
export type PactStatementMode = LivePactStatementMode;
export const DEFAULT_PRIORITY_VOTES_PER_PARTICIPANT = 1;
export const MIN_PRIORITY_VOTES_PER_PARTICIPANT = 1;
export const MAX_PRIORITY_VOTES_PER_PARTICIPANT = 10;
export const activities: Array<{ id: ActivityType }> = [
  { id: "innesco" }, { id: "traccia" }, { id: "focus" }, { id: "priorita" }, { id: "patto" }
];
export const DEFAULT_ACTIVITY_DURATIONS: Record<ActivityType, number> = {
  innesco: 3, traccia: 8, focus: 8, priorita: 5, patto: 8
};
export function defaultActivityDuration(type: ActivityType) { return DEFAULT_ACTIVITY_DURATIONS[type]; }
export function clampPriorityVotesPerParticipant(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PRIORITY_VOTES_PER_PARTICIPANT;
  return Math.min(MAX_PRIORITY_VOTES_PER_PARTICIPANT, Math.max(MIN_PRIORITY_VOTES_PER_PARTICIPANT, Math.trunc(parsed)));
}
export type CreateRitualActivityInput = {
  activity_type: ActivityType; instance_label?: string | null; prompt: string; timer_enabled: boolean;
  timer_duration: number | null; show_live_results: boolean; surface_input_types?: SurfaceInputType[] | null;
  priority_source_type?: PrioritySourceType; priority_source_activity_order?: number | null; priority_manual_items?: string[];
  votes_per_participant?: number; pact_statement_mode?: PactStatementMode; facilitator_note?: string | null; pact_text?: string | null;
};
export type LiveAdhesionLevel = "Concordo" | "Parzialmente" | "Non concordo";

export type LiveSession = { id: string; title: string; facilitator_name: string | null; context_label: string | null; participant_details_mode: LiveParticipantDetailsMode; status: LiveSessionStatus; ritual_started_at: string | null; ritual_ended_at: string | null; export_docx_count: number; export_excel_count: number; error_count: number; created_at: string; updated_at: string };
export type LiveActivity = { id: string; live_session_id: string; activity_type: LiveActivityType; order_index: number; instance_index: number; instance_label: string | null; prompt: string; timer_enabled: boolean; timer_duration: number | null; show_live_results: boolean; surface_input_types: unknown[] | null; state: LiveActivityStatus; priority_source: string | null; votes_per_participant: number; pact_statement_mode: LivePactStatementMode | null; facilitator_note: string | null; pact_text: string | null; started_at: string | null; ended_at: string | null; timer_anchor_at: string | null; paused_remaining_seconds: number | null; created_at: string; updated_at: string };
export type LiveSessionRole = { id: string; live_session_id: string; role_name: string; created_at: string };
export type LiveCollaborator = { live_session_id: string; user_id: string; role: LiveCollaboratorRole; granted_by: string; created_at: string; updated_at: string };
export type LiveParticipant = { id: string; live_session_id: string; role_name: string; nickname: string | null; first_name: string | null; last_name: string | null; organization: string | null; contact: string | null; display_name: string | null; joined_at: string };
export type LiveResponse = { id: string; live_session_id: string; live_activity_id: string; participant_id: string | null; activity_type: LiveActivityType; response_text: string; response_category: string | null; created_at: string };
export type LivePriorityItem = { id: string; live_session_id: string; live_activity_id: string; source_type: "previous_activity" | "manual"; label: string; created_at: string };
export type LivePriorityVote = { id: string; live_session_id: string; live_activity_id: string; participant_id: string; live_priority_item_id: string; created_at: string };
export type LivePactRound = { roundNumber: number; proposalText: string; agreementCounts: { agree: number; partial: number; disagree: number }; confirmed: boolean };
export type LivePact = { id: string; live_session_id: string; live_activity_id: string; pact_text: string; pact_statement_mode: LivePactStatementMode; facilitator_note: string | null; pact_rounds: LivePactRound[]; current_round_number: number | null; confirmed_pact_proposal: string | null; confirmed_round_number: number | null; resolved_final_statement: string; created_at: string };
export type LivePactVote = { id: string; live_session_id: string; live_activity_id: string; participant_id: string; round_number: number; adhesion_level: LiveAdhesionLevel; created_at: string };
export type LiveSessionSnapshot = { session: LiveSession; activities: LiveActivity[]; roles: LiveSessionRole[]; participants: LiveParticipant[]; responses: LiveResponse[]; priorityItems: LivePriorityItem[]; priorityVotes: LivePriorityVote[]; pacts: LivePact[]; pactVotes: LivePactVote[] };
export type CreateLiveActivityInput = Pick<LiveActivity, "activity_type" | "prompt" | "timer_enabled" | "timer_duration" | "show_live_results"> & Partial<Pick<LiveActivity, "instance_label" | "surface_input_types" | "priority_source" | "votes_per_participant" | "pact_statement_mode" | "facilitator_note" | "pact_text">> & { priority_manual_items?: string[] };
export type CreateLiveSessionInput = { title: string; facilitator_name?: string | null; context_label?: string | null; participant_details_mode: LiveParticipantDetailsMode; roles: string[]; activities: CreateLiveActivityInput[] };
export type LiveParticipantAccess = { participantId: string; participantToken: string; joinToken?: string | null };
export type LiveJoinAccess = { joinToken: string };
