import { createSupabaseAdminClient, requireRequestUser } from "@/lib/server/supabaseAdmin";

const DELETE_CONFIRMATION = "DELETE";

export async function DELETE(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");
    const user = await requireRequestUser(request);
    const body = await request.json().catch(() => null) as { confirmation?: unknown } | null;
    if (body?.confirmation !== DELETE_CONFIRMATION) {
      return new Response("Enter DELETE to confirm permanent account deletion.", { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: platformAdmin, error: platformAdminError } = await admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (platformAdminError) throw platformAdminError;
    if (platformAdmin) {
      return new Response("The platform administrator account cannot be deleted from the self-service area.", { status: 403 });
    }

    if (!accessToken) {
      return new Response("A valid session is required to delete this account.", { status: 401 });
    }
    const { error: signOutError } = await admin.auth.admin.signOut(accessToken, "global");
    if (signOutError) throw signOutError;

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response("Unable to delete the account. Please contact the platform administrator.", { status: 500 });
  }
}
