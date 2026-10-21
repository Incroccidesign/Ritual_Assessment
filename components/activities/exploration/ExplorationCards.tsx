"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { ExplorationActivity, ExplorationAnswer, ExplorationItem } from "@/types/activity";
import { Button, inputClass } from "@/components/ritual-ui";
import { groupedExplorationOptions } from "@/lib/activities/explorationOptionGroups";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";
import { cleanText } from "@/lib/utils/text";
import { uid } from "@/lib/utils/ids";

export function ExplorationCards({
  activity,
  answer,
  onChange
}: {
  activity: ExplorationActivity;
  answer: ExplorationAnswer;
  onChange: (answer: ExplorationAnswer) => void;
}) {
  const { messages } = useLocale();
  const [customValue, setCustomValue] = useState("");
  const canAddCustom = activity.responseMode === "free_input" || (activity.responseMode !== "closed_list" && Boolean(activity.allowOther));
  const predefinedGroups = groupedExplorationOptions(activity);

  function isSelected(label: string) {
    return answer.items.some((item) => item.label === label);
  }

  function toggleItem(item: ExplorationItem) {
    const exists = isSelected(item.label);
    const maxSelections = activity.maxSelections;
    const nextItems = exists
      ? answer.items.filter((current) => current.label !== item.label)
      : maxSelections === 1
        ? [item]
        : [...answer.items, item];
    onChange({
      items: nextItems,
      otherText: answer.otherText
    });
  }

  function addCustom() {
    const label = cleanText(customValue);
    if (!label || isSelected(label)) return;
    const item = { id: uid("item"), label, source: "custom" as const };
    onChange({ items: activity.maxSelections === 1 ? [item] : [...answer.items, item], otherText: answer.otherText });
    setCustomValue("");
  }

  return (
    <div className="space-y-6">
      {activity.responseMode !== "free_input" ? (
        <div className="space-y-7">
          {predefinedGroups.map(({ group, options }) => (
            <div key={group?.id ?? "ungrouped"}>
              {group ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-bone/46">{group.label}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((item) => {
                  const selected = isSelected(item.label);
                  const answerItem = {
                    id: item.id,
                    label: item.label,
                    source: "predefined" as const,
                    value: item.label,
                    groupId: item.groupId,
                    groupLabel: item.groupLabel
                  };
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(answerItem)}
                      className={cn(
                        "min-h-20 rounded-md border p-4 text-left transition",
                        selected ? "border-mint bg-mint/[0.08] text-bone" : "border-bone/12 bg-night/35 text-bone/76 hover:border-bone/35 hover:text-bone"
                      )}
                    >
                      <span className="block text-base font-semibold leading-6">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {canAddCustom ? (
        <div className="flex gap-2 border-t border-bone/10 pt-4">
          <div className="flex flex-1 gap-2">
            <input
              className={inputClass}
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
              placeholder={messages.otherOption.placeholder}
            />
            <Button type="button" variant="secondary" onClick={addCustom}>
              <Plus size={16} />
            </Button>
          </div>
        </div>
      ) : null}

      {answer.items.length ? (
        <div className="border-t border-bone/10 pt-4">
          <p className="text-sm text-bone/52">{messages.activities.exploration.selectedSummary.replace("{count}", String(answer.items.length))}</p>
          <div className="mt-2 flex flex-wrap gap-2">
          {answer.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onChange({
                  items: answer.items.filter((current) => current.id !== item.id),
                  otherText: answer.otherText
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-bone/15 px-3 py-2 text-sm text-bone/76 hover:border-bone/30"
            >
              {item.label} <X size={14} />
            </button>
          ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
