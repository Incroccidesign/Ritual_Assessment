"use client";

import { PrioritizationAnswer } from "@/types/activity";
import { SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function PrioritizationSummary({ answer }: { answer: PrioritizationAnswer }) {
  const { messages } = useLocale();

  return (
    <SubtlePanel>
      <p className="font-heading text-2xl font-semibold text-bone">{messages.activities.prioritization.ranking}</p>
      <ol className="mt-4 space-y-2">
        {answer.rankedItems.map((item) => (
          <li key={item.sourceItemId} className="flex items-center gap-3 rounded-md border border-bone/10 bg-night/50 px-4 py-3">
            <span className="text-mint">{item.rank}.</span>
            <span className="text-bone/78">{item.label}</span>
          </li>
        ))}
      </ol>
    </SubtlePanel>
  );
}
