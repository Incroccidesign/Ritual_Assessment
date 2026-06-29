import { Activity } from "@/types/activity";
import { AssessmentResponse } from "@/types/response";

export function previousExplorationActivities(activities: Activity[], orderIndex: number) {
  return activities.filter((activity) => activity.type === "exploration" && activity.orderIndex < orderIndex);
}

export function previousPrioritizationActivities(activities: Activity[], orderIndex: number) {
  return activities.filter((activity) => activity.type === "prioritization" && activity.orderIndex < orderIndex);
}

export function getExplorationItems(sourceActivityId: string, response: AssessmentResponse | null) {
  const answer = response?.activityResponses.find((item) => item.activityId === sourceActivityId)?.answer;
  if (!answer || !("items" in answer)) return [];
  return answer.items;
}

export function getRankingContext(sourceActivityId: string, response: AssessmentResponse | null) {
  const answer = response?.activityResponses.find((item) => item.activityId === sourceActivityId)?.answer;
  if (!answer || !("rankedItems" in answer)) return [];
  return [...answer.rankedItems].sort((a, b) => a.rank - b.rank);
}
