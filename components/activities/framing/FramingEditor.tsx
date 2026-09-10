"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Activity, FramingActivity } from "@/types/activity";
import { Field, selectClass } from "@/components/ritual-ui";
import { previousExplorationActivities, previousPrioritizationActivities } from "@/lib/activities/dependencies";
import { useLocale } from "@/lib/i18n/useLocale";

const responseLengths = [250, 500, 1000, 1500, 3000];

export function FramingResponseLengthField({
  activity,
  onChange
}: {
  activity: FramingActivity;
  onChange: (activity: FramingActivity) => void;
}) {
  const { messages } = useLocale();
  const lengths = responseLengths.includes(activity.maxLength)
    ? responseLengths
    : [...responseLengths, activity.maxLength].sort((left, right) => left - right);

  return (
    <Field label={messages.activities.framing.maxLength}>
      <select className={selectClass} value={activity.maxLength} onChange={(event) => onChange({ ...activity, maxLength: Number(event.target.value) })}>
        {lengths.map((length) => <option key={length} value={length}>{length}</option>)}
      </select>
    </Field>
  );
}

export function FramingEditor({
  activity,
  activities,
  onChange
}: {
  activity: FramingActivity;
  activities: Activity[];
  onChange: (activity: FramingActivity) => void;
}) {
  const { messages } = useLocale();
  const [isLinkOpen, setIsLinkOpen] = useState(Boolean(activity.sourceActivityId));
  const explorationSources = previousExplorationActivities(activities, activity.orderIndex);
  const prioritizationSources = previousPrioritizationActivities(activities, activity.orderIndex);
  const source = [...explorationSources, ...prioritizationSources].find((item) => item.id === activity.sourceActivityId);

  return (
    <div className="space-y-5 border-t border-bone/10 pt-5">
      <div className="flex items-start gap-3">
        <input
          id={`framing-link-${activity.id}`}
          type="checkbox"
          className="mt-1"
          checked={isLinkOpen || Boolean(activity.sourceActivityId)}
          onChange={(event) => {
            setIsLinkOpen(event.target.checked);
            if (!event.target.checked) onChange({ ...activity, sourceActivityId: "", mode: "standard" });
          }}
        />
        <div className="flex min-w-0 items-start gap-2">
          <label htmlFor={`framing-link-${activity.id}`} className="min-w-0 cursor-pointer">
            <span className="block text-sm font-semibold text-bone">{messages.activities.framing.linkToggle}</span>
            <span className="mt-1 block text-sm leading-6 text-bone/56">
              {source?.type === "prioritization" ? messages.activities.framing.prioritizationLinkHelper : messages.activities.framing.linkToggleHelper}
            </span>
          </label>
          <Help text={messages.activities.framing.linkToggleHelp} />
        </div>
      </div>
      {isLinkOpen || activity.sourceActivityId ? <Field label={messages.activities.framing.sourceActivity}>
        <select
          className={selectClass}
          value={activity.sourceActivityId}
          onChange={(event) => {
            const nextSourceId = event.target.value;
            const nextSource = [...explorationSources, ...prioritizationSources].find((item) => item.id === nextSourceId);
            onChange({
              ...activity,
              sourceActivityId: nextSourceId,
              mode: nextSource?.type === "exploration" ? "per_exploration_item" : "standard"
            });
          }}
        >
          <option value="">{messages.activities.framing.noSource}</option>
          {explorationSources.map((item) => <option key={item.id} value={item.id}>{item.title || messages.activities.framing.untitledExploration}</option>)}
          {prioritizationSources.map((item) => <option key={item.id} value={item.id}>{item.title || messages.activities.framing.untitledPrioritization}</option>)}
        </select>
      </Field> : null}
    </div>
  );
}

function Help({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative mt-0.5 inline-flex shrink-0" onMouseLeave={() => setIsOpen(false)}>
      <button
        type="button"
        className="inline-flex text-bone/50 outline-none hover:text-mint focus:text-mint"
        aria-label={text}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
      >
        <CircleHelp size={16} />
      </button>
      {isOpen ? <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-md border border-bone/15 bg-night px-3 py-2 text-xs font-normal leading-5 text-bone shadow-xl">{text}</span> : null}
    </span>
  );
}
