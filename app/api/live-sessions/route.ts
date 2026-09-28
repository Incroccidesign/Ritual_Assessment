import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, requireRequestUser } from "@/lib/server/supabaseAdmin";

const kinds = new Set(["innesco", "traccia", "focus", "priorita", "patto"]);
const modes = new Set(["nickname_only", "identified"]);
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  let sessionId: string | null = null;
  try {
    const user = await requireRequestUser(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const title = text(body?.title, 240); const mode = body?.participant_details_mode;
    const activities = Array.isArray(body?.activities) ? body.activities.slice(0, 50) : null;
    const roles = Array.isArray(body?.roles) ? body.roles.map((item) => text(item, 240)).filter(Boolean).slice(0, 50) : [];
    if (!title || typeof mode !== "string" || !modes.has(mode) || !activities) return new Response("Invalid Live Session creation request.", { status: 400 });
    const parsed = activities.map((raw, index) => {
      const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}; const type = item.activity_type; const prompt = text(item.prompt, 8000);
      if (typeof type !== "string" || !kinds.has(type) || !prompt) throw new Error("Invalid Live activity.");
      return { activity_type: type, order_index: index, instance_index: activities.slice(0, index + 1).filter((entry) => (entry as Record<string, unknown>)?.activity_type === type).length, instance_label: text(item.instance_label, 240) || null, prompt, timer_enabled: Boolean(item.timer_enabled), timer_duration: typeof item.timer_duration === "number" && item.timer_duration > 0 ? Math.trunc(item.timer_duration) : null, show_live_results: item.show_live_results !== false, surface_input_types: Array.isArray(item.surface_input_types) ? item.surface_input_types : null, priority_source: typeof item.priority_source === "string" ? item.priority_source : null, votes_per_participant: Math.min(10, Math.max(1, Number(item.votes_per_participant) || 1)), pact_statement_mode: item.pact_statement_mode === "build_live" || item.pact_statement_mode === "predefined" ? item.pact_statement_mode : null, facilitator_note: text(item.facilitator_note, 8000) || null, pact_text: text(item.pact_text, 12000) || null };
    });
    const admin = createSupabaseAdminClient();
    const { data: account, error: accountError } = await admin.from("accounts").select("id").eq("owner_user_id", user.id).single();
    if (accountError || !account) throw new Error("No account is available for this user.");
    const { data: session, error: sessionError } = await admin.from("live_sessions").insert({ account_id: account.id, owner_id: user.id, title, facilitator_name: text(body?.facilitator_name, 240) || null, context_label: text(body?.context_label, 240) || null, participant_details_mode: mode, status: "draft" }).select("id").single();
    if (sessionError || !session) throw sessionError ?? new Error("Unable to create Live Session."); sessionId = session.id;
    const joinToken = randomBytes(32).toString("base64url");
    const { error: tokenError } = await admin.from("live_session_access_tokens").insert({ live_session_id: session.id, participant_join_token_hash: createHash("sha256").update(joinToken).digest("hex") }); if (tokenError) throw tokenError;
    if (roles.length) { const { error } = await admin.from("live_session_roles").insert(roles.map((role_name) => ({ live_session_id: session.id, role_name }))); if (error) throw error; }
    if (parsed.length) { const { data: created, error } = await admin.from("live_activities").insert(parsed.map((item) => ({ ...item, live_session_id: session.id }))).select("id, order_index"); if (error || !created) throw error ?? new Error("Unable to create Live activities."); for (const activity of created) { const raw = activities[activity.order_index] as Record<string, unknown>; const labels = Array.isArray(raw.priority_manual_items) ? raw.priority_manual_items.map((value) => text(value, 2000)).filter(Boolean) : []; if (labels.length) { const { error: itemError } = await admin.from("live_priority_items").insert(labels.map((label) => ({ live_session_id: session.id, live_activity_id: activity.id, source_type: "manual", label }))); if (itemError) throw itemError; } } }
    return NextResponse.json({ id: session.id, joinToken }, { status: 201 });
  } catch (error) {
    if (sessionId) await createSupabaseAdminClient().from("live_sessions").delete().eq("id", sessionId);
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create Live Session." }, { status: 500 });
  }
}
