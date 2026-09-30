import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isUuid, requireRequestUser } from "@/lib/server/supabaseAdmin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireRequestUser(request);
    const { id } = await params;
    if (!isUuid(id)) return new Response("Invalid Live Session id.", { status: 400 });

    const admin = createSupabaseAdminClient();
    const { data: session, error: sessionError } = await admin
      .from("live_sessions")
      .select("id,owner_id")
      .eq("id", id)
      .maybeSingle();
    if (sessionError || !session) return new Response("Live Session not found.", { status: 404 });

    let canManageJoinLink = session.owner_id === user.id;
    if (!canManageJoinLink) {
      const { data: collaborator, error: collaboratorError } = await admin
        .from("live_session_collaborators")
        .select("role")
        .eq("live_session_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (collaboratorError) throw collaboratorError;
      canManageJoinLink = collaborator?.role === "co_owner";
    }
    if (!canManageJoinLink) return new Response("You cannot manage this participant link.", { status: 403 });

    const joinToken = randomBytes(32).toString("base64url");
    const { error: tokenError } = await admin.from("live_session_access_tokens").upsert(
      {
        live_session_id: id,
        participant_join_token_hash: createHash("sha256").update(joinToken).digest("hex"),
        rotated_at: new Date().toISOString()
      },
      { onConflict: "live_session_id" }
    );
    if (tokenError) throw tokenError;

    return NextResponse.json({ joinToken });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unable to generate a participant link." }, { status: 500 });
  }
}
