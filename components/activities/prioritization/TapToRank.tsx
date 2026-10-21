"use client";

import { X } from "lucide-react";
import { ExplorationItem, PrioritizationAnswer } from "@/types/activity";
import { Button } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

export function TapToRank({
  items,
  answer,
  onChange
}: {
  items: ExplorationItem[];
  answer: PrioritizationAnswer;
  onChange: (answer: PrioritizationAnswer) => void;
}) {
  const { messages } = useLocale();
  const rankedIds = new Set(answer.rankedItems.map((item) => item.sourceItemId));
  const available = items.filter((item) => !rankedIds.has(item.id));

  function add(item: ExplorationItem) {
    onChange({
      rankedItems: [
        ...answer.rankedItems,
        { sourceItemId: item.id, label: item.label, rank: answer.rankedItems.length + 1, groupId: item.groupId, groupLabel: item.groupLabel }
      ]
    });
  }

  function remove(sourceItemId: string) {
    onChange({
      rankedItems: answer.rankedItems
        .filter((item) => item.sourceItemId !== sourceItemId)
        .map((item, index) => ({ ...item, rank: index + 1 }))
    });
  }

  return (
    <div className="space-y-8">
      {available.length ? (
        <section>
          <p className="mb-3 text-sm font-medium text-bone/60">{messages.activities.prioritization.tapInstruction}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => add(item)}
                className="min-h-20 rounded-md border border-bone/12 bg-night/35 p-4 text-left text-base font-medium leading-6 text-bone/76 transition hover:border-bone/35 hover:text-bone"
              >
                {item.detail ? <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-bone/46">{item.detail}</span> : null}
                <span className="block">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <section className={available.length ? "border-t border-bone/10 pt-5" : ""}>
        <div className="flex items-center justify-between gap-4">
          <p className="font-heading text-xl font-semibold text-bone">{messages.activities.prioritization.ranking}</p>
          <Button type="button" variant="ghost" onClick={() => onChange({ rankedItems: [] })}>
            {messages.activities.prioritization.clearRanking}
          </Button>
        </div>
        <ol className="mt-4 space-y-2">
          {answer.rankedItems.map((item) => (
            <li key={item.sourceItemId} className="flex items-center gap-3 rounded-md border border-bone/12 bg-night/35 px-3 py-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-mint text-sm font-semibold text-night">{item.rank}</span>
              <span className="flex-1 text-bone">{item.label}</span>
              <button type="button" onClick={() => remove(item.sourceItemId)} className="text-bone/50 hover:text-orange">
                <X size={16} />
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
