import type { CreateLiveActivityInput, CreateRitualActivityInput } from "@/types/live";
import { clampPriorityVotesPerParticipant, defaultActivityDuration } from "@/types/live";
import { cloneSurfaceInputTypes, defaultSurfaceInputTypes } from "@/lib/live/surface-input-types";

/**
 * The setup editor deliberately keeps Facilitation's draft shape.  This is the
 * sole boundary where it is converted to the persisted live_* activity model.
 */
export function toLiveActivityInput(
  activity: CreateRitualActivityInput,
  index: number
): CreateLiveActivityInput {
  const previousIndex = typeof activity.priority_source_activity_order === "number"
    ? activity.priority_source_activity_order
    : null;
  const prioritySource = activity.activity_type !== "priorita"
    ? null
    : activity.priority_source_type === "previous_activity" && previousIndex !== null && previousIndex < index
      ? `previous:${previousIndex}`
      : "manual";

  return {
    activity_type: activity.activity_type,
    instance_label: activity.instance_label?.trim() || null,
    prompt: activity.prompt.trim(),
    timer_enabled: activity.timer_enabled,
    timer_duration: activity.timer_enabled
      ? Math.max(1, Number(activity.timer_duration ?? defaultActivityDuration(activity.activity_type)) || defaultActivityDuration(activity.activity_type))
      : null,
    show_live_results: activity.show_live_results,
    surface_input_types: activity.activity_type === "traccia"
      ? cloneSurfaceInputTypes(activity.surface_input_types ?? defaultSurfaceInputTypes())
      : null,
    priority_source: prioritySource,
    priority_manual_items: activity.activity_type === "priorita"
      ? (activity.priority_manual_items ?? []).map((item) => item.trim()).filter(Boolean)
      : [],
    votes_per_participant: activity.activity_type === "priorita"
      ? clampPriorityVotesPerParticipant(activity.votes_per_participant)
      : 1,
    pact_statement_mode: activity.activity_type === "patto" ? activity.pact_statement_mode ?? "build_live" : null,
    facilitator_note: activity.activity_type === "patto" ? activity.facilitator_note?.trim() || null : null,
    pact_text: activity.activity_type === "patto" ? activity.pact_text?.trim() || null : null
  };
}

export function toLiveActivityInputs(activities: CreateRitualActivityInput[]) {
  return activities.map((activity, index) => toLiveActivityInput(activity, index));
}
