import { Assessment } from "@/types/assessment";
import { Participant } from "@/types/participant";
import { AssessmentResponse } from "@/types/response";
import type { Messages } from "@/lib/i18n/getMessages";
import { displayProfilingAnswer, OTHER_OPTION_VALUE } from "@/lib/activities/otherOption";
import { safeFilename } from "@/lib/utils/text";

export async function exportAssessmentExcel(assessment: Assessment, participants: Participant[], responses: AssessmentResponse[], messages: Messages) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const participantsRows = participants.map((participant) => ({
    id: participant.id,
    status: participant.status,
    company_name: participant.companyName ?? "",
    contact_email: participant.contactEmail ?? "",
    started_at: participant.startedAt ?? "",
    submitted_at: participant.submittedAt ?? ""
  }));

  const activitiesRows = assessment.activities.map((activity) => ({
    id: activity.id,
    order: activity.orderIndex + 1,
    type: activity.type,
    title: activity.title,
    prompt: activity.prompt,
    config_json: JSON.stringify(activity)
  }));

  const profilingRows = responses.flatMap((response) =>
    response.activityResponses
      .filter((item) => item.activityType === "profiling" && "fields" in item.answer)
      .flatMap((item) => {
        const activity = assessment.activities.find((candidate) => candidate.id === item.activityId);
        if (!activity || activity.type !== "profiling" || !("fields" in item.answer)) return [];
        const answer = item.answer;
        return activity.fields.map((field) => {
          const selectedValue = answer.fields[field.id] ?? "";
          const otherResponse = selectedValue === OTHER_OPTION_VALUE ? answer.otherText?.[field.id]?.trim() ?? "" : "";
          return {
            response_id: response.id,
            participant_id: response.participantId,
            activity_id: item.activityId,
            question: field.label,
            selected_option: displayProfilingAnswer(field, answer, ""),
            other_response: otherResponse
          };
        });
      })
  );

  const explorationRows = responses.flatMap((response) =>
    response.activityResponses
      .filter((item) => item.activityType === "exploration" && "items" in item.answer)
      .flatMap((item) =>
        "items" in item.answer
          ? item.answer.items.map((selected) => ({
              response_id: response.id,
              participant_id: response.participantId,
              activity_id: item.activityId,
              question: assessment.activities.find((activity) => activity.id === item.activityId)?.title ?? "",
              label: selected.label,
              source: selected.source,
              selected_options: selected.source !== "predefined" ? OTHER_OPTION_VALUE : selected.label,
              other_response: selected.source !== "predefined" ? selected.label : ""
            }))
          : []
      )
  );

  const prioritizationRows = responses.flatMap((response) =>
    response.activityResponses
      .filter((item) => item.activityType === "prioritization" && "rankedItems" in item.answer)
      .flatMap((item) =>
        "rankedItems" in item.answer
          ? item.answer.rankedItems.map((ranked) => ({
              response_id: response.id,
              participant_id: response.participantId,
              activity_id: item.activityId,
              label: ranked.label,
              rank: ranked.rank
            }))
          : []
      )
  );

  const framingRows = responses.flatMap((response) =>
    response.activityResponses
      .filter((item) => item.activityType === "framing" && "answer" in item.answer)
      .map((item) =>
        "answer" in item.answer
          ? {
              response_id: response.id,
              participant_id: response.participantId,
              activity_id: item.activityId,
              source_ranking: item.answer.sourceRanking.join(" | "),
              answer: item.answer.answer
            }
          : {}
      )
  );

  const rawRows = responses.map((response) => ({
    id: response.id,
    participant_id: response.participantId,
    status: response.status,
    submitted_at: response.submittedAt ?? "",
    answer_json: JSON.stringify(response.activityResponses)
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(participantsRows), "participants");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activitiesRows), "activities");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(profilingRows), "profiling");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(explorationRows), "exploration");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(prioritizationRows), "prioritization");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(framingRows), "framing");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawRows), "raw_json");

  XLSX.writeFileXLSX(workbook, `${safeFilename(assessment.title)}-report.xlsx`);
}
