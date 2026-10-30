import { SchedulingActivity, SchedulingAnswer, SchedulingSlot } from "@/types/activity";
import { AssessmentResponse } from "@/types/response";

export function schedulingTodayDateKey(timezone: string) {
  return schedulingDateKeyAt(timezone, new Date());
}

function schedulingDateKeyAt(timezone: string, date: Date) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  }
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function schedulingCurrentTimeKey(timezone: string, at = new Date()) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  }
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("hour")}:${value("minute")}`;
}

export function isSchedulingSlotInPast(slot: SchedulingSlot, timezone: string, at = new Date()) {
  const today = schedulingDateKeyAt(timezone, at);
  return slot.date < today || (slot.date === today && Boolean(slot.startTime) && slot.startTime! < schedulingCurrentTimeKey(timezone, at));
}

export function slotLabel(slot: SchedulingSlot, locale: string, timezone: string) {
  const date = new Intl.DateTimeFormat(locale, { timeZone: timezone, weekday: "short", day: "numeric", month: "short" }).format(new Date(`${slot.date}T12:00:00Z`));
  return slot.startTime ? `${date}, ${slot.startTime}${slot.endTime ? `–${slot.endTime}` : ""}` : date;
}

export function schedulingVotes(activity: SchedulingActivity, responses: AssessmentResponse[]) {
  const answerCount = new Map<string, number>();
  const suggestedSlots = new Map<string, SchedulingSlot>();
  responses.forEach((response) => {
    const answer = response.activityResponses.find((item) => item.activityId === activity.id)?.answer;
    if (!answer || !("slotIds" in answer)) return;
    (answer as SchedulingAnswer).suggestedSlots?.forEach((slot) => suggestedSlots.set(slot.id, slot));
    (answer as SchedulingAnswer).slotIds.forEach((id) => answerCount.set(id, (answerCount.get(id) ?? 0) + 1));
  });
  const respondentCount = responses.filter((response) => response.activityResponses.some((item) => item.activityId === activity.id && "slotIds" in item.answer)).length;
  const slots = [...activity.slots, ...Array.from(suggestedSlots.values()).filter((slot) => !activity.slots.some((configured) => configured.id === slot.id))];
  return slots.map((slot) => ({ slot, count: answerCount.get(slot.id) ?? 0, percentage: respondentCount ? Math.round(((answerCount.get(slot.id) ?? 0) / respondentCount) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.slot.date.localeCompare(b.slot.date));
}
