import type { LiveActivity, LivePact, LivePriorityItem, LiveSessionSnapshot } from "@/types/live";

/** Read-only selectors used by the ported Facilitation screens.  Keeping this
 * translation here prevents the Live UI from accidentally using Assessment IDs. */
export function currentLiveActivity(snapshot: LiveSessionSnapshot) {
  return snapshot.activities.find((activity) => activity.state === "live" || activity.state === "paused") ?? null;
}

export function nextPendingLiveActivity(snapshot: LiveSessionSnapshot) {
  return snapshot.activities.find((activity) => activity.state === "pending") ?? null;
}

export function liveActivityItems(snapshot: LiveSessionSnapshot, activityId: string): LivePriorityItem[] {
  return snapshot.priorityItems.filter((item) => item.live_activity_id === activityId);
}

export function livePactForActivity(snapshot: LiveSessionSnapshot, activityId: string): LivePact | null {
  return snapshot.pacts.find((pact) => pact.live_activity_id === activityId) ?? null;
}

export function liveActivityRemainingSeconds(activity: LiveActivity, now = Date.now()): number | null {
  if (!activity.timer_enabled || !activity.timer_duration) return null;
  if (activity.state === "paused") return Math.max(0, activity.paused_remaining_seconds ?? 0);
  const anchor = activity.timer_anchor_at ? new Date(activity.timer_anchor_at).getTime() : now;
  return Math.max(0, activity.timer_duration * 60 - Math.floor(Math.max(0, now - anchor) / 1000));
}

export function activityDisplayName(activity: LiveActivity, messages: { activities: Record<LiveActivity["activity_type"], { name: string }> }) {
  const label = activity.instance_label?.trim();
  if (label && !/^#\d+$/.test(label)) return label;
  return activity.prompt.trim() || `${messages.activities[activity.activity_type].name} ${label || `#${activity.instance_index}`}`;
}
