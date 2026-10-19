"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, Compass, FileText, type LucideIcon, ListOrdered, MessageSquare, Trash2, UserRound } from "lucide-react";
import { Activity, ActivityType } from "@/types/activity";
import { Button } from "@/components/ritual-ui";
import { ActivityPicker } from "@/components/ritual-ui/ActivityPicker";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";

const activityOrder: ActivityType[] = ["profiling", "exploration", "prioritization", "framing", "scheduling", "planning_report"];
const activityIcons = {
  profiling: UserRound,
  exploration: Compass,
  prioritization: ListOrdered,
  framing: MessageSquare,
  planning_report: FileText,
  scheduling: CalendarDays
} satisfies Record<ActivityType, LucideIcon>;
const activityIllustrations: Partial<Record<ActivityType, string>> = {
  profiling: "Profiling",
  exploration: "Explore",
  prioritization: "Prioritize",
  framing: "Reflect",
  scheduling: "Plan",
  planning_report: "Planning-report"
};

export function ActivityList({
  activities,
  selectedId,
  onSelect,
  onAdd,
  onMove,
  onRemove,
  onUpdate,
  renderActivityEditor
}: {
  activities: Activity[];
  selectedId: string | null;
  onSelect: (activityId: string | null) => void;
  onAdd: (type: ActivityType) => void;
  onMove: (activityId: string, direction: -1 | 1) => void;
  onRemove: (activityId: string) => void;
  onUpdate: (activity: Activity) => void;
  renderActivityEditor?: (activity: Activity) => ReactNode;
}) {
  const { messages } = useLocale();
  const activityCountLabel = (activities.length === 1 ? messages.builder.activityAddedSingular : messages.builder.activitiesAddedPlural)
    .replace("{count}", String(activities.length));
  const activityCountByType = activities.reduce<Record<ActivityType, number>>(
    (counts, activity) => {
      counts[activity.type] += 1;
      return counts;
    },
    {
      profiling: 0,
      exploration: 0,
      prioritization: 0,
      framing: 0,
      planning_report: 0,
      scheduling: 0
    }
  );

  return (
    <div className="space-y-5">
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-bone/52">{activityCountLabel}</p>
        <ActivityPicker label={messages.common.addActivity} onAdd={onAdd} items={activityOrder.map((type) => {
          const Icon = activityIcons[type];
          return { id: type, label: messages.activities[type].label, description: messages.builder.activityCards[type].description, count: activityCountByType[type], illustration: activityIllustrations[type] ? <Image src={`/illustrations/${activityIllustrations[type]}-small.svg`} alt="" aria-hidden="true" width={40} height={40} /> : <Icon size={22} aria-hidden="true" /> };
        })} />
      </div>
      <div className="space-y-3">
        {activities.map((activity, index) => {
          const isExpanded = selectedId === activity.id;

          return (
            <article
              key={activity.id}
              className={cn(
                "group rounded-lg border transition",
                isExpanded ? "p-4" : "p-3",
                isExpanded ? "border-bone/25 bg-night/45" : "border-bone/10 bg-night/45 hover:border-bone/25 hover:bg-bone/[0.04]"
              )}
            >
              <div className={cn("grid grid-cols-[2.25rem_1fr] items-center", isExpanded ? "gap-4" : "gap-3")}>
                <div className={cn("flex flex-col items-center justify-center", isExpanded ? "gap-2" : "gap-1")}>
                  <Button type="button" variant="ghost" className="min-h-8 px-2 text-bone/46 hover:text-bone" disabled={index === 0} onClick={() => onMove(activity.id, -1)} title={messages.builder.moveUp}>
                    <ArrowUp size={15} />
                  </Button>
                  <span className="text-sm font-semibold text-bone/52">{index + 1}</span>
                  <Button type="button" variant="ghost" className="min-h-8 px-2 text-bone/46 hover:text-bone" disabled={index === activities.length - 1} onClick={() => onMove(activity.id, 1)} title={messages.builder.moveDown}>
                    <ArrowDown size={15} />
                  </Button>
                </div>
                <div className="min-w-0">
                  <span className="group/type relative inline-flex">
                    <span className="cursor-help text-xs font-semibold uppercase tracking-[0.16em] text-bone/58">
                      {messages.activities[activity.type].label}
                    </span>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 rounded-md border border-bone/12 bg-night px-3 py-2 text-sm font-medium leading-5 text-bone/78 opacity-0 shadow-xl shadow-black/30 transition group-hover/type:opacity-100"
                    >
                      {messages.activities[activity.type].purpose}
                    </span>
                  </span>
                  <div className="mt-1 grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-4">
                    <input
                      aria-label={messages.builder.activityTitleLabel}
                      className="block min-h-11 w-full rounded-md border border-transparent bg-transparent px-3 py-2 text-base font-semibold leading-6 text-bone outline-none transition placeholder:text-bone/42 hover:border-bone/12 hover:bg-night/70 focus:border-mint focus:bg-night/70"
                      value={activity.title}
                      placeholder={messages.builder.activityTitleLabel}
                      onChange={(event) => onUpdate({ ...activity, title: event.target.value } as Activity)}
                    />
                    <Button
                      type="button"
                      variant="danger"
                      className="h-11 min-h-11 w-11 min-w-11 !gap-0 !p-0 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [&_svg]:shrink-0"
                      onClick={() => onRemove(activity.id)}
                      title={messages.common.remove}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && renderActivityEditor ? (
                <div className="mt-5 border-t border-bone/10 pt-5">
                  {renderActivityEditor(activity)}
                </div>
              ) : null}

              <div className={cn("flex justify-center border-t border-bone/10", isExpanded ? "mt-4 pt-3" : "mt-2 pt-2")}>
                <Button type="button" variant="ghost" className="min-h-9 px-4 text-bone/60 hover:text-bone" onClick={() => onSelect(isExpanded ? null : activity.id)}>
                  {isExpanded ? messages.builder.collapse : messages.builder.expand}
                  <ChevronDown className={cn("transition", isExpanded ? "rotate-180" : "")} size={16} />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
