"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SchedulingMode, SchedulingSlot } from "@/types/activity";
import { Button, selectClass } from "@/components/ritual-ui";
import { schedulingCurrentTimeKey, schedulingTodayDateKey } from "@/lib/activities/scheduling";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const quarterHours = Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`);
const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function dateFromKey(key: string) { const [year, month, day] = key.split("-").map(Number); return new Date(year, month - 1, day); }
export const addMinutes = (time: string, minutes: number) => { const [hour, minute] = time.split(":").map(Number); const value = hour * 60 + minute + minutes; return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; };

type CalendarProps = { mode: SchedulingMode; slots: SchedulingSlot[]; duration: number; timezone: string; onToggle: (slot: SchedulingSlot) => void; idPrefix?: "slot" | "suggested"; onModeChange?: (mode: SchedulingMode) => void; onDurationChange?: (duration: number) => void };

export function SchedulingCalendar({ mode, slots, duration, timezone, onToggle, idPrefix = "slot", onModeChange, onDurationChange }: CalendarProps) {
  const todayKey = schedulingTodayDateKey(timezone);
  const today = dateFromKey(todayKey);
  const [currentTimeKey, setCurrentTimeKey] = useState(() => schedulingCurrentTimeKey(timezone));
  const [cursor, setCursor] = useState(() => dateFromKey(schedulingTodayDateKey(timezone)));
  useEffect(() => {
    const updateTime = () => setCurrentTimeKey(schedulingCurrentTimeKey(timezone));
    updateTime();
    const interval = window.setInterval(updateTime, 15_000);
    return () => window.clearInterval(interval);
  }, [timezone]);
  useEffect(() => { setCursor(dateFromKey(schedulingTodayDateKey(timezone))); }, [timezone]);
  useEffect(() => { setCursor((current) => toDateKey(current) < todayKey ? dateFromKey(todayKey) : current); }, [todayKey]);
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthStart = new Date(first); monthStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const monthDates = Array.from({ length: 42 }, (_, index) => { const date = new Date(monthStart); date.setDate(monthStart.getDate() + index); return date; });
  const weekDates = Array.from({ length: 8 }, (_, index) => { const date = new Date(cursor); date.setDate(cursor.getDate() + index); return date; });
  const weekLabel = `${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(weekDates[0])} – ${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(weekDates[7])}`;
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(cursor);
  const isCurrentPeriod = mode === "weekly"
    ? toDateKey(cursor) <= todayKey
    : cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
  function move(amount: number) { if (amount < 0 && isCurrentPeriod) return; const next = new Date(cursor); if (mode === "weekly") next.setDate(next.getDate() + amount * 7); else next.setMonth(next.getMonth() + amount, 1); setCursor(next); }
  function slotFor(date: Date, startTime?: string): SchedulingSlot { const dateKey = toDateKey(date); return mode === "monthly" ? { id: `${idPrefix}:${dateKey}`, date: dateKey } : { id: `${idPrefix}:${dateKey}:${startTime}`, date: dateKey, startTime, endTime: addMinutes(startTime!, duration) }; }
  function selected(slot: SchedulingSlot) { return slots.some((item) => item.date === slot.date && item.startTime === slot.startTime); }
  return <section className="overflow-hidden rounded-lg border border-bone/12 bg-night/35"><div className="flex items-center justify-between gap-2 border-b border-bone/10 px-3 py-2 sm:flex-wrap sm:gap-3 sm:px-4 sm:py-3"><div className="inline-flex h-11 shrink-0 rounded-md border border-bone/15 p-1">{(["weekly", "monthly"] as SchedulingMode[]).map((item) => <button key={item} type="button" disabled={!onModeChange} onClick={() => onModeChange?.(item)} className={`h-full rounded px-2 py-0 text-xs font-medium sm:px-3 sm:text-sm ${mode === item ? "bg-bone text-night" : "text-bone/60"}`}>{item === "weekly" ? "Week" : "Month"}</button>)}</div>{mode === "weekly" && onDurationChange ? <label className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs text-bone/65 sm:gap-2 sm:text-sm">Slot <select className={`${selectClass} !h-11 !min-h-11 !w-auto min-w-[6.25rem] !border-bone/15 !py-0 text-xs focus:!border-mint sm:min-w-32 sm:text-sm`} value={duration} onChange={(event) => onDurationChange(Number(event.target.value))}>{[15, 30, 60, 90, 120, 180, 240].map((value) => <option key={value} value={value}>{value} min</option>)}</select></label> : null}</div><div className="flex items-center justify-between px-2 py-3 sm:px-4"><Button type="button" variant="ghost" className="h-9 min-h-9 w-9 !p-0" disabled={isCurrentPeriod} onClick={() => move(-1)}><ChevronLeft size={17} /></Button><p className="text-center text-sm font-semibold text-bone sm:text-base">{mode === "weekly" ? weekLabel : monthLabel}</p><Button type="button" variant="ghost" className="h-9 min-h-9 w-9 !p-0" onClick={() => move(1)}><ChevronRight size={17} /></Button></div>{mode === "weekly" ? <WeeklyGrid key={`${timezone}-${todayKey}-${toDateKey(weekDates[0])}`} dates={weekDates} todayKey={todayKey} currentTimeKey={currentTimeKey} slots={slots} duration={duration} slotFor={slotFor} onToggle={onToggle} /> : <MonthlyGrid dates={monthDates} todayKey={todayKey} cursor={cursor} slotFor={slotFor} selected={selected} onToggle={onToggle} />}</section>;
}

function WeeklyGrid({ dates, todayKey, currentTimeKey, slots, duration, slotFor, onToggle }: { dates: Date[]; todayKey: string; currentTimeKey: string; slots: SchedulingSlot[]; duration: number; slotFor: (date: Date, time?: string) => SchedulingSlot; onToggle: (slot: SchedulingSlot) => void }) {
  const todayIndex = dates.findIndex((date) => toDateKey(date) === todayKey);
  const [mobileDay, setMobileDay] = useState(todayIndex >= 0 ? todayIndex : 0);
  return <><div className="md:hidden"><div className="grid gap-1 border-t border-bone/10 px-2 py-2 text-center" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` }}>{dates.map((date, index) => { const dateKey = toDateKey(date); const isPast = dateKey < todayKey; return <button type="button" key={dateKey} aria-pressed={mobileDay === index} onClick={() => setMobileDay(index)} className={`min-w-0 rounded px-0.5 py-1.5 text-[10px] leading-4 transition ${mobileDay === index ? "bg-bone text-night" : isPast ? "cursor-default text-bone/28" : "text-bone/60 hover:bg-bone/8"}`}>{dayNames[(date.getDay() + 6) % 7]}<span className="mt-0.5 block text-xs font-semibold sm:text-sm">{date.getDate()}</span></button>; })}</div><DaySchedule date={dates[mobileDay]} todayKey={todayKey} currentTimeKey={currentTimeKey} slots={slots} duration={duration} slotFor={slotFor} onToggle={onToggle} /></div><div className="hidden md:block"><div className="grid border-t border-bone/10 text-center text-xs text-bone/55" style={{ gridTemplateColumns: `3.5rem repeat(${dates.length}, minmax(0, 1fr))` }}><span className="py-3" />{dates.map((date) => { const dateKey = toDateKey(date); const isPast = dateKey < todayKey; const isToday = dateKey === todayKey; return <span key={dateKey} aria-current={isToday ? "date" : undefined} className={`py-3 ${isPast ? "text-bone/28" : isToday ? "text-mint" : ""}`}>{new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date)}<strong className={`mt-1 block ${isPast ? "text-bone/28" : isToday ? "text-mint" : "text-bone"}`}>{date.getDate()}</strong></span>; })}</div><DesktopSchedule dates={dates} todayKey={todayKey} currentTimeKey={currentTimeKey} slots={slots} duration={duration} slotFor={slotFor} onToggle={onToggle} /></div></>;
}

function timeIndex(time: string) { const [hours, minutes] = time.split(":").map(Number); return hours * 4 + minutes / 15; }
function slotBlocks(slot: SchedulingSlot) { if (!slot.startTime || !slot.endTime) return 1; const start = timeIndex(slot.startTime); const end = timeIndex(slot.endTime); return (end > start ? end - start : end + 96 - start) || 1; }
function containsTime(slot: SchedulingSlot, time: string) { if (!slot.startTime || !slot.endTime) return false; return slot.endTime > slot.startTime ? time >= slot.startTime && time < slot.endTime : time >= slot.startTime || time < slot.endTime; }

function DesktopSchedule({ dates, todayKey, currentTimeKey, slots, duration, slotFor, onToggle }: { dates: Date[]; todayKey: string; currentTimeKey: string; slots: SchedulingSlot[]; duration: number; slotFor: (date: Date, time?: string) => SchedulingSlot; onToggle: (slot: SchedulingSlot) => void }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    scrollElement.scrollTop = 8 * 4 * 20;

    function forwardWheelToPage(event: WheelEvent) {
      if (!window.matchMedia("(min-width: 768px)").matches || event.ctrlKey || event.deltaY === 0) return;

      event.preventDefault();
      let ancestor = scrollElement!.parentElement;
      while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
        const overflowY = window.getComputedStyle(ancestor).overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && ancestor.scrollHeight > ancestor.clientHeight) {
          ancestor.scrollBy({ top: event.deltaY, behavior: "auto" });
          return;
        }
        ancestor = ancestor.parentElement;
      }
      window.scrollBy({ top: event.deltaY, behavior: "auto" });
    }

    scrollElement.addEventListener("wheel", forwardWheelToPage, { passive: false });
    return () => scrollElement.removeEventListener("wheel", forwardWheelToPage);
  }, []);

  return <div ref={scrollRef} className="max-h-[32rem] overflow-y-auto"><div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${dates.length}, minmax(0, 1fr))` }}><TimeLabels />{dates.map((date) => <DayColumn key={toDateKey(date)} date={date} todayKey={todayKey} currentTimeKey={currentTimeKey} slots={slots} duration={duration} slotFor={slotFor} onToggle={onToggle} />)}</div></div>;
}

function DaySchedule({ date, todayKey, currentTimeKey, slots, duration, slotFor, onToggle }: { date: Date; todayKey: string; currentTimeKey: string; slots: SchedulingSlot[]; duration: number; slotFor: (date: Date, time?: string) => SchedulingSlot; onToggle: (slot: SchedulingSlot) => void }) { const scrollRef = useRef<HTMLDivElement | null>(null); useEffect(() => { const frame = window.requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = 8 * 4 * 20; }); return () => window.cancelAnimationFrame(frame); }, []); return <div ref={scrollRef} className="max-h-[32rem] overflow-y-auto"><div className="grid grid-cols-[3.5rem_1fr]"><TimeLabels /><DayColumn date={date} todayKey={todayKey} currentTimeKey={currentTimeKey} slots={slots} duration={duration} slotFor={slotFor} onToggle={onToggle} /></div></div>; }

function TimeLabels() { return <div className="border-r border-bone/10">{quarterHours.map((time) => <div key={time} className={`h-5 pr-2 text-right text-xs leading-5 text-bone/40 ${time.endsWith(":00") ? "border-t border-t-bone/20" : ""}`}>{time.endsWith(":00") ? time : ""}</div>)}</div>; }

function DayColumn({ date, todayKey, currentTimeKey, slots, duration, slotFor, onToggle }: { date: Date; todayKey: string; currentTimeKey: string; slots: SchedulingSlot[]; duration: number; slotFor: (date: Date, time?: string) => SchedulingSlot; onToggle: (slot: SchedulingSlot) => void }) { const matchingSlots = slots.filter((slot) => slot.date === toDateKey(date) && slot.startTime); const dateKey = toDateKey(date); const isPastDate = dateKey < todayKey; const isToday = dateKey === todayKey; return <div className="relative grid grid-rows-[repeat(96,1.25rem)] border-r border-bone/10">{quarterHours.map((time) => { const requestedSlot = slotFor(date, time); const activeSlot = matchingSlots.find((slot) => containsTime(slot, time)); const isPastTime = isToday && time < currentTimeKey; const isUnavailable = isPastDate || isPastTime; const exceedsDay = timeIndex(time) + duration / 15 > 96; return <button key={requestedSlot.id} type="button" aria-label={`${dateKey} ${time}`} disabled={exceedsDay || (isUnavailable && !activeSlot)} onClick={() => onToggle(activeSlot ?? requestedSlot)} className={`border-b border-bone/10 transition ${time.endsWith(":00") ? "border-t border-t-bone/20" : ""} ${activeSlot ? "opacity-0" : isUnavailable || exceedsDay ? "cursor-not-allowed opacity-20" : "hover:bg-bone/10"}`} />; })}{matchingSlots.map((slot) => <button key={slot.id} type="button" aria-label={`${dateKey} ${slot.startTime}–${slot.endTime}, remove slot`} onClick={() => onToggle(slot)} style={{ top: `${timeIndex(slot.startTime!) * 20}px`, height: `${Math.min(slotBlocks(slot), 96 - timeIndex(slot.startTime!)) * 20}px` }} className="absolute inset-x-0 z-10 flex items-center justify-center bg-mint px-1 text-center text-[11px] font-semibold text-night hover:bg-mint/85 focus:outline-none focus:ring-2 focus:ring-bone">{slot.startTime}–{slot.endTime}</button>)}</div>; }

function MonthlyGrid({ dates, todayKey, cursor, slotFor, selected, onToggle }: { dates: Date[]; todayKey: string; cursor: Date; slotFor: (date: Date) => SchedulingSlot; selected: (slot: SchedulingSlot) => boolean; onToggle: (slot: SchedulingSlot) => void }) {
  return <div className="p-4"><div className="grid grid-cols-7 gap-1 text-center text-xs text-bone/45">{dayNames.map((day) => <span key={day} className="py-2">{day}</span>)}</div><div className="grid grid-cols-7 gap-1">{dates.map((date) => { const slot = slotFor(date); const isPast = toDateKey(date) < todayKey; const isOutsideMonth = date.getMonth() !== cursor.getMonth(); const isSelected = selected(slot); return <button key={slot.id} type="button" disabled={isPast && !isSelected} onClick={() => onToggle(slot)} className={`min-h-10 rounded-md text-sm transition ${isPast ? isSelected ? "bg-bone/15 text-bone/55" : "cursor-not-allowed text-bone/20" : isOutsideMonth ? "text-bone/25" : isSelected ? "bg-mint text-night font-semibold" : "text-bone hover:bg-bone/10"}`}>{date.getDate()}</button>; })}</div></div>;
}
