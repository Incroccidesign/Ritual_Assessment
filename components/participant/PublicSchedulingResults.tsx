import { Card } from "@/components/ritual-ui";
import { PublicSchedulingResults as PublicResults } from "@/lib/supabase/assessmentRepository";
import { slotLabel } from "@/lib/activities/scheduling";

export function PublicSchedulingResults({ results }: { results: PublicResults }) {
  return <div className="space-y-5"><Card><h1 className="font-heading text-4xl font-semibold leading-tight text-bone">{results.title}</h1><p className="mt-3 text-base text-bone/62">{results.status === "closed" ? "Availability collection has ended." : "Availability so far."}</p></Card>{results.activities.map((activity) => {
    const confirmed = activity.slots.find((slot) => slot.id === activity.confirmedSlotId);
    const counts = new Map(activity.availability.map((row) => [row.slotId, row]));
    return <Card key={activity.id}><h2 className="font-heading text-2xl font-semibold text-bone">{activity.title}</h2>{activity.prompt ? <p className="mt-2 text-bone/62">{activity.prompt}</p> : null}{confirmed ? <p className="mt-5 rounded-md border border-mint/40 bg-mint/10 px-4 py-3 font-semibold text-bone">Confirmed: {slotLabel(confirmed, "en", activity.timezone)}</p> : results.status === "closed" ? <p className="mt-5 text-sm text-bone/55">Awaiting date confirmation.</p> : null}<div className="mt-5 space-y-2">{activity.slots.map((slot) => { const row = counts.get(slot.id); return <div key={slot.id} className="flex justify-between gap-4 rounded-md border border-bone/10 px-4 py-3"><span>{slotLabel(slot, "en", activity.timezone)}</span><span className="text-bone/60">{row?.count ?? 0} · {row?.percentage ?? 0}%</span></div>; })}</div></Card>; })}</div>;
}
