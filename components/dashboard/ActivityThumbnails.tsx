"use client";

import Image from "next/image";
import { useId, useState } from "react";

export type ActivityThumbnail = { id: string; illustration: string; label: string };

export function ActivityThumbnails({ activities }: { activities: ActivityThumbnail[] }) {
  const tooltipId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleActivities = activities.slice(0, 6);
  const remainingActivities = activities.slice(6);

  if (!activities.length) return null;

  return (
    <ul className="relative z-10 mt-5 flex min-w-0 flex-wrap items-center gap-1.5">
      {visibleActivities.map((activity) => (
        <li key={activity.id} className="relative" onMouseEnter={() => setActiveId(activity.id)} onMouseLeave={() => setActiveId(null)}>
          <span
            role="img"
            aria-label={activity.label}
            aria-describedby={activeId === activity.id ? `${tooltipId}-${activity.id}` : undefined}
            tabIndex={0}
            onFocus={() => setActiveId(activity.id)}
            onBlur={() => setActiveId(null)}
            onKeyDown={(event) => { if (event.key === "Escape") setActiveId(null); }}
            className="flex size-7 items-center justify-center rounded-sm opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint"
          >
            <Image src={`/illustrations/${activity.illustration}-small.svg`} alt="" aria-hidden="true" width={28} height={28} className="size-7 object-contain" />
          </span>
          {activeId === activity.id ? (
            <span id={`${tooltipId}-${activity.id}`} role="tooltip" className="absolute bottom-full left-0 z-30 pb-2">
              <span className="ritual-popover-surface block w-max max-w-48 rounded-md border px-3 py-2 text-xs leading-5 text-bone">{activity.label}</span>
            </span>
          ) : null}
        </li>
      ))}
      {remainingActivities.length ? (
        <li className="relative" onMouseEnter={() => setActiveId("remaining")} onMouseLeave={() => setActiveId(null)}>
          <button
            type="button"
            aria-label={remainingActivities.map((activity) => activity.label).join(", ")}
            aria-describedby={activeId === "remaining" ? `${tooltipId}-remaining` : undefined}
            onFocus={() => setActiveId("remaining")}
            onBlur={() => setActiveId(null)}
            onKeyDown={(event) => { if (event.key === "Escape") setActiveId(null); }}
            className="flex h-7 min-w-7 items-center justify-center rounded-full border border-bone/15 px-1.5 text-[10px] font-semibold tabular-nums text-bone/65 transition hover:border-mint/40 hover:text-bone focus:outline-none focus:ring-2 focus:ring-mint"
          >+{remainingActivities.length}</button>
          {activeId === "remaining" ? (
            <span id={`${tooltipId}-remaining`} role="tooltip" className="absolute bottom-full left-0 z-30 pb-2">
              <span className="ritual-popover-surface block w-max max-w-56 rounded-md border px-3 py-2 text-xs leading-5 text-bone">{remainingActivities.map((activity) => activity.label).join(" · ")}</span>
            </span>
          ) : null}
        </li>
      ) : null}
    </ul>
  );
}
