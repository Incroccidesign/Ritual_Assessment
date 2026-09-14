import { NextResponse } from "next/server";
import { createSupabaseAdminClient, requireRequestUser } from "@/lib/server/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const configuredEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
    if (!configuredEmail || user.email?.trim().toLowerCase() !== configuredEmail) {
      return new Response("Not authorised to bootstrap platform administration.", { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { error: adminError } = await admin
      .from("platform_admins")
      .upsert({ user_id: user.id }, { onConflict: "user_id" });
    if (adminError) throw adminError;

    const { error: auditError } = await admin
      .from("admin_audit_events")
      .insert({
        admin_user_id: user.id,
        action: "platform_admin_bootstrap",
        target_user_id: user.id,
        metadata: { source: "authenticated-bootstrap" }
      });
    if (auditError) throw auditError;

    return NextResponse.json({ platformAdmin: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response("Unable to bootstrap platform administration.", { status: 500 });
  }
}
