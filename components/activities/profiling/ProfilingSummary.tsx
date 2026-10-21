"use client";

import { ProfilingActivity, ProfilingAnswer } from "@/types/activity";
import { displayProfilingAnswer } from "@/lib/activities/otherOption";
import { useLocale } from "@/lib/i18n/useLocale";

export function ProfilingSummary({ activity, answer }: { activity: ProfilingActivity; answer: ProfilingAnswer }) {
  const { messages } = useLocale();

  return (
    <dl className="divide-y divide-bone/10">
        {activity.fields.map((field) => (
          <div key={field.id} className="py-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-bone/38">{field.label}</dt>
            <dd className="mt-1 text-bone/78">{displayProfilingAnswer(field, answer, messages.common.empty)}</dd>
          </div>
        ))}
    </dl>
  );
}
