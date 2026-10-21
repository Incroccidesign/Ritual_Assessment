"use client";

import { SchedulingActivity, SchedulingAnswer, SchedulingSlot } from "@/types/activity";
import { slotLabel } from "@/lib/activities/scheduling";
import { SchedulingCalendar } from "@/components/activities/scheduling/SchedulingCalendar";
import { useLocale } from "@/lib/i18n/useLocale";

export function SchedulingParticipant({
  activity,
  answer,
  onChange
}: {
  activity: SchedulingActivity;
  answer: SchedulingAnswer;
  onChange: (answer: SchedulingAnswer) => void;
}) {
  const { locale } = useLocale();
  const suggestedSlots = answer.suggestedSlots ?? [];

  function toggleConfigured(id: string) {
    const selected = answer.slotIds.includes(id);
    onChange({ ...answer, slotIds: selected ? answer.slotIds.filter((slotId) => slotId !== id) : [...answer.slotIds, id] });
  }

  function toggleSuggested(slot: SchedulingSlot) {
    const existing = suggestedSlots.find((item) => item.date === slot.date && item.startTime === slot.startTime);
    const nextSuggestions = existing ? suggestedSlots.filter((item) => item.id !== existing.id) : [...suggestedSlots, slot];
    onChange({
      slotIds: existing ? answer.slotIds.filter((slotId) => slotId !== existing.id) : [...answer.slotIds, slot.id],
      suggestedSlots: nextSuggestions
    });
  }

  return (
    <div className="space-y-5">
      {activity.slots.length ? (
        <div className="divide-y divide-bone/10 border-y border-bone/10">
          {activity.slots.map((slot) => {
            const selected = answer.slotIds.includes(slot.id);
            return (
              <label key={slot.id} className={`flex cursor-pointer items-center gap-3 py-3 ${selected ? "text-bone" : "text-bone/72"}`}>
                <input type="checkbox" checked={selected} onChange={() => toggleConfigured(slot.id)} />
                <span>{slotLabel(slot, locale, activity.timezone)}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <SchedulingCalendar
          mode={activity.mode}
          slots={suggestedSlots}
          duration={activity.slotDurationMinutes}
          onToggle={toggleSuggested}
          idPrefix="suggested"
        />
      )}
    </div>
  );
}
