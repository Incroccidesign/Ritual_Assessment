"use client";

import { ProfilingActivity, ProfilingAnswer } from "@/types/activity";
import { Field, inputClass, selectClass } from "@/components/ritual-ui";
import { isOtherOptionValue, OTHER_OPTION_VALUE } from "@/lib/activities/otherOption";
import { useLocale } from "@/lib/i18n/useLocale";

export function ProfilingParticipant({
  activity,
  answer,
  onChange
}: {
  activity: ProfilingActivity;
  answer: ProfilingAnswer;
  onChange: (answer: ProfilingAnswer) => void;
}) {
  const { messages } = useLocale();

  function updateField(fieldId: string, value: string) {
    const nextOtherText = { ...(answer.otherText ?? {}) };
    if (!isOtherOptionValue(value)) delete nextOtherText[fieldId];
    onChange({
      fields: { ...answer.fields, [fieldId]: value },
      otherText: nextOtherText
    });
  }

  function updateOtherText(fieldId: string, value: string) {
    onChange({
      fields: { ...answer.fields, [fieldId]: OTHER_OPTION_VALUE },
      otherText: { ...(answer.otherText ?? {}), [fieldId]: value }
    });
  }

  return (
    <div className="space-y-4">
      {activity.fields.map((field) => {
        const value = answer.fields[field.id] ?? "";
        const otherValue = answer.otherText?.[field.id] ?? "";
        const needsOtherText = field.allowOther && isOtherOptionValue(value) && !otherValue.trim();
        return (
          <Field key={field.id} label={field.label}>
            {field.fieldType === "select" && field.options?.length ? (
              <div className="space-y-3">
                <select
                  className={selectClass}
                  value={value}
                  required={field.required}
                  onChange={(event) => updateField(field.id, event.target.value)}
                >
                  <option value="" disabled />
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {field.allowOther ? <option value={OTHER_OPTION_VALUE}>{messages.otherOption.label}</option> : null}
                </select>
                {field.allowOther && isOtherOptionValue(value) ? (
                  <div className="space-y-2">
                    <input
                      className={inputClass}
                      value={otherValue}
                      placeholder={messages.otherOption.placeholder}
                      onChange={(event) => updateOtherText(field.id, event.target.value)}
                    />
                    {needsOtherText ? <p className="text-sm text-orange">{messages.otherOption.validationRequired}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <input
                className={inputClass}
                type={field.fieldType === "email" ? "email" : field.fieldType === "number" ? "number" : "text"}
                value={value}
                required={field.required}
                onChange={(event) => updateField(field.id, event.target.value)}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}
