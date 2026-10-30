"use client";

import { useEffect, useState } from "react";
import { SchedulingActivity, SchedulingAnswer, SchedulingSlot } from "@/types/activity";
import { isSchedulingSlotInPast, slotLabel } from "@/lib/activities/scheduling";
import { addMinutes, SchedulingCalendar } from "@/components/activities/scheduling/SchedulingCalendar";
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
  const { locale, messages } = useLocale();
  const suggestedSlots = answer.suggestedSlots ?? [];
  const [now, setNow] = useState(() => new Date());
  const [slotDuration, setSlotDuration] = useState(() => {
    const savedSlot = suggestedSlots.find((slot) => slot.startTime && slot.endTime);
    if (!savedSlot?.startTime || !savedSlot.endTime) return activity.slotDurationMinutes;
    const [startHour, startMinute] = savedSlot.startTime.split(":").map(Number);
    const [endHour, endMinute] = savedSlot.endTime.split(":").map(Number);
    return (endHour * 60 + endMinute - (startHour * 60 + startMinute) + 1440) % 1440 || activity.slotDurationMinutes;
  });
  const participantSlots = activity.slots.filter((slot) =>
    !isSchedulingSlotInPast(slot, activity.timezone, now) || answer.slotIds.includes(slot.id)
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  function toggleConfigured(id: string) {
    const selected = answer.slotIds.includes(id);
    const slot = activity.slots.find((item) => item.id === id);
    if (!selected && slot && isSchedulingSlotInPast(slot, activity.timezone, now)) return;
    onChange({ ...answer, slotIds: selected ? answer.slotIds.filter((slotId) => slotId !== id) : [...answer.slotIds, id] });
  }

  function changeSlotDuration(duration: number) {
    setSlotDuration(duration);
    onChange({
      ...answer,
      suggestedSlots: suggestedSlots.map((slot) => slot.startTime ? { ...slot, endTime: addMinutes(slot.startTime, duration) } : slot)
    });
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
      {activity.slots.length && participantSlots.length ? (
        <div className="divide-y divide-bone/10 border-y border-bone/10">
          {participantSlots.map((slot) => {
            const selected = answer.slotIds.includes(slot.id);
            return (
              <label key={slot.id} className={`flex cursor-pointer items-center gap-3 py-3 ${selected ? "text-bone" : "text-bone/72"}`}>
                <input type="checkbox" checked={selected} onChange={() => toggleConfigured(slot.id)} />
                <span>{slotLabel(slot, locale, activity.timezone)}</span>
              </label>
            );
          })}
        </div>
      ) : activity.slots.length ? (
        <p className="text-sm text-bone/55">{messages.participant.scheduling.noUpcomingDates}</p>
      ) : (
        <SchedulingCalendar
          mode={activity.mode}
          slots={suggestedSlots}
          duration={slotDuration}
          timezone={activity.timezone}
          onToggle={toggleSuggested}
          onDurationChange={changeSlotDuration}
          idPrefix="suggested"
        />
      )}
    </div>
  );
}
