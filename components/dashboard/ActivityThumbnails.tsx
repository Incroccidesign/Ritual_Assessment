"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

export type ActivityThumbnail = { id: string; illustration: string; label: string };

export function ActivityThumbnails({ activities }: { activities: ActivityThumbnail[] }) {
  const tooltipId = useId();
  const listRef = useRef<HTMLUListElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [capacity, setCapacity] = useState(7);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const itemSize = 24;
      const gap = 4;
      setCapacity(Math.max(1, Math.floor((entry.contentRect.width + gap) / (itemSize + gap))));
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  if (!activities.length) return null;

  const hasOverflow = activities.length > capacity;
  const visibleActivities = activities.slice(0, hasOverflow ? Math.max(0, capacity - 1) : capacity);
  const remainingActivities = activities.slice(visibleActivities.length);

  return (
    <ul ref={listRef} className={`relative z-10 mt-3 flex w-full min-w-0 flex-nowrap items-center ${hasOverflow ? "justify-between gap-0" : "gap-1"}`}>
      {visibleActivities.map((activity) => (
        <li key={activity.id} className="relative shrink-0" onMouseEnter={() => setActiveId(activity.id)} onMouseLeave={() => setActiveId(null)}>
          <span
            role="img"
            aria-label={activity.label}
            aria-describedby={activeId === activity.id ? `${tooltipId}-${activity.id}` : undefined}
            tabIndex={0}
            onFocus={() => setActiveId(activity.id)}
            onBlur={() => setActiveId(null)}
            onKeyDown={(event) => { if (event.key === "Escape") setActiveId(null); }}
            className="flex size-6 shrink-0 items-center justify-center rounded-sm opacity-85 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint"
          >
            <Image src={`/illustrations/${activity.illustration}-small.svg`} alt="" aria-hidden="true" width={24} height={24} className="size-6 object-contain" />
          </span>
          {activeId === activity.id ? (
            <span id={`${tooltipId}-${activity.id}`} role="tooltip" className="absolute bottom-full left-0 z-30 pb-2">
              <span className="ritual-popover-surface block w-max max-w-48 rounded-md border px-3 py-2 text-xs leading-5 text-bone">{activity.label}</span>
            </span>
          ) : null}
        </li>
      ))}
      {remainingActivities.length ? (
        <li className="relative shrink-0" onMouseEnter={() => setActiveId("remaining")} onMouseLeave={() => setActiveId(null)}>
          <button
            type="button"
            aria-label={remainingActivities.map((activity) => activity.label).join(", ")}
            aria-describedby={activeId === "remaining" ? `${tooltipId}-remaining` : undefined}
            onFocus={() => setActiveId("remaining")}
            onBlur={() => setActiveId(null)}
            onKeyDown={(event) => { if (event.key === "Escape") setActiveId(null); }}
            className="relative flex size-6 items-center justify-center text-[8px] font-medium tabular-nums text-bone transition hover:text-white focus:outline-none focus:ring-2 focus:ring-mint"
          ><Image src="/icons/dashboard-activity-overflow-circle.svg" alt="" aria-hidden="true" width={24} height={24} className="absolute inset-0 size-full" /><span className="relative">+{remainingActivities.length}</span></button>
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
