import { supabase } from "@/lib/supabase/client";

async function request(method: "GET" | "POST") {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw error ?? new Error("Authentication required.");

  const response = await fetch("/api/legal/acceptance", {
    method,
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ accepted: boolean }>;
}

export async function getLegalAcceptanceStatus() {
  return request("GET");
}

export async function recordLegalAcceptance() {
  return request("POST");
}
