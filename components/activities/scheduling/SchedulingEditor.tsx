"use client";

import { Field, inputClass } from "@/components/ritual-ui";
import { SchedulingActivity, SchedulingMode, SchedulingSlot } from "@/types/activity";
import { addMinutes, SchedulingCalendar } from "@/components/activities/scheduling/SchedulingCalendar";

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function SchedulingEditor({ activity, onChange }: { activity: SchedulingActivity; onChange: (activity: SchedulingActivity) => void }) {
  function toggleSlot(nextSlot: SchedulingSlot) { const existing = activity.slots.find((slot) => slot.date === nextSlot.date && slot.startTime === nextSlot.startTime); onChange({ ...activity, timezone: activity.timezone || browserTimezone(), slots: existing ? activity.slots.filter((slot) => slot.id !== existing.id) : [...activity.slots, nextSlot] }); }
  function changeMode(mode: SchedulingMode) { onChange({ ...activity, mode, slots: activity.slots.map((slot) => mode === "monthly" ? { id: `slot:${slot.date}`, date: slot.date } : slot.startTime ? slot : { id: `slot:${slot.date}:09:00`, date: slot.date, startTime: "09:00", endTime: addMinutes("09:00", activity.slotDurationMinutes) }) }); }
  return <div className="space-y-5"><Field label="Timezone"><input className={inputClass} value={activity.timezone} onChange={(event) => onChange({ ...activity, timezone: event.target.value })} placeholder={browserTimezone()} /></Field><div><div className="mb-3 flex items-baseline justify-between gap-3"><div><p className="font-semibold text-bone">Availability</p><p className="mt-1 text-sm text-bone/55">Select dates or time slots you want to propose. Participants can always add theirs.</p></div><p className="text-sm text-bone/55">{activity.slots.length} selected</p></div><SchedulingCalendar mode={activity.mode} slots={activity.slots} duration={activity.slotDurationMinutes} onToggle={toggleSlot} onModeChange={changeMode} onDurationChange={(slotDurationMinutes) => onChange({ ...activity, slotDurationMinutes })} /></div></div>;
}
