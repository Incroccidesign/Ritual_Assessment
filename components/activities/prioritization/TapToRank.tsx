"use client";

import { X } from "lucide-react";
import { ExplorationItem, PrioritizationAnswer } from "@/types/activity";
import { Button, SubtlePanel } from "@/components/ritual-ui";
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
    <div className="space-y-5">
      <p className="text-sm font-medium text-bone/62">{messages.activities.prioritization.tapInstruction}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {available.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => add(item)}
            className="min-h-20 rounded-lg border border-bone/10 bg-night/55 p-4 text-left text-base font-semibold leading-6 text-bone/78 transition hover:border-mint hover:text-bone"
          >
            {item.label}
          </button>
        ))}
      </div>
      <SubtlePanel>
        <div className="flex items-center justify-between gap-4">
          <p className="font-heading text-2xl font-semibold text-bone">{messages.activities.prioritization.ranking}</p>
          <Button type="button" variant="ghost" onClick={() => onChange({ rankedItems: [] })}>
            {messages.activities.prioritization.clearRanking}
          </Button>
        </div>
        <ol className="mt-4 space-y-2">
          {answer.rankedItems.map((item) => (
            <li key={item.sourceItemId} className="flex items-center gap-3 rounded-md border border-mint/20 bg-mint/10 px-4 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-sm font-semibold text-night">{item.rank}</span>
              <span className="flex-1 text-bone">{item.label}</span>
              <button type="button" onClick={() => remove(item.sourceItemId)} className="text-bone/50 hover:text-orange">
                <X size={16} />
              </button>
            </li>
          ))}
        </ol>
      </SubtlePanel>
    </div>
  );
}
