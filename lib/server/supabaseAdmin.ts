import { createClient, type User } from "@supabase/supabase-js";

function readServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Server-side Supabase access is not configured.");
  return { url, secret };
}

export function createSupabaseAdminClient() {
  const { url, secret } = readServerConfig();
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function requireRequestUser(request: Request): Promise<User> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new Response("Authentication required.", { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Response("Authentication required.", { status: 401 });
  return data.user;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
