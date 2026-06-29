export type ActivityType = "profiling" | "exploration" | "prioritization" | "framing" | "planning_report";

export type ElementType = "problems" | "objectives" | "criticalities" | "barriers" | "opportunities" | "other";

export type ExplorationResponseMode = "closed_list" | "open_list" | "free_input";

export type ProfilingFieldType = "text" | "number" | "email" | "country" | "select";

export type BaseActivity = {
  id: string;
  type: ActivityType;
  title: string;
  prompt: string;
  orderIndex: number;
};

export type ProfilingField = {
  id: string;
  label: string;
  fieldType: ProfilingFieldType;
  required: boolean;
  options?: string[];
  allowOther?: boolean;
};

export type ProfilingActivity = BaseActivity & {
  type: "profiling";
  fields: ProfilingField[];
};

export type ExplorationActivity = BaseActivity & {
  type: "exploration";
  itemType: ElementType;
  responseMode: ExplorationResponseMode;
  options: string[];
  allowOther?: boolean;
  maxSelections?: number;
};

export type PrioritizationActivity = BaseActivity & {
  type: "prioritization";
  sourceActivityId: string;
};

export type FramingActivity = BaseActivity & {
  type: "framing";
  sourceActivityId: string;
  maxLength: number;
  questions: FramingQuestion[];
};

export type FramingQuestion = {
  id: string;
  title: string;
  prompt: string;
  placeholder?: string;
  required?: boolean;
};

export type PlanningReportSectionKey =
  | "header"
  | "organizationSnapshot"
  | "planningOverview"
  | "shortTermPlan"
  | "mediumTermPlan"
  | "longTermPlan"
  | "collaboration"
  | "nextSteps"
  | string;

export type PlanningReportItemConfig = {
  id: string;
  activityId: string;
  title: string;
  visible: boolean;
};

export type PlanningReportSectionConfig = {
  key: PlanningReportSectionKey;
  title: string;
  visible: boolean;
  items?: PlanningReportItemConfig[];
};

export type PlanningReportActivity = BaseActivity & {
  type: "planning_report";
  reportTitle: string;
  reportSubtitle: string;
  sections: PlanningReportSectionConfig[];
};

export type Activity =
  | ProfilingActivity
  | ExplorationActivity
  | PrioritizationActivity
  | FramingActivity
  | PlanningReportActivity;

export type ExplorationItem = {
  id: string;
  label: string;
  source: "predefined" | "custom" | "other";
  value?: string;
};

export type RankedItem = {
  sourceItemId: string;
  label: string;
  rank: number;
};

export type ProfilingAnswer = {
  fields: Record<string, string>;
  otherText?: Record<string, string>;
};

export type ExplorationAnswer = {
  items: ExplorationItem[];
  otherText?: string;
};

export type PrioritizationAnswer = {
  rankedItems: RankedItem[];
};

export type FramingAnswer = {
  sourceRanking: string[];
  answer: string;
  questionAnswers?: Record<string, string>;
};

export type PlanningReportAnswer = {
  viewedAt?: string;
};

export type ActivityAnswer =
  | ProfilingAnswer
  | ExplorationAnswer
  | PrioritizationAnswer
  | FramingAnswer
  | PlanningReportAnswer;
