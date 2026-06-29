"use client";

import { ProfilingActivity, ProfilingAnswer } from "@/types/activity";
import { SubtlePanel } from "@/components/ritual-ui";
import { displayProfilingAnswer } from "@/lib/activities/otherOption";
import { useLocale } from "@/lib/i18n/useLocale";

export function ProfilingSummary({ activity, answer }: { activity: ProfilingActivity; answer: ProfilingAnswer }) {
  const { messages } = useLocale();

  return (
    <SubtlePanel>
      <p className="font-heading text-2xl font-semibold text-bone">{messages.activities.profiling.summary}</p>
      <dl className="mt-4 space-y-3">
        {activity.fields.map((field) => (
          <div key={field.id} className="border-t border-bone/10 pt-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-bone/38">{field.label}</dt>
            <dd className="mt-1 text-bone/78">{displayProfilingAnswer(field, answer, messages.common.empty)}</dd>
          </div>
        ))}
      </dl>
    </SubtlePanel>
  );
}
