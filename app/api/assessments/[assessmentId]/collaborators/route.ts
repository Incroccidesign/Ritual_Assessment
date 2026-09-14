import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isUuid, requireRequestUser } from "@/lib/server/supabaseAdmin";

type RouteContext = { params: Promise<{ assessmentId: string }> };
type CollaborationRole = "editor" | "co_owner";

async function requireCollaborationManager(request: Request, assessmentId: string) {
  const user = await requireRequestUser(request);
  if (!isUuid(assessmentId)) throw new Response("Assessment not found.", { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data: assessment, error } = await admin
    .from("assessments")
    .select("id, owner_id")
    .eq("id", assessmentId)
    .maybeSingle();

  if (error || !assessment) throw new Response("Assessment not found.", { status: 404 });
  if (assessment.owner_id === user.id) return { admin, user, managerRole: "owner" as const };

  const { data: membership, error: membershipError } = await admin
    .from("assessment_collaborators")
    .select("role")
    .eq("assessment_id", assessmentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError || membership?.role !== "co_owner") {
    throw new Response("You cannot manage access for this assessment.", { status: 403 });
  }
  return { admin, user, managerRole: "co_owner" as const };
}

async function responseForError(error: unknown) {
  if (error instanceof Response) return error;
  return new Response("Unable to manage collaborators.", { status: 500 });
}

export async function GET(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const { admin, managerRole } = await requireCollaborationManager(request, params.assessmentId);
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
    return NextResponse.json({ collaborators: rows, managerRole });
  } catch (error) {
    return responseForError(error);
  }
}

export async function POST(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const { admin, user, managerRole } = await requireCollaborationManager(request, params.assessmentId);
    const body = await request.json().catch(() => null) as { email?: unknown; role?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response("Enter a valid email address.", { status: 400 });
    }
    const role: CollaborationRole = body?.role === "co_owner" ? "co_owner" : "editor";
    if (managerRole !== "owner" && role !== "editor") {
      return new Response("Only the owner can grant co-owner access.", { status: 403 });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.id === user.id) {
      return new Response("This email is not available for sharing.", { status: 400 });
    }

    const { data: target, error: targetError } = await admin.auth.admin.getUserById(profile.id);
    if (targetError) throw targetError;
    if (!target.user?.email_confirmed_at) {
      return new Response("This email is not available for sharing.", { status: 400 });
    }

    const { error: collaborationError } = await admin
      .from("assessment_collaborators")
      .upsert({
        assessment_id: params.assessmentId,
        user_id: profile.id,
        role,
        granted_by: user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: "assessment_id,user_id" });
    if (collaborationError) throw collaborationError;
    return NextResponse.json({ userId: profile.id, email: target.user.email, role }, { status: 201 });
  } catch (error) {
    return responseForError(error);
  }
}

export async function PUT(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const { admin, managerRole } = await requireCollaborationManager(request, params.assessmentId);
    if (managerRole !== "owner") {
      return new Response("Only the owner can change collaborator roles.", { status: 403 });
    }
    const body = await request.json().catch(() => null) as { userId?: unknown; role?: unknown } | null;
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const role: CollaborationRole | null = body?.role === "editor" || body?.role === "co_owner" ? body.role : null;
    if (!isUuid(userId) || !role) return new Response("Invalid collaborator update.", { status: 400 });

    const { data, error } = await admin
      .from("assessment_collaborators")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("assessment_id", params.assessmentId)
      .eq("user_id", userId)
      .select("user_id, role")
      .maybeSingle();
    if (error) throw error;
    if (!data) return new Response("Collaborator not found.", { status: 404 });
    return NextResponse.json({ userId: data.user_id, role: data.role });
  } catch (error) {
    return responseForError(error);
  }
}

export async function DELETE(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const { admin, managerRole } = await requireCollaborationManager(request, params.assessmentId);
    const userId = new URL(request.url).searchParams.get("userId") ?? "";
    if (!isUuid(userId)) return new Response("Collaborator not found.", { status: 404 });

    const { data: collaborator, error: collaboratorError } = await admin
      .from("assessment_collaborators")
      .select("role")
      .eq("assessment_id", params.assessmentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (collaboratorError) throw collaboratorError;
    if (!collaborator) return new Response("Collaborator not found.", { status: 404 });
    if (managerRole !== "owner" && collaborator.role !== "editor") {
      return new Response("Only the owner can remove a co-owner.", { status: 403 });
    }

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
