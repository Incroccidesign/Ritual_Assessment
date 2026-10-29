import type { SupabaseClient, User } from "@supabase/supabase-js";
export const DEMO_EMAIL: string;
export function listScreenshotDemos(): Array<{ key: string; kind: string; title: string; status: string; count: number; activityCount: number }>;
export function seedScreenshotDemo(db: SupabaseClient, user: User, key: string): Promise<{ key: string; id: string; title: string; skipped: boolean }>;
