"use client";

import { Plus, Trash2 } from "lucide-react";
import { ProfilingActivity, ProfilingField, ProfilingFieldType } from "@/types/activity";
import { Button, Field, inputClass, selectClass, SubtlePanel } from "@/components/ritual-ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { uid } from "@/lib/utils/ids";

const fieldTypes: ProfilingFieldType[] = ["text", "number", "email", "country", "select"];

export function ProfilingEditor({
  activity,
  onChange
}: {
  activity: ProfilingActivity;
  onChange: (activity: ProfilingActivity) => void;
}) {
  const { messages } = useLocale();

  function addField() {
    onChange({
      ...activity,
      fields: [...activity.fields, { id: uid("field"), label: "", fieldType: "text", required: false }]
    });
  }

  function updateField(fieldId: string, updater: (field: ProfilingField) => ProfilingField) {
    onChange({
      ...activity,
      fields: activity.fields.map((item) => item.id === fieldId ? updater(item) : item)
    });
  }

  return (
    <div className="space-y-4">
      {activity.fields.map((field) => (
        <SubtlePanel key={field.id} className="space-y-4">
          <Field label={messages.activities.profiling.fieldLabel}>
            <input
              className={inputClass}
              value={field.label}
              onChange={(event) => updateField(field.id, (item) => ({ ...item, label: event.target.value }))}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Field label={messages.activities.profiling.fieldType}>
              <select
                className={selectClass}
                value={field.fieldType}
                onChange={(event) => {
                  const fieldType = event.target.value as ProfilingFieldType;
                  updateField(field.id, (item) => ({ ...item, fieldType, allowOther: fieldType === "select" ? item.allowOther : false }));
                }}
              >
                {fieldTypes.map((type) => (
                  <option key={type} value={type}>
                    {messages.activityTypes[type]}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-end gap-3 pb-3 text-sm font-medium text-bone">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(event) => updateField(field.id, (item) => ({ ...item, required: event.target.checked }))}
              />
              {messages.activities.profiling.required}
            </label>
          </div>
          {field.fieldType === "select" ? (
            <>
              <Field label={messages.activities.exploration.options}>
                <div className="space-y-2">
                  {(field.options ?? []).map((option, optionIndex) => (
                    <div key={`${field.id}-option-${optionIndex}`} className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        className={inputClass}
                        value={option}
                        onChange={(event) =>
                          updateField(field.id, (item) => ({
                            ...item,
                            options: (item.options ?? []).map((currentOption, currentIndex) =>
                              currentIndex === optionIndex ? event.target.value : currentOption
                            )
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() =>
                          updateField(field.id, (item) => ({
                            ...item,
                            options: (item.options ?? []).filter((_, currentIndex) => currentIndex !== optionIndex)
                          }))
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => updateField(field.id, (item) => ({ ...item, options: [...(item.options ?? []), ""] }))}
                  >
                    <Plus size={16} /> {messages.activities.exploration.addOption}
                  </Button>
                </div>
              </Field>
              <label className="block rounded-md border border-bone/10 bg-night/40 p-4">
                <span className="flex items-start gap-3 text-sm font-medium text-bone">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(field.allowOther)}
                    onChange={(event) => updateField(field.id, (item) => ({ ...item, allowOther: event.target.checked }))}
                  />
                  <span>
                    <span className="block">{messages.otherOption.allowLabel}</span>
                    <span className="mt-1 block text-sm font-normal leading-5 text-bone/52">{messages.otherOption.allowHelper}</span>
                  </span>
                </span>
              </label>
            </>
          ) : null}
          <Button
            type="button"
            variant="danger"
            onClick={() => onChange({ ...activity, fields: activity.fields.filter((item) => item.id !== field.id) })}
          >
            <Trash2 size={16} /> {messages.common.remove}
          </Button>
        </SubtlePanel>
      ))}
      <Button type="button" variant="secondary" onClick={addField}>
        <Plus size={16} /> {messages.activities.profiling.addField}
      </Button>
    </div>
  );
}
