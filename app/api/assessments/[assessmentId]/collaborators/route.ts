import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isUuid, requireRequestUser } from "@/lib/server/supabaseAdmin";

type RouteContext = { params: Promise<{ assessmentId: string }> };

async function requireAssessmentOwner(request: Request, assessmentId: string) {
  const user = await requireRequestUser(request);
  if (!isUuid(assessmentId)) throw new Response("Assessment not found.", { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data: assessment, error } = await admin
    .from("assessments")
    .select("id, owner_id")
    .eq("id", assessmentId)
    .maybeSingle();

  if (error || !assessment || assessment.owner_id !== user.id) {
    throw new Response("Only the assessment owner can manage collaborators.", { status: 403 });
  }
  return { admin, user };
}

async function responseForError(error: unknown) {
  if (error instanceof Response) return error;
  return new Response("Unable to manage collaborators.", { status: 500 });
}

export async function GET(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const { admin } = await requireAssessmentOwner(request, params.assessmentId);
    const { data: collaborators, error } = await admin
      .from("assessment_collaborators")
      .select("user_id, role, created_at")
      .eq("assessment_id", params.assessmentId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const rows = await Promise.all((collaborators ?? []).map(async (collaborator) => {
      const { data } = await admin.auth.admin.getUserById(collaborator.user_id);
      return {
        userId: collaborator.user_id,
        email: data.user?.email ?? "Unavailable user",
        role: collaborator.role,
        createdAt: collaborator.created_at
      };
    }));
    return NextResponse.json({ collaborators: rows });
  } catch (error) {
    return responseForError(error);
  }
}

export async function POST(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const { admin, user } = await requireAssessmentOwner(request, params.assessmentId);
    const body = await request.json().catch(() => null) as { email?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response("Enter a valid email address.", { status: 400 });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.id === user.id) {
      return new Response("That user is not available to share with.", { status: 400 });
    }

    const { data: target, error: targetError } = await admin.auth.admin.getUserById(profile.id);
    if (targetError) throw targetError;
    if (!target.user?.email_confirmed_at) {
      return new Response("That user must confirm their email before access can be shared.", { status: 400 });
    }

    const { error: collaborationError } = await admin
      .from("assessment_collaborators")
      .upsert({
        assessment_id: params.assessmentId,
        user_id: profile.id,
        role: "editor",
        granted_by: user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: "assessment_id,user_id" });
    if (collaborationError) throw collaborationError;
    return NextResponse.json({ userId: profile.id, email: target.user.email, role: "editor" }, { status: 201 });
  } catch (error) {
    return responseForError(error);
  }
}

export async function DELETE(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const { admin } = await requireAssessmentOwner(request, params.assessmentId);
    const userId = new URL(request.url).searchParams.get("userId") ?? "";
    if (!isUuid(userId)) return new Response("Collaborator not found.", { status: 404 });

    const { error } = await admin
      .from("assessment_collaborators")
      .delete()
      .eq("assessment_id", params.assessmentId)
      .eq("user_id", userId);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return responseForError(error);
  }
}
