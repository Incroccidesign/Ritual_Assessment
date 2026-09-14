import { NextResponse } from "next/server";
import type { Assessment } from "@/types/assessment";
import type { ActivityType } from "@/types/activity";
import { createSupabaseAdminClient, requireRequestUser } from "@/lib/server/supabaseAdmin";

const languages = new Set<Assessment["language"]>(["en", "fr", "it"]);
const activityTypes = new Set<ActivityType>(["profiling", "exploration", "prioritization", "framing", "planning_report"]);
const maxActivities = 50;
const maxActivityConfigBytes = 64_000;

type PlannedActivity = {
  clientId: string;
  type: ActivityType;
  title: string;
  prompt: string;
  orderIndex: number;
  configJson: Record<string, unknown>;
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseActivities(value: unknown): PlannedActivity[] | null {
  if (!Array.isArray(value) || value.length > maxActivities) return null;

  const clientIds = new Set<string>();
  const activities: PlannedActivity[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = record(value[index]);
    const clientId = text(item?.clientId, 120);
    const type = item?.type;
    const title = text(item?.title, 240);
    const prompt = text(item?.prompt, 8_000);
    const orderIndex = item?.orderIndex;
    const configJson = record(item?.configJson);
    if (
      !clientId || clientIds.has(clientId) || typeof type !== "string" || !activityTypes.has(type as ActivityType)
      || !title || !prompt || !Number.isInteger(orderIndex) || orderIndex !== index || !configJson
    ) return null;

    try {
      if (JSON.stringify(configJson).length > maxActivityConfigBytes) return null;
    } catch {
      return null;
    }

    clientIds.add(clientId);
    activities.push({ clientId, type: type as ActivityType, title, prompt, orderIndex, configJson });
  }
  return activities;
}

function rewriteActivityReferences(configJson: Record<string, unknown>, activityIds: Map<string, string>) {
  const rewritten = structuredClone(configJson);
  const sourceActivityId = rewritten.sourceActivityId;
  if (typeof sourceActivityId === "string" && activityIds.has(sourceActivityId)) {
    rewritten.sourceActivityId = activityIds.get(sourceActivityId);
  }

  if (!Array.isArray(rewritten.sections)) return rewritten;
  rewritten.sections = rewritten.sections.map((section) => {
    if (!record(section) || !Array.isArray(section.items)) return section;
    return {
      ...section,
      items: section.items.map((item: unknown) => {
        const itemRecord = record(item);
        if (!itemRecord || typeof itemRecord.activityId !== "string" || !activityIds.has(itemRecord.activityId)) return item;
        return { ...itemRecord, activityId: activityIds.get(itemRecord.activityId) };
      })
    };
  });
  return rewritten;
}

export async function POST(request: Request) {
  let createdAssessmentId: string | null = null;
  try {
    const user = await requireRequestUser(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const language = body?.language;
    const title = text(body?.title, 240);
    const description = body?.description === null ? null : text(body?.description, 8_000);
    const estimatedDuration = body?.estimatedDuration === null ? null : text(body?.estimatedDuration, 120);
    const activities = parseActivities(body?.activities);
    if (typeof language !== "string" || !languages.has(language as Assessment["language"]) || !title || !activities) {
      return new Response("Invalid assessment creation request.", { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: assessment, error: assessmentError } = await admin
      .from("assessments")
      .insert({
        owner_id: user.id,
        title,
        description,
        estimated_duration: estimatedDuration,
        hide_activity_summaries: Boolean(body?.hideActivitySummaries),
        language,
        status: "draft"
      })
      .select("*")
      .single();
    if (assessmentError || !assessment) throw assessmentError ?? new Error("Assessment creation failed.");
    createdAssessmentId = assessment.id;

    const activityIds = new Map<string, string>();
    const createdActivities = [];
    for (const activity of activities) {
      const { data: createdActivity, error: activityError } = await admin
        .from("activities")
        .insert({
          assessment_id: assessment.id,
          type: activity.type,
          title: activity.title,
          prompt: activity.prompt,
          order_index: activity.orderIndex,
          config_json: rewriteActivityReferences(activity.configJson, activityIds)
        })
        .select("*")
        .single();
      if (activityError || !createdActivity) throw activityError ?? new Error("Activity creation failed.");
      activityIds.set(activity.clientId, createdActivity.id);
      createdActivities.push(createdActivity);
    }

    return NextResponse.json({ assessment, activities: createdActivities }, { status: 201 });
  } catch (error) {
    if (createdAssessmentId) {
      await createSupabaseAdminClient().from("assessments").delete().eq("id", createdAssessmentId);
    }
    if (error instanceof Response) return error;
    return new Response("Unable to create assessment.", { status: 500 });
  }
}
