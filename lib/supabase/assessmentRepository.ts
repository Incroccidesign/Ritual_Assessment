import { Assessment, AssessmentStatus } from "@/types/assessment";
import { Activity, ActivityAnswer, ActivityType, ExplorationOptionGroup, FramingQuestion, PlanningReportItemConfig, PlanningReportSectionConfig } from "@/types/activity";
import { Participant, ParticipantStatus } from "@/types/participant";
import { ActivityResponse, AssessmentResponse, ResponseStatus } from "@/types/response";
import { createActivityPreset } from "@/data/activity-presets";
import {
  AssessmentTemplate,
  AssessmentTemplateActivity,
  nasijSustainabilityAssessmentTemplate
} from "@/data/templates/nasijSustainabilityAssessmentTemplate";
import { generatePublicToken } from "@/lib/assessment/generatePublicToken";
import { getMessages } from "@/lib/i18n/getMessages";
import { supabase } from "@/lib/supabase/client";
import { uid } from "@/lib/utils/ids";

type AssessmentRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  estimated_duration: string | null;
  language: Assessment["language"];
  status: AssessmentStatus;
  public_token: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type ActivityRow = {
  id: string;
  assessment_id: string;
  type: ActivityType;
  title: string;
  prompt: string;
  order_index: number;
  config_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type ParticipantRow = {
  id: string;
  assessment_id: string;
  participant_token: string | null;
  company_name: string | null;
  contact_email: string | null;
  status: ParticipantStatus;
  created_at: string;
  started_at?: string | null;
  submitted_at: string | null;
};

type ResponseRow = {
  id: string;
  assessment_id: string;
  participant_id: string;
  status: ResponseStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

type ActivityResponseRow = {
  id: string;
  response_id: string;
  activity_id: string;
  activity_type: ActivityType;
  answer_json: ActivityAnswer;
  created_at: string;
  updated_at: string;
};

export type AssessmentBundle = {
  assessment: Assessment;
  participants: Participant[];
  responses: AssessmentResponse[];
};

type ResponsePayload = {
  id: string;
  assessmentId: string;
  participantId: string;
  status: ResponseStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  activityResponses: Array<{
    id: string;
    responseId: string;
    activityId: string;
    activityType: ActivityType;
    answer: ActivityAnswer;
    createdAt: string;
    updatedAt: string;
  }>;
};

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function rowToAssessment(row: AssessmentRow, activities: Activity[] = []): Assessment {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description ?? undefined,
    estimatedDuration: row.estimated_duration ?? undefined,
    language: row.language,
    status: row.status,
    publicToken: row.public_token ?? undefined,
    activities,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined
  };
}

function configQuestionToFramingQuestion(value: unknown): FramingQuestion | null {
  if (typeof value !== "object" || value === null) return null;
  const question = value as Record<string, unknown>;
  if (typeof question.title !== "string" || typeof question.prompt !== "string") return null;
  return {
    id: typeof question.id === "string" && question.id ? question.id : uid("question"),
    title: question.title,
    prompt: question.prompt,
    ...(typeof question.placeholder === "string" ? { placeholder: question.placeholder } : {}),
    ...(typeof question.required === "boolean" ? { required: question.required } : {})
  };
}

function configOptionGroups(value: unknown): ExplorationOptionGroup[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item !== "object" || item === null) return null;
      const group = item as Record<string, unknown>;
      const id = typeof group.id === "string" ? group.id : "";
      if (!id) return null;
      return {
        id,
        label: typeof group.label === "string" ? group.label : "",
        orderIndex: typeof group.orderIndex === "number" ? group.orderIndex : index
      };
    })
    .filter((item): item is ExplorationOptionGroup => Boolean(item))
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item, index) => ({ ...item, orderIndex: index }));
}

function configOptionGroupAssignments(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([key, groupId]) =>
      /^\d+$/.test(key) && typeof groupId === "string" && Boolean(groupId)
    )
  ) as Record<string, string>;
}

function nasijFramingContent(title: string, prompt: string) {
  const placeholder = "Write your reflection...";
  const knownFraming = [
    {
      title: "Short-term needs",
      description:
        "Starting from the short-term challenges you prioritized, describe what would help your organization address them in the next 6-12 months.",
      markers: [
        "Immediate support:",
        "Practical resources:",
        "First step:"
      ],
      questions: [
        {
          title: "Immediate support",
          prompt: "What kind of support would help you address the most urgent short-term challenges?",
          placeholder
        },
        {
          title: "Practical resources",
          prompt: "What tools, knowledge, training or technical support would be useful in the next 6-12 months?",
          placeholder
        },
        {
          title: "First step",
          prompt: "What could be a realistic first step to start addressing these challenges?",
          placeholder
        }
      ]
    },
    {
      title: "Medium-term needs",
      description:
        "Starting from the medium-term challenges you prioritized, describe what would help your organization make progress over the next 1-3 years.",
      markers: [
        "Skills and capabilities:",
        "Processes and tools:",
        "Partnerships and resources:"
      ],
      questions: [
        {
          title: "Skills and capabilities",
          prompt: "What skills, capabilities or professional profiles would be useful in the next 1-3 years?",
          placeholder
        },
        {
          title: "Processes and tools",
          prompt: "What processes, tools, methods or technical resources would help your organization make progress?",
          placeholder
        },
        {
          title: "Partnerships and resources",
          prompt: "What partnerships, funding opportunities or organizational resources would be needed?",
          placeholder
        }
      ]
    },
    {
      title: "Long-term needs",
      description:
        "Starting from the long-term challenges you prioritized, describe what would be needed to prepare for a more sustainable transition over the next 3-5 years or more.",
      markers: [
        "Strategic support:",
        "Long-term change:",
        "Collaboration and investment:"
      ],
      questions: [
        {
          title: "Strategic support",
          prompt:
            "What kind of strategic support would help your organization, sector or ecosystem prepare for long-term sustainability challenges?",
          placeholder
        },
        {
          title: "Long-term change",
          prompt: "What should change in the organization, value chain or wider ecosystem to support a more sustainable transition?",
          placeholder
        },
        {
          title: "Collaboration and investment",
          prompt: "What collaborations, policies, infrastructures or investments would be needed in the long term?",
          placeholder
        }
      ]
    }
  ];

  const match = knownFraming.find((item) => item.title === title && item.markers.some((marker) => prompt.includes(marker)));
  if (!match) return null;

  return {
    prompt: match.description,
    questions: match.questions.map((question) => ({ ...question, id: uid("question") }))
  };
}

function framingContentFromConfig(title: string, prompt: string, config: Record<string, unknown>) {
  const configQuestions = Array.isArray(config.questions)
    ? config.questions.map(configQuestionToFramingQuestion).filter((question): question is FramingQuestion => Boolean(question))
    : [];
  if (configQuestions.length) return { prompt, questions: configQuestions };

  const nasijContent = nasijFramingContent(title, prompt);
  if (nasijContent) return nasijContent;

  return {
    prompt,
    questions: [
      {
        id: uid("question"),
        title: "Reflection",
        prompt: "Write your reflection.",
        placeholder: "Write your reflection..."
      }
    ]
  };
}

function configSectionToPlanningSection(value: unknown): PlanningReportSectionConfig | null {
  if (typeof value !== "object" || value === null) return null;
  const section = value as Record<string, unknown>;
  if (typeof section.key !== "string" || typeof section.title !== "string") return null;
  return {
    key: section.key as PlanningReportSectionConfig["key"],
    title: section.title,
    visible: typeof section.visible === "boolean" ? section.visible : true,
    items: Array.isArray(section.items)
      ? section.items.map(configItemToPlanningItem).filter((item): item is PlanningReportItemConfig => Boolean(item))
      : []
  };
}

function configItemToPlanningItem(value: unknown): PlanningReportItemConfig | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.activityId !== "string" || typeof item.title !== "string") return null;
  return {
    id: item.id,
    activityId: item.activityId,
    title: item.title,
    visible: typeof item.visible === "boolean" ? item.visible : true
  };
}

function templateSectionsToPlanningSections(
  sections: AssessmentTemplateActivity extends never ? never : Extract<AssessmentTemplateActivity, { type: "planning_report" }>["sections"],
  sourceIds: Map<string, string>
): PlanningReportSectionConfig[] {
  return sections.map((section) => ({
    key: section.key,
    title: section.title,
    visible: section.visible,
    items: (section.items ?? []).map((item) => ({
      id: uid("report_item"),
      activityId: requireTemplateSource(sourceIds, item.sourceKey),
      title: item.title,
      visible: item.visible
    }))
  }));
}

function rowToActivity(row: ActivityRow): Activity {
  const config = row.config_json ?? {};
  const preset = createActivityPreset(row.type, row.order_index);
  const base = {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    orderIndex: row.order_index
  };

  if (row.type === "profiling" && preset.type === "profiling") {
    return { ...preset, ...base, type: "profiling", fields: Array.isArray(config.fields) ? config.fields as typeof preset.fields : preset.fields };
  }
  if (row.type === "exploration" && preset.type === "exploration") {
    return {
      ...preset,
      ...base,
      type: "exploration",
      itemType: typeof config.itemType === "string" ? config.itemType as typeof preset.itemType : preset.itemType,
      responseMode: typeof config.responseMode === "string" ? config.responseMode as typeof preset.responseMode : preset.responseMode,
      options: Array.isArray(config.options) ? config.options.filter((item): item is string => typeof item === "string") : preset.options,
      optionGroups: configOptionGroups(config.optionGroups),
      optionGroupAssignments: configOptionGroupAssignments(config.optionGroupAssignments),
      allowOther: typeof config.allowOther === "boolean" ? config.allowOther : preset.allowOther,
      maxSelections: typeof config.maxSelections === "number" ? config.maxSelections : preset.maxSelections
    };
  }
  if (row.type === "prioritization" && preset.type === "prioritization") {
    return { ...preset, ...base, type: "prioritization", sourceActivityId: typeof config.sourceActivityId === "string" ? config.sourceActivityId : "" };
  }
  if (row.type === "framing" && preset.type === "framing") {
    const framingContent = framingContentFromConfig(row.title, row.prompt, config);
    return {
      ...preset,
      ...base,
      type: "framing",
      prompt: framingContent.prompt,
      sourceActivityId: typeof config.sourceActivityId === "string" ? config.sourceActivityId : "",
      maxLength: typeof config.maxLength === "number" ? config.maxLength : 1500,
      questions: framingContent.questions
    };
  }
  if (row.type === "planning_report" && preset.type === "planning_report") {
    const sections = Array.isArray(config.sections)
      ? config.sections.map(configSectionToPlanningSection).filter((section): section is PlanningReportSectionConfig => Boolean(section))
      : [];
    return {
      ...preset,
      ...base,
      type: "planning_report",
      reportTitle: typeof config.reportTitle === "string" ? config.reportTitle : preset.reportTitle,
      reportSubtitle: typeof config.reportSubtitle === "string" ? config.reportSubtitle : preset.reportSubtitle,
      sections: sections.length ? sections : preset.sections
    };
  }
  return preset;
}

function activityConfig(activity: Activity) {
  if (activity.type === "profiling") return { fields: activity.fields };
  if (activity.type === "exploration") {
    return {
      itemType: activity.itemType,
      responseMode: activity.responseMode,
      options: activity.options,
      optionGroups: activity.optionGroups ?? [],
      optionGroupAssignments: activity.optionGroupAssignments ?? {},
      allowOther: Boolean(activity.allowOther),
      maxSelections: activity.maxSelections
    };
  }
  if (activity.type === "prioritization") return { sourceActivityId: activity.sourceActivityId };
  if (activity.type === "framing") return { sourceActivityId: activity.sourceActivityId, maxLength: activity.maxLength, questions: activity.questions };
  return { reportTitle: activity.reportTitle, reportSubtitle: activity.reportSubtitle, sections: activity.sections };
}

function requireTemplateSource(sourceIds: Map<string, string>, sourceKey: string) {
  const sourceActivityId = sourceIds.get(sourceKey);
  if (!sourceActivityId) throw new Error(`Template source activity "${sourceKey}" was not created.`);
  return sourceActivityId;
}

function resolveTemplateSource(sourceIds: Map<string, string>, sourceKey?: string) {
  if (!sourceKey) return "";
  return requireTemplateSource(sourceIds, sourceKey);
}

function templateActivityToActivity(
  templateActivity: AssessmentTemplateActivity,
  orderIndex: number,
  sourceIds: Map<string, string>
): Activity {
  const base = {
    id: uid("activity"),
    title: templateActivity.title,
    prompt: templateActivity.prompt,
    orderIndex
  };

  if (templateActivity.type === "profiling") {
    return {
      ...base,
      type: "profiling",
      fields: templateActivity.fields.map((field) => ({ ...field, id: uid("field") }))
    };
  }

  if (templateActivity.type === "exploration") {
    return {
      ...base,
      type: "exploration",
      itemType: templateActivity.itemType,
      responseMode: templateActivity.responseMode,
      options: templateActivity.options,
      optionGroups: templateActivity.optionGroups?.map((group) => ({ ...group })) ?? [],
      optionGroupAssignments: { ...(templateActivity.optionGroupAssignments ?? {}) },
      allowOther: Boolean(templateActivity.allowOther),
      maxSelections: templateActivity.maxSelections
    };
  }

  if (templateActivity.type === "prioritization") {
    return {
      ...base,
      type: "prioritization",
      sourceActivityId: requireTemplateSource(sourceIds, templateActivity.sourceKey)
    };
  }

  if (templateActivity.type === "planning_report") {
    return {
      ...base,
      type: "planning_report",
      reportTitle: templateActivity.reportTitle,
      reportSubtitle: templateActivity.reportSubtitle,
      sections: templateSectionsToPlanningSections(templateActivity.sections, sourceIds)
    };
  }

  return {
    ...base,
    type: "framing",
    sourceActivityId: resolveTemplateSource(sourceIds, templateActivity.sourceKey),
    maxLength: templateActivity.maxLength,
    questions: templateActivity.questions.map((question) => ({ ...question, id: uid("question") }))
  };
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    participantToken: row.participant_token ?? "",
    companyName: row.company_name ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at ?? row.created_at,
    submittedAt: row.submitted_at ?? undefined
  };
}

function buildResponses(responseRows: ResponseRow[], activityResponseRows: ActivityResponseRow[]): AssessmentResponse[] {
  return responseRows.map((response) => ({
    id: response.id,
    assessmentId: response.assessment_id,
    participantId: response.participant_id,
    status: response.status,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    submittedAt: response.submitted_at ?? undefined,
    activityResponses: activityResponseRows
      .filter((activityResponse) => activityResponse.response_id === response.id)
      .map((activityResponse): ActivityResponse => ({
        id: activityResponse.id,
        responseId: activityResponse.response_id,
        activityId: activityResponse.activity_id,
        activityType: activityResponse.activity_type,
        answer: activityResponse.answer_json,
        createdAt: activityResponse.created_at,
        updatedAt: activityResponse.updated_at
      }))
  }));
}

function payloadToResponse(payload: ResponsePayload | null): AssessmentResponse | null {
  if (!payload) return null;
  return {
    id: payload.id,
    assessmentId: payload.assessmentId,
    participantId: payload.participantId,
    status: payload.status,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    submittedAt: payload.submittedAt ?? undefined,
    activityResponses: (payload.activityResponses ?? []).map((activityResponse) => ({
      id: activityResponse.id,
      responseId: activityResponse.responseId,
      activityId: activityResponse.activityId,
      activityType: activityResponse.activityType,
      answer: activityResponse.answer,
      createdAt: activityResponse.createdAt,
      updatedAt: activityResponse.updatedAt
    }))
  };
}

export async function createSupabaseAssessment(language: Assessment["language"]) {
  const client = requireSupabase();
  const messages = getMessages(language);
  const { data, error } = await client
    .from("assessments")
    .insert({ title: messages.presets.assessment.draftTitle, language, status: "draft" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToAssessment(data as AssessmentRow);
}

export async function createSupabaseAssessmentFromTemplate(template: AssessmentTemplate) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("assessments")
    .insert({
      title: template.title,
      description: template.description,
      estimated_duration: template.estimatedDuration ?? null,
      language: template.language,
      status: template.status
    })
    .select("*")
    .single();
  if (error) throw error;

  const assessment = rowToAssessment(data as AssessmentRow);
  const sourceIds = new Map<string, string>();
  const activities: Activity[] = [];

  try {
    for (let orderIndex = 0; orderIndex < template.activities.length; orderIndex += 1) {
      const templateActivity = template.activities[orderIndex];
      const activity = templateActivityToActivity(templateActivity, orderIndex, sourceIds);
      const insertedActivity = await insertSupabaseActivity(assessment.id, activity);
      sourceIds.set(templateActivity.key, insertedActivity.id);
      activities.push(insertedActivity);
    }
  } catch (templateError) {
    await client.from("assessments").delete().eq("id", assessment.id);
    throw templateError;
  }

  return { ...assessment, activities };
}

function cloneActivityForAssessment(activity: Activity, orderIndex: number, sourceIds: Map<string, string>): Activity {
  const base = {
    id: uid("activity"),
    title: activity.title,
    prompt: activity.prompt,
    orderIndex
  };

  if (activity.type === "profiling") {
    return {
      ...base,
      type: "profiling",
      fields: activity.fields.map((field) => ({ ...field, id: uid("field") }))
    };
  }

  if (activity.type === "exploration") {
    return {
      ...base,
      type: "exploration",
      itemType: activity.itemType,
      responseMode: activity.responseMode,
      options: [...activity.options],
      optionGroups: activity.optionGroups?.map((group) => ({ ...group })) ?? [],
      optionGroupAssignments: { ...(activity.optionGroupAssignments ?? {}) },
      allowOther: Boolean(activity.allowOther),
      maxSelections: activity.maxSelections
    };
  }

  if (activity.type === "prioritization") {
    return {
      ...base,
      type: "prioritization",
      sourceActivityId: sourceIds.get(activity.sourceActivityId) ?? ""
    };
  }

  if (activity.type === "framing") {
    return {
      ...base,
      type: "framing",
      sourceActivityId: sourceIds.get(activity.sourceActivityId) ?? "",
      maxLength: activity.maxLength,
      questions: activity.questions.map((question) => ({ ...question, id: uid("question") }))
    };
  }

  return {
    ...base,
    type: "planning_report",
    reportTitle: activity.reportTitle,
    reportSubtitle: activity.reportSubtitle,
    sections: activity.sections.map((section) => ({
      ...section,
      items: (section.items ?? []).map((item) => ({
        ...item,
        id: uid("report_item"),
        activityId: sourceIds.get(item.activityId) ?? item.activityId
      }))
    }))
  };
}

export async function createSupabaseAssessmentFromExistingTemplate(template: Assessment) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("assessments")
    .insert({
      title: template.title,
      description: template.description ?? null,
      estimated_duration: template.estimatedDuration ?? null,
      language: template.language,
      status: "draft"
    })
    .select("*")
    .single();
  if (error) throw error;

  const assessment = rowToAssessment(data as AssessmentRow);
  const sourceIds = new Map<string, string>();
  const activities: Activity[] = [];
  const ordered = template.activities.slice().sort((a, b) => a.orderIndex - b.orderIndex);

  try {
    for (let orderIndex = 0; orderIndex < ordered.length; orderIndex += 1) {
      const sourceActivity = ordered[orderIndex];
      const activity = cloneActivityForAssessment(sourceActivity, orderIndex, sourceIds);
      const insertedActivity = await insertSupabaseActivity(assessment.id, activity);
      sourceIds.set(sourceActivity.id, insertedActivity.id);
      activities.push(insertedActivity);
    }
  } catch (templateError) {
    await client.from("assessments").delete().eq("id", assessment.id);
    throw templateError;
  }

  return { ...assessment, activities };
}

export async function createSupabaseNasijAssessment() {
  return createSupabaseAssessmentFromTemplate(nasijSustainabilityAssessmentTemplate);
}

export async function fetchAssessmentBundle(assessmentId: string, ownerId?: string): Promise<AssessmentBundle | null> {
  const client = requireSupabase();
  let assessmentQuery = client.from("assessments").select("*").eq("id", assessmentId);
  if (ownerId) assessmentQuery = assessmentQuery.eq("owner_id", ownerId);
  const [assessmentResult, activitiesResult, participantsResult, responsesResult] = await Promise.all([
    assessmentQuery.single(),
    client.from("activities").select("*").eq("assessment_id", assessmentId).order("order_index"),
    client.from("participants").select("*").eq("assessment_id", assessmentId).order("created_at", { ascending: false }),
    client.from("responses").select("*").eq("assessment_id", assessmentId).order("created_at", { ascending: false })
  ]);
  if (assessmentResult.error || !assessmentResult.data) return null;
  if (activitiesResult.error || participantsResult.error || responsesResult.error) throw activitiesResult.error ?? participantsResult.error ?? responsesResult.error;

  const responseIds = ((responsesResult.data ?? []) as ResponseRow[]).map((response) => response.id);
  const activityResponsesResult = responseIds.length
    ? await client.from("activity_responses").select("*").in("response_id", responseIds)
    : { data: [], error: null };
  if (activityResponsesResult.error) throw activityResponsesResult.error;

  const activities = ((activitiesResult.data ?? []) as ActivityRow[]).map(rowToActivity);
  return {
    assessment: rowToAssessment(assessmentResult.data as AssessmentRow, activities),
    participants: ((participantsResult.data ?? []) as ParticipantRow[]).map(rowToParticipant),
    responses: buildResponses((responsesResult.data ?? []) as ResponseRow[], (activityResponsesResult.data ?? []) as ActivityResponseRow[])
  };
}

export async function fetchDesignerAssessmentBundles(ownerId: string): Promise<AssessmentBundle[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("assessments").select("id").eq("owner_id", ownerId).order("updated_at", { ascending: false });
  if (error) throw error;
  const bundles = await Promise.all((data ?? []).map((row) => fetchAssessmentBundle(row.id, ownerId)));
  return bundles.filter((bundle): bundle is AssessmentBundle => Boolean(bundle));
}

export async function updateSupabaseAssessment(assessment: Assessment) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("assessments")
    .update({
      title: assessment.title,
      description: assessment.description ?? null,
      estimated_duration: assessment.estimatedDuration?.trim() ? assessment.estimatedDuration.trim() : null,
      language: assessment.language,
      updated_at: new Date().toISOString()
    })
    .eq("id", assessment.id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToAssessment(data as AssessmentRow, assessment.activities);
}

export async function insertSupabaseActivity(assessmentId: string, activity: Activity) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("activities")
    .insert({
      assessment_id: assessmentId,
      type: activity.type,
      title: activity.title,
      prompt: activity.prompt,
      order_index: activity.orderIndex,
      config_json: activityConfig(activity)
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToActivity(data as ActivityRow);
}

export async function updateSupabaseActivity(activity: Activity) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("activities")
    .update({
      title: activity.title,
      prompt: activity.prompt,
      order_index: activity.orderIndex,
      config_json: activityConfig(activity),
      updated_at: new Date().toISOString()
    })
    .eq("id", activity.id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToActivity(data as ActivityRow);
}

export async function reorderSupabaseActivities(activities: Activity[]) {
  await Promise.all(activities.map((activity, orderIndex) => updateSupabaseActivity({ ...activity, orderIndex } as Activity)));
}

export async function deleteSupabaseActivity(activityId: string) {
  const client = requireSupabase();
  const { error } = await client.from("activities").delete().eq("id", activityId);
  if (error) throw error;
}

export async function publishSupabaseAssessment(assessment: Assessment) {
  const client = requireSupabase();
  const publicToken = assessment.publicToken ?? generatePublicToken();
  const { data, error } = await client
    .from("assessments")
    .update({
      status: "published",
      public_token: publicToken,
      published_at: assessment.publishedAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", assessment.id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToAssessment(data as AssessmentRow, assessment.activities);
}

export async function deleteSupabaseAssessment(assessmentId: string) {
  const client = requireSupabase();
  const { error } = await client.from("assessments").delete().eq("id", assessmentId);
  if (error) throw error;
}

export async function fetchPublishedAssessmentByToken(publicToken: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("assessments")
    .select("*")
    .eq("public_token", publicToken)
    .eq("status", "published")
    .single();
  if (error || !data) return null;
  const { data: activityRows, error: activitiesError } = await client
    .from("activities")
    .select("*")
    .eq("assessment_id", data.id)
    .order("order_index");
  if (activitiesError) throw activitiesError;
  return rowToAssessment(data as AssessmentRow, ((activityRows ?? []) as ActivityRow[]).map(rowToActivity));
}

export async function startSupabaseParticipantResponse(publicToken: string, participantToken: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("start_public_response", {
    target_public_token: publicToken,
    target_participant_token: participantToken
  });
  if (error) throw error;
  return payloadToResponse((data ?? null) as ResponsePayload | null);
}

export async function saveSupabaseActivityResponse(
  publicToken: string,
  participantToken: string,
  activityId: string,
  activityType: ActivityType,
  answer: ActivityAnswer
) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("save_public_activity_response", {
    target_public_token: publicToken,
    target_participant_token: participantToken,
    target_activity_id: activityId,
    target_activity_type: activityType,
    target_answer_json: answer
  });
  if (error) throw error;
  return payloadToResponse((data ?? null) as ResponsePayload | null);
}

export async function fetchSupabaseResponse(responseId: string) {
  const client = requireSupabase();
  const { data: response, error } = await client.from("responses").select("*").eq("id", responseId).single();
  if (error || !response) return null;
  const { data: activityResponses, error: activityError } = await client.from("activity_responses").select("*").eq("response_id", responseId);
  if (activityError) throw activityError;
  return buildResponses([response as ResponseRow], (activityResponses ?? []) as ActivityResponseRow[])[0];
}

export async function submitSupabaseResponse(publicToken: string, participantToken: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("submit_public_response", {
    target_public_token: publicToken,
    target_participant_token: participantToken
  });
  if (error) throw error;
  return payloadToResponse((data ?? null) as ResponsePayload | null);
}
