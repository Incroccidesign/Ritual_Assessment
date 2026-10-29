"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Field, inputClass, selectClass } from "@/components/ritual-ui";
import { SchedulingActivity, SchedulingMode, SchedulingSlot } from "@/types/activity";
import { addMinutes, SchedulingCalendar } from "@/components/activities/scheduling/SchedulingCalendar";
import { useDismissiblePopover } from "@/lib/ui/use-dismissible-popover";

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const fallbackTimeZones = [
  "Africa/Cairo", "Africa/Johannesburg", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Mexico_City", "America/New_York", "America/Sao_Paulo", "Asia/Dubai", "Asia/Hong_Kong",
  "Asia/Kolkata", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
  "Europe/Athens", "Europe/Berlin", "Europe/Istanbul", "Europe/London", "Europe/Madrid", "Europe/Paris",
  "Europe/Rome", "Pacific/Auckland", "UTC"
];

function getTimeZoneOptions(selectedTimezone: string) {
  const supportedValues = (Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf;
  const zones = supportedValues?.call(Intl, "timeZone") ?? fallbackTimeZones;
  return Array.from(new Set([...zones, "UTC", selectedTimezone])).sort((first, second) => first.localeCompare(second));
}

function timeZoneOffset(timezone: string) {
  return new Intl.DateTimeFormat("en", { timeZone: timezone, timeZoneName: "shortOffset" })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value ?? "UTC";
}

function TimezoneSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (timezone: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dismiss = useCallback(() => setOpen(false), []);
  useDismissiblePopover(open, containerRef, dismiss);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return options.filter((timezone) => timezone.toLocaleLowerCase().includes(normalizedQuery));
  }, [options, query]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={`${selectClass} flex items-center justify-between gap-3 text-left`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{value}</span>
        <ChevronDown size={17} className={`shrink-0 text-bone/55 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="ritual-popover-surface absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-md border p-2 shadow-live">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone/45" aria-hidden="true" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search time zones"
              aria-label="Search time zones"
              className={`${inputClass} min-h-10 py-2 pl-9 pr-3 text-sm`}
            />
          </div>
          <div role="listbox" aria-label="Time zones" className="modal-scroll mt-2 max-h-56 overflow-y-auto">
            {filteredOptions.length ? filteredOptions.map((timezone) => (
              <button
                key={timezone}
                type="button"
                role="option"
                aria-selected={timezone === value}
                onClick={() => {
                  onChange(timezone);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex min-h-10 w-full items-center justify-between gap-3 rounded px-3 text-left text-sm transition hover:bg-bone/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bone/70"
              >
                <span className="truncate text-bone">{timezone}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-bone/48">
                  {timeZoneOffset(timezone)}
                  {timezone === value ? <Check size={14} className="text-mint" aria-hidden="true" /> : null}
                </span>
              </button>
            )) : (
              <p className="px-3 py-4 text-sm text-bone/55">No time zones found.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SchedulingEditor({ activity, onChange }: { activity: SchedulingActivity; onChange: (activity: SchedulingActivity) => void }) {
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(activity.timezone || browserTimezone()), [activity.timezone]);
  function toggleSlot(nextSlot: SchedulingSlot) { const existing = activity.slots.find((slot) => slot.date === nextSlot.date && slot.startTime === nextSlot.startTime); onChange({ ...activity, timezone: activity.timezone || browserTimezone(), slots: existing ? activity.slots.filter((slot) => slot.id !== existing.id) : [...activity.slots, nextSlot] }); }
  function changeMode(mode: SchedulingMode) { onChange({ ...activity, mode, slots: activity.slots.map((slot) => mode === "monthly" ? { id: `slot:${slot.date}`, date: slot.date } : slot.startTime ? slot : { id: `slot:${slot.date}:09:00`, date: slot.date, startTime: "09:00", endTime: addMinutes("09:00", activity.slotDurationMinutes) }) }); }
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-bone">Availability</p>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-bone/55">Select dates or time slots you want to propose. Participants can always add theirs.</p>
        </div>
        <span className="shrink-0 rounded-full border border-bone/12 px-2.5 py-1 text-xs font-medium tabular-nums text-bone/60">
          {activity.slots.length} selected
        </span>
      </div>
      <div className="sm:max-w-sm">
        <Field label="Timezone">
          <TimezoneSelect value={activity.timezone || browserTimezone()} options={timeZoneOptions} onChange={(timezone) => onChange({ ...activity, timezone })} />
        </Field>
      </div>
      <SchedulingCalendar
        mode={activity.mode}
        slots={activity.slots}
        duration={activity.slotDurationMinutes}
        onToggle={toggleSlot}
        onModeChange={changeMode}
        onDurationChange={(slotDurationMinutes) => onChange({ ...activity, slotDurationMinutes })}
      />
    </div>
  );
}
