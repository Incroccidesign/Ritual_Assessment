"use client";

import { useState } from "react";
import { Button } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { SchedulingActivity } from "@/types/activity";
import { AssessmentResponse } from "@/types/response";
import { schedulingVotes, slotLabel } from "@/lib/activities/scheduling";
import { confirmSchedulingSlot } from "@/lib/supabase/assessmentRepository";

export function SchedulingResults({ assessmentId, activity, responses, canConfirm = false }: { assessmentId: string; activity: SchedulingActivity; responses: AssessmentResponse[]; canConfirm?: boolean }) {
  const { locale, messages } = useLocale();
  const [confirmedSlotId, setConfirmedSlotId] = useState(activity.confirmedSlotId);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const rows = schedulingVotes(activity, responses);
  const totalPages = Math.max(1, Math.ceil(rows.length / 8));
  const currentPage = Math.min(page, totalPages - 1);
  const respondentCount = responses.filter((response) => response.activityResponses.some((item) => item.activityId === activity.id && "slotIds" in item.answer)).length;
  async function confirm(slotId: string) { setSaving(true); try { await confirmSchedulingSlot(assessmentId, activity.id, slotId); setConfirmedSlotId(slotId); } finally { setSaving(false); } }
  return <div className="space-y-4"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><h3 className="font-heading text-2xl font-semibold text-bone">{activity.title}</h3><p className="mt-1 text-sm text-bone/55">{messages.reports.schedulingRespondents.replace("{count}", String(respondentCount))}</p></div>{confirmedSlotId ? <p className="text-sm font-semibold text-mint">{messages.reports.schedulingConfirmed}</p> : null}</div>
    <div className="divide-y divide-bone/10 border-y border-bone/10">{rows.slice(currentPage * 8, (currentPage + 1) * 8).map(({ slot, count, percentage }) => <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium text-bone">{slotLabel(slot, locale, activity.timezone)}</p><p className="text-sm text-bone/55">{messages.reports.schedulingAvailable.replace("{count}", String(count))} · {percentage}%</p></div>{canConfirm && !confirmedSlotId ? <Button type="button" variant="secondary" className="min-h-9 px-3" disabled={saving} onClick={() => void confirm(slot.id)}>{messages.reports.schedulingConfirm}</Button> : null}</div>)}</div>
    {totalPages > 1 ? <div className="flex items-center gap-4 text-sm text-bone/60"><button type="button" className="min-h-10 underline disabled:opacity-35" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{messages.reports.previousPage}</button><span aria-live="polite">{messages.reports.pageOf.replace("{page}", String(currentPage + 1)).replace("{total}", String(totalPages))}</span><button type="button" className="min-h-10 underline disabled:opacity-35" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>{messages.reports.nextPage}</button></div> : null}
    {!rows.length ? <p className="text-sm text-bone/55">{messages.reports.schedulingEmpty}</p> : null}
  </div>;
}
