import { Activity, ActivityAnswer } from "@/types/activity";

export function emptyAnswerForActivity(activity: Activity): ActivityAnswer {
  if (activity.type === "profiling") return { fields: {} };
  if (activity.type === "exploration") return { items: [] };
  if (activity.type === "prioritization") return { rankedItems: [] };
  if (activity.type === "planning_report") return { viewedAt: "" };
  return {
    sourceRanking: [],
    answer: "",
    questionAnswers: Object.fromEntries(activity.questions.map((question) => [question.id, ""]))
  };
}
