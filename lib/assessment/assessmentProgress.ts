import { Assessment } from "@/types/assessment";
import { AssessmentResponse } from "@/types/response";

export function completedActivityCount(assessment: Assessment, response: AssessmentResponse | null) {
  if (!response) return 0;
  return assessment.activities.filter((activity) =>
    response.activityResponses.some((activityResponse) => activityResponse.activityId === activity.id)
  ).length;
}

export function assessmentProgressLabel(assessment: Assessment, response: AssessmentResponse | null) {
  return `${completedActivityCount(assessment, response)} / ${assessment.activities.length}`;
}
