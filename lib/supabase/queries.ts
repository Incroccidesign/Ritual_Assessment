import { Assessment } from "@/types/assessment";
import { Activity } from "@/types/activity";
import { supabase } from "@/lib/supabase/client";

export async function fetchPublishedAssessmentByToken(publicToken: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("assessments")
    .select("*, activities(*)")
    .eq("public_token", publicToken)
    .eq("status", "published")
    .single();
  if (error || !data) return null;
  return data as unknown as Assessment & { activities: Activity[] };
}

export async function fetchDesignerAssessments(ownerId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  if (error) return [];
  return data;
}
