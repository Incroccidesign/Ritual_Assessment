import { Activity, ActivityAnswer } from "@/types/activity";
import { cleanOtherText, isOtherOptionValue, OTHER_OPTION_VALUE } from "@/lib/activities/otherOption";

export function validateActivityConfig(activity: Activity) {
  if (!activity.title.trim() || !activity.prompt.trim()) return false;
  if (activity.type === "profiling") return activity.fields.length > 0;
  if (activity.type === "exploration") {
    return activity.responseMode === "free_input" || activity.options.some((option) => option.trim().length > 0);
  }
  if (activity.type === "prioritization") return Boolean(activity.sourceActivityId);
  if (activity.type === "framing") {
    return activity.maxLength > 0 && activity.questions.some((question) => question.prompt.trim());
  }
  if (activity.type === "planning_report") {
    return Boolean(activity.reportTitle.trim()) && activity.sections.some((section) => section.visible && section.title.trim());
  }
  return false;
}

export function validateActivityResponse(activity: Activity, answer: ActivityAnswer) {
  if (activity.type === "profiling") {
    return "fields" in answer && activity.fields.every((field) => {
      const value = answer.fields[field.id];
      if (field.allowOther && isOtherOptionValue(value)) return Boolean(cleanOtherText(answer.otherText?.[field.id]));
      return !field.required || Boolean(value?.trim());
    });
  }
  if (activity.type === "exploration") {
    if (!("items" in answer) || answer.items.length === 0) return false;
    if (activity.maxSelections && answer.items.length > activity.maxSelections) return false;
    const otherItem = answer.items.find((item) => item.source === "other" || item.value === OTHER_OPTION_VALUE);
    if (!otherItem) return true;
    return answer.otherText !== undefined ? Boolean(cleanOtherText(answer.otherText)) : Boolean(cleanOtherText(otherItem.label));
  }
  if (activity.type === "prioritization") return "rankedItems" in answer && answer.rankedItems.length > 0;
  if (activity.type === "framing" && "answer" in answer) {
    if (!activity.questions.length) return answer.answer.trim().length > 0;
    if (!answer.questionAnswers && answer.answer.trim()) return true;
    return activity.questions.every((question) => question.required === false || Boolean(answer.questionAnswers?.[question.id]?.trim()));
  }
  if (activity.type === "planning_report") return true;
  return false;
}
