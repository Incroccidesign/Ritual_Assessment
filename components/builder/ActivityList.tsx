"use client";

import { ArrowDown, ArrowUp, Check, Compass, FileText, type LucideIcon, ListOrdered, MessageSquare, Plus, Trash2, UserRound } from "lucide-react";
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
  onRemove
}: {
  activities: Activity[];
  selectedId: string | null;
  onSelect: (activityId: string) => void;
  onAdd: (type: ActivityType) => void;
  onMove: (activityId: string, direction: -1 | 1) => void;
  onRemove: (activityId: string) => void;
}) {
  const { messages } = useLocale();
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {activityOrder.map((type) => {
          const Icon = activityIcons[type];
          const addedCount = activityCountByType[type];

          return (
            <Button
              key={type}
              type="button"
              variant="secondary"
              className={cn(
                "min-h-[148px] w-full flex-col items-start justify-between rounded-lg px-4 py-4 text-left",
                addedCount > 0
                  ? "border-mint/65 bg-mint/8 hover:border-mint hover:bg-mint/10"
                  : "hover:border-violet/45 hover:bg-bone/8"
              )}
              onClick={() => onAdd(type)}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full border text-bone/72",
                    addedCount > 0 ? "border-mint/55 bg-mint/12 text-mint" : "border-bone/12 bg-bone/6"
                  )}
                >
                  <Icon size={18} />
                </span>
                {addedCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-mint/40 bg-mint/10 px-2.5 py-1 text-xs font-semibold text-mint">
                    <Check size={12} />
                    {addedCount}
                  </span>
                ) : null}
              </div>
              <div className="w-full space-y-3">
                <div>
                  <p className="text-base font-semibold text-bone">{messages.activities[type].label}</p>
                  <p className="mt-2 text-sm font-normal leading-6 text-bone/64">{messages.builder.activityCards[type].description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-bone/50">
                  <Plus size={14} />
                  <span>{messages.common.add}</span>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <article
            key={activity.id}
            className={cn(
              "rounded-lg border p-4 transition",
              selectedId === activity.id ? "border-mint bg-mint/10" : "border-bone/10 bg-night/45 hover:border-violet/45"
            )}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelect(activity.id)}>
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-bone/8 text-sm font-semibold text-bone/72">{index + 1}</span>
                <div>
                  <p className="font-semibold text-bone">{activity.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone/40">{messages.activities[activity.type].label}</p>
                </div>
              </div>
            </button>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-bone/10 pt-3">
              <Button type="button" variant="ghost" className="min-h-9 px-3" disabled={index === 0} onClick={() => onMove(activity.id, -1)} title={messages.builder.moveUp}>
                <ArrowUp size={15} />
              </Button>
              <Button type="button" variant="ghost" className="min-h-9 px-3" disabled={index === activities.length - 1} onClick={() => onMove(activity.id, 1)} title={messages.builder.moveDown}>
                <ArrowDown size={15} />
              </Button>
              <Button type="button" variant="danger" className="ms-auto min-h-9 px-3" onClick={() => onRemove(activity.id)} title={messages.common.remove}>
                <Trash2 size={15} />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
