"use client";

import { ProfilingActivity, ProfilingAnswer } from "@/types/activity";
import { Minus, Plus } from "lucide-react";
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

  function stepNumber(fieldId: string, value: string, direction: -1 | 1) {
    const current = Number(value);
    const next = Number.isFinite(current) ? current + direction : direction;
    updateField(fieldId, String(next));
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
            ) : field.fieldType === "number" ? (
              <div className="relative">
                <input
                  className={`${inputClass} appearance-none pr-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  type="number"
                  value={value}
                  required={field.required}
                  onChange={(event) => updateField(field.id, event.target.value)}
                />
                <div className="absolute inset-y-1 right-1 flex overflow-hidden rounded border border-bone/12 bg-bone/[0.045]">
                  <button
                    type="button"
                    className="grid w-10 place-items-center text-bone/60 transition hover:bg-bone/10 hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
                    aria-label={`Decrease ${field.label}`}
                    onClick={() => stepNumber(field.id, value, -1)}
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="grid w-10 border-l border-bone/12 place-items-center text-bone/60 transition hover:bg-bone/10 hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
                    aria-label={`Increase ${field.label}`}
                    onClick={() => stepNumber(field.id, value, 1)}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <input
                className={inputClass}
                type={field.fieldType === "email" ? "email" : "text"}
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
