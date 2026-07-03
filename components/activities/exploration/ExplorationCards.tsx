"use client";

import { Check, Plus, X } from "lucide-react";
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
    <div className="space-y-5">
      {activity.responseMode !== "free_input" ? (
        <div className="space-y-6">
          {predefinedGroups.map(({ group, options }) => (
            <div key={group?.id ?? "ungrouped"} className="space-y-3">
              {group ? <p className="text-sm font-semibold uppercase tracking-[0.16em] text-mint">{group.label}</p> : null}
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
                        "min-h-20 rounded-lg border p-4 text-left transition",
                        selected ? "border-mint bg-mint/12 text-bone" : "border-bone/10 bg-night/55 text-bone/72 hover:border-violet/45"
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-base font-semibold leading-6">{item.label}</span>
                        {selected ? <Check size={18} className="text-mint" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {canAddCustom ? (
        <div className="rounded-lg border border-bone/10 bg-night/45 p-4">
          <div className="flex gap-2">
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
        <div className="flex flex-wrap gap-2">
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
              className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-3 py-2 text-sm text-bone"
            >
              {item.label} <X size={14} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
