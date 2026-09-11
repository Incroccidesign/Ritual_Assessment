"use client";

import { ReactNode, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Compass, FileText, type LucideIcon, ListOrdered, MessageSquare, Plus, Trash2, UserRound, X } from "lucide-react";
import { Activity, ActivityType } from "@/types/activity";
import { Button } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";

const activityOrder: ActivityType[] = ["profiling", "exploration", "prioritization", "framing", "planning_report"];
const activityIcons = {
  profiling: UserRound,
  exploration: Compass,
  prioritization: ListOrdered,
  framing: MessageSquare,
  planning_report: FileText
} satisfies Record<ActivityType, LucideIcon>;

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
  const [isAddOpen, setIsAddOpen] = useState(false);
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
      planning_report: 0
    }
  );

  return (
    <div className="space-y-5">
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-bone/52">{activityCountLabel}</p>
        <Button type="button" variant="secondary" className="min-h-11 px-4" onClick={() => setIsAddOpen((current) => !current)}>
          <Plus size={16} />
          {messages.common.addActivity}
        </Button>
        {isAddOpen ? (
          <div className="absolute right-0 top-14 z-20 w-[min(520px,calc(100vw-3rem))] rounded-lg border border-bone/12 bg-night p-3 shadow-2xl shadow-black/40">
            <div className="mb-2 flex items-center justify-between gap-3 px-2">
              <p className="font-heading text-xl font-semibold text-bone">{messages.common.addActivity}</p>
              <Button type="button" variant="ghost" className="min-h-9 px-3" onClick={() => setIsAddOpen(false)}>
                <X size={16} />
              </Button>
            </div>
            <div className="space-y-2">
              {activityOrder.map((type) => {
                const Icon = activityIcons[type];
                const addedCount = activityCountByType[type];

                return (
                  <button
                    key={type}
                    type="button"
                    className="flex w-full items-start gap-3 rounded-md border border-bone/10 bg-bone/[0.03] p-3 text-left transition hover:border-mint/55 hover:bg-mint/10"
                    onClick={() => {
                      onAdd(type);
                      setIsAddOpen(false);
                    }}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-bone/12 bg-bone/6 text-bone/72">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold text-bone">
                        {messages.activities[type].label}
                        {addedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-mint/40 bg-mint/10 px-2 py-0.5 text-xs text-mint">
                            <Check size={11} />
                            {addedCount}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-bone/58">{messages.builder.activityCards[type].description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
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
                isExpanded ? "border-mint bg-mint/10" : "border-bone/10 bg-night/45 hover:border-violet/45 hover:bg-bone/[0.04]"
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
                    <span className="cursor-help text-xs font-semibold uppercase tracking-[0.16em] text-mint">
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
                      className="h-11 min-h-11 w-11 min-w-11 !gap-0 !p-0 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 [&_svg]:shrink-0"
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
