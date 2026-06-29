"use client";

import { ExplorationAnswer } from "@/types/activity";
import { SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function ExplorationSummary({ answer }: { answer: ExplorationAnswer }) {
  const { messages } = useLocale();

  return (
    <SubtlePanel>
      <p className="font-heading text-2xl font-semibold text-bone">
        {messages.activities.exploration.selectedSummary.replace("{count}", String(answer.items.length))}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {answer.items.map((item) => (
          <span key={item.id} className="rounded-full border border-bone/10 bg-night/55 px-3 py-2 text-sm text-bone/78">
            {item.source === "other" ? `${messages.otherOption.resultsLabel}: ${answer.otherText?.trim() || item.label}` : item.label}
          </span>
        ))}
      </div>
    </SubtlePanel>
  );
}
