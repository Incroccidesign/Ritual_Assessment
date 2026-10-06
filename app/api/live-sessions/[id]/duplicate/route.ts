import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isUuid, requireRequestUser } from "@/lib/server/supabaseAdmin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  let duplicatedSessionId: string | null = null;

  try {
    const user = await requireRequestUser(request);
    const { id } = await params;
    if (!isUuid(id)) return new Response("Invalid Live Session id.", { status: 400 });

    const admin = createSupabaseAdminClient();
    const { data: source, error: sourceError } = await admin
      .from("live_sessions")
      .select("id,owner_id,title,facilitator_name,context_label,participant_details_mode")
      .eq("id", id)
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source) return new Response("Live Session not found.", { status: 404 });

    let canDuplicate = source.owner_id === user.id;
    if (!canDuplicate) {
      const { data: collaborator, error: collaboratorError } = await admin
        .from("live_session_collaborators")
        .select("role")
        .eq("live_session_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (collaboratorError) throw collaboratorError;
      canDuplicate = collaborator?.role === "editor" || collaborator?.role === "co_owner";
    }
    if (!canDuplicate) return new Response("You cannot duplicate this Live Session.", { status: 403 });

    const [{ data: account, error: accountError }, { data: sourceActivities, error: activitiesError }, { data: sourceRoles, error: rolesError }, { data: sourcePriorityItems, error: priorityItemsError }] = await Promise.all([
      admin.from("accounts").select("id").eq("owner_user_id", user.id).maybeSingle(),
      admin.from("live_activities").select("id,activity_type,order_index,instance_index,instance_label,prompt,timer_enabled,timer_duration,show_live_results,surface_input_types,priority_source,votes_per_participant,pact_statement_mode,facilitator_note,pact_text").eq("live_session_id", id).order("order_index"),
      admin.from("live_session_roles").select("role_name").eq("live_session_id", id).order("role_name"),
      admin.from("live_priority_items").select("live_activity_id,label").eq("live_session_id", id).eq("source_type", "manual")
    ]);
    if (accountError || !account) throw accountError ?? new Error("No account is available for this user.");
    if (activitiesError) throw activitiesError;
    if (rolesError) throw rolesError;
    if (priorityItemsError) throw priorityItemsError;
    if (!sourceActivities?.length) return new Response("This Live Session has no activities to duplicate.", { status: 400 });

    const { data: duplicate, error: duplicateError } = await admin
      .from("live_sessions")
      .insert({
        account_id: account.id,
        owner_id: user.id,
        title: `${source.title.slice(0, 233)} · copy`,
        facilitator_name: source.facilitator_name,
        context_label: source.context_label,
        participant_details_mode: source.participant_details_mode,
        status: "draft"
      })
      .select("id")
      .single();
    if (duplicateError || !duplicate) throw duplicateError ?? new Error("Unable to create the duplicated Live Session.");
    duplicatedSessionId = duplicate.id;

    const joinToken = randomBytes(32).toString("base64url");
    const { error: tokenError } = await admin.from("live_session_access_tokens").insert({
      live_session_id: duplicate.id,
      participant_join_token_hash: createHash("sha256").update(joinToken).digest("hex")
    });
    if (tokenError) throw tokenError;

    if (sourceRoles?.length) {
      const { error } = await admin.from("live_session_roles").insert(sourceRoles.map(({ role_name }) => ({ live_session_id: duplicate.id, role_name })));
      if (error) throw error;
    }

    const { data: createdActivities, error: createdActivitiesError } = await admin
      .from("live_activities")
      .insert(sourceActivities.map((activity) => ({
        live_session_id: duplicate.id,
        activity_type: activity.activity_type,
        order_index: activity.order_index,
        instance_index: activity.instance_index,
        instance_label: activity.instance_label,
        prompt: activity.prompt,
        timer_enabled: activity.timer_enabled,
        timer_duration: activity.timer_duration,
        show_live_results: activity.show_live_results,
        surface_input_types: activity.surface_input_types,
        priority_source: activity.priority_source,
        votes_per_participant: activity.votes_per_participant,
        pact_statement_mode: activity.pact_statement_mode,
        facilitator_note: activity.facilitator_note,
        pact_text: activity.pact_text
      })))
      .select("id,order_index");
    if (createdActivitiesError || !createdActivities) throw createdActivitiesError ?? new Error("Unable to create duplicated activities.");

    const copiedActivityIdByOrder = new Map(createdActivities.map((activity) => [activity.order_index, activity.id]));
    const originalOrderById = new Map(sourceActivities.map((activity) => [activity.id, activity.order_index]));
    const manualItems = (sourcePriorityItems ?? []).flatMap((item) => {
      const order = originalOrderById.get(item.live_activity_id);
      const activityId = order === undefined ? undefined : copiedActivityIdByOrder.get(order);
      return activityId ? [{ live_session_id: duplicate.id, live_activity_id: activityId, source_type: "manual" as const, label: item.label }] : [];
    });
    if (manualItems.length) {
      const { error } = await admin.from("live_priority_items").insert(manualItems);
      if (error) throw error;
    }

    return NextResponse.json({ id: duplicate.id, joinToken }, { status: 201 });
  } catch (error) {
    if (duplicatedSessionId) await createSupabaseAdminClient().from("live_sessions").delete().eq("id", duplicatedSessionId);
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to duplicate the Live Session." }, { status: 500 });
  }
}
