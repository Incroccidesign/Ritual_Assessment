import { Assessment } from "@/types/assessment";
import type { Locale } from "@/types/locale";
import { defaultLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/getMessages";
import { nowIso } from "@/lib/utils/dates";
import { uid } from "@/lib/utils/ids";

const profilingId = "activity_profile_demo";
const explorationId = "activity_explore_demo";
const prioritizationId = "activity_prioritize_demo";
const framingId = "activity_frame_demo";

export function demoAssessment(locale: Locale = defaultLocale): Assessment {
  const timestamp = nowIso();
  const messages = getMessages(locale);
  const preset = messages.presets;
  return {
    id: uid("assessment"),
    title: preset.assessment.demoTitle,
    description: preset.assessment.demoDescription,
    language: locale,
    status: "draft",
    activities: [
      {
        id: profilingId,
        type: "profiling",
        title: preset.activities.profiling.title,
        prompt: preset.activities.profiling.prompt,
        orderIndex: 0,
        fields: [
          { id: "field_company", label: preset.activities.profiling.organizationName, fieldType: "text", required: true },
          { id: "field_sector", label: preset.activities.profiling.sector, fieldType: "text", required: false },
          { id: "field_country", label: preset.activities.profiling.country, fieldType: "country", required: false },
          { id: "field_role", label: preset.activities.profiling.respondentRole, fieldType: "text", required: false }
        ]
      },
      {
        id: explorationId,
        type: "exploration",
        title: preset.activities.exploration.title,
        prompt: preset.activities.exploration.prompt,
        orderIndex: 1,
        itemType: "problems",
        responseMode: "open_list",
        options: [
          preset.activities.exploration.energyCosts,
          preset.activities.exploration.staffTurnover,
          preset.activities.exploration.trainingNeeds,
          preset.activities.exploration.digitalizationGaps
        ]
      },
      {
        id: prioritizationId,
        type: "prioritization",
        title: preset.activities.prioritization.title,
        prompt: preset.activities.prioritization.prompt,
        orderIndex: 2,
        sourceActivityId: explorationId
      },
      {
        id: framingId,
        type: "framing",
        title: preset.activities.framing.title,
        prompt: preset.activities.framing.prompt,
        orderIndex: 3,
        sourceActivityId: prioritizationId,
        maxLength: 1500,
        questions: [
          {
            id: "question_frame_demo",
            title: preset.activities.framing.defaultQuestionTitle,
            prompt: preset.activities.framing.defaultQuestionPrompt,
            placeholder: preset.activities.framing.answerPlaceholder
          }
        ]
      }
    ],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
