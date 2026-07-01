"use client";

import { Activity } from "@/types/activity";
import { ExplorationEditor } from "@/components/activities/exploration/ExplorationEditor";
import { FramingEditor } from "@/components/activities/framing/FramingEditor";
import { PlanningReportEditor } from "@/components/activities/planning-report/PlanningReportEditor";
import { PrioritizationEditor } from "@/components/activities/prioritization/PrioritizationEditor";
import { ProfilingEditor } from "@/components/activities/profiling/ProfilingEditor";
import { Card, Field, inputClass } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function ActivityEditor({
  activity,
  activities,
  onChange,
  embedded = false
}: {
  activity: Activity | null;
  activities: Activity[];
  onChange: (activity: Activity) => void;
  embedded?: boolean;
}) {
  const { messages } = useLocale();

  if (!activity) {
    return (
      <Card className="grid min-h-80 place-items-center text-center">
        <p className="text-bone/50">{messages.builder.noActivitySelected}</p>
      </Card>
    );
  }

  const content = (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{messages.activities[activity.type].label}</p>
        <p className="mt-2 text-sm leading-6 text-bone/56">{messages.activities[activity.type].purpose}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={messages.builder.titleLabel}>
          <input className={inputClass} value={activity.title} onChange={(event) => onChange({ ...activity, title: event.target.value } as Activity)} />
        </Field>
        <Field label={messages.builder.promptLabel}>
          <input className={inputClass} value={activity.prompt} onChange={(event) => onChange({ ...activity, prompt: event.target.value } as Activity)} />
        </Field>
      </div>
      {activity.type === "profiling" ? <ProfilingEditor activity={activity} onChange={onChange} /> : null}
      {activity.type === "exploration" ? <ExplorationEditor activity={activity} onChange={onChange} /> : null}
      {activity.type === "prioritization" ? <PrioritizationEditor activity={activity} activities={activities} onChange={onChange} /> : null}
      {activity.type === "framing" ? <FramingEditor activity={activity} activities={activities} onChange={onChange} /> : null}
      {activity.type === "planning_report" ? <PlanningReportEditor activity={activity} activities={activities} onChange={onChange} /> : null}
    </div>
  );

  return embedded ? content : <Card className="space-y-6">{content}</Card>;
}
