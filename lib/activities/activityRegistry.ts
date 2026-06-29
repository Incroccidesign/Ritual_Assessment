import { ComponentType } from "react";
import { Activity, ActivityAnswer, ActivityType } from "@/types/activity";
import { ExplorationEditor } from "@/components/activities/exploration/ExplorationEditor";
import { ExplorationParticipant } from "@/components/activities/exploration/ExplorationParticipant";
import { ExplorationSummary } from "@/components/activities/exploration/ExplorationSummary";
import { FramingEditor } from "@/components/activities/framing/FramingEditor";
import { FramingParticipant } from "@/components/activities/framing/FramingParticipant";
import { FramingSummary } from "@/components/activities/framing/FramingSummary";
import { PlanningReportEditor } from "@/components/activities/planning-report/PlanningReportEditor";
import { PlanningReportParticipant } from "@/components/activities/planning-report/PlanningReportParticipant";
import { PlanningReportSummary } from "@/components/activities/planning-report/PlanningReportSummary";
import { PrioritizationEditor } from "@/components/activities/prioritization/PrioritizationEditor";
import { PrioritizationParticipant } from "@/components/activities/prioritization/PrioritizationParticipant";
import { PrioritizationSummary } from "@/components/activities/prioritization/PrioritizationSummary";
import { ProfilingEditor } from "@/components/activities/profiling/ProfilingEditor";
import { ProfilingParticipant } from "@/components/activities/profiling/ProfilingParticipant";
import { ProfilingSummary } from "@/components/activities/profiling/ProfilingSummary";
import { activityDependencyRequirements } from "@/lib/activities/activityTypes";
import { validateActivityConfig, validateActivityResponse } from "@/lib/activities/validation";

type RegistryEntry = {
  type: ActivityType;
  labelKey: ActivityType;
  editor: ComponentType<any>;
  participant: ComponentType<any>;
  summary: ComponentType<any>;
  validateConfig: (activity: Activity) => boolean;
  validateResponse: (activity: Activity, answer: ActivityAnswer) => boolean;
  dependency: { sourceType: ActivityType | null };
};

export const activityRegistry: Record<ActivityType, RegistryEntry> = {
  profiling: {
    type: "profiling",
    labelKey: "profiling",
    editor: ProfilingEditor,
    participant: ProfilingParticipant,
    summary: ProfilingSummary,
    validateConfig: validateActivityConfig,
    validateResponse: validateActivityResponse,
    dependency: activityDependencyRequirements.profiling
  },
  exploration: {
    type: "exploration",
    labelKey: "exploration",
    editor: ExplorationEditor,
    participant: ExplorationParticipant,
    summary: ExplorationSummary,
    validateConfig: validateActivityConfig,
    validateResponse: validateActivityResponse,
    dependency: activityDependencyRequirements.exploration
  },
  prioritization: {
    type: "prioritization",
    labelKey: "prioritization",
    editor: PrioritizationEditor,
    participant: PrioritizationParticipant,
    summary: PrioritizationSummary,
    validateConfig: validateActivityConfig,
    validateResponse: validateActivityResponse,
    dependency: activityDependencyRequirements.prioritization
  },
  framing: {
    type: "framing",
    labelKey: "framing",
    editor: FramingEditor,
    participant: FramingParticipant,
    summary: FramingSummary,
    validateConfig: validateActivityConfig,
    validateResponse: validateActivityResponse,
    dependency: activityDependencyRequirements.framing
  },
  planning_report: {
    type: "planning_report",
    labelKey: "planning_report",
    editor: PlanningReportEditor,
    participant: PlanningReportParticipant,
    summary: PlanningReportSummary,
    validateConfig: validateActivityConfig,
    validateResponse: validateActivityResponse,
    dependency: activityDependencyRequirements.planning_report
  }
};
