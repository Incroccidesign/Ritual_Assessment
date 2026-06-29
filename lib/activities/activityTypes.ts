import { ActivityType } from "@/types/activity";

export const activityTypes: ActivityType[] = ["profiling", "exploration", "prioritization", "framing", "planning_report"];

export const activityDependencyRequirements: Record<ActivityType, { sourceType: ActivityType | null }> = {
  profiling: { sourceType: null },
  exploration: { sourceType: null },
  prioritization: { sourceType: "exploration" },
  framing: { sourceType: "prioritization" },
  planning_report: { sourceType: null }
};
