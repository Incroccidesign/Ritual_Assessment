import type { Language } from "@/lib/live/i18n";
import { getMessages } from "@/lib/live/i18n";
import { participantDisplayName } from "@/lib/live/participant-identity";
import { normalizeSurfaceInputTypes, resolveSurfaceCategoryId, surfaceLabel } from "@/lib/live/surface-input-types";
import type { LiveSessionSnapshot, SurfaceInputType } from "@/types/live";

// Shared by Word and Excel. Archived snapshots keep their own category labels.
export function buildLiveReport(snapshot: LiveSessionSnapshot, language: Language = "it") {
  const messages = getMessages(language);
  const person = (id: string | null) => snapshot.participants.find((p) => p.id === id);
  const participant = (id: string | null) => ({ participant_id: id ?? "", participant: participantDisplayName(person(id), messages.common.participant), role: person(id)?.role_name ?? "" });
  const activity = (id: string) => snapshot.activities.find((a) => a.id === id);
  const activityFields = (id: string) => ({ activity_id: id, activity: activity(id)?.prompt ?? "", type: activity(id)?.activity_type ?? "" });
  const responses = snapshot.responses.map((r) => {
    const categories = normalizeSurfaceInputTypes(activity(r.live_activity_id)?.surface_input_types as SurfaceInputType[] | null);
    const matched = categories.find((c) => c.id === resolveSurfaceCategoryId(r.response_category, categories));
    const category = r.activity_type !== "traccia" ? "" : matched ? surfaceLabel(matched, language) : r.response_category || (language === "it" ? "Senza categoria" : "Uncategorized");
    return { ...activityFields(r.live_activity_id), ...participant(r.participant_id), response: r.response_text, category_id: r.response_category ?? "", category, created_at: r.created_at };
  });
  const priority = snapshot.priorityItems.map((i) => ({ ...activityFields(i.live_activity_id), item_id: i.id, item: i.label, source: i.source_type, votes: snapshot.priorityVotes.filter((v) => v.live_priority_item_id === i.id).length })).sort((a,b) => b.votes-a.votes);
  const priorityVotes = snapshot.priorityVotes.map((v) => ({ ...activityFields(v.live_activity_id), ...participant(v.participant_id), item_id: v.live_priority_item_id, item: snapshot.priorityItems.find((i) => i.id === v.live_priority_item_id)?.label ?? "", created_at: v.created_at }));
  const pactRounds = snapshot.pacts.flatMap((p) => p.pact_rounds.map((r) => {
    const votes = snapshot.pactVotes.filter((v) => v.live_activity_id === p.live_activity_id && v.round_number === r.roundNumber);
    return { ...activityFields(p.live_activity_id), round: r.roundNumber, proposal: r.proposalText, confirmed: p.confirmed_round_number === r.roundNumber,
      agree: votes.filter((v) => v.adhesion_level === "Concordo").length,
      partial: votes.filter((v) => v.adhesion_level === "Parzialmente").length,
      disagree: votes.filter((v) => v.adhesion_level === "Non concordo").length };
  }));
  const pactVotes = snapshot.pactVotes.map((v) => ({ ...activityFields(v.live_activity_id), ...participant(v.participant_id), round: v.round_number, adhesion: messages.adhesionLabels[v.adhesion_level], created_at: v.created_at }));
  const pacts = snapshot.pacts.map((p) => ({ ...activityFields(p.live_activity_id), mode: p.pact_statement_mode, note: p.facilitator_note ?? "", current_proposal: p.pact_text, final_statement: p.resolved_final_statement, confirmed_proposal: p.confirmed_pact_proposal ?? "", confirmed_round: p.confirmed_round_number ?? "" }));
  return { responses, priority, priorityVotes, pactRounds, pactVotes, pacts };
}
