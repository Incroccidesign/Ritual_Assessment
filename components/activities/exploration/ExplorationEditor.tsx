"use client";

import { Plus, Trash2 } from "lucide-react";
import { ElementType, ExplorationActivity, ExplorationResponseMode } from "@/types/activity";
import { Button, Field, inputClass, selectClass, SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";

const elementTypes: ElementType[] = ["problems", "objectives", "criticalities", "barriers", "opportunities", "other"];
const responseModes: ExplorationResponseMode[] = ["closed_list", "open_list", "free_input"];

export function ExplorationEditor({
  activity,
  onChange
}: {
  activity: ExplorationActivity;
  onChange: (activity: ExplorationActivity) => void;
}) {
  const { messages } = useLocale();

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={messages.activities.exploration.elementType}>
          <select
            className={selectClass}
            value={activity.itemType}
            onChange={(event) => onChange({ ...activity, itemType: event.target.value as ElementType })}
          >
            {elementTypes.map((type) => (
              <option key={type} value={type}>{messages.activityTypes[type]}</option>
            ))}
          </select>
        </Field>
        <Field label={messages.activities.exploration.responseMode}>
          <select
            className={selectClass}
            value={activity.responseMode}
            onChange={(event) => {
              const responseMode = event.target.value as ExplorationResponseMode;
              onChange({ ...activity, responseMode, allowOther: responseMode === "free_input" ? false : activity.allowOther });
            }}
          >
            {responseModes.map((mode) => (
              <option key={mode} value={mode}>{messages.activityTypes[mode]}</option>
            ))}
          </select>
        </Field>
      </div>
      {activity.responseMode !== "free_input" ? (
        <SubtlePanel className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">{messages.activities.exploration.options}</p>
          <div className="space-y-3">
            {activity.options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className={inputClass}
                  value={option}
                  onChange={(event) => {
                    const next = [...activity.options];
                    next[index] = event.target.value;
                    onChange({ ...activity, options: next });
                  }}
                />
                <Button
                  type="button"
                  variant="danger"
                  className="px-3"
                  onClick={() => onChange({ ...activity, options: activity.options.filter((_, itemIndex) => itemIndex !== index) })}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" onClick={() => onChange({ ...activity, options: [...activity.options, ""] })}>
            <Plus size={16} /> {messages.activities.exploration.addOption}
          </Button>
          <label className="block rounded-md border border-bone/10 bg-night/40 p-4">
            <span className="flex items-start gap-3 text-sm font-medium text-bone">
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(activity.allowOther)}
                onChange={(event) => onChange({ ...activity, allowOther: event.target.checked })}
              />
              <span>
                <span className="block">{messages.otherOption.allowLabel}</span>
                <span className="mt-1 block text-sm font-normal leading-5 text-bone/52">{messages.otherOption.allowHelper}</span>
              </span>
            </span>
          </label>
        </SubtlePanel>
      ) : null}
    </div>
  );
}
