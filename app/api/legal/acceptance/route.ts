import { LEGAL_ACCEPTANCE_KEY, LEGAL_DOCUMENT_VERSION } from "@/lib/legal/documents";
import { createSupabaseAdminClient, requireRequestUser } from "@/lib/server/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("legal_acceptances")
      .select("id")
      .eq("user_id", user.id)
      .eq("document_key", LEGAL_ACCEPTANCE_KEY)
      .eq("document_version", LEGAL_DOCUMENT_VERSION)
      .maybeSingle();
    if (error) throw error;
    return Response.json({ accepted: Boolean(data) });
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response("Unable to read legal acceptance.", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("legal_acceptances")
      .upsert(
        {
          user_id: user.id,
          document_key: LEGAL_ACCEPTANCE_KEY,
          document_version: LEGAL_DOCUMENT_VERSION
        },
        { onConflict: "user_id,document_key,document_version", ignoreDuplicates: true }
      );
    if (error) throw error;
    return Response.json({ accepted: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response("Unable to record legal acceptance.", { status: 500 });
  }
}
