"use client";
import { SchedulingActivity, SchedulingAnswer, SchedulingSlot } from "@/types/activity";
import { slotLabel } from "@/lib/activities/scheduling";
import { SchedulingCalendar } from "@/components/activities/scheduling/SchedulingCalendar";
export function SchedulingParticipant({ activity, answer, onChange }: { activity: SchedulingActivity; answer: SchedulingAnswer; onChange: (answer: SchedulingAnswer) => void }) {
  const suggestedSlots = answer.suggestedSlots ?? [];
  function toggleConfigured(id: string) { const selected = answer.slotIds.includes(id); onChange({ ...answer, slotIds: selected ? answer.slotIds.filter((slotId) => slotId !== id) : [...answer.slotIds, id] }); }
  function toggleSuggested(slot: SchedulingSlot) {
    const existing = suggestedSlots.find((item) => item.date === slot.date && item.startTime === slot.startTime);
    const nextSuggestions = existing ? suggestedSlots.filter((item) => item.id !== existing.id) : [...suggestedSlots, slot];
    onChange({ slotIds: existing ? answer.slotIds.filter((slotId) => slotId !== existing.id) : [...answer.slotIds, slot.id], suggestedSlots: nextSuggestions });
  }
  return <div className="space-y-5">{activity.slots.length ? <div className="space-y-2">{activity.slots.map((slot) => { const selected = answer.slotIds.includes(slot.id); return <label key={slot.id} className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 ${selected ? "border-mint/60 bg-mint/10" : "border-bone/15 bg-night/35"}`}><input type="checkbox" checked={selected} onChange={() => toggleConfigured(slot.id)} /><span>{slotLabel(slot, navigator.language, activity.timezone)}</span></label>; })}</div> : <div className="space-y-3"><div><p className="font-medium text-bone">Your availability</p><p className="mt-1 text-sm text-bone/55">Select every time that works for you.</p></div><SchedulingCalendar mode={activity.mode} slots={suggestedSlots} duration={activity.slotDurationMinutes} onToggle={toggleSuggested} idPrefix="suggested" /></div>}</div>;
}
