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
  renderActivityEditor
}: {
  activities: Activity[];
  selectedId: string | null;
  onSelect: (activityId: string | null) => void;
  onAdd: (type: ActivityType) => void;
  onMove: (activityId: string, direction: -1 | 1) => void;
  onRemove: (activityId: string) => void;
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
                "group rounded-lg border p-4 transition",
                isExpanded ? "border-mint bg-mint/10" : "border-bone/10 bg-night/45 hover:border-violet/45 hover:bg-bone/[0.04]"
              )}
            >
              <div className="grid grid-cols-[2.25rem_1fr_2.75rem] items-center gap-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Button type="button" variant="ghost" className="min-h-8 px-2 text-bone/46 hover:text-bone" disabled={index === 0} onClick={() => onMove(activity.id, -1)} title={messages.builder.moveUp}>
                    <ArrowUp size={15} />
                  </Button>
                  <Button type="button" variant="ghost" className="min-h-8 px-2 text-bone/46 hover:text-bone" disabled={index === activities.length - 1} onClick={() => onMove(activity.id, 1)} title={messages.builder.moveDown}>
                    <ArrowDown size={15} />
                  </Button>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">{messages.activities[activity.type].label}</p>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-sm font-semibold text-bone/46">{index + 1}</span>
                    <p className="truncate font-semibold text-bone">{activity.title}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="danger"
                    className="min-h-9 px-3 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                    onClick={() => onRemove(activity.id)}
                    title={messages.common.remove}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>

              {isExpanded && renderActivityEditor ? (
                <div className="mt-5 border-t border-bone/10 pt-5">
                  {renderActivityEditor(activity)}
                </div>
              ) : null}

              <div className="mt-4 flex justify-center border-t border-bone/10 pt-3">
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
