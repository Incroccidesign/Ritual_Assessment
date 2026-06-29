"use client";

import { PrioritizationActivity, Activity } from "@/types/activity";
import { Field, selectClass, SubtlePanel } from "@/components/ritual-ui";
import { previousExplorationActivities } from "@/lib/activities/dependencies";
import { useLocale } from "@/lib/i18n/useLocale";

export function PrioritizationEditor({
  activity,
  activities,
  onChange
}: {
  activity: PrioritizationActivity;
  activities: Activity[];
  onChange: (activity: PrioritizationActivity) => void;
}) {
  const { messages } = useLocale();
  const sources = previousExplorationActivities(activities, activity.orderIndex);

  return (
    <SubtlePanel>
      <Field label={messages.activities.prioritization.sourceActivity}>
        <select
          className={selectClass}
          value={activity.sourceActivityId}
          onChange={(event) => onChange({ ...activity, sourceActivityId: event.target.value })}
        >
          <option value="">{messages.common.empty}</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>{source.title}</option>
          ))}
        </select>
      </Field>
    </SubtlePanel>
  );
}
