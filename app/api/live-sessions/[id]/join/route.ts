import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isUuid } from "@/lib/server/supabaseAdmin";

type RouteContext = { params: Promise<{ id: string }> };
type ParticipantMode = "nickname_only" | "identified";

const tokenPattern = /^[A-Za-z0-9_-]{16,200}$/;
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const nullableText = (value: unknown, max: number) => text(value, max) || null;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request, { params }: RouteContext) {
  let participantId: string | null = null;
  try {
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Live Session is unavailable." }, { status: 404 });

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const joinToken = typeof body?.joinToken === "string" ? body.joinToken : "";
    const participantToken = typeof body?.participantToken === "string" ? body.participantToken : "";
    const roleName = text(body?.roleName, 240);
    const identity = body?.identity && typeof body.identity === "object" ? body.identity as Record<string, unknown> : {};
    if (!tokenPattern.test(joinToken) || !tokenPattern.test(participantToken) || !roleName) {
      return NextResponse.json({ error: "Invalid participant details." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: session, error: sessionError } = await admin
      .from("live_sessions")
      .select("id,status,participant_details_mode")
      .eq("id", id)
      .in("status", ["lobby", "live", "intermission"])
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ error: "Live Session is unavailable." }, { status: 404 });

    const { data: accessToken, error: tokenError } = await admin
      .from("live_session_access_tokens")
      .select("participant_join_token_hash")
      .eq("live_session_id", id)
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!accessToken || accessToken.participant_join_token_hash !== hash(joinToken)) {
      return NextResponse.json({ error: "Live Session is unavailable." }, { status: 404 });
    }

    const mode = session.participant_details_mode as ParticipantMode;
    const nickname = nullableText(identity.nickname, 240);
    const firstName = nullableText(identity.first_name, 240);
    const lastName = nullableText(identity.last_name, 240);
    const organization = nullableText(identity.organization, 240);
    const contact = nullableText(identity.contact, 500);
    const displayName = nullableText(identity.display_name, 500);
    if ((mode === "nickname_only" && !nickname) || (mode === "identified" && (!firstName || !lastName || !displayName))) {
      return NextResponse.json({ error: "Complete the required participant details." }, { status: 400 });
    }

    const { data: participant, error: participantError } = await admin
      .from("live_participants")
      .insert({
        live_session_id: id,
        role_name: roleName,
        nickname: mode === "nickname_only" ? nickname : null,
        first_name: mode === "identified" ? firstName : null,
        last_name: mode === "identified" ? lastName : null,
        organization: mode === "identified" ? organization : null,
        contact: mode === "identified" ? contact : null,
        display_name: displayName
      })
      .select("id")
      .single();
    if (participantError || !participant) throw participantError ?? new Error("Unable to create participant.");
    participantId = participant.id;

    const { error: participantTokenError } = await admin.from("live_participant_tokens").insert({
      participant_id: participant.id,
      live_session_id: id,
      participant_token_hash: hash(participantToken)
    });
    if (participantTokenError) throw participantTokenError;

    return NextResponse.json({ participantId: participant.id });
  } catch {
    if (participantId) await createSupabaseAdminClient().from("live_participants").delete().eq("id", participantId);
    return NextResponse.json({ error: "Unable to join this Live Session." }, { status: 500 });
  }
}
