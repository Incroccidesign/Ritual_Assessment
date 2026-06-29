import { ProfilingAnswer, ProfilingField } from "@/types/activity";

export const OTHER_OPTION_VALUE = "**other**";

export function isOtherOptionValue(value: string | undefined) {
  return value === OTHER_OPTION_VALUE;
}

export function cleanOtherText(value: string | undefined) {
  return (value ?? "").trim();
}

export function displayProfilingAnswer(field: ProfilingField, answer: ProfilingAnswer, emptyLabel: string) {
  const value = answer.fields[field.id] ?? "";
  if (isOtherOptionValue(value)) return cleanOtherText(answer.otherText?.[field.id]) || emptyLabel;
  return value || emptyLabel;
}
