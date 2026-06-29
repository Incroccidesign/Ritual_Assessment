import { Assessment } from "@/types/assessment";
import {
  Activity,
  ActivityAnswer,
  ExplorationAnswer,
  FramingActivity,
  FramingAnswer,
  PlanningReportActivity,
  PrioritizationAnswer,
  ProfilingActivity,
  ProfilingAnswer
} from "@/types/activity";
import { AssessmentResponse } from "@/types/response";
import type { Messages } from "@/lib/i18n/getMessages";
import { displayProfilingAnswer } from "@/lib/activities/otherOption";

export type PlanningReportField = {
  label: string;
  value: string;
};

export type PlanningReportActivityBlock = {
  id: string;
  title: string;
  activityType: Activity["type"];
  fields: PlanningReportField[];
  values: string[];
};

export type PlanningReportSectionModel = {
  key: string;
  title: string;
  visible: boolean;
  blocks: PlanningReportActivityBlock[];
};

export type PlanningReportModel = {
  title: string;
  subtitle: string;
  sections: PlanningReportSectionModel[];
  emptyText: string;
};

function answerFor(response: AssessmentResponse, activityId: string): ActivityAnswer | null {
  return response.activityResponses.find((item) => item.activityId === activityId)?.answer ?? null;
}

function isProfilingAnswer(answer: ActivityAnswer | null): answer is ProfilingAnswer {
  return Boolean(answer && "fields" in answer);
}

function isExplorationAnswer(answer: ActivityAnswer | null): answer is ExplorationAnswer {
  return Boolean(answer && "items" in answer);
}

function isPrioritizationAnswer(answer: ActivityAnswer | null): answer is PrioritizationAnswer {
  return Boolean(answer && "rankedItems" in answer);
}

function isFramingAnswer(answer: ActivityAnswer | null): answer is FramingAnswer {
  return Boolean(answer && "answer" in answer);
}

function profilingBlock(activity: ProfilingActivity, answer: ProfilingAnswer): Pick<PlanningReportActivityBlock, "fields" | "values"> {
  return {
    values: [],
    fields: activity.fields.map((field) => ({
      label: field.label,
      value: displayProfilingAnswer(field, answer, "")
    }))
  };
}

function explorationBlock(answer: ExplorationAnswer): Pick<PlanningReportActivityBlock, "fields" | "values"> {
  return {
    fields: [],
    values: answer.items.map((item) => item.label)
  };
}

function prioritizationBlock(answer: PrioritizationAnswer): Pick<PlanningReportActivityBlock, "fields" | "values"> {
  return {
    fields: [],
    values: answer.rankedItems
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((item) => `${item.rank}. ${item.label}`)
  };
}

function framingBlock(activity: FramingActivity, answer: FramingAnswer): Pick<PlanningReportActivityBlock, "fields" | "values"> {
  if (answer.questionAnswers) {
    return {
      values: [],
      fields: activity.questions.map((question) => ({
        label: question.title,
        value: answer.questionAnswers?.[question.id]?.trim() ?? ""
      }))
    };
  }

  return {
    fields: [],
    values: answer.answer.trim() ? [answer.answer.trim()] : []
  };
}

function blockForActivity(activity: Activity, answer: ActivityAnswer | null, title: string): PlanningReportActivityBlock | null {
  if (activity.type === "planning_report") return null;
  if (activity.type === "profiling" && isProfilingAnswer(answer)) {
    return { id: activity.id, title, activityType: activity.type, ...profilingBlock(activity, answer) };
  }
  if (activity.type === "exploration" && isExplorationAnswer(answer)) {
    return { id: activity.id, title, activityType: activity.type, ...explorationBlock(answer) };
  }
  if (activity.type === "prioritization" && isPrioritizationAnswer(answer)) {
    return { id: activity.id, title, activityType: activity.type, ...prioritizationBlock(answer) };
  }
  if (activity.type === "framing" && isFramingAnswer(answer)) {
    return { id: activity.id, title, activityType: activity.type, ...framingBlock(activity, answer) };
  }
  return {
    id: activity.id,
    title,
    activityType: activity.type,
    fields: [],
    values: []
  };
}

function fallbackSections(assessment: Assessment, activity: PlanningReportActivity, defaultSectionTitle: string) {
  if (activity.sections.some((section) => (section.items ?? []).length > 0)) return activity.sections;
  return [
    {
      key: "assessment-responses",
      title: defaultSectionTitle,
      visible: true,
      items: assessment.activities
        .filter((candidate) => candidate.id !== activity.id && candidate.type !== "planning_report")
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((candidate) => ({
          id: candidate.id,
          activityId: candidate.id,
          title: candidate.title,
          visible: true
        }))
    }
  ];
}

export function generatePlanningReportModel(
  assessment: Assessment,
  response: AssessmentResponse,
  activity: PlanningReportActivity,
  messages: Messages
): PlanningReportModel {
  const activityById = new Map(assessment.activities.map((candidate) => [candidate.id, candidate]));
  const sections = fallbackSections(assessment, activity, messages.planningReport.builder.defaultSection)
    .filter((section) => section.visible)
    .map((section) => ({
      key: section.key,
      title: section.title,
      visible: section.visible,
      blocks: (section.items ?? [])
        .filter((item) => item.visible)
        .map((item) => {
          const sourceActivity = activityById.get(item.activityId);
          if (!sourceActivity) return null;
          return blockForActivity(sourceActivity, answerFor(response, sourceActivity.id), item.title || sourceActivity.title);
        })
        .filter((block): block is PlanningReportActivityBlock => Boolean(block))
    }))
    .filter((section) => section.blocks.length > 0);

  return {
    title: activity.reportTitle,
    subtitle: activity.reportSubtitle,
    sections,
    emptyText: messages.planningReport.empty
  };
}
