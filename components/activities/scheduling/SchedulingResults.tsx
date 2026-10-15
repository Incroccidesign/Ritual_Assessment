"use client";

import { useState } from "react";
import { Button, SubtlePanel } from "@/components/ritual-ui";
import { SchedulingActivity } from "@/types/activity";
import { AssessmentResponse } from "@/types/response";
import { schedulingVotes, slotLabel } from "@/lib/activities/scheduling";
import { confirmSchedulingSlot } from "@/lib/supabase/assessmentRepository";

export function SchedulingResults({ assessmentId, activity, responses, canConfirm = false }: { assessmentId: string; activity: SchedulingActivity; responses: AssessmentResponse[]; canConfirm?: boolean }) {
  const [confirmedSlotId, setConfirmedSlotId] = useState(activity.confirmedSlotId);
  const [saving, setSaving] = useState(false);
  const rows = schedulingVotes(activity, responses);
  const respondentCount = responses.filter((response) => response.activityResponses.some((item) => item.activityId === activity.id && "slotIds" in item.answer)).length;
  async function confirm(slotId: string) { setSaving(true); try { await confirmSchedulingSlot(assessmentId, activity.id, slotId); setConfirmedSlotId(slotId); } finally { setSaving(false); } }
  return <SubtlePanel className="space-y-4"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><p className="font-semibold text-bone">{activity.title}</p><p className="mt-1 text-sm text-bone/55">{respondentCount} respondents</p></div>{confirmedSlotId ? <p className="text-sm font-semibold text-mint">Date confirmed</p> : null}</div>
    <div className="space-y-2">{rows.map(({ slot, count, percentage }) => <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-bone/10 px-4 py-3"><div><p className="font-medium text-bone">{slotLabel(slot, "en", activity.timezone)}</p><p className="text-sm text-bone/55">{count} available · {percentage}%</p></div>{canConfirm && !confirmedSlotId ? <Button type="button" variant="secondary" className="min-h-9 px-3" disabled={saving} onClick={() => void confirm(slot.id)}>Confirm date</Button> : null}</div>)}</div>
    {!rows.length ? <p className="text-sm text-bone/55">No availability has been collected yet.</p> : null}
  </SubtlePanel>;
}
