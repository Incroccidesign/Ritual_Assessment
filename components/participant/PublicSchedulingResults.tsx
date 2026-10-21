"use client";

import { PublicSchedulingResults as PublicResults } from "@/lib/supabase/assessmentRepository";
import { slotLabel } from "@/lib/activities/scheduling";
import { useLocale } from "@/lib/i18n/useLocale";

export function PublicSchedulingResults({ results }: { results: PublicResults }) {
  const { locale, messages } = useLocale();

  return <div className="space-y-10"><section><h1 className="font-heading text-3xl font-semibold leading-tight text-bone sm:text-4xl">{results.title}</h1><p className="mt-3 text-base text-bone/62">{results.status === "closed" ? messages.participant.scheduling.availabilityEnded : messages.participant.scheduling.availabilitySoFar}</p></section>{results.activities.map((activity) => {
    const confirmed = activity.slots.find((slot) => slot.id === activity.confirmedSlotId);
    const counts = new Map(activity.availability.map((row) => [row.slotId, row]));
    return <section key={activity.id} className="border-t border-bone/10 pt-5"><h2 className="font-heading text-2xl font-semibold text-bone">{activity.title}</h2>{activity.prompt ? <p className="mt-2 text-bone/62">{activity.prompt}</p> : null}{confirmed ? <p className="mt-5 text-sm font-medium text-mint">{messages.participant.scheduling.confirmedSlot}: {slotLabel(confirmed, locale, activity.timezone)}</p> : results.status === "closed" ? <p className="mt-5 text-sm text-bone/55">{messages.participant.scheduling.awaitingConfirmation}</p> : null}<div className="mt-5 divide-y divide-bone/10 border-y border-bone/10">{activity.slots.map((slot) => { const row = counts.get(slot.id); return <div key={slot.id} className="flex justify-between gap-4 py-3"><span>{slotLabel(slot, locale, activity.timezone)}</span><span className="text-bone/60">{row?.count ?? 0} · {row?.percentage ?? 0}%</span></div>; })}</div></section>; })}</div>;
}
