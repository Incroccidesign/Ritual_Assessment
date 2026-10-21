"use client";

import { PrioritizationAnswer } from "@/types/activity";
import { useLocale } from "@/lib/i18n/useLocale";

export function PrioritizationSummary({ answer }: { answer: PrioritizationAnswer }) {
  const { messages } = useLocale();

  return (
    <div className="py-4">
      <p className="text-sm font-medium text-bone/60">{messages.activities.prioritization.ranking}</p>
      <ol className="mt-3 divide-y divide-bone/10 border-y border-bone/10">
        {answer.rankedItems.map((item) => (
          <li key={item.sourceItemId} className="flex items-center gap-3 py-3">
            <span className="text-bone/48">{item.rank}.</span>
            <span className="text-bone/78">{item.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
