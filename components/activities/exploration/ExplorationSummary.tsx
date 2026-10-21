"use client";

import { ExplorationAnswer } from "@/types/activity";
import { useLocale } from "@/lib/i18n/useLocale";

export function ExplorationSummary({ answer }: { answer: ExplorationAnswer }) {
  const { messages } = useLocale();

  return (
    <div className="py-4">
      <p className="text-sm font-medium text-bone/60">
        {messages.activities.exploration.selectedSummary.replace("{count}", String(answer.items.length))}
      </p>
      <ul className="mt-3 divide-y divide-bone/10 border-y border-bone/10">
        {answer.items.map((item) => (
          <li key={item.id} className="py-3 text-sm leading-6 text-bone/78">
            {item.source === "other" ? `${messages.otherOption.resultsLabel}: ${answer.otherText?.trim() || item.label}` : item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
