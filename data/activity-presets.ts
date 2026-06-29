import { Activity, ActivityType, PlanningReportSectionKey } from "@/types/activity";
import type { Locale } from "@/types/locale";
import { defaultLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/getMessages";
import { uid } from "@/lib/utils/ids";

const planningReportSectionKeys: PlanningReportSectionKey[] = [
  "header",
  "organizationSnapshot",
  "planningOverview",
  "shortTermPlan",
  "mediumTermPlan",
  "longTermPlan",
  "collaboration",
  "nextSteps"
];

export function createActivityPreset(type: ActivityType, orderIndex: number, sourceActivityId = "", locale: Locale = defaultLocale): Activity {
  const presetMessages = getMessages(locale).presets.activities;
  const planningReportMessages = getMessages(locale).planningReport;
  const base = {
    id: uid("activity"),
    orderIndex
  };

  if (type === "profiling") {
    return {
      ...base,
      type,
      title: presetMessages.profiling.title,
      prompt: presetMessages.profiling.prompt,
      fields: [
        { id: uid("field"), label: presetMessages.profiling.organizationName, fieldType: "text", required: true },
        { id: uid("field"), label: presetMessages.profiling.sector, fieldType: "text", required: false },
        { id: uid("field"), label: presetMessages.profiling.country, fieldType: "country", required: false },
        { id: uid("field"), label: presetMessages.profiling.respondentRole, fieldType: "text", required: false }
      ]
    };
  }

  if (type === "exploration") {
    return {
      ...base,
      type,
      title: presetMessages.exploration.title,
      prompt: presetMessages.exploration.prompt,
      itemType: "problems",
      responseMode: "open_list",
      allowOther: false,
      options: [
        presetMessages.exploration.energyCosts,
        presetMessages.exploration.staffTurnover,
        presetMessages.exploration.trainingNeeds,
        presetMessages.exploration.digitalizationGaps
      ]
    };
  }

  if (type === "prioritization") {
    return {
      ...base,
      type,
      title: presetMessages.prioritization.title,
      prompt: presetMessages.prioritization.prompt,
      sourceActivityId
    };
  }

  if (type === "planning_report") {
    return {
      ...base,
      type,
      title: planningReportMessages.activity.label,
      prompt: planningReportMessages.participantDescription,
      reportTitle: planningReportMessages.title.default,
      reportSubtitle: planningReportMessages.subtitle.default,
      sections: planningReportSectionKeys.map((key) => ({
        key,
        title: planningReportMessages.sections[key as keyof typeof planningReportMessages.sections],
        visible: true,
        items: []
      }))
    };
  }

  return {
    ...base,
    type,
    title: presetMessages.framing.title,
    prompt: presetMessages.framing.prompt,
    sourceActivityId,
    maxLength: 1500,
    questions: [
      {
        id: uid("question"),
        title: presetMessages.framing.defaultQuestionTitle,
        prompt: presetMessages.framing.defaultQuestionPrompt,
        placeholder: presetMessages.framing.answerPlaceholder
      }
    ]
  };
}
